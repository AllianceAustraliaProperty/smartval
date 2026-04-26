"""
Floor Plans blueprint for uploading and managing floor plan images.
Stored under the `floorPlans` array on the valuation report document.
"""
from flask import Blueprint, request, jsonify, current_app
from database import get_database
from models.valuation_report import ValuationReport
from utils.s3_service import s3_service


floor_plans_bp = Blueprint('floor_plans', __name__)

valuation_report_model = ValuationReport(get_database())


@floor_plans_bp.route('/presigned-url/<report_id>', methods=['POST'])
def get_presigned_url(report_id):
    """Generate a presigned URL for S3 upload (floor plans)."""
    try:
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404

        data = request.get_json() or {}
        file_extension = (data.get('fileExtension') or '').lower()
        content_type = data.get('contentType')
        if not file_extension:
            return jsonify({'error': 'File extension is required'}), 400

        # Reuse the same S3 service (uploads into photos/<report_id>/ by default)
        presigned = s3_service.generate_presigned_url(
            file_extension=file_extension,
            report_id=report_id,
            content_type=content_type,
        )

        return jsonify({
            'presignedUrl': presigned['presigned_url'],
            'fileKey': presigned['file_key'],
            's3Url': presigned['s3_url'],
            'bucket': presigned['bucket'],
            'region': presigned['region']
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error generating presigned URL (floor plans): {str(e)}")
        return jsonify({'error': f'Failed to generate presigned URL: {str(e)}'}), 500


@floor_plans_bp.route('/presigned-batch/<report_id>', methods=['POST'])
def get_presigned_urls_batch(report_id):
    """Generate multiple presigned URLs for floor plans."""
    try:
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404

        data = request.get_json(silent=True) or {}
        files = data.get('files') or []
        if not isinstance(files, list) or len(files) == 0:
            return jsonify({'error': 'files array is required'}), 400

        items = []
        for f in files:
            file_extension = (f.get('fileExtension') or '').lower()
            content_type = f.get('contentType')
            if not file_extension:
                return jsonify({'error': 'fileExtension is required for all items'}), 400

            presigned = s3_service.generate_presigned_url(
                file_extension=file_extension,
                report_id=report_id,
                content_type=content_type,
            )
            items.append({
                'presignedUrl': presigned['presigned_url'],
                'fileKey': presigned['file_key'],
                's3Url': presigned['s3_url'],
                'bucket': presigned['bucket'],
                'region': presigned['region']
            })

        return jsonify({'items': items}), 200
    except Exception as e:
        current_app.logger.error(f"Error generating batch presigned URLs (floor plans): {str(e)}")
        return jsonify({'error': f'Failed to generate presigned URLs: {str(e)}'}), 500


@floor_plans_bp.route('/confirm-upload/<report_id>', methods=['POST'])
def confirm_upload(report_id):
    """Confirm S3 upload and append to floorPlans array."""
    try:
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404

        data = request.get_json() or {}
        s3_url = data.get('s3Url')
        file_key = data.get('fileKey')
        if not s3_url or not file_key:
            return jsonify({'error': 'S3 URL and file key are required'}), 400

        photo_obj = {
            'photoUrl': s3_url,
            # Keep structure compatible with main photos for future use
            'isCover': False,
            'isGallery': False,
            'isAnnexure': False,
            'annexureHeader': '',
            'featuresFixtures': [],
            'primeCostItems': [],
            'extraItems': [],
            'internalCondition': '',
            'externalCondition': '',
            'externalWallsType': '',
            'internalWallsType': '',
            'flooring': '',
            'category': ''
        }

        # Atomically add photo to the array (fixes race condition)
        valuation_report_model.add_floor_plan(report_id, photo_obj)
        
        # Fetch updated report to return current photos
        updated_report = valuation_report_model.get_by_id(report_id)
        report_data = valuation_report_model.serialize(updated_report)

        return jsonify({'message': 'Floor plan recorded', 'photoUrl': s3_url, 'floorPlans': report_data.get('floorPlans', [])}), 200
    except Exception as e:
        current_app.logger.error(f"Error confirming floor plan upload: {str(e)}")
        return jsonify({'error': f'Failed to confirm upload: {str(e)}'}), 500


@floor_plans_bp.route('/list/<report_id>', methods=['GET'])
def list_floor_plans(report_id):
    """List floor plans for a valuation report."""
    try:
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404
        report_data = valuation_report_model.serialize(report)
        photos = report_data.get('floorPlans', [])
        return jsonify({'photos': photos, 'reportId': report_id}), 200
    except Exception as e:
        current_app.logger.error(f"Error listing floor plans: {str(e)}")
        return jsonify({'error': f'Failed to list photos: {str(e)}'}), 500


@floor_plans_bp.route('/delete/<report_id>', methods=['DELETE'])
def delete_floor_plan(report_id):
    """Delete a floor plan by URL and update the document."""
    try:
        data = request.get_json() or {}
        photo_url = data.get('photoUrl')
        if not photo_url:
            return jsonify({'error': 'Photo URL is required'}), 400

        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404

        report_data = valuation_report_model.serialize(report)
        existing = report_data.get('floorPlans', [])
        updated = [p for p in existing if p.get('photoUrl') != photo_url]

        if len(updated) == len(existing):
            return jsonify({'error': 'Floor plan not found'}), 404

        valuation_report_model.update(report_id, {'floorPlans': updated})

        # Best-effort delete of the underlying file
        try:
            if photo_url.startswith('https://') and 's3' in photo_url:
                url_parts = photo_url.split('/')
                if len(url_parts) >= 4:
                    file_key = '/'.join(url_parts[3:])
                    s3_service.delete_file(file_key)
        except Exception as file_err:
            current_app.logger.warning(f"Could not delete floor plan file: {str(file_err)}")

        return jsonify({'message': 'Floor plan deleted', 'photoUrl': photo_url}), 200
    except Exception as e:
        current_app.logger.error(f"Error deleting floor plan: {str(e)}")
        return jsonify({'error': f'Failed to delete photo: {str(e)}'}), 500


