"""
Comparables Photos Blueprint
Handles photo uploads for comparables (sales and rentals)
"""

import os
import uuid
from flask import Blueprint, request, jsonify, current_app
# CORS is handled globally in app.py
from werkzeug.utils import secure_filename
from database import get_database
from models.valuation_report import ValuationReport
from utils.s3_service import s3_service

# Initialize blueprint
comparables_photos_bp = Blueprint('comparables_photos', __name__)

valuation_report_model = ValuationReport(get_database())

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def ensure_upload_directory(report_id, comparable_type):
    """Ensure upload directory exists for comparables photos
    Note: We intentionally ignore comparable_type so all photos live under
    uploads/{report_id}/comparables
    """
    upload_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], str(report_id), 'comparables')
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir

@comparables_photos_bp.route('/presigned-url/<report_id>/<comparable_type>', methods=['POST'])
def get_comparable_presigned_url(report_id, comparable_type):
    """Generate presigned URL for direct S3 upload of comparable photos"""
    try:
        # Validate comparable type
        if comparable_type not in ['sales', 'rentals']:
            return jsonify({'error': 'Invalid comparable type. Must be "sales" or "rentals"'}), 400
        
        # Check if report exists
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404
        
        data = request.get_json()
        file_extension = data.get('fileExtension')
        content_type = data.get('contentType')
        
        if not file_extension:
            return jsonify({'error': 'File extension is required'}), 400
        
        # Validate file extension
        if file_extension.lower() not in ALLOWED_EXTENSIONS:
            return jsonify({'error': f'Invalid file type: {file_extension}'}), 400
        
        # Generate presigned URL for comparables
        presigned_data = s3_service.generate_presigned_url(
            file_extension=file_extension,
            report_id=f"{report_id}/comparables",
            content_type=content_type
        )
        
        return jsonify({
            'presignedUrl': presigned_data['presigned_url'],
            'fileKey': presigned_data['file_key'],
            's3Url': presigned_data['s3_url'],
            'bucket': presigned_data['bucket'],
            'region': presigned_data['region'],
            'comparableType': comparable_type
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error generating presigned URL for comparable: {str(e)}")
        return jsonify({'error': f'Failed to generate presigned URL: {str(e)}'}), 500

@comparables_photos_bp.route('/upload/<report_id>/<comparable_type>', methods=['POST'])
def upload_comparable_photo(report_id, comparable_type):
    """Upload a photo for a comparable (sales or rentals)"""
    try:
        # Validate comparable type
        if comparable_type not in ['sales', 'rentals']:
            return jsonify({'error': 'Invalid comparable type. Must be "sales" or "rentals"'}), 400
        
        # Check if report exists
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404
        
        # Check if file is present
        if 'photo' not in request.files:
            return jsonify({'error': 'No photo file provided'}), 400
        
        file = request.files['photo']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': f'Invalid file type: {file.filename}'}), 400
        
        # Generate unique filename
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        
        # Ensure upload directory exists
        upload_dir = ensure_upload_directory(report_id, comparable_type)
        
        # Save file
        file_path = os.path.join(upload_dir, unique_filename)
        file.save(file_path)
        
        # Generate URL for the saved file (no sales/rentals subfolders)
        photo_url = f"/uploads/{report_id}/comparables/{unique_filename}"
        
        current_app.logger.info(f"Comparable photo uploaded: {photo_url}")
        
        return jsonify({
            'message': 'Photo uploaded successfully',
            'photoUrl': photo_url,
            'comparableType': comparable_type,
            'reportId': report_id
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error uploading comparable photo: {str(e)}")
        return jsonify({'error': f'Failed to upload photo: {str(e)}'}), 500

@comparables_photos_bp.route('/delete/<report_id>/<comparable_type>', methods=['DELETE'])
def delete_comparable_photo(report_id, comparable_type):
    """Delete a comparable photo"""
    try:
        # Validate comparable type
        if comparable_type not in ['sales', 'rentals']:
            return jsonify({'error': 'Invalid comparable type. Must be "sales" or "rentals"'}), 400
        
        data = request.get_json()
        photo_url = data.get('photoUrl')
        
        if not photo_url:
            return jsonify({'error': 'Photo URL is required'}), 400
        
        # Check if report exists
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404
        
        # Delete the file from filesystem or S3
        try:
            if photo_url.startswith('https://') and 's3' in photo_url:
                # S3 URL - check if it's from our bucket before deleting
                if _is_our_s3_url(photo_url):
                    current_app.logger.info(f"Deleting S3 photo from our bucket: {photo_url}")
                    _delete_old_s3_photo(photo_url)
                else:
                    current_app.logger.info(f"Skipping deletion of external S3 photo: {photo_url}")
            else:
                # Local file - delete from filesystem
                filename = photo_url.split('/')[-1]
                file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], str(report_id), 'comparables', filename)
                if os.path.exists(file_path):
                    os.remove(file_path)
                    current_app.logger.info(f"Comparable photo file deleted: {file_path}")
        except Exception as file_error:
            current_app.logger.warning(f"Could not delete file {photo_url}: {str(file_error)}")
        
        return jsonify({
            'message': 'Photo deleted successfully',
            'photoUrl': photo_url,
            'comparableType': comparable_type
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error deleting comparable photo: {str(e)}")
        return jsonify({'error': f'Failed to delete photo: {str(e)}'}), 500


@comparables_photos_bp.route('/update-photo/<report_id>/<comparable_type>', methods=['POST'])
def update_comparable_photo(report_id, comparable_type):
    """Update a comparable photo - generates new S3 URL and deletes old photo if from our bucket"""
    try:
        # Validate comparable type
        if comparable_type not in ['sales', 'rentals']:
            return jsonify({'error': 'Invalid comparable type. Must be "sales" or "rentals"'}), 400

        # Check if report exists
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404

        data = request.get_json()
        file_extension = data.get('fileExtension')
        content_type = data.get('contentType')
        comparable_id = data.get('comparableId')
        old_photo_url = data.get('oldPhotoUrl')

        if not file_extension:
            return jsonify({'error': 'File extension is required'}), 400

        # Validate file extension
        if file_extension.lower() not in ALLOWED_EXTENSIONS:
            return jsonify({'error': f'Invalid file type: {file_extension}'}), 400

        # Generate new presigned URL for comparables
        current_app.logger.info(f"Generating presigned URL for photo update: report_id={report_id}, comparable_id={comparable_id}, old_photo_url={old_photo_url}")
        presigned_data = s3_service.generate_presigned_url(
            file_extension=file_extension,
            report_id=f"{report_id}/comparables",
            content_type=content_type
        )
        current_app.logger.info(f"Generated presigned URL: {presigned_data['s3_url']}")

        # Get report data and comparables
        report_data = valuation_report_model.serialize(report)
        comparables = report_data.get('comparables', {})
        list_for_type = comparables.get(comparable_type, [])

        # Find and update the comparable
        if comparable_id:
            found = False
            for item in list_for_type:
                if str(item.get('id') or item.get('_id') or '') == str(comparable_id):
                    # Delete old photo if it's from our S3 bucket
                    if old_photo_url and _is_our_s3_url(old_photo_url):
                        current_app.logger.info(f"Deleting old S3 photo: {old_photo_url}")
                        _delete_old_s3_photo(old_photo_url)
                    elif old_photo_url:
                        current_app.logger.info(f"Skipping deletion of non-S3 photo: {old_photo_url}")
                    
                    # Update with new photo URL
                    item['photoUrl'] = presigned_data['s3_url']
                    found = True
                    break

            if not found:
                return jsonify({'error': 'Comparable not found'}), 404
        else:
            return jsonify({'error': 'Comparable ID is required'}), 400

        # Save back to report
        comparables[comparable_type] = list_for_type
        valuation_report_model.update(report_id, {'comparables': comparables})

        current_app.logger.info(f"Comparable photo updated: {presigned_data['s3_url']} (report: {report_id}, type: {comparable_type})")

        return jsonify({
            'presignedUrl': presigned_data['presigned_url'],
            'fileKey': presigned_data['file_key'],
            's3Url': presigned_data['s3_url'],
            'bucket': presigned_data['bucket'],
            'region': presigned_data['region'],
            'comparableType': comparable_type,
            'message': 'Photo update URL generated successfully'
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error updating comparable photo: {str(e)}")
        return jsonify({'error': f'Failed to update photo: {str(e)}'}), 500


@comparables_photos_bp.route('/confirm-upload/<report_id>/<comparable_type>/<index>', methods=['POST'])
def confirm_comparable_upload(report_id, comparable_type, index):
    """Confirm S3 upload for a comparable photo and update the comparable's photoUrl"""
    try:
        # Validate comparable type
        if comparable_type not in ['sales', 'rentals']:
            return jsonify({'error': 'Invalid comparable type. Must be "sales" or "rentals"'}), 400

        # Check if report exists
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404

        data = request.get_json() or {}
        s3_url = data.get('s3Url')
        file_key = data.get('fileKey')
        comparable_id = data.get('comparableId')

        if not s3_url or not file_key:
            return jsonify({'error': 'S3 URL and file key are required'}), 400

        # Get report data and comparables
        report_data = valuation_report_model.serialize(report)
        comparables = report_data.get('comparables', {})
        list_for_type = comparables.get(comparable_type, [])

        idx = None

        # If a comparableId was provided, try to find and update that comparable
        if comparable_id:
            found = False
            for i, item in enumerate(list_for_type):
                if str(item.get('id') or item.get('_id') or '') == str(comparable_id):
                    item['photoUrl'] = s3_url
                    idx = i
                    found = True
                    break

            if not found:
                # If not found, append a minimal comparable object with the provided id and photoUrl
                new_comp = {
                    'id': comparable_id,
                    'photoUrl': s3_url
                }
                list_for_type.append(new_comp)
                idx = len(list_for_type) - 1

        else:
            # Fallback to index-based update/append
            try:
                idx_int = int(index)
            except Exception:
                return jsonify({'error': 'Invalid comparable index'}), 400

            # If index equals length, append new comparable
            if idx_int == len(list_for_type):
                list_for_type.append({'photoUrl': s3_url})
                idx = len(list_for_type) - 1
            elif 0 <= idx_int < len(list_for_type):
                list_for_type[idx_int]['photoUrl'] = s3_url
                idx = idx_int
            else:
                return jsonify({'error': 'Comparable index out of range'}), 400

        # Save back to report
        comparables[comparable_type] = list_for_type
        valuation_report_model.update(report_id, {'comparables': comparables})

        current_app.logger.info(f"Comparable photo confirmed in S3: {s3_url} (report: {report_id}, type: {comparable_type}, index: {idx})")

        return jsonify({
            'message': 'Comparable photo upload confirmed successfully',
            'photoUrl': s3_url,
            'reportId': report_id,
            'comparableType': comparable_type,
            'index': idx,
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error confirming comparable upload: {str(e)}")
        return jsonify({'error': f'Failed to confirm comparable upload: {str(e)}'}), 500


def _is_our_s3_url(url):
    """Check if the URL is from our S3 bucket"""
    if not url or not isinstance(url, str):
        return False
    
    # Check if it's an S3 URL and contains our bucket name
    bucket_name = Config.S3_BUCKET_NAME
    return (url.startswith('https://') and 
            's3' in url and 
            bucket_name in url and
            '.amazonaws.com' in url)


def _delete_old_s3_photo(photo_url):
    """Delete old photo from S3 if it's from our bucket"""
    try:
        if not _is_our_s3_url(photo_url):
            current_app.logger.info(f"Skipping deletion of non-S3 or external photo: {photo_url}")
            return
        
        # Extract file key from S3 URL
        # URL format: https://bucket-name.s3.region.amazonaws.com/file-key
        url_parts = photo_url.split('/')
        if len(url_parts) >= 4:
            file_key = '/'.join(url_parts[3:])  # Everything after bucket name
            if s3_service.delete_file(file_key):
                current_app.logger.info(f"Old S3 photo deleted: {file_key}")
            else:
                current_app.logger.warning(f"Failed to delete old S3 photo: {file_key}")
        else:
            current_app.logger.warning(f"Could not extract file key from URL: {photo_url}")
            
    except Exception as e:
        current_app.logger.error(f"Error deleting old S3 photo {photo_url}: {str(e)}")

