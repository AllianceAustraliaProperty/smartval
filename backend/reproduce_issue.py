import os
from jinja2 import Environment, FileSystemLoader

# Mock filters
def format_currency(value):
    return f"${value}"

def format_date(value):
    return str(value)

def format_currency_words(value):
    return "words"

def now():
    return "2023-10-27"

# Setup Jinja2 environment
template_dir = os.path.join(os.path.dirname(__file__), 'templates')
env = Environment(loader=FileSystemLoader(template_dir))
env.filters['format_currency'] = format_currency
env.filters['format_date'] = format_date
env.filters['format_currency_words'] = format_currency_words
env.filters['now'] = now

# Mock data
valuation_report = {
    "address": {"fullAddress": "123 Test St"},
    "generalComments": {},
    "propertyDetails": {},
    "valuationDetails": {"valuationDate": "2023-10-27", "marketValue": 1000000},
    "comparables": {
        "sales": [
            {"fullAddress": "Comp 1", "saleLeasePrice": 500000}
        ],
        "rentals": [
            {"full_address": "Rental 1", "sale_lease_price": 500}
        ]
    }
}

template_data = {
    "valuation_report": valuation_report,
    "logo_url": "logo.png",
    "now": now
}

try:
    template = env.get_template('commercial.html')
    output = template.render(**template_data)
    print("Template rendered successfully!")
except Exception as e:
    with open('error.log', 'w') as f:
        import traceback
        traceback.print_exc(file=f)
    print(f"Error rendering template: {e}")
