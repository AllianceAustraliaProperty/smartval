import os
import jinja2
import traceback

# Mock data mimicking the structure passed to the template
mock_data = {
    "valuation_report": {
        "fileNumber": "PV2025806",
        "address": {
            "fullAddress": "2/540 Nagle Road, Lavington NSW 2641"
        },
        "primaryContact": {
            "firstName": "John",
            "lastName": "Doe"
        },
        "valuationDetails": {
            "valuationType": "Land Valuation",
            "valuationDate": "2025-11-18",
            "marketValue": 500000,
            "landValuationType": "Capital Gains",
            "squareMeterRate": 500
        },
        "locationDetails": {
            "latitude": -33.8688,
            "longitude": 151.2093
        },
        "propertyDetails": {
            "propertyType": "House",
            "siteArea": 600,
            "buildingArea": 200,
            "titleReference": "123/456",
            "councilArea": "Albury City Council",
            "buildYear": 2000
        },
        "propertyDescriptors": {
            "bedrooms": 3,
            "bathrooms": 2,
            "carSpaces": 2
        },
        "generalComments": {
            "propertyDescription": "A nice house."
        },
        "comparables": {
            "sales": []
        },
        "photos": [
            {"isCover": True, "photoUrl": "http://example.com/cover.jpg"},
            {"isGallery": True, "photoUrl": "http://example.com/gallery1.jpg"}
            # Intentionally missing 2nd and 3rd gallery photos to trigger the error
        ]
    },
    "logo_url": "http://example.com/logo.png",
    "now": lambda: "2025-11-26"
}

# Setup Jinja2 environment
template_dir = os.path.join(os.getcwd(), 'backend', 'templates')
env = jinja2.Environment(loader=jinja2.FileSystemLoader(template_dir))

# Add custom filters used in the template
def format_area_smart(value):
    return f"{value} sqm"

def format_currency(value):
    if value is None or isinstance(value, jinja2.runtime.Undefined):
        return "N/A"
    return f"${value:,.2f}"

def format_date(value):
    return value

def format_date_v2(value):
    return value

def format_currency_words(value):
    return "Five Hundred Thousand Dollars"

def format_rental_frequency(value):
    return "pw"

env.filters['format_area_smart'] = format_area_smart
env.filters['format_currency'] = format_currency
env.filters['format_date'] = format_date
env.filters['format_date_v2'] = format_date_v2
env.filters['format_currency_words'] = format_currency_words
env.filters['format_rental_frequency'] = format_rental_frequency

try:
    template = env.get_template('smsf.html')
    output = template.render(**mock_data)
    print("Template rendered successfully!")
except Exception:
    with open('error_smsf.log', 'w') as f:
        traceback.print_exc(file=f)
    print("Failed to render template. Check error_smsf.log")
