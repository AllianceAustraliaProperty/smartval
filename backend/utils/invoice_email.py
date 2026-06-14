"""
Invoice email template helpers.

The invoice email body is an admin-editable HTML template stored in the
``settings`` collection. It is rendered with Jinja2 (autoescaping on, so any
``{{ variable }}`` substitutions are HTML-escaped while the template's own
markup is preserved). Defaults below are used until an admin saves a custom
template via the settings page.
"""
from jinja2 import Environment, select_autoescape

# Jinja environment dedicated to rendering the (string) email template.
# Autoescape escapes the output of {{ ... }} expressions only, not the literal
# HTML of the template itself - exactly what we want for a stored HTML body.
_env = Environment(autoescape=select_autoescape(default=True, default_for_string=True))


# Variables made available to the template. Surfaced to the frontend so the
# user knows which placeholders they can insert.
INVOICE_EMAIL_VARIABLES = [
    {'token': '{{ client_name }}', 'label': 'Client name'},
    {'token': '{{ invoice_number }}', 'label': 'Invoice number'},
    {'token': '{{ invoice_date }}', 'label': 'Invoice date'},
    {'token': '{{ due_date }}', 'label': 'Due date'},
    {'token': '{{ amount_formatted }}', 'label': 'Amount due (formatted)'},
    {'token': '{{ item_address }}', 'label': 'Property address'},
    {'token': '{{ item_description }}', 'label': 'Item description'},
    {'token': '{{ logo_url }}', 'label': 'Company logo URL'},
]


DEFAULT_INVOICE_EMAIL_SUBJECT = 'Invoice {{ invoice_number }} - Property Valuation'

DEFAULT_INVOICE_EMAIL_BODY = """<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #1f2937; line-height: 1.6;">
  {% if logo_url %}<p><img src="{{ logo_url }}" alt="Australian Appraisers" style="max-height: 60px;" /></p>{% endif %}
  <p>Dear {{ client_name }},</p>
  <p>Please find attached invoice <strong>{{ invoice_number }}</strong> for the property valuation of <strong>{{ item_address }}</strong>.</p>
  <table style="border-collapse: collapse; margin: 16px 0;">
    <tr>
      <td style="padding: 4px 16px 4px 0; color: #6b7280;">Invoice number</td>
      <td style="padding: 4px 0; font-weight: bold;">{{ invoice_number }}</td>
    </tr>
    <tr>
      <td style="padding: 4px 16px 4px 0; color: #6b7280;">Invoice date</td>
      <td style="padding: 4px 0;">{{ invoice_date }}</td>
    </tr>
    <tr>
      <td style="padding: 4px 16px 4px 0; color: #6b7280;">Due date</td>
      <td style="padding: 4px 0;">{{ due_date }}</td>
    </tr>
    <tr>
      <td style="padding: 4px 16px 4px 0; color: #6b7280;">Amount due</td>
      <td style="padding: 4px 0; font-weight: bold;">{{ amount_formatted }}</td>
    </tr>
  </table>
  <p>If you have any questions about this invoice, please reply to this email.</p>
  <p>Kind regards,<br/>Australian Appraisers</p>
</div>"""


def build_invoice_email_context(invoice_context, client_name, logo_url=None):
    """Build the variable dict used to render the invoice email template.

    Args:
        invoice_context: the dict returned by ``_build_invoice_context``.
        client_name: resolved client name (may be 'N/A').
        logo_url: optional company logo URL.
    """
    amount = invoice_context.get('total')
    if amount is None:
        amount = invoice_context.get('balance_due') or 0
    try:
        amount_formatted = f"${float(amount):,.2f}"
    except (TypeError, ValueError):
        amount_formatted = str(amount)

    greeting_name = client_name if client_name and client_name != 'N/A' else 'there'

    return {
        'client_name': greeting_name,
        'invoice_number': invoice_context.get('invoice_number', ''),
        'invoice_date': invoice_context.get('invoice_date', ''),
        'due_date': invoice_context.get('due_date', ''),
        'item_address': invoice_context.get('item_address', ''),
        'item_description': invoice_context.get('item_description', ''),
        'amount': amount,
        'amount_formatted': amount_formatted,
        'logo_url': logo_url or '',
    }


def sample_context():
    """A representative context used for previewing a template."""
    return {
        'client_name': 'John Smith',
        'invoice_number': 'INV-12345',
        'invoice_date': '14/06/2026',
        'due_date': '15/06/2026',
        'item_address': '12 Sample Street, Sydney NSW 2000',
        'item_description': 'Residential Property Valuation for Mortgage purpose',
        'amount': 660.0,
        'amount_formatted': '$660.00',
        'logo_url': '',
    }


def render_string(template_str, context):
    """Render a single template string with the given context (autoescaped)."""
    return _env.from_string(template_str or '').render(**context)
