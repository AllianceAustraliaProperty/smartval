"""
Alliance blueprint for handling Alliance website integration
"""
from flask import Blueprint, jsonify, request
from utils.alliance_service import AllianceService
from database import get_database
from models.valuation_report import ValuationReport
import logging

logger = logging.getLogger(__name__)

alliance_bp = Blueprint('alliance', __name__)

# Initialize Alliance service
alliance_service = AllianceService()

# Initialize MongoDB connection
db = get_database()
valuation_report_model = ValuationReport(db)


@alliance_bp.route('/jobs', methods=['GET'])
def get_alliance_jobs():
    """Get jobs from Alliance website"""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Fetch jobs from Alliance
        jobs_data = alliance_service.fetch_jobs(page=page, per_page=per_page)
        
        return jsonify({
            'success': True,
            'data': jobs_data,
            'message': 'Successfully fetched jobs from Alliance'
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching Alliance jobs: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to fetch jobs from Alliance'
        }), 500


@alliance_bp.route('/jobs/<int:job_id>', methods=['GET'])
def get_alliance_job(job_id):
    """Get a specific job from Alliance by ID"""
    try:
        job = alliance_service.get_job_by_id(job_id)
        
        if job is None:
            return jsonify({
                'success': False,
                'error': 'Job not found',
                'message': f'Job with ID {job_id} not found in Alliance'
            }), 404
        
        return jsonify({
            'success': True,
            'data': job,
            'message': f'Successfully fetched job {job_id} from Alliance'
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching Alliance job {job_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'Failed to fetch job {job_id} from Alliance'
        }), 500


@alliance_bp.route('/jobs/transform/<int:job_id>', methods=['GET'])
def transform_alliance_job(job_id):
    """Transform an Alliance job to our valuation report format"""
    try:
        job = alliance_service.get_job_by_id(job_id)
        
        if job is None:
            return jsonify({
                'success': False,
                'error': 'Job not found',
                'message': f'Job with ID {job_id} not found in Alliance'
            }), 404
        
        # Transform the job data
        transformed_data = alliance_service.transform_job_to_valuation_report(job)
        
        return jsonify({
            'success': True,
            'data': transformed_data,
            'message': f'Successfully transformed job {job_id} to valuation report format'
        }), 200
        
    except Exception as e:
        logger.error(f"Error transforming Alliance job {job_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'Failed to transform job {job_id} from Alliance'
        }), 500


@alliance_bp.route('/jobs/all', methods=['GET'])
def get_all_alliance_jobs():
    """Get all jobs from Alliance (with pagination)"""
    try:
        max_pages = request.args.get('max_pages', 10, type=int)
        
        jobs = alliance_service.get_all_jobs(max_pages=max_pages)
        
        return jsonify({
            'success': True,
            'data': jobs,
            'count': len(jobs),
            'message': f'Successfully fetched {len(jobs)} jobs from Alliance'
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching all Alliance jobs: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': 'Failed to fetch all jobs from Alliance'
        }), 500


@alliance_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for Alliance service"""
    try:
        # Try to fetch a small number of jobs to test connectivity
        test_data = alliance_service.fetch_jobs(page=1, per_page=1)
        
        return jsonify({
            'success': True,
            'status': 'healthy',
            'alliance_url': alliance_service.base_url,
            'message': 'Alliance service is operational'
        }), 200
        
    except Exception as e:
        logger.error(f"Alliance service health check failed: {str(e)}")
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e),
            'message': 'Alliance service is not responding'
        }), 503


@alliance_bp.route('/jobs/import/<int:job_id>', methods=['POST'])
def import_alliance_job(job_id):
    """Import an Alliance job as a new valuation report"""
    try:
        # Check if this Alliance ID already exists
        existing_report = db.valuationReports.find_one({'allianceId': str(job_id)})
        
        if existing_report:
            return jsonify({
                'success': False,
                'error': 'already_exists',
                'message': f'Valuation report with Alliance ID {job_id} already exists',
                'report_id': str(existing_report['_id'])
            }), 409
        
        # Fetch the job from Alliance
        job = alliance_service.get_job_by_id(job_id)
        
        if job is None:
            return jsonify({
                'success': False,
                'error': 'not_found',
                'message': f'Job with ID {job_id} not found in Alliance'
            }), 404
        
        # Transform the job data to our valuation report format
        transformed_data = alliance_service.transform_job_to_valuation_report(job)
        
        # Remove null values to avoid MongoDB schema validation errors
        def remove_null_values(data):
            if isinstance(data, dict):
                cleaned = {}
                for key, value in data.items():
                    if value is None:
                        continue
                    elif isinstance(value, dict):
                        cleaned_dict = remove_null_values(value)
                        if cleaned_dict:
                            cleaned[key] = cleaned_dict
                    elif isinstance(value, list):
                        cleaned_list = [remove_null_values(item) for item in value if item is not None]
                        if cleaned_list:
                            cleaned[key] = cleaned_list
                    else:
                        cleaned[key] = value
                return cleaned
            elif isinstance(data, list):
                return [remove_null_values(item) for item in data if item is not None]
            return data
        
        cleaned_data = remove_null_values(transformed_data)
        
        # Create the valuation report
        report_id = valuation_report_model.create(cleaned_data)
        
        return jsonify({
            'success': True,
            'data': {
                'report_id': report_id,
                'alliance_id': job_id
            },
            'message': f'Successfully imported Alliance job {job_id} as valuation report'
        }), 201
        
    except Exception as e:
        logger.error(f"Error importing Alliance job {job_id}: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'message': f'Failed to import Alliance job {job_id}'
        }), 500
