from flask import Blueprint, jsonify, request
from config import Config
from database import get_database
from models.settings import Settings
from utils.graph_mail import GraphMailError, list_users
from utils.invoice_email import (
    DEFAULT_INVOICE_EMAIL_BODY,
    DEFAULT_INVOICE_EMAIL_SUBJECT,
    INVOICE_EMAIL_VARIABLES,
    render_string,
    sample_context,
)
from utils.report_email import (
    DEFAULT_REPORT_EMAIL_BODY,
    DEFAULT_REPORT_EMAIL_SUBJECT,
    REPORT_EMAIL_VARIABLES,
    render_string as render_report_string,
    sample_report_context,
)

settings_bp = Blueprint('settings', __name__)
settings_model = Settings(get_database())


def _current_invoice_email_template():
    stored_subject = settings_model.get('invoiceEmailSubject')
    stored_body = settings_model.get('invoiceEmailBody')
    stored_sender = settings_model.get('invoiceEmailSender')
    return {
        'subject': stored_subject or DEFAULT_INVOICE_EMAIL_SUBJECT,
        'body': stored_body or DEFAULT_INVOICE_EMAIL_BODY,
        'sender': stored_sender or '',
        'defaultSender': Config.MS_GRAPH_SENDER_EMAIL or '',
        'isCustom': bool(stored_body),
    }


@settings_bp.route('/graph-users', methods=['GET'])
def get_graph_users():
    search = (request.args.get('search') or '').strip()
    try:
        users = list_users(search=search or None)
        return jsonify({'users': users}), 200
    except GraphMailError as ge:
        return jsonify({'users': [], 'warning': str(ge)}), 200
    except Exception as e:
        print(f"Error listing tenant users: {str(e)}")
        return jsonify({'users': [], 'warning': str(e)}), 200


@settings_bp.route('/invoice-email', methods=['GET'])
def get_invoice_email_template():
    try:
        current = _current_invoice_email_template()
        return jsonify({
            **current,
            'variables': INVOICE_EMAIL_VARIABLES,
            'defaultSubject': DEFAULT_INVOICE_EMAIL_SUBJECT,
            'defaultBody': DEFAULT_INVOICE_EMAIL_BODY,
        }), 200
    except Exception as e:
        print(f"Error loading invoice email template: {str(e)}")
        return jsonify({'error': f'Failed to load invoice email template: {str(e)}'}), 500


@settings_bp.route('/invoice-email', methods=['PUT'])
def update_invoice_email_template():
    try:
        data = request.get_json(silent=True) or {}
        subject = (data.get('subject') or '').strip()
        body = data.get('body') or ''
        sender = (data.get('sender') or '').strip()

        if not subject:
            return jsonify({'error': 'Subject is required.'}), 400
        if not body.strip():
            return jsonify({'error': 'Email body is required.'}), 400
        if sender and '@' not in sender:
            return jsonify({'error': 'Sender must be a valid email address.'}), 400

        try:
            render_string(subject, sample_context())
            render_string(body, sample_context())
        except Exception as render_error:
            return jsonify({'error': f'Template is invalid: {str(render_error)}'}), 400

        settings_model.set_many({
            'invoiceEmailSubject': subject,
            'invoiceEmailBody': body,
            'invoiceEmailSender': sender or None,
        })
        return jsonify({
            'message': 'Invoice email template saved.',
            'subject': subject,
            'body': body,
            'sender': sender,
            'isCustom': True,
        }), 200
    except Exception as e:
        print(f"Error saving invoice email template: {str(e)}")
        return jsonify({'error': f'Failed to save invoice email template: {str(e)}'}), 500


@settings_bp.route('/invoice-email/reset', methods=['POST'])
def reset_invoice_email_template():
    try:
        settings_model.set_many({
            'invoiceEmailSubject': None,
            'invoiceEmailBody': None,
            'invoiceEmailSender': None,
        })
        return jsonify({
            'message': 'Invoice email template reset to default.',
            'subject': DEFAULT_INVOICE_EMAIL_SUBJECT,
            'body': DEFAULT_INVOICE_EMAIL_BODY,
            'sender': '',
            'defaultSender': Config.MS_GRAPH_SENDER_EMAIL or '',
            'isCustom': False,
        }), 200
    except Exception as e:
        print(f"Error resetting invoice email template: {str(e)}")
        return jsonify({'error': f'Failed to reset invoice email template: {str(e)}'}), 500


@settings_bp.route('/invoice-email/preview', methods=['POST'])
def preview_invoice_email_template():
    try:
        data = request.get_json(silent=True) or {}
        subject = data.get('subject') or DEFAULT_INVOICE_EMAIL_SUBJECT
        body = data.get('body') or DEFAULT_INVOICE_EMAIL_BODY

        ctx = sample_context()
        try:
            rendered_subject = render_string(subject, ctx)
            rendered_html = render_string(body, ctx)
        except Exception as render_error:
            return jsonify({'error': f'Template is invalid: {str(render_error)}'}), 400

        return jsonify({'subject': rendered_subject, 'html': rendered_html}), 200
    except Exception as e:
        print(f"Error previewing invoice email template: {str(e)}")
        return jsonify({'error': f'Failed to preview invoice email template: {str(e)}'}), 500


# ── Report email template routes ──────────────────────────────────────────────

def _current_report_email_template():
    stored_subject = settings_model.get('reportEmailSubject')
    stored_body = settings_model.get('reportEmailBody')
    stored_sender = settings_model.get('reportEmailSender')
    return {
        'subject': stored_subject or DEFAULT_REPORT_EMAIL_SUBJECT,
        'body': stored_body or DEFAULT_REPORT_EMAIL_BODY,
        'sender': stored_sender or '',
        'defaultSender': Config.MS_GRAPH_SENDER_EMAIL or '',
        'isCustom': bool(stored_body),
    }


@settings_bp.route('/report-email', methods=['GET'])
def get_report_email_template():
    try:
        current = _current_report_email_template()
        return jsonify({
            **current,
            'variables': REPORT_EMAIL_VARIABLES,
            'defaultSubject': DEFAULT_REPORT_EMAIL_SUBJECT,
            'defaultBody': DEFAULT_REPORT_EMAIL_BODY,
        }), 200
    except Exception as e:
        print(f"Error loading report email template: {str(e)}")
        return jsonify({'error': f'Failed to load report email template: {str(e)}'}), 500


@settings_bp.route('/report-email', methods=['PUT'])
def update_report_email_template():
    try:
        data = request.get_json(silent=True) or {}
        subject = (data.get('subject') or '').strip()
        body = data.get('body') or ''
        sender = (data.get('sender') or '').strip()

        if not subject:
            return jsonify({'error': 'Subject is required.'}), 400
        if not body.strip():
            return jsonify({'error': 'Email body is required.'}), 400
        if sender and '@' not in sender:
            return jsonify({'error': 'Sender must be a valid email address.'}), 400

        try:
            render_report_string(subject, sample_report_context())
            render_report_string(body, sample_report_context())
        except Exception as render_error:
            return jsonify({'error': f'Template is invalid: {str(render_error)}'}), 400

        settings_model.set_many({
            'reportEmailSubject': subject,
            'reportEmailBody': body,
            'reportEmailSender': sender or None,
        })
        return jsonify({
            'message': 'Report email template saved.',
            'subject': subject,
            'body': body,
            'sender': sender,
            'isCustom': True,
        }), 200
    except Exception as e:
        print(f"Error saving report email template: {str(e)}")
        return jsonify({'error': f'Failed to save report email template: {str(e)}'}), 500


@settings_bp.route('/report-email/reset', methods=['POST'])
def reset_report_email_template():
    try:
        settings_model.set_many({
            'reportEmailSubject': None,
            'reportEmailBody': None,
            'reportEmailSender': None,
        })
        return jsonify({
            'message': 'Report email template reset to default.',
            'subject': DEFAULT_REPORT_EMAIL_SUBJECT,
            'body': DEFAULT_REPORT_EMAIL_BODY,
            'sender': '',
            'defaultSender': Config.MS_GRAPH_SENDER_EMAIL or '',
            'isCustom': False,
        }), 200
    except Exception as e:
        print(f"Error resetting report email template: {str(e)}")
        return jsonify({'error': f'Failed to reset report email template: {str(e)}'}), 500


@settings_bp.route('/report-email/preview', methods=['POST'])
def preview_report_email_template():
    try:
        data = request.get_json(silent=True) or {}
        subject = data.get('subject') or DEFAULT_REPORT_EMAIL_SUBJECT
        body = data.get('body') or DEFAULT_REPORT_EMAIL_BODY

        ctx = sample_report_context()
        try:
            rendered_subject = render_report_string(subject, ctx)
            rendered_html = render_report_string(body, ctx)
        except Exception as render_error:
            return jsonify({'error': f'Template is invalid: {str(render_error)}'}), 400

        return jsonify({'subject': rendered_subject, 'html': rendered_html}), 200
    except Exception as e:
        print(f"Error previewing report email template: {str(e)}")
        return jsonify({'error': f'Failed to preview report email template: {str(e)}'}), 500
