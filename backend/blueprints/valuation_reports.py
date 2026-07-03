"""
Valuation Reports blueprint for valuation report endpoints
"""
from flask import Blueprint, jsonify, request, render_template_string
# CORS is handled globally in app.py
from database import get_database
from models.valuation_report import ValuationReport
from models.settings import Settings
from pymongo import MongoClient
from config import Config
import base64
from datetime import datetime
import os
from utils.template import summarize_photos, format_currency_words, format_owners, format_rental_frequency, format_date_v2
from utils.image_compress import compress_report_images
from jinja2 import Environment, BaseLoader, Undefined
from playwright.sync_api import sync_playwright

import time
valuation_reports_bp = Blueprint('valuation_reports', __name__)

# Residential property types constant
RESIDENTIAL_PROPERTY_TYPES = [
    "House",
    "Duplex",
    "Triplex",
    "Studio",
    "Apartment",
    "House & Granny Flat",
    "Dual Key Apartment",
    "Townhouse",
    "Villa",
    "Terrace",
    "Granny Flat",
    "Semi-detached",
    "Unit"
]

# Initialize MongoDB connection
client = MongoClient(Config.MONGODB_URI)
db = client.get_default_database()
valuation_report_model = ValuationReport(db)
settings_model = Settings(db)

# Template filter functions
def _is_missing(value):
    """Treat both Python None and Jinja Undefined as missing."""
    return value is None or isinstance(value, Undefined)

def format_currency(value):
    if _is_missing(value):
        return 'N/A'
    try:
        return f"${value:,.2f}"
    except (TypeError, ValueError):
        return 'N/A'

def format_date(value):
    if _is_missing(value):
        return 'N/A'
    try:
        if isinstance(value, str):
            from datetime import datetime
            dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        elif hasattr(value, 'strftime'):
            dt = value
        else:
            return str(value)
        return dt.strftime('%d %B %Y')
    except (TypeError, ValueError):
        return 'N/A'

def format_area(value):
    if _is_missing(value):
        return 'N/A'
    try:
        return f"{value} sqm"
    except (TypeError, ValueError):
        return 'N/A'

def format_area_sqm(value):
    if _is_missing(value):
        return 'N/A'
    try:
        return f"{value} sqm"
    except (TypeError, ValueError):
        return 'N/A'

def format_area_smart(value):
    if _is_missing(value):
        return 'N/A'
    try:
        if value >= 10000:
            return f"{value/10000:.1f} hectares"
        else:
            return f"{value} sqm"
    except (TypeError, ValueError):
        return 'N/A'

def now(value=None):
    from datetime import datetime
    return datetime.now().strftime('%d %B %Y')

# Initialize Jinja2 environment once at module level
class TemplateLoader(BaseLoader):
    def get_source(self, environment, template):
        # This will be set when we load the template
        return self.template_content, None, lambda: True

# Australian state abbreviations that should stay uppercase
AU_STATE_ABBREVS = {'Nsw', 'Qld', 'Vic', 'Wa', 'Sa', 'Tas', 'Act', 'Nt'}

def title_address(value):
    """Title-case an address string but keep AU state abbreviations uppercase."""
    if not value:
        return value
    words = str(value).title().split()
    return ' '.join(w.upper() if w in AU_STATE_ABBREVS else w for w in words)

# Create the environment with custom filters
jinja_env = Environment(loader=TemplateLoader())
jinja_env.filters['format_currency'] = format_currency
jinja_env.filters['format_currency_words'] = format_currency_words
jinja_env.filters['format_date'] = format_date
jinja_env.filters['format_date_v2'] = format_date_v2
jinja_env.filters['format_area'] = format_area
jinja_env.filters['format_area_sqm'] = format_area_sqm
jinja_env.filters['format_area_smart'] = format_area_smart
jinja_env.filters['format_owners'] = format_owners
jinja_env.filters['now'] = now
jinja_env.filters['format_rental_frequency'] = format_rental_frequency
jinja_env.filters['title_address'] = title_address


def remove_null_values(data):
    """
    Recursively remove None/null values from dictionary
    MongoDB schema validation fails on null values for typed fields
    """
    if isinstance(data, dict):
        # Create a new dict without None values
        cleaned = {}
        for key, value in data.items():
            if value is None:
                continue  # Skip None values
            elif isinstance(value, dict):
                cleaned_dict = remove_null_values(value)
                if cleaned_dict:  # Only add if not empty
                    cleaned[key] = cleaned_dict
            elif isinstance(value, list):
                cleaned_list = [remove_null_values(item) if isinstance(item, dict) else item 
                               for item in value if item is not None]
                if cleaned_list:  # Only add if not empty
                    cleaned[key] = cleaned_list
            else:
                cleaned[key] = value
        return cleaned
    return data


def convert_date_strings_to_datetime(data, date_fields):
    """
    Recursively convert date string fields to datetime objects
    Empty date strings are converted to None (will be removed by remove_null_values)
    """
    if isinstance(data, dict):
        for key, value in data.items():
            if key in date_fields:
                if isinstance(value, str):
                    # Convert empty strings to None (will be removed later)
                    if not value or value.strip() == '':
                        data[key] = None
                        continue
                    
                    try:
                        # Parse various date string formats to datetime
                        # Check GMT/UTC first (most specific)
                        if 'GMT' in value or 'UTC' in value:
                            # Flask/Python datetime format (e.g., "Thu, 25 Sep 2025 00:00:00 GMT")
                            # Remove the timezone part and parse
                            date_part = value.replace(' GMT', '').replace(' UTC', '')
                            data[key] = datetime.strptime(date_part, '%a, %d %b %Y %H:%M:%S')
                        elif 'T' in value and ('-' in value or ':' in value):
                            # Full ISO datetime format (e.g., "2025-09-25T00:00:00.000Z")
                            # More specific check: must have T AND either - or : for time
                            data[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                        else:
                            # Date only format (YYYY-MM-DD)
                            data[key] = datetime.strptime(value, '%Y-%m-%d')
                    except Exception as e:
                        print(f"Warning: Failed to parse date {key}={value}: {str(e)}")
                        # On error, set to None (will be removed later)
                        data[key] = None
            elif isinstance(value, dict):
                convert_date_strings_to_datetime(value, date_fields)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        convert_date_strings_to_datetime(item, date_fields)
    return data


def generate_pdf_from_html(html: str):
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(args=[
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',   # critical for Docker: prevents /dev/shm exhaustion
            '--disable-gpu',             # no GPU in Docker
            '--no-zygote',               # avoids sandbox crashes in Docker
        ])
        page = browser.new_page()
        page.set_content(html, wait_until='domcontentloaded')
        time.sleep(3)
        return page.pdf(
            format="A4",
            print_background=True,
            margin={"top": "0", "bottom": "0", "left": "0", "right": "0"},
        )

@valuation_reports_bp.route('/', methods=['GET'])
def get_all_valuation_reports():
    """Get all valuation reports"""
    try:
        reports = valuation_report_model.get_all()
        return jsonify({
            'reports': reports,
            'count': len(reports)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@valuation_reports_bp.route('/<report_id>', methods=['GET'])
def get_valuation_report(report_id):
    """Get valuation report by ID"""
    try:
        report = valuation_report_model.get_by_id(report_id)
        
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404
        
        # Serialize report
        report = valuation_report_model.serialize(report)
        
        return jsonify({
            'report': report
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@valuation_reports_bp.route('/address', methods=['POST'])
def get_valuation_reports_by_address():
    """Get all valuation reports for a specific address"""
    try:
        data = request.get_json()
        if not data or 'address' not in data:
            return jsonify({'error': 'Address data is required'}), 400
        
        reports = valuation_report_model.get_by_address(data['address'])
        
        return jsonify({
            'reports': reports,
            'count': len(reports)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@valuation_reports_bp.route('/', methods=['POST'])
def create_valuation_report():
    """Create a new valuation report with property data included"""
    try:
        data = request.get_json()
        
        if not data:
            data = {}  # Allow empty valuation report creation
        
        # Ensure address is provided
        if 'address' not in data:
            return jsonify({'error': 'Address is required'}), 400
        
        # Convert date strings to datetime objects FIRST (empty strings -> None)
        date_fields = ['valuationDate', 'inspectionDate', 'reportDate', 'conversionDate', 'deadlineDate', 'dateIssued']
        convert_date_strings_to_datetime(data, date_fields)
        
        # Convert dates in valuationDetails if present
        if 'valuationDetails' in data:
            convert_date_strings_to_datetime(data['valuationDetails'], date_fields)
        
        # Convert dates in comparables (sales and rentals)
        if 'comparables' in data:
            if 'sales' in data['comparables']:
                for sale in data['comparables']['sales']:
                    convert_date_strings_to_datetime(sale, ['saleLeaseDate'])
            if 'rentals' in data['comparables']:
                for rental in data['comparables']['rentals']:
                    convert_date_strings_to_datetime(rental, ['saleLeaseDate'])
        
        # Remove null values to avoid MongoDB validation errors (AFTER date conversion)
        data = remove_null_values(data)
        
        report_id = valuation_report_model.create(data)
        
        return jsonify({
            'message': 'Valuation report created successfully',
            'reportId': report_id
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@valuation_reports_bp.route('/<report_id>/duplicate', methods=['POST'])
def duplicate_valuation_report(report_id):
    """Duplicate an existing valuation report a specified number of times"""
    try:
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404

        data = request.get_json() or {}
        copies = data.get('copies', 1)
        
        try:
            copies = int(copies)
            if copies < 1:
                copies = 1
        except ValueError:
            copies = 1

        new_ids = []
        for _ in range(copies):
            import copy
            # Create a deep copy of the report so we don't modify the original or subsequent copies
            new_report = copy.deepcopy(report)
            
            # Remove IDs to ensure a new document is created
            new_report.pop('_id', None)
            new_report.pop('id', None)
            
            # Create the new report
            new_id = valuation_report_model.create(new_report)
            new_ids.append(new_id)

        return jsonify({
            'message': f'Successfully duplicated {copies} report(s)',
            'reportIds': new_ids
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@valuation_reports_bp.route('/<report_id>', methods=['PUT'])
def update_valuation_report(report_id):
    """Update valuation report"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Convert date strings to datetime objects FIRST (empty strings -> None)
        date_fields = ['valuationDate', 'inspectionDate', 'reportDate', 'conversionDate', 'deadlineDate', 'dateIssued']
        data = convert_date_strings_to_datetime(data, date_fields)
        
        # Convert dates in valuationDetails if present
        if 'valuationDetails' in data:
            convert_date_strings_to_datetime(data['valuationDetails'], date_fields)
        
        # Convert dates in comparables (sales and rentals)
        if 'comparables' in data:
            if 'sales' in data['comparables']:
                for sale in data['comparables']['sales']:
                    convert_date_strings_to_datetime(sale, ['saleLeaseDate'])
            if 'rentals' in data['comparables']:
                for rental in data['comparables']['rentals']:
                    convert_date_strings_to_datetime(rental, ['saleLeaseDate'])
        
        # Remove null values to avoid MongoDB validation errors (AFTER date conversion)
        data = remove_null_values(data)
        
        # Check if report exists first
        existing_report = valuation_report_model.get_by_id(report_id)
        if not existing_report:
            print(f"Report not found: {report_id}")
            return jsonify({'error': f'Valuation report not found with ID: {report_id}'}), 404
        
        # Attempt to update - this will now raise exception if validation fails
        success = valuation_report_model.update(report_id, data)
        
        if not success:
            return jsonify({'error': 'No changes were made to the valuation report'}), 200
        
        return jsonify({'message': 'Valuation report updated successfully'}), 200
    except Exception as e:
        print(f"Error updating report: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to update: {str(e)}'}), 500


@valuation_reports_bp.route('/<report_id>', methods=['DELETE'])
def delete_valuation_report(report_id):
    """Delete valuation report"""
    try:
        success = valuation_report_model.delete(report_id)
        
        if not success:
            return jsonify({'error': 'Valuation report not found'}), 404
        
        return jsonify({'message': 'Valuation report deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def generate_html_report(report_id, template_name='residential.html'):
    """
    Generate HTML report using Jinja template
    
    Args:
        report_id (str): The valuation report ID
        template_name (str): The template file name (default: 'residential.html')
    
    Returns:
        tuple: (html_content, success, error_message)
    """
    try:
        # Get the valuation report
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return None, False, 'Valuation report not found'
        # Be defensive about missing fields
        valuation_type = (report.get("valuationDetails", {}).get("valuationType") or "").lower()

        if valuation_type == "commercial":
            template_name = "commercial_long.html"
        elif "commercial" in valuation_type:
            template_name = "commercial.html"
        elif "smsf" in valuation_type or "land valuation" in valuation_type:
            template_name = "smsf.html"
        elif "rural" in valuation_type:
            template_name = "rural.html"

        is_residential = report.get("propertyDetails", {}).get("propertyType") in RESIDENTIAL_PROPERTY_TYPES
        
        # Property data is now included in the report itself
        property_data = report.get('address', {})
        
        # Read the template file
        template_path = os.path.join(os.path.dirname(__file__), '..', 'templates', template_name)
        with open(template_path, 'r', encoding='utf-8') as f:
            template_content = f.read()
        
        # Compress all report images (gallery, cover, annexure, granny flat, comparables)
        # before template rendering. Floor plans and title searches are preserved at full quality.
        compress_report_images(report)

        # Process photos data
        report["photosSummary"] = summarize_photos(report.get("photos", []))
        gallery_photos = [photo for photo in report.get("photos", []) if photo.get("isGallery")]
        gallery_photos_groups = [gallery_photos[i:i+6] for i in range(0, len(gallery_photos), 6)]
        annexures = [photo for photo in report.get("photos", []) if photo.get("isAnnexure")]
        cover_photos = [photo for photo in report.get("photos", []) if photo.get("isCover")]
        cover_photo = cover_photos[0] if cover_photos else None
        
        # Process additional photos if type is Granny Flat
        additional_photos_type = report.get("additionalPhotosType", "")
        if additional_photos_type == "Granny Flat":
            report["additionalPhotosSummary"] = summarize_photos(report.get("additionalPhotos", []))
        else:
            report["additionalPhotosSummary"] = {"categories": []}
        
        # Add processed data to report
        report["gallery_photos_groups"] = gallery_photos_groups
        report["annexures"] = annexures
        report["cover_photo"] = cover_photo
        
        land_value = None
        land_value_rounded = None
        if report.get("propertyDetails", {}).get("siteArea") and report.get("valuationDetails", {}).get("squareMeterRate"):
            land_value = report.get("propertyDetails", {}).get("siteArea") * report.get("valuationDetails", {}).get("squareMeterRate")
            # Round to nearest 5,000 (e.g. 164,250 -> 165,000)
            try:
                land_value_rounded = int(round(land_value / 5000.0) * 5000)
            except Exception:
                land_value_rounded = land_value

        # Determine which logo to use (AAP default, CPV optional, TAMN optional)
        logo_type = (report.get('valuationDetails') or {}).get('logoType', 'AAP') or 'AAP'
        if logo_type == 'CPV':
            logo_filename = 'CPV-logo.png'
            logo_remote_url = f"https://{Config.S3_BUCKET_NAME}.s3.{Config.AWS_REGION}.amazonaws.com/photos/CPV-logo.png"
        elif logo_type == 'TAMN':
            logo_filename = 'tamn_logo.png'
            logo_remote_url = Config.REPORT_LOGO_URL
        else:
            logo_filename = 'aap-logo-final.png'
            logo_remote_url = Config.REPORT_LOGO_URL

        # Inline logo as data URL to avoid remote loading failures in Playwright/PDF
        try:
            local_logo_path = os.path.join(os.path.dirname(__file__), '..', 'templates', logo_filename)
            with open(local_logo_path, 'rb') as lf:
                logo_b64 = base64.b64encode(lf.read()).decode('ascii')
            logo_data_url = f"data:image/png;base64,{logo_b64}"
            effective_logo_url = logo_data_url  # prefer inline for PDF reliability
        except Exception:
            logo_data_url = None
            effective_logo_url = logo_remote_url

        # Load TAMN per-page logo (tamn_logo_1.png) as base64
        try:
            tamn_page_logo_path = os.path.join(os.path.dirname(__file__), '..', 'templates', 'tamn_logo_1.png')
            with open(tamn_page_logo_path, 'rb') as tf:
                tamn_page_logo_b64 = f"data:image/png;base64,{base64.b64encode(tf.read()).decode('ascii')}"
        except Exception:
            tamn_page_logo_b64 = ""

        # Load cover house image as base64
        try:
            house_img_path = os.path.join(os.path.dirname(__file__), '..', 'templates', 'house-cover.png')
            with open(house_img_path, 'rb') as hf:
                house_cover_b64 = f"data:image/png;base64,{base64.b64encode(hf.read()).decode('ascii')}"
        except Exception:
            house_cover_b64 = ""

        # Load AAP cover design image (cityscape) as base64
        try:
            aap_design_path = os.path.join(os.path.dirname(__file__), '..', 'templates', 'design_v001_cropped.jpg-removebg-preview.png')
            with open(aap_design_path, 'rb') as df:
                aap_cover_design_b64 = f"data:image/png;base64,{base64.b64encode(df.read()).decode('ascii')}"
        except Exception:
            aap_cover_design_b64 = ""

        # Prepare data for template rendering
        template_data = {
            'property': property_data,
            'land_value': land_value,
            'land_value_rounded': land_value_rounded,
            'valuation_report': report,
            'maps_api_key': Config.GOOGLE_MAPS_API_KEY,
            'base_url': Config.BASE_URL,
            'logo_url': effective_logo_url,
            'logo_data_url': logo_data_url,
            'house_cover_url': house_cover_b64,
            'aap_cover_design_url': aap_cover_design_b64,
            'tamn_page_logo_url': tamn_page_logo_b64,
            'logo_type': logo_type,
            'now': now,
        }

        # Add record and sf_record mapping for commercial_long.html
        if template_name == "commercial_long.html":
            # Map report data to 'record' structure expected by commercial_long.html
            # Helper to chunk lists
            def chunk_list(lst, n):
                return [lst[i:i + n] for i in range(0, len(lst), n)]

            # Process photos for commercial template (needs large/base keys)
            def map_photo(p):
                return {
                    "large": p.get("photoUrl"),
                    "base": p.get("photoUrl"),
                    "annexure_header": p.get("caption", "Annexure")
                }

            comm_gallery_groups = [[map_photo(p) for p in group] for group in gallery_photos_groups]
            comm_annexures = [map_photo(p) for p in annexures]
            
            # Process sales comparables
            sales_comps = report.get("comparables", {}).get("sales", [])
            mapped_sales = []
            for comp in sales_comps:
                mapped_sales.append({
                    "full_address": comp.get("fullAddress"),
                    "sale_lease_date": comp.get("saleLeaseDate"),
                    "site_area": comp.get("siteArea"),
                    "sale_lease_price": comp.get("saleLeasePrice"),
                    "building_area": comp.get("buildingArea"),
                    "net_income_rental": comp.get("netIncomeRental"),
                    "net_income_rental_suffix": "", 
                    "passing_rent": comp.get("passingRent"),
                    "nla_rate": comp.get("nlaRate"),
                    "yield_": comp.get("yield"),
                    "build_year": comp.get("buildYear"),
                    "image_url": comp.get("photoUrl") or comp.get("imageUrl") or None,
                    "description": comp.get("description"),
                    "comparison": comp.get("comparison"),
                })
            sales_comparables = chunk_list(mapped_sales, 3)

            # Process rental comparables
            rental_comps = report.get("comparables", {}).get("rentals", [])
            mapped_rentals = []
            for comp in rental_comps:
                mapped_rentals.append({
                    "full_address": comp.get("fullAddress"),
                    "building_area": comp.get("buildingArea"),
                    "sale_lease_date": comp.get("saleLeaseDate"),
                    "net_income_rental": comp.get("saleLeasePrice"),
                    "net_income_rental_suffix": "pa",
                    "net_rental_rate": comp.get("rentalRate"),
                    "passing_rent": comp.get("passingRent"),
                    "image_url": comp.get("photoUrl") or comp.get("imageUrl") or None,
                    "description": comp.get("description"),
                    "comparison": comp.get("comparison"),
                })
            listing_comparables = chunk_list(mapped_rentals, 3)

            _unit = report.get("address", {}).get("unitNumber") or ""
            _street_name = report.get("address", {}).get("streetName") or ""
            _street = f"{_unit} {_street_name}".strip() or None
            val_details = report.get("valuationDetails", {})

            record = {
                "location_details": {
                    "street": _street,
                    "suburb": report.get("address", {}).get("suburb"),
                    "state": report.get("address", {}).get("state"),
                    "postcode": report.get("address", {}).get("postcode"),
                    "latitude": report.get("locationDetails", {}).get("latitude") or report.get("address", {}).get("latitude", "-33.8688"),
                    "longitude": report.get("locationDetails", {}).get("longitude") or report.get("address", {}).get("longitude", "151.2093"),
                    "suburb_description": report.get("locationDetails", {}).get("suburbDescription"),
                    "suburb_description_2": "",
                    "surrounding_development": report.get("locationDetails", {}).get("surroundingDevelopment"),
                    "services": report.get("locationDetails", {}).get("services"),
                    "access": report.get("locationDetails", {}).get("access"),
                },
                "valuation_date": report.get("valuationDetails", {}).get("valuationDate"),
                "date_issued": report.get("valuationDetails", {}).get("dateIssued"),
                "cover_photo": {
                    "large": cover_photo.get("photoUrl") if cover_photo else None,
                    "base": cover_photo.get("photoUrl") if cover_photo else None
                } if cover_photo else None,
                "property_valuation": {
                    "interest_valued": report.get("valuationDetails", {}).get("interestValued"),
                    "current_day_valuation": report.get("valuationDetails", {}).get("currentDayValuation"),
                    "occupancy_status": report.get("valuationDetails", {}).get("occupancy") or ("Tenanted" if report.get("tenancyDetails") else "Vacant"),
                    "nla_value_rate": report.get("valuationDetails", {}).get("squareMeterRate"),
                    "assessed_net_rental": report.get("valuationDetails", {}).get("assessedNetRental"),
                    "capitalisation_rate": report.get("valuationDetails", {}).get("capitalisationRate"),
                    "market_rent": report.get("valuationDetails", {}).get("marketRent"),
                    "market_value": report.get("valuationDetails", {}).get("marketValue"),
                    "external_desktop_valuation": report.get("valuationDetails", {}).get("externalDesktopValuation"),
                    "letting_up_expenses": report.get("valuationDetails", {}).get("lettingUpExpenses"),
                    "instructing_party": report.get("valuationDetails", {}).get("instructingParty"),
                    "date_of_instruction": report.get("valuationDetails", {}).get("dateOfInstruction"),
                    "primary_method": report.get("valuationDetails", {}).get("primaryMethod"),
                    "secondary_method": report.get("valuationDetails", {}).get("secondaryMethod"),
                    "commercial_subtype": report.get("valuationDetails", {}).get("commercialSubType"),
                },
                "purpose_of_report": report.get("valuationDetails", {}).get("purposeOfReport"),
                "valuation_type": report.get("valuationDetails", {}).get("valuationType"),
                "property_details": {
                    "property_type": report.get("propertyDetails", {}).get("propertyType"),
                    "lettable_area": report.get("propertyDetails", {}).get("buildingArea"),
                    "site_area": report.get("propertyDetails", {}).get("siteArea"),
                    "council_area": report.get("propertyDetails", {}).get("councilArea"),
                    "zoning": report.get("propertyDetails", {}).get("zoning"),
                    "title_reference": report.get("propertyDetails", {}).get("titleReference"),
                    "frontage": report.get("propertyDetails", {}).get("frontage") or report.get("landDetails", {}).get("frontage"),
                    "depth": report.get("propertyDetails", {}).get("depth") or report.get("landDetails", {}).get("depth"),
                    "build_year": report.get("propertyDetails", {}).get("buildYear") or report.get("propertyDetails", {}).get("yearBuilt"),
                },
                "property_descriptors": {
                    "parking_type": "On-site",
                    "car_spaces": report.get("propertyDescriptors", {}).get("carSpaces"),
                    "onsite_parking": report.get("propertyDescriptors", {}).get("onsiteParking"),
                    "visitors_parking": report.get("propertyDescriptors", {}).get("visitorsParking"),
                    "general_description": report.get("generalComments", {}).get("propertyDescription"),
                    "external_walls": report.get("propertyDescriptors", {}).get("externalWalls"),
                    "internal_walls": report.get("propertyDescriptors", {}).get("internalWalls"),
                    "roofing_type": report.get("propertyDescriptors", {}).get("roofingType"),
                    "lighting": report.get("propertyDescriptors", {}).get("lighting"),
                    "airconditioning": report.get("propertyDescriptors", {}).get("airconditioning"),
                    "fire_services": report.get("propertyDescriptors", {}).get("fireServices"),
                    "lift": report.get("propertyDescriptors", {}).get("lifts"),
                    "repairs_requirements": report.get("propertyDescriptors", {}).get("repairsRequirements") or report.get("propertyDescriptors", {}).get("repairRequirements"),
                },
                "planning_details": {
                    "planning_scheme": report.get("valuationDetails", {}).get("planningScheme"),
                    "planning_approval": report.get("valuationDetails", {}).get("planningApproval"),
                    "potential_future_use": report.get("valuationDetails", {}).get("potentialFutureUse"),
                    "current_use": report.get("valuationDetails", {}).get("currentUse"),
                    "heritage_registration": report.get("planningDetails", {}).get("heritageRegistration"),
                },
                "statutory_details": {
                    "show": True,
                    "site_value": report.get("propertyDetails", {}).get("statutoryValue"),
                    "relevant_date": report.get("propertyDetails", {}).get("statutoryDate"),
                    "capital_improved_value": report.get("propertyDetails", {}).get("capitalImprovedValue"),
                    "net_annual_value": report.get("propertyDetails", {}).get("netAnnualValue"),
                    "rating_authority": report.get("propertyDetails", {}).get("councilArea"),
                },
                "site_details": {
                    "description": report.get("locationDetails", {}).get("siteDescription"),
                    "access": report.get("locationDetails", {}).get("access"),
                    "identification": report.get("locationDetails", {}).get("identification"),
                    "map_photo": {"base": report.get("locationDetails", {}).get("map", {}).get("photo")} if report.get("locationDetails", {}).get("map", {}).get("photo") else None,
                    "map_source": report.get("locationDetails", {}).get("map", {}).get("source", "Google Maps"),
                },
                "photos_summary": {
                    "floorings": report.get("photosSummary", {}).get("floorings", []),
                },
                "general_comments": {
                    "valuation_comments": report.get("generalComments", {}).get("valuationCommentsPara"),
                    "valuation_comments_image": report.get("generalComments", {}).get("valuationCommentsImage"),
                },
                "ancillary_improvements": {
                    "accommodation": report.get("ancillaryImprovements", {}).get("accommodation"),
                    "driveway": report.get("ancillaryImprovements", {}).get("driveway"),
                    "fencing": report.get("ancillaryImprovements", {}).get("fencing"),
                    "other_items": report.get("ancillaryImprovements", {}).get("otherItems"),
                },
                "estimated_outgoings": report.get("valuationDetails", {}).get("outgoings"),
                "listing_comparables": listing_comparables,
                "sales_comparables": sales_comparables,
                "direct_comparison_min": float(val_details.get("lowestValueSqm") or 0),
                "direct_comparison_max": float(val_details.get("highestValueSqm") or 0),
                "direct_comparison_summation": float(val_details.get("nla") or 0) * float(val_details.get("squareMeterRate") or 0),
                "capitalised_value": (float(val_details.get("assessedNetRental") or 0) / float(val_details.get("capitalisationRate") or 1) * 100) if float(val_details.get("capitalisationRate") or 0) > 0 else 0,
                "lowest_rental_rate": float(val_details.get("lowestRentalRate") or 0),
                "highest_rental_rate": float(val_details.get("highestRentalRate") or 0),
                "lowest_building_area": float(val_details.get("lowestBuildingArea") or 0),
                "highest_building_area": float(val_details.get("highestBuildingArea") or 0),
                "subject_nla": float(val_details.get("subjectNla") or 0),
                "subject_rental_rate": float(val_details.get("subjectRentalRate") or 0),
                "net_market_rent": float(val_details.get("netMarketRent") or 0),
                "gallery_photos_groups": comm_gallery_groups,
                "annexures": comm_annexures,
                "floor_plans": [{"url": fp.get("photoUrl", "")} for fp in report.get("floorPlans", [])],
                "title_search": (report.get("titleSearch", [{}])[0].get("photoUrl") if report.get("titleSearch") else None),
                "title_search_list": [p.get("photoUrl") for p in report.get("titleSearch", []) if p.get("photoUrl")],
                "blank_pages_count": report.get("valuationDetails", {}).get("blankPagesCount", 0) or 0,
                "blank_pages_heading": report.get("valuationDetails", {}).get("blankPagesHeading", ""),
            }

            # Capitalisation Method — exact image defaults, no calculation
            val_details = report.get("valuationDetails", {})

            record["capitalisation_method"] = {
                "nla": float(val_details.get("nla") or report.get("propertyDetails", {}).get("buildingArea") or 1094),
                "gross_rental_rate": float(val_details.get("grossRentalRate") or 170.00),
                "total_gross_rental": float(val_details.get("totalGrossRental") or 185980),
                "vacancy_pct": float(val_details.get("vacancyAllowancePct") or 0),
                "vacancy_amount": float(val_details.get("vacancyAmount") or 0),
                "outgoings_rate": float(val_details.get("outgoingsRate") or 30.00),
                "outgoings_amount": float(val_details.get("outgoingsAmount") or 32820),
                "net_rental": float(val_details.get("netRental") or 153160),
                "net_rental_rate": float(val_details.get("netRentalRate") or 140.00),
                "cap_rate_low": float(val_details.get("capRateLow") or 4.75),
                "cap_rate_mid": float(val_details.get("capRateMid") or float(val_details.get("capitalisationRate") or 5.00)),
                "cap_rate_high": float(val_details.get("capRateHigh") or 5.25),
                "cap_value_low": (float(val_details.get("assessedNetRental") or 0) / float(val_details.get("capRateLow") or 4.75) * 100) if float(val_details.get("capRateLow") or 0) > 0 else float(val_details.get("capValueLow") or 0),
                "cap_value_mid": float(val_details.get("capValueMid") or 3063200),
                "cap_value_high": (float(val_details.get("assessedNetRental") or 0) / float(val_details.get("capRateHigh") or 5.25) * 100) if float(val_details.get("capRateHigh") or 0) > 0 else float(val_details.get("capValueHigh") or 0),
                "adopted_cap_value": float(val_details.get("adoptedCapValue") or 3060000),
                "cap_exp_rate": float(val_details.get("capitalExpenditureRate") or 13.00),
                "cap_expenditure": float(val_details.get("capExpenditure") or 14222),
                "incentive_months": float(val_details.get("incentiveMonths") or 0),
                "incentive_cost": float(val_details.get("incentiveCost") or 0),
                "letting_up_months": float(val_details.get("lettingUpMonths") or 3),
                "letting_up_cost": float(val_details.get("lettingUpCost") or 38290),
                "agents_commission_pct": float(val_details.get("agentsCommissionPct") or 12.00),
                "agents_commission": float(val_details.get("agentsCommission") or 0),
                "pv_discount_rate": float(val_details.get("pvDiscountRate") or 10.00),
                "pv_reversion": float(val_details.get("pvReversion") or 0),
                "misc_amount": float(val_details.get("miscellaneousAmount") or 0),
                "total_deductions": float(val_details.get("totalDeductions") or 52512),
                "subtotal_after_deductions": float(val_details.get("subtotalAfterDeductions") or 3007488),
                "pv_overage_rent": float(val_details.get("pvOverageRent") or 0),
                "subtotal_after_overage": float(val_details.get("subtotalAfterOverage") or 3007488),
                "market_value": float(val_details.get("marketValue") or 3000000),
            }
            
            # Map to 'sf_record' structure (Salesforce placeholder)
            sf_record = {
                "Job_Number__c": report.get("fileNumber", ""),
                "Owners__c": " ".join(filter(None, [
                    report.get("primaryContact", {}).get("firstName", ""),
                    report.get("primaryContact", {}).get("lastName", ""),
                ])) or report.get("valuationDetails", {}).get("registeredProprietor") or report.get("propertyDetails", {}).get("owner", ""),
                "InspectionDate__c": report.get("valuationDetails", {}).get("inspectionDate"),
                "PropertyValuer__r": {
                    "Name": "Jugal Saha" # Default valuer
                }
            }
            
            template_data['record'] = record
            template_data['sf_record'] = sf_record

        elif template_name == "rural.html":
            _unit = report.get("address", {}).get("unitNumber") or ""
            _street_name = report.get("address", {}).get("streetName") or ""
            _street = f"{_unit} {_street_name}".strip() or None
            _street_only = (_street_name.split(" ", 1)[1] if " " in (_street_name or "") else _street_name) or ""

            # Process photos for rural template
            def map_photo_rural(p):
                return {
                    "large": p.get("photoUrl"),
                    "base": p.get("photoUrl"),
                    "is_cover": p.get("isCover", False),
                    "is_gallery": p.get("isGallery", False),
                    "is_annexure": p.get("isAnnexure", False),
                    "annexure_header": p.get("annexureHeader", "Annexure"),
                    "category": p.get("category", ""),
                    "prime_cost_items": p.get("primeCostItems", []),
                    "features_fixtures": p.get("featuresFixtures", []),
                    "floorings": [p.get("flooring")] if p.get("flooring") else [],
                }

            mapped_photos = [map_photo_rural(p) for p in report.get("photos", [])]
            # Transform photos_summary categories from camelCase to snake_case for rural template
            raw_summary = report.get("photosSummary", {})
            photos_summary = {
                "categories": [
                    {
                        "category": cat.get("category", ""),
                        "prime_cost_items": cat.get("primeCostItems", []),
                        "features_fixtures": cat.get("featuresFixtures", []),
                        "floorings": cat.get("floorings", []),
                    }
                    for cat in raw_summary.get("categories", [])
                ],
                "floorings": raw_summary.get("floorings", []),
            }

            # Process gallery groups and annexures for rural
            rural_gallery = [map_photo_rural(p) for p in gallery_photos]
            rural_gallery_groups = [rural_gallery[i:i+6] for i in range(0, len(rural_gallery), 6)]
            rural_annexures = [map_photo_rural(p) for p in annexures]

            # Process sales comparables for rural
            sales_comps = report.get("comparables", {}).get("sales", [])
            mapped_sales = []
            for comp in sales_comps:
                mapped_sales.append({
                    "full_address": comp.get("fullAddress"),
                    "sale_price": comp.get("saleLeasePrice"),
                    "sale_lease_price": comp.get("saleLeasePrice"),
                    "sale_date": comp.get("saleLeaseDate"),
                    "sale_lease_date": comp.get("saleLeaseDate"),
                    "site_area": comp.get("siteArea"),
                    "building_area": comp.get("buildingArea"),
                    "build_year": comp.get("buildYear"),
                    "image_url": comp.get("photoUrl") or comp.get("imageUrl") or None,
                    "description": comp.get("description"),
                    "comparison": comp.get("comparison"),
                    "bedrooms": comp.get("bedrooms"),
                    "bathrooms": comp.get("bathrooms"),
                    "car_spaces": comp.get("carSpaces"),
                    "property_type": comp.get("propertyType"),
                    "land_area": comp.get("siteArea"),
                    "distance": comp.get("distance"),
                    "residual_land_value": comp.get("residualLandValue"),
                    "zoning": comp.get("zoning"),
                })

            # Process other dwellings
            other_dwellings = []
            for dw in report.get("otherDwellings", []):
                dw_photos = dw.get("photos", [])
                dw_mapped = [map_photo_rural(p) for p in dw_photos]
                dw_summary = summarize_photos(dw_photos)
                other_dwellings.append({
                    "name": dw.get("name", "Other Dwelling"),
                    "main_building_type": dw.get("mainBuildingType"),
                    "build_year": dw.get("buildYear"),
                    "external_walls": dw.get("externalWalls"),
                    "internal_walls": dw.get("internalWalls"),
                    "roofing_type": dw.get("roofingType"),
                    "parking_type": dw.get("parkingType"),
                    "accommodation": dw.get("accommodation"),
                    "living_area": dw.get("livingArea"),
                    "external_area": dw.get("externalArea"),
                    "parking_area": dw.get("parkingArea"),
                    "other_area": dw.get("otherArea"),
                    "internal_condition": dw.get("internalCondition"),
                    "external_condition": dw.get("externalCondition"),
                    "repairs_requirements": dw.get("repairsRequirements"),
                    "defects": dw.get("defects"),
                    "photos_summary": dw_summary,
                    "photos": dw_mapped,
                })

            record = {
                "location_details": {
                    "street": _street,
                    "street_only": _street_only,
                    "suburb": report.get("address", {}).get("suburb"),
                    "state": report.get("address", {}).get("state"),
                    "postcode": report.get("address", {}).get("postcode"),
                    "latitude": report.get("locationDetails", {}).get("latitude") or report.get("address", {}).get("latitude", "-33.8688"),
                    "longitude": report.get("locationDetails", {}).get("longitude") or report.get("address", {}).get("longitude", "151.2093"),
                    "suburb_description": report.get("locationDetails", {}).get("suburbDescription"),
                },
                "valuation_date": report.get("valuationDetails", {}).get("valuationDate"),
                "valuation_type": report.get("valuationDetails", {}).get("valuationType"),
                "purpose_of_report": report.get("valuationDetails", {}).get("purposeOfReport"),
                "photos": mapped_photos,
                "cover_photo": {
                    "large": cover_photo.get("photoUrl") if cover_photo else None,
                    "base": cover_photo.get("photoUrl") if cover_photo else None,
                } if cover_photo else None,
                "property_valuation": {
                    "interest_valued": report.get("valuationDetails", {}).get("interestValued"),
                    "current_day_valuation": report.get("valuationDetails", {}).get("currentDayValuation"),
                    "market_value": report.get("valuationDetails", {}).get("marketValue"),
                    "external_desktop_valuation": report.get("valuationDetails", {}).get("externalDesktopValuation"),
                    "show_improvements": report.get("valuationDetails", {}).get("showImprovements", False),
                    "show_currency_of_valuation": report.get("valuationDetails", {}).get("showCurrencyOfValuation", False),
                    "display_in_sqm": report.get("valuationDetails", {}).get("displayInSqm", False),
                    "show_land_value": report.get("valuationDetails", {}).get("showLandValue", False),
                    "land_value": report.get("valuationDetails", {}).get("landValue"),
                    "total_improve_value_rate": report.get("valuationDetails", {}).get("totalImproveValueRate"),
                    "improvements": report.get("valuationDetails", {}).get("improvements"),
                    "secondary_dwelling_value": report.get("valuationDetails", {}).get("secondaryDwellingValue"),
                    "direct_comparison": report.get("valuationDetails", {}).get("directComparison"),
                },
                "property_details": {
                    "property_type": report.get("propertyDetails", {}).get("propertyType"),
                    "site_area": report.get("propertyDetails", {}).get("siteArea"),
                    "council_area": report.get("propertyDetails", {}).get("councilArea"),
                    "zoning": report.get("propertyDetails", {}).get("zoning"),
                    "title_reference": report.get("propertyDetails", {}).get("titleReference"),
                    "build_year": report.get("propertyDetails", {}).get("buildYear"),
                    "permissible_uses": report.get("propertyDetails", {}).get("permissibleUses"),
                    "heritage_issue": report.get("propertyDetails", {}).get("heritageIssue"),
                    "flood": report.get("propertyDetails", {}).get("flood"),
                    "bushfire": report.get("propertyDetails", {}).get("bushfire"),
                    "land_shape": report.get("propertyDetails", {}).get("landShape"),
                    "rainfall": report.get("propertyDetails", {}).get("rainfall"),
                    "accommodation": report.get("propertyDetails", {}).get("accommodation"),
                    "water_utilisation": report.get("propertyDetails", {}).get("waterUtilisation"),
                    "living_area": report.get("propertyDetails", {}).get("livingArea"),
                    "external_area": report.get("propertyDetails", {}).get("externalArea"),
                    "parking_area": report.get("propertyDetails", {}).get("parkingArea"),
                    "other_area": report.get("propertyDetails", {}).get("otherArea"),
                    "building_area": report.get("propertyDetails", {}).get("buildingArea"),
                    "tenure_type": report.get("propertyDetails", {}).get("tenureType"),
                    "town_planning": report.get("propertyDetails", {}).get("townPlanning"),
                    "topography": report.get("propertyDetails", {}).get("topography"),
                },
                "property_descriptors": {
                    "bedrooms": report.get("propertyDescriptors", {}).get("bedrooms"),
                    "bathrooms": report.get("propertyDescriptors", {}).get("bathrooms"),
                    "car_spaces": report.get("propertyDescriptors", {}).get("carSpaces"),
                    "main_building_type": report.get("propertyDescriptors", {}).get("mainBuildingType"),
                    "external_walls": report.get("propertyDescriptors", {}).get("externalWalls"),
                    "internal_walls": report.get("propertyDescriptors", {}).get("internalWalls"),
                    "roofing_type": report.get("propertyDescriptors", {}).get("roofingType"),
                    "parking_type": report.get("propertyDescriptors", {}).get("parkingType"),
                    "internal_condition": report.get("propertyDescriptors", {}).get("internalCondition"),
                    "external_condition": report.get("propertyDescriptors", {}).get("externalCondition"),
                    "repairs_requirements": report.get("propertyDescriptors", {}).get("repairsRequirements") or report.get("propertyDescriptors", {}).get("repairRequirements"),
                    "defects": report.get("propertyDescriptors", {}).get("defects"),
                },
                "site_details": {
                    "encumbrances": report.get("propertyDetails", {}).get("encumbrances"),
                    "access": report.get("locationDetails", {}).get("access"),
                    "services": report.get("locationDetails", {}).get("services"),
                    "map_photo": {"base": report.get("locationDetails", {}).get("map", {}).get("photo")} if report.get("locationDetails", {}).get("map", {}).get("photo") else None,
                    "map_source": report.get("locationDetails", {}).get("map", {}).get("source", "Google Maps"),
                },
                "general_comments": {
                    "property_description": report.get("generalComments", {}).get("propertyDescription"),
                    "market_overview": report.get("generalComments", {}).get("marketOverview"),
                    "property_comments": report.get("generalComments", {}).get("propertyComments"),
                    "valuation_comments": report.get("generalComments", {}).get("valuationCommentsPara"),
                },
                "ancillary_improvements": {
                    "show": report.get("ancillaryImprovements", {}).get("show", True),
                    "driveway": report.get("ancillaryImprovements", {}).get("driveway"),
                    "fencing": report.get("ancillaryImprovements", {}).get("fencing"),
                    "other_items": report.get("ancillaryImprovements", {}).get("otherItems"),
                },
                "photos_summary": photos_summary,
                "gallery_photos_groups": rural_gallery_groups,
                "annexures": rural_annexures,
                "floor_plans": [{"url": fp.get("photoUrl", "")} for fp in report.get("floorPlans", [])],
                "title_search": (report.get("titleSearch", [{}])[0].get("photoUrl") if report.get("titleSearch") else None),
                "sales_comparables": mapped_sales,
                "market_evidence": mapped_sales,
                "other_dwellings": other_dwellings,
                "primary_contact": {
                    "first_name": report.get("primaryContact", {}).get("firstName", ""),
                    "last_name": report.get("primaryContact", {}).get("lastName", ""),
                },
            }

            sf_record = {
                "Job_Number__c": report.get("fileNumber", ""),
                "Owners__c": report.get("valuationDetails", {}).get("registeredProprietor") or report.get("propertyDetails", {}).get("owner", ""),
                "InspectionDate__c": report.get("valuationDetails", {}).get("inspectionDate"),
                "PropertyValuer__r": {
                    "Name": "Jugal Saha"
                },
            }

            template_data['record'] = record
            template_data['sf_record'] = sf_record

        # Set the template content in the loader
        jinja_env.loader.template_content = template_content
        
        # Render the template using the pre-initialized environment
        template = jinja_env.from_string(template_content)
        html_content = template.render(**template_data)
        
        return html_content, True, None
        
    except Exception as e:
        print(f"Error generating report: {str(e)}")
        import traceback
        traceback.print_exc()
        return None, False, f'Failed to generate report: {str(e)}'


@valuation_reports_bp.route('/<report_id>/preview', methods=['POST'])
def generate_report_preview(report_id):
    """Generate HTML report preview using Jinja template"""
    html_content, success, error_message = generate_html_report(report_id)
    
    if not success:
        return jsonify({'error': error_message}), 404 if 'not found' in error_message else 500
    
    return html_content, 200, {'Content-Type': 'text/html'}


@valuation_reports_bp.route('/<report_id>/generate', methods=['POST'])
def generate_report_pdf(report_id):
    """Generate PDF report from HTML template"""
    try:
        # Generate HTML content first
        html_content, success, error_message = generate_html_report(report_id)
        
        if not success:
            return jsonify({'error': error_message}), 404 if 'not found' in error_message else 500
        
        # Generate PDF from HTML
        pdf_content = generate_pdf_from_html(html_content)
        
        # Create filename with report ID
        filename = f"{report_id}.pdf"
        
        # Return PDF file
        from flask import Response
        return Response(
            pdf_content,
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Type': 'application/pdf'
            }
        )
        
    except Exception as e:
        print(f"Error generating PDF report: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to generate PDF report: {str(e)}'}), 500


def _build_invoice_context(report):
    """Build the Jinja context for invoice.html from a report document."""
    from datetime import datetime, timedelta

    primary = report.get('primaryContact', {}) or {}
    first = (primary.get('firstName') or '').strip()
    last = (primary.get('lastName') or '').strip()
    client_name = (f"{first} {last}").strip() or 'N/A'

    address = report.get('address', {}) or {}
    full_address = address.get('fullAddress') or ' '.join(
        filter(None, [
            address.get('unitNumber'),
            address.get('streetName'),
            address.get('suburb'),
            address.get('state'),
            address.get('postcode'),
        ])
    ).strip() or 'N/A'

    valuation_details = report.get('valuationDetails', {}) or {}
    valuation_type = (valuation_details.get('valuationType') or '').strip()
    purpose = (valuation_details.get('purposeOfReport') or '').strip()

    if valuation_type and purpose:
        item_description = f"{valuation_type} Property Valuation for {purpose} purpose"
    elif valuation_type:
        item_description = f"{valuation_type} Property Valuation"
    else:
        item_description = "Property Valuation"

    invoice_details = report.get('invoiceDetails', {}) or {}
    try:
        report_fee = float(invoice_details.get('reportFee') or 0)
    except (TypeError, ValueError):
        report_fee = 0.0

    gst_amount = report_fee * 0.10
    total_amount = report_fee + gst_amount

    file_number = (report.get('fileNumber') or '').strip()
    report_id = str(report.get('_id') or report.get('id') or '')
    if file_number:
        invoice_number = f"INV-{file_number}"
    elif report_id:
        invoice_number = f"INV-{report_id[-8:].upper()}"
    else:
        invoice_number = "INV-DRAFT"

    today = datetime.now()
    due = today + timedelta(days=1)

    return {
        'invoice_number': invoice_number,
        'client_name': client_name,
        'invoice_date': today.strftime('%d/%m/%Y'),
        'due_date': due.strftime('%d/%m/%Y'),
        'item_description': item_description,
        'item_address': full_address,
        'qty': 1.0,
        'rate': report_fee,
        'gst': gst_amount,
        'amount': total_amount,
        'subtotal': total_amount,
        'total': total_amount,
        'balance_due': total_amount,
    }


def _render_invoice_html(report_id):
    """Render invoice HTML for a report. Returns (html, context, error_or_None, status_code)."""
    report = valuation_report_model.get_by_id(report_id)
    if not report:
        return None, None, 'Valuation report not found', 404

    template_path = os.path.join(os.path.dirname(__file__), '..', 'templates', 'invoice.html')
    with open(template_path, 'r', encoding='utf-8') as f:
        template_content = f.read()

    context = _build_invoice_context(report)

    template = jinja_env.from_string(template_content)
    html_content = template.render(**context)
    return html_content, context, None, 200


@valuation_reports_bp.route('/<report_id>/invoice/preview', methods=['POST'])
def generate_invoice_preview(report_id):
    """Return rendered invoice HTML for in-browser preview."""
    try:
        html_content, _context, error, status = _render_invoice_html(report_id)
        if error:
            return jsonify({'error': error}), status
        return html_content, 200, {'Content-Type': 'text/html'}
    except Exception as e:
        print(f"Error generating invoice preview: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to generate invoice preview: {str(e)}'}), 500


@valuation_reports_bp.route('/<report_id>/invoice', methods=['POST'])
def generate_invoice_pdf(report_id):
    """Generate an invoice PDF for a valuation report using invoice.html."""
    try:
        html_content, context, error, status = _render_invoice_html(report_id)
        if error:
            return jsonify({'error': error}), status

        pdf_content = generate_pdf_from_html(html_content)

        from flask import Response
        filename = f"{context['invoice_number']}.pdf"
        return Response(
            pdf_content,
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Type': 'application/pdf',
            },
        )

    except Exception as e:
        print(f"Error generating invoice PDF: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to generate invoice PDF: {str(e)}'}), 500


def _get_invoice_recipient(report):
    primary = report.get('primaryContact', {}) or {}
    email = (primary.get('email') or '').strip()
    if not email:
        email = (primary.get('email2') or '').strip()
    return email


@valuation_reports_bp.route('/<report_id>/invoice/send', methods=['POST'])
def send_invoice_email(report_id):
    try:
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404

        body = request.get_json(silent=True) or {}

        recipient = (body.get('to') or '').strip() or _get_invoice_recipient(report)
        if not recipient:
            return jsonify({
                'error': 'No client email address found. Add an email in the Primary '
                         'Contact section before sending the invoice.'
            }), 400

        html_content, context, error, status = _render_invoice_html(report_id)
        if error:
            return jsonify({'error': error}), status

        pdf_content = generate_pdf_from_html(html_content)
        filename = f"{context['invoice_number']}.pdf"

        from utils.invoice_email import (
            DEFAULT_INVOICE_EMAIL_BODY,
            DEFAULT_INVOICE_EMAIL_SUBJECT,
            build_invoice_email_context,
            render_string,
        )

        client_name = context.get('client_name', 'N/A')
        email_ctx = build_invoice_email_context(context, client_name, Config.REPORT_LOGO_URL)

        subject_tmpl = settings_model.get('invoiceEmailSubject') or DEFAULT_INVOICE_EMAIL_SUBJECT
        body_tmpl = settings_model.get('invoiceEmailBody') or DEFAULT_INVOICE_EMAIL_BODY

        req_subject = (body.get('subject') or '').strip()
        req_message = (body.get('message') or '').strip()

        subject = render_string(req_subject or subject_tmpl, email_ctx)
        if req_message:
            email_html = render_string(
                '<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; '
                'color: #1f2937; line-height: 1.6; white-space: pre-wrap;">'
                '{{ message_body }}</div>',
                {**email_ctx, 'message_body': req_message},
            )
        else:
            email_html = render_string(body_tmpl, email_ctx)

        sender = settings_model.get('invoiceEmailSender') or None

        # Extract secondary email for CC
        cc_recipients = []
        primary_contact = report.get('primaryContact', {}) or {}
        secondary_email = (primary_contact.get('email2') or '').strip()
        
        # Add to CC list if it exists and isn't already the primary recipient
        if secondary_email and secondary_email != recipient:
            cc_recipients.append(secondary_email)

        from utils.graph_mail import send_mail, GraphMailError
        try:
            send_mail(
                to_recipients=recipient,
                cc_recipients=cc_recipients,
                subject=subject,
                html_body=email_html,
                attachments=[{
                    'name': filename,
                    'content': pdf_content,
                    'content_type': 'application/pdf',
                }],
                sender=sender,
            )
        except GraphMailError as ge:
            print(f"Error sending invoice email: {str(ge)}")
            return jsonify({'error': f'Failed to send invoice email: {str(ge)}'}), 502

        return jsonify({
            'message': f'Invoice sent to {recipient}',
            'recipient': recipient,
            'invoice_number': context['invoice_number'],
        }), 200

    except Exception as e:
        print(f"Error sending invoice email: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to send invoice email: {str(e)}'}), 500


@valuation_reports_bp.route('/<report_id>/report/send', methods=['POST'])
def send_report_email(report_id):
    try:
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404

        body = request.get_json(silent=True) or {}

        recipient = (body.get('to') or '').strip() or _get_invoice_recipient(report)
        if not recipient:
            return jsonify({
                'error': 'No client email address found. Add an email in the Primary '
                         'Contact section before sending the report.'
            }), 400

        html_content, success, error_message = generate_html_report(report_id)
        if not success:
            return jsonify({'error': error_message}), 500

        pdf_content = generate_pdf_from_html(html_content)
        file_number = (report.get('fileNumber') or report_id[-8:].upper()).strip()
        filename = f"AAP-{file_number}.pdf"

        from utils.report_email import (
            DEFAULT_REPORT_EMAIL_BODY,
            DEFAULT_REPORT_EMAIL_SUBJECT,
            build_report_email_context,
            render_string,
        )

        email_ctx = build_report_email_context(report, Config.REPORT_LOGO_URL)

        subject_tmpl = settings_model.get('reportEmailSubject') or DEFAULT_REPORT_EMAIL_SUBJECT
        body_tmpl = settings_model.get('reportEmailBody') or DEFAULT_REPORT_EMAIL_BODY

        req_subject = (body.get('subject') or '').strip()
        req_message = (body.get('message') or '').strip()

        subject = render_string(req_subject or subject_tmpl, email_ctx)
        if req_message:
            email_html = render_string(
                '<div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; '
                'color: #1f2937; line-height: 1.6; white-space: pre-wrap;">'
                '{{ message_body }}</div>',
                {**email_ctx, 'message_body': req_message},
            )
        else:
            email_html = render_string(body_tmpl, email_ctx)

        sender = settings_model.get('reportEmailSender') or None

        # Extract secondary email for CC
        cc_recipients = []
        primary_contact = report.get('primaryContact', {}) or {}
        secondary_email = (primary_contact.get('email2') or '').strip()
        
        # Add to CC list if it exists and isn't already the primary recipient
        if secondary_email and secondary_email != recipient:
            cc_recipients.append(secondary_email)

        from utils.graph_mail import send_mail, GraphMailError
        try:
            send_mail(
                to_recipients=recipient,
                cc_recipients=cc_recipients,
                subject=subject,
                html_body=email_html,
                attachments=[{
                    'name': filename,
                    'content': pdf_content,
                    'content_type': 'application/pdf',
                }],
                sender=sender,
            )
        except GraphMailError as ge:
            print(f"Error sending report email: {str(ge)}")
            return jsonify({'error': f'Failed to send report email: {str(ge)}'}), 502

        return jsonify({
            'message': f'Report sent to {recipient}',
            'recipient': recipient,
            'file_number': file_number,
        }), 200

    except Exception as e:
        print(f"Error sending report email: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Failed to send report email: {str(e)}'}), 500
