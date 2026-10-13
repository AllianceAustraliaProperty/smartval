"""Durable, single-document report email state machine. No in-process timers."""
import hashlib
import re
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from bson import json_util
from pymongo import ReturnDocument


def now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def fingerprint(report):
    return hashlib.sha256(json_util.dumps({k: v for k, v in report.items()
        if k not in ('updatedAt', 'createdAt')}, sort_keys=True).encode()).hexdigest()


def addresses(value, required=False):
    if not isinstance(value, str) or len(value) > 2000:
        raise ValueError('Enter email addresses separated by commas.')
    result = list(dict.fromkeys(x.strip().lower() for x in value.split(',') if x.strip()))
    if len(result) > 10 or (required and not result) or any(
        not re.fullmatch(r'[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+', x) or len(x) > 254 for x in result):
        raise ValueError('Enter up to 10 valid email addresses, separated by commas.')
    return result


def send_time(local, zone, current=None):
    try:
        date = datetime.strptime(local, '%Y-%m-%dT%H:%M')
        tz = ZoneInfo(zone)
        candidates = {date.replace(tzinfo=tz, fold=fold).astimezone(timezone.utc)
            for fold in (0, 1)
            if date.replace(tzinfo=tz, fold=fold).astimezone(timezone.utc).astimezone(tz).replace(tzinfo=None) == date}
    except (ValueError, TypeError, ZoneInfoNotFoundError):
        raise ValueError('Choose a valid date, time and time zone.')
    if len(candidates) != 1:
        raise ValueError('This time is skipped or repeated by daylight saving. Choose another time.')
    result = candidates.pop().replace(tzinfo=None)
    current = current or now()
    if not current + timedelta(minutes=2) <= result <= current + timedelta(days=365):
        raise ValueError('Choose a time at least 2 minutes ahead and within the next year.')
    return result


def ensure_indexes(collection):
    collection.create_index('reportId', unique=True, partialFilterExpression={'active': True}, name='one_active_email_per_report')
    collection.create_index([('status', 1), ('nextAttemptAt', 1)])
    collection.create_index([('reportId', 1), ('createdAt', -1)])
    collection.create_index('expiresAt', expireAfterSeconds=0)


def transition(collection, query, status, **fields):
    timestamp = now()
    return collection.find_one_and_update(query, {
        '$set': {'status': status, 'updatedAt': timestamp, **fields},
        '$inc': {'version': 1},
        '$push': {'events': {'$each': [{'status': status, 'at': timestamp}], '$slice': -50}},
    }, return_document=ReturnDocument.AFTER)


def run_once(db, transport):
    """Only explicit confirmation creates a scheduled job. Ambiguous sends never retry."""
    collection = db.reportEmailSchedules
    timestamp = now()
    # A crash before the send boundary is safe to retry; after it needs a person.
    collection.update_many({'status': 'processing', 'leaseUntil': {'$lt': timestamp}},
        {'$set': {'status': 'scheduled', 'nextAttemptAt': timestamp}, '$inc': {'version': 1}})
    collection.update_many({'status': 'sending', 'leaseUntil': {'$lt': timestamp}},
        {'$set': {'status': 'needs_review', 'reason': 'Delivery uncertain. Check the sender’s Sent Items before closing this schedule.'}, '$inc': {'version': 1}})
    job = collection.find_one_and_update({'status': 'scheduled', 'nextAttemptAt': {'$lte': timestamp}},
        {'$set': {'status': 'processing', 'leaseUntil': timestamp + timedelta(minutes=5)}, '$inc': {'version': 1, 'attempts': 1}},
        sort=[('nextAttemptAt', 1)], return_document=ReturnDocument.AFTER)
    if not job:
        return False
    query = {'_id': job['_id'], 'version': job['version'], 'status': 'processing'}
    from bson import ObjectId
    report = db.valuationReports.find_one({'_id': ObjectId(job['reportId'])}, {'isDeleted': 1})
    if not report or report.get('isDeleted') or timestamp - job['scheduledAt'] > timedelta(hours=1):
        transition(collection, query, 'needs_review', reason='The report was deleted or the send is over an hour late. Close this schedule and prepare a new email.')
        return True
    sending = False

    def before_send():
        nonlocal query, sending
        updated = transition(collection, query, 'sending')
        if not updated:
            raise RuntimeError('Schedule claim changed before sending')
        sending = True
        query = {'_id': job['_id'], 'version': updated['version'], 'status': 'sending'}

    try:
        transport(to_recipients=job['to'], cc_recipients=job['cc'], sender=job['sender'],
            subject=job['subject'], html_body=job['html'],
            attachments=[{'name': job['filename'], 'content': bytes(job['pdf']), 'content_type': 'application/pdf'}],
            before_send=before_send)
        transition(collection, query, 'accepted', active=False, acceptedAt=now(), reason='Accepted by Microsoft. This does not confirm inbox delivery.')
    except Exception:
        # Fail closed, including token failures. A human can fix configuration then prepare again.
        transition(collection, query, 'needs_review' if sending else 'failed', active=sending,
            reason='Delivery uncertain. Check the sender’s Sent Items before closing this schedule.' if sending else 'Email could not be submitted. Check mail configuration and prepare a new schedule.')

    return True
