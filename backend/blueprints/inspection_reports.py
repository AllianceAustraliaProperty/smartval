"""
Inspection Reports blueprint for handling mobile app inspection submissions
"""
from flask import Blueprint, jsonify, request, current_app
from database import get_database
from models.valuation_report import ValuationReport
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

inspection_bp = Blueprint('inspection', __name__)

# Initialize MongoDB connection
db = get_database()
valuation_report_model = ValuationReport(db)


def parse_address(full_address):
    """Parse full address into components"""
    # Simple parsing - can be improved with regex
    parts = full_address.split()
    
    # Try to extract components (this is a basic implementation)
    return {
        'fullAddress': full_address,
        'houseNumber': '',
        'streetName': '',
        'suburb': '',
        'state': '',
        'postcode': ''
    }


@inspection_bp.route('/reports', methods=['POST'])
def create_inspection_report():
    """
    Create a new valuation report from mobile app inspection data
    
    Expected JSON payload:
    {
        "inspectionId": "APP_20251130_001",
        "source": "mobile_inspection_app",
        "propertyAddress": {...},
        "primaryContact": {...},
        "valuationDetails": {...},
        "propertyDetails": {...},
        "photos": [...]
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Validate required fields
        inspection_id = data.get('inspectionId')
        if not inspection_id:
            return jsonify({
                'success': False,
                'error': 'Missing required field: inspectionId'
            }), 400
        
        # Check for duplicate using inspectionId
        existing_report = db.valuationReports.find_one({'inspectionId': inspection_id})
        
        if existing_report:
            logger.info(f"Duplicate inspection report detected: {inspection_id}")
            return jsonify({
                'success': True,
                'message': 'Inspection report already exists',
                'reportId': str(existing_report['_id']),
                'inspectionId': inspection_id,
                'duplicate': True
            }), 200
        
        # Build valuation report data structure
        property_address = data.get('propertyAddress', {})
        primary_contact = data.get('primaryContact', {})
        valuation_details = data.get('valuationDetails', {})
        property_details = data.get('propertyDetails', {})
        photos = data.get('photos', [])
        
        # Map to valuation report schema
        valuation_report_data = {
            'inspectionId': inspection_id,
            'source': data.get('source', 'mobile_inspection_app'),
            
            # Address section
            'address': {
                'fullAddress': property_address.get('fullAddress', ''),
                'houseNumber': property_address.get('houseNumber', ''),
                'streetName': property_address.get('streetName', ''),
                'suburb': property_address.get('suburb', ''),
                'state': property_address.get('state', ''),
                'postcode': property_address.get('postcode', '')
            },
            
            # Primary contact
            'primaryContact': {
                'firstName': primary_contact.get('firstName', ''),
                'lastName': primary_contact.get('lastName', ''),
                'name': f"{primary_contact.get('firstName', '')} {primary_contact.get('lastName', '')}".strip()
            },
            
            # Valuation details
            'valuationDetails': {
                'valuationType': valuation_details.get('valuationType', ''),
                'propertyType': valuation_details.get('propertyType', ''),
                'valuationDate': valuation_details.get('valuationDate', ''),
                'inspectionDate': valuation_details.get('inspectionDate', ''),
                'deadlineDate': valuation_details.get('deadlineDate', '')
            },
            
            # Property details
            'propertyDetails': {
                'buildYear': property_details.get('yearOfBuild'),  # Mapped from yearOfBuild
                'siteArea': property_details.get('siteMeasurement'),  # Mapped from siteMeasurement
                'livingArea': property_details.get('livingArea'),
                'propertyType': valuation_details.get('propertyType', '')
            },
            
            # Property descriptors
            'propertyDescriptors': {
                'bedrooms': property_details.get('bedrooms'),  # Moved from propertyDetails
                'bathrooms': property_details.get('bathrooms'),  # Moved from propertyDetails
                'carSpaces': property_details.get('carspaces'),  # Moved from propertyDetails and renamed (capital S)
                'externalWalls': property_details.get('externalWalls', ''),
                'internalWalls': property_details.get('internalWalls', ''),
                'parkingType': property_details.get('parkingType', '')
            },
            
            # Photos with all metadata
            'photos': photos,
            
            # Metadata
            'createdAt': datetime.utcnow(),
            'updatedAt': datetime.utcnow()
        }
        
        # Remove null/empty values to avoid schema validation issues
        def clean_data(obj):
            if isinstance(obj, dict):
                return {k: clean_data(v) for k, v in obj.items() if v is not None and v != ''}
            elif isinstance(obj, list):
                return [clean_data(item) for item in obj if item is not None]
            return obj
        
        cleaned_data = clean_data(valuation_report_data)
        
        # Create the valuation report
        report_id = valuation_report_model.create(cleaned_data)
        
        logger.info(f"Created inspection report {inspection_id} with ID {report_id}")
        
        return jsonify({
            'success': True,
            'message': 'Inspection report created successfully',
            'reportId': report_id,
            'inspectionId': inspection_id
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating inspection report: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to create inspection report'
        }), 500


@inspection_bp.route('/reports', methods=['GET'])
def get_inspection_reports():
    """
    Get all inspection reports from mobile app
    
    Query parameters:
    - page: Page number (default: 1)
    - per_page: Items per page (default: 20)
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Find all reports with inspectionId (from mobile app)
        skip = (page - 1) * per_page
        
        reports = list(db.valuationReports.find(
            {'inspectionId': {'$exists': True}},
            {'_id': 1, 'inspectionId': 1, 'address': 1, 'primaryContact': 1, 
             'valuationDetails': 1, 'createdAt': 1, 'updatedAt': 1}
        ).skip(skip).limit(per_page).sort('createdAt', -1))
        
        # Convert ObjectId to string
        for report in reports:
            report['_id'] = str(report['_id'])
            report['id'] = report['_id']
        
        total = db.valuationReports.count_documents({'inspectionId': {'$exists': True}})
        
        return jsonify({
            'success': True,
            'data': reports,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'pages': (total + per_page - 1) // per_page
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching inspection reports: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@inspection_bp.route('/reports/<inspection_id>', methods=['GET'])
def get_inspection_report(inspection_id):
    """Get a specific inspection report by inspectionId"""
    try:
        report = db.valuationReports.find_one({'inspectionId': inspection_id})
        
        if not report:
            return jsonify({
                'success': False,
                'error': 'Report not found'
            }), 404
        
        report['_id'] = str(report['_id'])
        report['id'] = report['_id']
        
        return jsonify({
            'success': True,
            'data': report
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching inspection report {inspection_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@inspection_bp.route('/reports/<report_id>', methods=['DELETE'])
def delete_inspection_report(report_id):
    """Delete an inspection report by ID"""
    try:
        from bson.objectid import ObjectId
        
        result = db.valuationReports.delete_one({'_id': ObjectId(report_id)})
        
        if result.deleted_count == 0:
            return jsonify({
                'success': False,
                'error': 'Report not found'
            }), 404
            
        return jsonify({
            'success': True,
            'message': 'Report deleted successfully'
        }), 200
        
    except Exception as e:
        logger.error(f"Error deleting inspection report {report_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@inspection_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'success': True,
        'status': 'healthy',
        'message': 'Inspection reports service is operational'
    }), 200


@inspection_bp.route('/presigned-url/<inspection_id>', methods=['POST'])
def get_inspection_presigned_url(inspection_id):
    """
    Generate presigned URL for inspection photo uploads
    
    This endpoint doesn't require a pre-existing report.
    It creates the S3 path using the inspection_id.
    
    Request body:
    {
        "fileExtension": "jpg",
        "contentType": "image/jpeg"
    }
    """
    try:
        from utils.s3_service import s3_service
        
        data = request.get_json()
        file_extension = data.get('fileExtension')
        content_type = data.get('contentType')
        
        if not file_extension:
            return jsonify({'error': 'File extension is required'}), 400
        
        # Generate presigned URL using inspection_id as the folder
        presigned_data = s3_service.generate_presigned_url(
            file_extension=file_extension,
            report_id=inspection_id,  # Use inspection_id for S3 path
            content_type=content_type
        )
        
        return jsonify({
            'presignedUrl': presigned_data['presigned_url'],
            'fileKey': presigned_data['file_key'],
            's3Url': presigned_data['s3_url'],
            'bucket': presigned_data['bucket'],
            'region': presigned_data['region']
        }), 200
        
    except Exception as e:
        logger.error(f"Error generating presigned URL for inspection {inspection_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

