import os
import sys
import unittest
from jinja2 import Environment, FileSystemLoader, select_autoescape

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from tests.test_residential_modular import (
    format_currency,
    format_currency_no_decimal,
    format_currency_words,
    format_date,
    format_date_v2,
    format_area,
    format_area_sqm,
    format_area_smart,
    format_owners,
    now,
    format_rental_frequency,
    title_address,
    build_mock_report,
)


class MultiTenantBrandingTests(unittest.TestCase):
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

    def test_aap_tenant_branding_isolation(self):
        template = self.env.get_template('residential.html')
        report = build_mock_report('AAP')
        html = template.render(
            valuation_report=report,
            property=report['address'],
            logo_type='AAP',
            logo_url='https://example.com/aap-logo.png',
            page_logo_url='https://example.com/aap-logo.png',
            tamn_page_logo_url=None,
            aap_cover_design_url='https://example.com/aap-design.png',
            now=now
        )
        cover = html.split('<div class="page executive-summary">')[0]
        self.assertIn("AAP VALUATIONS", cover)
        self.assertNotIn("Tamn Property Valuers", cover)
        self.assertNotIn("Commercial Property Valuations (CPV)", cover)
        self.assertIn("AAP Valuations or relied upon any other party", html)
        print("✓ AAP tenant branding fully isolated with zero leaks!")

    def test_tamn_tenant_branding_isolation(self):
        template = self.env.get_template('residential.html')
        report = build_mock_report('TAMN')
        html = template.render(
            valuation_report=report,
            property=report['address'],
            logo_type='TAMN',
            logo_url='https://example.com/tamn-logo.png',
            page_logo_url='https://example.com/tamn-page-logo.png',
            tamn_page_logo_url='https://example.com/tamn-page-logo.png',
            aap_cover_design_url=None,
            now=now
        )
        cover = html.split('<div class="page executive-summary">')[0]
        self.assertIn("Tamn Property Valuers", cover)
        self.assertNotIn("AAP VALUATIONS", cover)
        self.assertNotIn("Commercial Property Valuations (CPV)", cover)
        self.assertIn("TAMN Valuations or relied upon any other party", html)
        print("✓ TAMN tenant branding fully isolated with zero leaks!")

    def test_cpv_tenant_branding_isolation(self):
        template = self.env.get_template('residential.html')
        report = build_mock_report('CPV')
        html = template.render(
            valuation_report=report,
            property=report['address'],
            logo_type='CPV',
            logo_url='https://example.com/cpv-logo.png',
            page_logo_url='https://example.com/cpv-logo.png',
            tamn_page_logo_url=None,
            aap_cover_design_url=None,
            now=now
        )
        cover = html.split('<div class="page executive-summary">')[0]
        self.assertIn("Commercial Property Valuations (CPV)", cover)
        self.assertNotIn("Alliance Australia Property Pty Ltd", cover)
        self.assertNotIn("AAP VALUATIONS", cover)
        self.assertNotIn("Tamn Property Valuers", cover)
        self.assertIn("CPV Valuers or relied upon any other party", html)
        print("✓ CPV tenant branding fully isolated with zero leaks!")


if __name__ == '__main__':
    unittest.main()
