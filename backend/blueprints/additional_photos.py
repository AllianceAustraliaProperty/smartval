"""
Additional Photos blueprint for uploading and managing extra photos
such as granny flat, studio, etc. Stored under the `additionalPhotos`
array on the valuation report document.
"""
from flask import Blueprint, request, jsonify, current_app
from database import get_database
from models.valuation_report import ValuationReport
from utils.s3_service import s3_service


additional_photos_bp = Blueprint('additional_photos', __name__)

valuation_report_model = ValuationReport(get_database())


@additional_photos_bp.route('/presigned-url/<report_id>', methods=['POST'])
def get_presigned_url(report_id):
    """Generate a presigned URL for S3 upload (additional photos)."""
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
        current_app.logger.error(f"Error generating presigned URL (additional): {str(e)}")
        return jsonify({'error': f'Failed to generate presigned URL: {str(e)}'}), 500


@additional_photos_bp.route('/presigned-batch/<report_id>', methods=['POST'])
def get_presigned_urls_batch(report_id):
    """Generate multiple presigned URLs for additional photos."""
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
        current_app.logger.error(f"Error generating batch presigned URLs (additional): {str(e)}")
        return jsonify({'error': f'Failed to generate presigned URLs: {str(e)}'}), 500


@additional_photos_bp.route('/confirm-upload/<report_id>', methods=['POST'])
def confirm_upload(report_id):
    """Confirm S3 upload and append to additionalPhotos array."""
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
        valuation_report_model.add_additional_photo(report_id, photo_obj)
        
        # Fetch updated report to return current photos
        updated_report = valuation_report_model.get_by_id(report_id)
        report_data = valuation_report_model.serialize(updated_report)

        return jsonify({'message': 'Additional photo recorded', 'photoUrl': s3_url, 'additionalPhotos': report_data.get('additionalPhotos', [])}), 200
    except Exception as e:
        current_app.logger.error(f"Error confirming additional photo upload: {str(e)}")
        return jsonify({'error': f'Failed to confirm upload: {str(e)}'}), 500


@additional_photos_bp.route('/list/<report_id>', methods=['GET'])
def list_additional_photos(report_id):
    """List additional photos for a valuation report."""
    try:
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404
        report_data = valuation_report_model.serialize(report)
        photos = report_data.get('additionalPhotos', [])
        return jsonify({'photos': photos, 'reportId': report_id}), 200
    except Exception as e:
        current_app.logger.error(f"Error listing additional photos: {str(e)}")
        return jsonify({'error': f'Failed to list photos: {str(e)}'}), 500


@additional_photos_bp.route('/delete/<report_id>', methods=['DELETE'])
def delete_additional_photo(report_id):
    """Delete an additional photo by URL and update the document."""
    try:
        data = request.get_json() or {}
        photo_url = data.get('photoUrl')
        if not photo_url:
            return jsonify({'error': 'Photo URL is required'}), 400

        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404

        report_data = valuation_report_model.serialize(report)
        existing = report_data.get('additionalPhotos', [])
        updated = [p for p in existing if p.get('photoUrl') != photo_url]

        if len(updated) == len(existing):
            return jsonify({'error': 'Photo not found'}), 404

        valuation_report_model.update(report_id, {'additionalPhotos': updated})

        # Best-effort delete of the underlying file
        try:
            if photo_url.startswith('https://') and 's3' in photo_url:
                url_parts = photo_url.split('/')
                if len(url_parts) >= 4:
                    file_key = '/'.join(url_parts[3:])
                    s3_service.delete_file(file_key)
        except Exception as file_err:
            current_app.logger.warning(f"Could not delete additional photo file: {str(file_err)}")

        return jsonify({'message': 'Additional photo deleted', 'photoUrl': photo_url}), 200
    except Exception as e:
        current_app.logger.error(f"Error deleting additional photo: {str(e)}")
        return jsonify({'error': f'Failed to delete photo: {str(e)}'}), 500


@additional_photos_bp.route('/update/<report_id>', methods=['PUT'])
def update_additional_photos(report_id):
    """Update additional photos array (replace the entire array)."""
    try:
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404

        data = request.get_json() or {}
        photos = data.get('photos', [])

        # Update the additionalPhotos array
        valuation_report_model.update(report_id, {'additionalPhotos': photos})

        return jsonify({'message': 'Additional photos updated', 'photos': photos}), 200
    except Exception as e:
        current_app.logger.error(f"Error updating additional photos: {str(e)}")
        return jsonify({'error': f'Failed to update photos: {str(e)}'}), 500


