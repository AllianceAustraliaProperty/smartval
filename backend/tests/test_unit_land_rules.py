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


class UnitLandRuleTests(unittest.TestCase):
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

    def test_residential_freehold_house_renders_land_value(self):
        template = self.env.get_template('residential.html')
        report = build_mock_report('AAP', 'House', is_unit=False)
        html = template.render(
            valuation_report=report,
            property=report['address'],
            logo_type='AAP',
            page_logo_url='https://example.com/logo.png',
            now=now
        )
        self.assertIn("<td>Land Value</td>", html)
        self.assertIn("$650,000.00", html)
        self.assertNotIn("No Separate Land Value (Strata Titled Unit)", html)
        print("✓ Freehold house correctly renders numeric land value in residential.html!")

    def test_residential_strata_unit_suppresses_numeric_land_value(self):
        template = self.env.get_template('residential.html')
        report = build_mock_report('AAP', 'Unit', is_unit=True)
        html = template.render(
            valuation_report=report,
            property=report['address'],
            logo_type='AAP',
            page_logo_url='https://example.com/logo.png',
            now=now
        )
        self.assertIn("No Separate Land Value (Strata Titled Unit)", html)
        print("✓ Strata unit correctly denotes strata disclosure in residential.html!")

    def test_cgt_short_unit_land_value_suppression(self):
        template = self.env.get_template('cgt_short.html')
        report_unit = build_mock_report('AAP', 'Apartment', is_unit=True)
        html_unit = template.render(
            valuation_report=report_unit,
            property=report_unit['address'],
            logo_type='AAP',
            page_logo_url='https://example.com/logo.png',
            now=now
        )
        # Unit in cgt_short should show Valuation Amount and NOT Land Value: $650,000
        self.assertIn("Valuation Amount:", html_unit)
        self.assertNotIn("Land Value:", html_unit)
        print("✓ Strata unit correctly suppresses Land Value in cgt_short.html!")

    def test_cgt_short_house_shows_land_value(self):
        template = self.env.get_template('cgt_short.html')
        report_house = build_mock_report('AAP', 'House', is_unit=False)
        html_house = template.render(
            valuation_report=report_house,
            property=report_house['address'],
            logo_type='AAP',
            page_logo_url='https://example.com/logo.png',
            now=now
        )
        self.assertIn("Land Value:", html_house)
        self.assertIn("$650,000", html_house)
        print("✓ Freehold house correctly displays Land Value in cgt_short.html!")


if __name__ == '__main__':
    unittest.main()
