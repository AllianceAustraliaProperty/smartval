import os
import sys
import unittest
from jinja2 import Environment, FileSystemLoader, select_autoescape

# Ensure backend root is on sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Helper filters matching valuation_reports.py
def format_currency(val):
    if val is None or val == '': return '$0'
    try: return f"${float(val):,.2f}"
    except: return str(val)

def format_currency_no_decimal(val):
    if val is None or val == '': return '$0'
    try: return f"${int(float(val)):,}"
    except: return str(val)

def format_currency_words(val):
    return "Zero Dollars" if not val else "Sample Dollars"

def format_date(val):
    return str(val) if val else "14 November 2026"

def format_date_v2(val):
    return str(val) if val else "14/11/2026"

def format_area(val):
    return f"{val} sqm" if val else "0 sqm"

def format_area_sqm(val):
    return f"{val} sqm" if val else "0 sqm"

def format_area_smart(val):
    return f"{val} sqm" if val else "0 sqm"

def format_owners(val):
    return str(val) if val else "John Doe"

def now():
    return "14 November 2026"

def format_rental_frequency(val):
    return str(val) if val else "Weekly"

def title_address(val):
    return str(val).title() if val else ""


def build_mock_report(logo_type='AAP', property_type='House', is_unit=False):
    return {
        "fileNumber": "PV2026001",
        "logoType": logo_type,
        "address": {
            "unitNumber": "Unit 5" if is_unit else "",
            "streetName": "100 George Street",
            "suburb": "Parramatta",
            "state": "NSW",
            "postcode": "2150",
            "fullAddress": "Unit 5, 100 George Street, Parramatta NSW 2150" if is_unit else "100 George Street, Parramatta NSW 2150"
        },
        "primaryContact": {
            "firstName": "John",
            "lastName": "Doe"
        },
        "locationDetails": {
            "suburbDescription": "Parramatta is a vibrant commercial and residential hub.",
            "surroundingDevelopment": "Established residential and commercial precinct.",
            "services": "All municipal utility services connected.",
            "access": "Good vehicular and pedestrian access.",
            "map": {"source": "Google Maps", "photo": None}
        },
        "land": {
            "propertyIdentification": "Lot 1 DP 123456",
            "siteDescriptionAccess": "Regular shaped allotment."
        },
        "dwellingDescription": {
            "style": "Contemporary",
            "mainWallsRoof": "Brick veneer / Concrete tile",
            "accommodation": "4 bedrooms, 2 bathrooms, 2 car garage"
        },
        "propertyDetails": {
            "propertyType": property_type,
            "siteArea": 450,
            "livingArea": 180,
            "councilArea": "City of Parramatta",
            "zoning": "R2 Low Density Residential"
        },
        "propertyDescriptors": {
            "isGrannyFlat": False
        },
        "valuationDetails": {
            "valuationType": "Market Valuation",
            "valuationDate": "2026-11-14",
            "dateIssued": "2026-11-14",
            "marketValue": 1250000,
            "landValue": 650000,
            "improvements": 600000,
            "showLandValue": True,
            "showImprovements": True,
            "squareMeterRate": 1444,
            "directComparison": "Direct comparison analysis based on recent local sales.",
            "isUnit": is_unit
        },
        "photos": [],
        "photosSummary": {
            "internalWalls": ["Plasterboard"],
            "externalWalls": ["Brick"],
            "roofings": ["Tile"],
            "floorings": ["Timber", "Carpet"]
        },
        "additionalPhotos": [],
        "floorPlans": [],
        "titleSearch": [],
        "comparables": {
            "sales": [],
            "rentals": []
        },
        "generalComments": {
            "valuationCommentsPara": "Subject property presents in good overall condition.",
            "propertyDescription": "Single storey dwelling.",
            "marketOverview": "Stable local market conditions."
        },
        "ancillaryImprovements": {
            "accommodation": "Concrete driveway and perimeter timber fencing."
        }
    }


class ModularTemplateTests(unittest.TestCase):
    def setUp(self):
        templates_dir = os.path.join(backend_dir, 'templates')
        self.env = Environment(
            loader=FileSystemLoader(templates_dir),
            autoescape=select_autoescape(['html', 'xml'])
        )
        self.env.filters['format_currency'] = format_currency
        self.env.filters['format_currency_no_decimal'] = format_currency_no_decimal
        self.env.filters['format_currency_words'] = format_currency_words
        self.env.filters['format_date'] = format_date
        self.env.filters['format_date_v2'] = format_date_v2
        self.env.filters['format_area'] = format_area
        self.env.filters['format_area_sqm'] = format_area_sqm
        self.env.filters['format_area_smart'] = format_area_smart
        self.env.filters['format_owners'] = format_owners
        self.env.filters['now'] = now
        self.env.filters['format_rental_frequency'] = format_rental_frequency
        self.env.filters['title_address'] = title_address

    def test_modular_residential_renders_without_errors(self):
        template = self.env.get_template('residential.html')
        report = build_mock_report('AAP', 'House')
        html = template.render(
            valuation_report=report,
            property=report['address'],
            logo_type='AAP',
            logo_url='https://example.com/aap-logo.png',
            page_logo_url='https://example.com/aap-logo.png',
            tamn_page_logo_url='https://example.com/tamn-logo.png',
            aap_cover_design_url='https://example.com/aap-cover.png',
            house_cover_url='https://example.com/house.png',
            cover_photo=None,
            now=now
        )
        self.assertIn("<!DOCTYPE html>", html)
        self.assertIn("AAP VALUATIONS", html)
        self.assertIn("100 George Street", html)
        self.assertIn("Valuation Methodology", html)
        print("✓ test_modular_residential_renders_without_errors passed!")

    def test_cpv_cover_page_has_no_aap_leak(self):
        template = self.env.get_template('residential.html')
        report = build_mock_report('CPV', 'House')
        html = template.render(
            valuation_report=report,
            property=report['address'],
            logo_type='CPV',
            logo_url='https://example.com/cpv-logo.png',
            page_logo_url='https://example.com/cpv-logo.png',
            tamn_page_logo_url='https://example.com/tamn-logo.png',
            aap_cover_design_url=None,
            house_cover_url=None,
            cover_photo=None,
            now=now
        )
        self.assertIn("Commercial Property Valuations (CPV)", html)
        # Verify CPV cover page does not contain Alliance Australia Property
        cover_section = html.split('<div class="page executive-summary">')[0]
        self.assertNotIn("Alliance Australia Property Pty Ltd", cover_section)
        print("✓ test_cpv_cover_page_has_no_aap_leak passed!")

    def test_disclaimer_uses_dynamic_tenant_name(self):
        template = self.env.get_template('residential.html')
        # Test AAP
        report_aap = build_mock_report('AAP')
        html_aap = template.render(
            valuation_report=report_aap,
            property=report_aap['address'],
            logo_type='AAP',
            page_logo_url='https://example.com/logo.png',
            now=now
        )
        self.assertIn("AAP Valuations or relied upon any other party", html_aap)

        # Test CPV
        report_cpv = build_mock_report('CPV')
        html_cpv = template.render(
            valuation_report=report_cpv,
            property=report_cpv['address'],
            logo_type='CPV',
            page_logo_url='https://example.com/logo.png',
            now=now
        )
        self.assertIn("CPV Valuers or relied upon any other party", html_cpv)
        print("✓ test_disclaimer_uses_dynamic_tenant_name passed!")

    def test_strata_unit_suppresses_separate_land_value(self):
        template = self.env.get_template('residential.html')
        report_unit = build_mock_report('AAP', 'Unit', is_unit=True)
        html_unit = template.render(
            valuation_report=report_unit,
            property=report_unit['address'],
            logo_type='AAP',
            page_logo_url='https://example.com/logo.png',
            now=now
        )
        self.assertIn("No Separate Land Value (Strata Titled Unit)", html_unit)

        # Freehold house should show actual land value
        report_house = build_mock_report('AAP', 'House', is_unit=False)
        html_house = template.render(
            valuation_report=report_house,
            property=report_house['address'],
            logo_type='AAP',
            page_logo_url='https://example.com/logo.png',
            now=now
        )
        self.assertIn("$650,000.00", html_house)
        self.assertNotIn("No Separate Land Value (Strata Titled Unit)", html_house)
        print("✓ test_strata_unit_suppresses_separate_land_value passed!")


if __name__ == '__main__':
    unittest.main()
