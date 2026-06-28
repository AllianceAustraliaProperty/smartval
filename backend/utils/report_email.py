from jinja2 import Environment, select_autoescape

_env = Environment(autoescape=select_autoescape(default=True, default_for_string=True))

REPORT_EMAIL_VARIABLES = [
    {'token': '{{ client_name }}', 'label': 'Client name'},
    {'token': '{{ file_number }}', 'label': 'File number'},
    {'token': '{{ property_address }}', 'label': 'Property address'},
    {'token': '{{ valuation_date }}', 'label': 'Valuation date'},
    {'token': '{{ logo_url }}', 'label': 'Company logo URL'},
    {'token': '{{ footer_url }}', 'label': 'Footer image URL'},
]

DEFAULT_REPORT_EMAIL_SUBJECT = 'Valuation Report - {{ property_address }}'

# Footer image hosted on S3
FOOTER_IMAGE_URL = 'https://smartval-bucket-copy.s3.ap-southeast-2.amazonaws.com/assets/footer_report_automation.jpeg'

DEFAULT_REPORT_EMAIL_BODY = (
    '<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px;'
    ' color: #1f2937; line-height: 1.6;">'
    '<p>Dear {{ client_name }},</p>'
    '<p>I hope this message finds you well.</p>'
    '<p>Please find attached the property valuation report for'
    ' <strong>{{ property_address }}</strong>.'
    ' Should you have any questions or require further clarification,'
    ' please feel free to reach out.</p>'
    '<p>Best regards,<br/>'
    'Jugal Saha<br/>'
    'Director (AAP Valuations)</p>'
    '<p style="margin-top: 24px;">'
    '<img src="' + FOOTER_IMAGE_URL + '" alt="AAP Valuations"'
    ' style="max-width: 100%; height: auto;" />'
    '</p>'
    '</div>'
)


def build_report_email_context(report, logo_url=None):
    primary = report.get('primaryContact', {}) or {}
    fn = (primary.get('firstName') or '').strip()
    ln = (primary.get('lastName') or '').strip()
    client_name = f"{fn} {ln}".strip() or 'there'

    address = report.get('address', {}) or {}
    property_address = (address.get('fullAddress') or '').strip()

    file_number = (report.get('fileNumber') or '').strip()

    val_details = report.get('valuationDetails', {}) or {}
    _vdate = val_details.get('inspectionDate') or val_details.get('valuationDate') or ''
    if hasattr(_vdate, 'strftime'):
        valuation_date = _vdate.strftime('%d/%m/%Y')
    else:
        valuation_date = str(_vdate).strip()

    return {
        'client_name': client_name,
        'file_number': file_number,
        'property_address': property_address,
        'valuation_date': valuation_date,
        'logo_url': logo_url or '',
        'footer_url': FOOTER_IMAGE_URL,
    }


def sample_report_context():
    return {
        'client_name': 'John Smith',
        'file_number': 'PV020880',
        'property_address': '12 Sample Street, Sydney NSW 2000',
        'valuation_date': '14/06/2026',
        'logo_url': '',
        'footer_url': FOOTER_IMAGE_URL,
    }


def render_string(template_str, context):
    return _env.from_string(template_str or '').render(**context)
