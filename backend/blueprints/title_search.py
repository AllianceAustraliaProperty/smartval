"""
Title Search blueprint for uploading and managing a single title search image.
Stored under the `titleSearch` array (max 1 item) on the valuation report document.
"""
from flask import Blueprint, request, jsonify, current_app
from database import get_database
from models.valuation_report import ValuationReport
from utils.s3_service import s3_service


title_search_bp = Blueprint('title_search', __name__)

valuation_report_model = ValuationReport(get_database())


@title_search_bp.route('/presigned-url/<report_id>', methods=['POST'])
def get_presigned_url(report_id):
    """Generate a presigned URL for S3 upload (title search)."""
    try:
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404

        data = request.get_json() or {}
        file_extension = (data.get('fileExtension') or '').lower()
        content_type = data.get('contentType')
        if not file_extension:
            return jsonify({'error': 'File extension is required'}), 400

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
        current_app.logger.error(f"Error generating presigned URL (title search): {str(e)}")
        return jsonify({'error': f'Failed to generate presigned URL: {str(e)}'}), 500


@title_search_bp.route('/presigned-batch/<report_id>', methods=['POST'])
def get_presigned_urls_batch(report_id):
    """Generate presigned URLs for title search (max 1 file)."""
    try:
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404

        data = request.get_json(silent=True) or {}
        files = data.get('files') or []
        if not isinstance(files, list) or len(files) == 0:
            return jsonify({'error': 'files array is required'}), 400

        items = []
        for f in files[:2]:  # Limit to 2 files
            file_extension = (f.get('fileExtension') or '').lower()
            content_type = f.get('contentType')
            if not file_extension:
                return jsonify({'error': 'fileExtension is required'}), 400

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
        current_app.logger.error(f"Error generating batch presigned URLs (title search): {str(e)}")
        return jsonify({'error': f'Failed to generate presigned URLs: {str(e)}'}), 500


@title_search_bp.route('/confirm-upload/<report_id>', methods=['POST'])
def confirm_upload(report_id):
    """Confirm S3 upload and set titleSearch (replaces existing)."""
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
        }

        valuation_report_model.add_title_search(report_id, photo_obj)

        updated_report = valuation_report_model.get_by_id(report_id)
        report_data = valuation_report_model.serialize(updated_report)

        return jsonify({
            'message': 'Title search recorded',
            'photoUrl': s3_url,
            'titleSearch': report_data.get('titleSearch', [])
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error confirming title search upload: {str(e)}")
        return jsonify({'error': f'Failed to confirm upload: {str(e)}'}), 500


@title_search_bp.route('/list/<report_id>', methods=['GET'])
def list_title_search(report_id):
    """List title search images for a valuation report."""
    try:
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404
        report_data = valuation_report_model.serialize(report)
        photos = report_data.get('titleSearch', [])
        return jsonify({'photos': photos, 'reportId': report_id}), 200
    except Exception as e:
        current_app.logger.error(f"Error listing title search: {str(e)}")
        return jsonify({'error': f'Failed to list photos: {str(e)}'}), 500


@title_search_bp.route('/delete/<report_id>', methods=['DELETE'])
def delete_title_search(report_id):
    """Delete the title search image."""
    try:
        data = request.get_json() or {}
        photo_url = data.get('photoUrl')
        if not photo_url:
            return jsonify({'error': 'Photo URL is required'}), 400

        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404

        valuation_report_model.remove_title_search(report_id, photo_url)

        try:
            if photo_url.startswith('https://') and 's3' in photo_url:
                url_parts = photo_url.split('/')
                if len(url_parts) >= 4:
                    file_key = '/'.join(url_parts[3:])
                    s3_service.delete_file(file_key)
        except Exception as file_err:
            current_app.logger.warning(f"Could not delete title search file: {str(file_err)}")

        return jsonify({'message': 'Title search deleted', 'photoUrl': photo_url}), 200
    except Exception as e:
        current_app.logger.error(f"Error deleting title search: {str(e)}")
        return jsonify({'error': f'Failed to delete photo: {str(e)}'}), 500
