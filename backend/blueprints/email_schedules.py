"""Authenticated preview, confirmation and management of per-report scheduled emails."""
from copy import deepcopy
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
from io import BytesIO
from uuid import UUID
from bson import ObjectId, Binary
from flask import Blueprint, jsonify, request, send_file, current_app
from pymongo.errors import DuplicateKeyError
from database import get_database
from config import Config
from models.settings import Settings
from utils.email_schedule import now, fingerprint, addresses, send_time, transition
from utils.email_schedule_timing import HEALTH_MAX_AGE

email_schedules_bp = Blueprint('email_schedules', __name__)
ROOT = '/<report_id>/email-schedules'


def user_id():
    return (getattr(request, 'user', {}) or {}).get('uid') or (getattr(request, 'user', {}) or {}).get('sub')


def report_for(report_id):
    if not ObjectId.is_valid(report_id):
        raise ValueError('Report not found.')
    report = get_database().valuationReports.find_one({'_id': ObjectId(report_id), 'isDeleted': {'$ne': True}})
    if not report:
        raise ValueError('Report not found or deleted.')
    return report


def dto(job, report=None):
    fields = ('status', 'to', 'cc', 'subject', 'sender', 'filename', 'scheduledAt', 'timeZone', 'createdAt', 'updatedAt', 'reason', 'version', 'active', 'events', 'acceptedAt')
    def encode(value):
        if isinstance(value, datetime): return value.isoformat() + 'Z'
        if isinstance(value, list): return [encode(x) for x in value]
        if isinstance(value, dict): return {k: encode(v) for k, v in value.items()}
        return value
    result = {key: encode(job[key]) for key in fields if key in job}
    result.update(id=str(job['_id']), canManage=job['createdBy'] == user_id())
    if report: result['reportChanged'] = job.get('fingerprint') != fingerprint(report)
    return result


@email_schedules_bp.before_request
def protect():
    if request.method == 'OPTIONS': return None
    if not user_id(): return jsonify(error='Sign in to manage scheduled emails.'), 401
    if request.method != 'GET':
        origin = request.headers.get('Origin')
        allowed = current_app.config.get('CORS_ORIGINS', [])
        if origin and origin != request.host_url.rstrip('/') and origin not in allowed:
            return jsonify(error='This request origin is not allowed.'), 403
        if not request.is_json: return jsonify(error='A JSON request is required.'), 415


@email_schedules_bp.errorhandler(ValueError)
def invalid(exc):
    return jsonify(error=str(exc)), 400


@email_schedules_bp.errorhandler(DuplicateKeyError)
def duplicate(exc):
    return jsonify(error='This report already has an active schedule. Refresh and manage it first.'), 409


@email_schedules_bp.errorhandler(Exception)
def unavailable(exc):
    current_app.logger.error('Schedule operation failed: %s', type(exc).__name__)
    return jsonify(error='Scheduling could not complete. Refresh status before trying again.'), 503


@email_schedules_bp.after_request
def private(response):
    response.headers['Cache-Control'] = 'private, no-store'
    return response


@email_schedules_bp.get(ROOT)
def listing(report_id):
    report = report_for(report_id)
    db = get_database()
    # Small projections keep binary PDF content out of dashboard/editor requests.
    jobs = list(db.reportEmailSchedules.find({'reportId': report_id, 'status': {'$ne': 'prepared'}}, {'pdf': 0, 'html': 0}).sort('createdAt', -1).limit(20))
    active = db.reportEmailSchedules.find_one({'reportId': report_id, 'active': True}, {'pdf': 0, 'html': 0})
    if active and all(x['_id'] != active['_id'] for x in jobs): jobs.insert(0, active)
    heartbeat = db.reportEmailSchedulerState.find_one({'_id': 'worker'}) or {}
    contact = report.get('primaryContact') or {}
    return jsonify(jobs=[dto(x, report) for x in jobs], defaults={'to': contact.get('email') or contact.get('email2', ''), 'cc': contact.get('email2', '') if contact.get('email') else ''},
        workerHealthy=bool(heartbeat.get('at') and timedelta(0) <= now() - heartbeat['at'] < timedelta(seconds=HEALTH_MAX_AGE)))


@email_schedules_bp.post(ROOT + '/prepare')
def prepare(report_id):
    from blueprints.valuation_reports import _render_html_report
    from utils.pdf_client import generate_pdf_from_html
    from utils.report_email import DEFAULT_REPORT_EMAIL_BODY, DEFAULT_REPORT_EMAIL_SUBJECT, build_report_email_context, render_string
    body = request.get_json()
    try: job_id = str(UUID(body.get('requestId', '')))
    except (ValueError, TypeError, AttributeError): raise ValueError('A valid preview request ID is required.')
    db = get_database()
    existing = db.reportEmailSchedules.find_one({'_id': job_id})
    if existing:
        if existing['createdBy'] != user_id() or existing['reportId'] != report_id: return jsonify(error='Preview unavailable.'), 403
        return jsonify(job=dto(existing), html=existing.get('html', ''))
    report = report_for(report_id)
    recipients = addresses(body.get('to', ''), required=True)
    cc = [x for x in addresses(body.get('cc', '')) if x not in recipients]
    settings = Settings(db).get_all()
    sender = settings.get('reportEmailSender') or Config.MS_GRAPH_SENDER_EMAIL
    if not sender: raise ValueError('The report sender mailbox is not configured. Ask an administrator to update email settings.')
    context = build_report_email_context(report, Config.REPORT_LOGO_URL)
    logo = (report.get('valuationDetails') or {}).get('logoType', 'AAP')
    if body.get('recipientType') == 'poc' and logo in ('CPV', 'TAMN'):
        context['client_name'] = 'Falak' if logo == 'CPV' else 'Ashi'
    subject = render_string(settings.get('reportEmailSubject') or DEFAULT_REPORT_EMAIL_SUBJECT, context)
    html = render_string(settings.get('reportEmailBody') or DEFAULT_REPORT_EMAIL_BODY, context)
    rendered, success, error = _render_html_report(deepcopy(report), 'residential.html')
    if not success: raise ValueError('Could not prepare the report. Check the report fields and try again.')
    pdf = generate_pdf_from_html(rendered)
    if len(pdf) > 2_500_000 or len(html.encode()) > 100_000:
        raise ValueError('This PDF is too large for scheduled email (2.5 MB limit). Reduce report images and prepare it again.')
    file_number = str(report.get('fileNumber') or report_id[-8:])
    filename = ('AAP-' if logo == 'AAP' else '') + file_number.replace('/', '-').replace('\\', '-') + '.pdf'
    filename = secure_filename(filename) or 'report.pdf'
    timestamp = now()
    job = {'_id': job_id, 'reportId': report_id, 'createdBy': user_id(), 'status': 'prepared', 'active': False,
        'to': recipients, 'cc': cc, 'sender': sender, 'subject': subject, 'html': html, 'pdf': Binary(pdf), 'filename': filename,
        'fingerprint': fingerprint(report), 'createdAt': timestamp, 'updatedAt': timestamp, 'expiresAt': timestamp + timedelta(hours=1),
        'version': 1, 'events': [{'status': 'prepared', 'at': timestamp}], 'attempts': 0}
    db.reportEmailSchedules.insert_one(job)
    return jsonify(job=dto(job), html=html)


def owned_job(report_id, job_id):
    job = get_database().reportEmailSchedules.find_one({'_id': job_id, 'reportId': report_id})
    if not job or job['createdBy'] != user_id():
        return None
    return job


@email_schedules_bp.get(ROOT + '/<job_id>/pdf')
def pdf(report_id, job_id):
    report_for(report_id)
    job = owned_job(report_id, job_id)
    if not job or 'pdf' not in job: return jsonify(error='This preview is unavailable or has expired.'), 404
    return send_file(BytesIO(bytes(job['pdf'])), mimetype='application/pdf', download_name=job['filename'])


@email_schedules_bp.post(ROOT + '/<job_id>/<action>')
def change(report_id, job_id, action):
    db = get_database()
    job = owned_job(report_id, job_id)
    if not job: return jsonify(error='Only the person who created this schedule can change it.'), 403
    body = request.get_json()
    query = {'_id': job_id, 'version': body.get('version'), 'status': job['status']}
    fields = {}
    if action in ('confirm', 'reschedule'):
        report = report_for(report_id)
        required = 'prepared' if action == 'confirm' else 'scheduled'
        if job['status'] != required:
            # Repeating an acknowledged confirmation is harmless.
            if action == 'confirm' and job['status'] == 'scheduled': return jsonify(job=dto(job, report))
            raise ValueError('This schedule can no longer be changed. Refresh its status.')
        if action == 'confirm' and (job.get('expiresAt', now()) <= now() or job['fingerprint'] != fingerprint(report)):
            raise ValueError('The preview expired or the report changed. Prepare a new preview before scheduling.')
        scheduled = send_time(body.get('localDateTime'), body.get('timeZone'))
        fields = {'scheduledAt': scheduled, 'nextAttemptAt': scheduled, 'timeZone': body['timeZone'], 'active': True}
        status = 'scheduled'
    elif action == 'cancel' and job['status'] in ('scheduled', 'prepared', 'needs_review'):
        if job['status'] == 'needs_review' and body.get('reviewed') is not True:
            raise ValueError('Check Sent Items before closing a schedule with uncertain delivery.')
        status, fields = 'cancelled', {'active': False, 'reason': 'Closed by the schedule creator.'}
    else:
        raise ValueError('This email is being submitted or is already finished. Refresh its status.')
    # TTL only applies to unconfirmed previews. Clear it atomically with confirmation.
    timestamp = now()
    updated = db.reportEmailSchedules.find_one_and_update(query, {
        '$set': {'status': status, 'updatedAt': timestamp, **fields}, '$unset': {'expiresAt': ''}, '$inc': {'version': 1},
        '$push': {'events': {'$each': [{'status': status, 'at': timestamp, 'actor': user_id()}], '$slice': -50}},
    }, return_document=True)
    if not updated: return jsonify(error='The schedule changed in another window. Refresh before trying again.'), 409
    return jsonify(job=dto(updated))
