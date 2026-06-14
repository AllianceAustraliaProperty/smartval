"""
Settings blueprint - admin-editable application configuration.

Currently exposes the invoice email template (subject + HTML body) used by the
"Send Invoice" action on the valuation report page.
"""
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

settings_bp = Blueprint('settings', __name__)
settings_model = Settings(get_database())


def _current_invoice_email_template():
    """Return the stored template, falling back to defaults."""
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
    """Typeahead source for the sender picker - lists tenant mailboxes.

    Degrades gracefully: if Graph isn't configured or the directory permission
    is missing, returns an empty list plus a warning so the UI can still accept
    a manually typed address.
    """
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
    """Return the current invoice email template + available variables."""
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
    """Persist a custom invoice email template."""
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

        # Validate the templates render before saving so a broken template can't
        # be persisted and break sending later.
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
    """Reset the invoice email template back to defaults."""
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
    """Render a template with sample data for previewing in the editor."""
    try:
        data = request.get_json(silent=True) or {}
        subject = data.get('subject')
        body = data.get('body')
        if subject is None:
            subject = DEFAULT_INVOICE_EMAIL_SUBJECT
        if body is None:
            body = DEFAULT_INVOICE_EMAIL_BODY

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
