"""
Photos blueprint for photo upload and management endpoints
"""
import os
import uuid
from flask import Blueprint, request, jsonify, current_app
# CORS is handled globally in app.py
from werkzeug.utils import secure_filename
from models.valuation_report import ValuationReport
from pymongo import MongoClient
from config import Config
from utils.s3_service import s3_service

photos_bp = Blueprint('photos', __name__)

# Initialize MongoDB connection
client = MongoClient(Config.MONGODB_URI)
db = client.get_default_database()
valuation_report_model = ValuationReport(db)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tiff'}

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def ensure_upload_directory(report_id):
    """Ensure upload directory exists for the report"""
    upload_dir = os.path.join(current_app.config['UPLOAD_FOLDER'], str(report_id))
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir, exist_ok=True)
    return upload_dir

@photos_bp.route('/presigned-url/<report_id>', methods=['POST'])
def get_presigned_url(report_id):
    """Generate presigned URL for direct S3 upload"""
    try:
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
        
        # Generate presigned URL
        presigned_data = s3_service.generate_presigned_url(
            file_extension=file_extension,
            report_id=report_id,
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
        current_app.logger.error(f"Error generating presigned URL: {str(e)}")
        return jsonify({'error': f'Failed to generate presigned URL: {str(e)}'}), 500

@photos_bp.route('/presigned-batch/<report_id>', methods=['POST'])
def get_presigned_urls_batch(report_id):
    """Generate multiple presigned URLs in a single request.
    Expects JSON body: { "files": [{"fileExtension": "jpg", "contentType": "image/jpeg"}, ...] }
    Returns: { "items": [ {presignedUrl, fileKey, s3Url, bucket, region}, ... ] }
    """
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
            if file_extension not in ALLOWED_EXTENSIONS:
                return jsonify({'error': f'Invalid file type: {file_extension}'}), 400

            presigned_data = s3_service.generate_presigned_url(
                file_extension=file_extension,
                report_id=report_id,
                content_type=content_type
            )

            items.append({
                'presignedUrl': presigned_data['presigned_url'],
                'fileKey': presigned_data['file_key'],
                's3Url': presigned_data['s3_url'],
                'bucket': presigned_data['bucket'],
                'region': presigned_data['region']
            })

        return jsonify({'items': items}), 200
    except Exception as e:
        current_app.logger.error(f"Error generating batch presigned URLs: {str(e)}")
        return jsonify({'error': f'Failed to generate presigned URLs: {str(e)}'}), 500

@photos_bp.route('/confirm-upload/<report_id>', methods=['POST'])
def confirm_upload(report_id):
    """Confirm S3 upload and update database with photo URL"""
    try:
        # Check if report exists
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404
        
        data = request.get_json()
        s3_url = data.get('s3Url')
        file_key = data.get('fileKey')
        
        if not s3_url or not file_key:
            return jsonify({'error': 'S3 URL and file key are required'}), 400
        
        # Create new photo object
        photo_obj = {
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
            'photoUrl': s3_url,
            'flooring': '',
            'category': ''
        }
        
        # Atomically add photo to the array (fixes race condition)
        valuation_report_model.add_photo(report_id, photo_obj)
        
        current_app.logger.info(f"Photo confirmed in S3: {s3_url}")
        
        # Fetch updated report to return current photos
        updated_report = valuation_report_model.get_by_id(report_id)
        report_data = valuation_report_model.serialize(updated_report)
        
        return jsonify({
            'message': 'Photo upload confirmed successfully',
            'photoUrl': s3_url,
            'photos': report_data.get('photos', []),
            'reportId': report_id
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error confirming upload: {str(e)}")
        return jsonify({'error': f'Failed to confirm upload: {str(e)}'}), 500

@photos_bp.route('/upload/<report_id>', methods=['POST'])
def upload_photos(report_id):
    """Upload photos for a valuation report"""
    try:
        # Check if report exists
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404
        
        # Check if files are present
        if 'photos' not in request.files:
            return jsonify({'error': 'No photos provided'}), 400
        
        files = request.files.getlist('photos')
        if not files or all(file.filename == '' for file in files):
            return jsonify({'error': 'No files selected'}), 400
        
        # No photo type validation needed - using unified photo structure
        
        uploaded_urls = []
        upload_dir = ensure_upload_directory(report_id)
        
        for file in files:
            if file and file.filename and allowed_file(file.filename):
                # Generate unique filename
                file_extension = file.filename.rsplit('.', 1)[1].lower()
                unique_filename = f"{uuid.uuid4()}.{file_extension}"
                
                # Save file
                file_path = os.path.join(upload_dir, unique_filename)
                file.save(file_path)
                
                # Generate URL for the saved file
                photo_url = f"/uploads/{report_id}/{unique_filename}"
                uploaded_urls.append(photo_url)
                
                current_app.logger.info(f"Photo uploaded: {photo_url}")
            else:
                return jsonify({'error': f'Invalid file type: {file.filename}'}), 400
        
        # Update the valuation report with new photo URLs
        report_data = valuation_report_model.serialize(report)
        existing_photos = report_data.get('photos', [])
        
        # Create photo objects with the new schema structure
        new_photos = []
        for photo_url in uploaded_urls:
            photo_obj = {
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
                'photoUrl': photo_url,
                'flooring': '',
                'category': ''
            }
            new_photos.append(photo_obj)
        
        # Add new photos to existing array
        updated_photos = existing_photos + new_photos
        
        # Update the report
        valuation_report_model.update(report_id, {'photos': updated_photos})
        
        return jsonify({
            'message': 'Photos uploaded successfully',
            'uploadedUrls': uploaded_urls,
            'photos': updated_photos,
            'reportId': report_id
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error uploading photos: {str(e)}")
        return jsonify({'error': f'Failed to upload photos: {str(e)}'}), 500

@photos_bp.route('/delete/<report_id>', methods=['DELETE'])
def delete_photo(report_id):
    """Delete a photo from a valuation report"""
    try:
        data = request.get_json()
        photo_url = data.get('photoUrl')
        
        if not photo_url:
            return jsonify({'error': 'Photo URL is required'}), 400
        
        # Check if report exists
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404
        
        # Get current photos
        report_data = valuation_report_model.serialize(report)
        existing_photos = report_data.get('photos', [])
        
        # Remove photo object with matching photoUrl from the array
        updated_photos = [photo for photo in existing_photos if photo.get('photoUrl') != photo_url]
        
        if len(updated_photos) == len(existing_photos):
            return jsonify({'error': 'Photo not found'}), 404
        
        # Update the report
        valuation_report_model.update(report_id, {'photos': updated_photos})
        
        # Delete the actual file
        try:
            if photo_url.startswith('https://') and 's3' in photo_url:
                # S3 URL - extract file key and delete from S3
                # Extract file key from S3 URL
                # URL format: https://bucket.s3.region.amazonaws.com/photos/report_id/filename
                url_parts = photo_url.split('/')
                if len(url_parts) >= 4:
                    file_key = '/'.join(url_parts[3:])  # Everything after bucket name
                    s3_service.delete_file(file_key)
                    current_app.logger.info(f"S3 photo deleted: {file_key}")
            else:
                # Local file - delete from filesystem
                filename = photo_url.split('/')[-1]
                file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], str(report_id), filename)
                if os.path.exists(file_path):
                    os.remove(file_path)
                    current_app.logger.info(f"Local photo file deleted: {file_path}")
        except Exception as file_error:
            current_app.logger.warning(f"Could not delete file {photo_url}: {str(file_error)}")
        
        return jsonify({
            'message': 'Photo deleted successfully',
            'photoUrl': photo_url
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error deleting photo: {str(e)}")
        return jsonify({'error': f'Failed to delete photo: {str(e)}'}), 500

@photos_bp.route('/list/<report_id>', methods=['GET'])
def list_photos(report_id):
    """Get all photos for a valuation report"""
    try:
        # Check if report exists
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404
        
        # Get photos from report
        report_data = valuation_report_model.serialize(report)
        photos = report_data.get('photos', [])
        
        return jsonify({
            'photos': photos,
            'reportId': report_id
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error listing photos: {str(e)}")
        return jsonify({'error': f'Failed to list photos: {str(e)}'}), 500

@photos_bp.route('/create/<report_id>', methods=['POST'])
def create_empty_photo(report_id):
    """Create an empty photo record without uploading an image"""
    try:
        # Check if report exists
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404

        data = request.get_json()

        # Create new photo object with attributes from request or defaults
        photo_obj = {
            'isCover': data.get('isCover', False),
            'isGallery': data.get('isGallery', False),
            'isAnnexure': data.get('isAnnexure', False),
            'annexureHeader': data.get('annexureHeader', ''),
            'featuresFixtures': data.get('featuresFixtures', []),
            'primeCostItems': data.get('primeCostItems', []),
            'extraItems': data.get('extraItems', []),
            'internalCondition': data.get('internalCondition', ''),
            'externalCondition': data.get('externalCondition', ''),
            'externalWallsType': data.get('externalWallsType', ''),
            'internalWallsType': data.get('internalWallsType', ''),
            'photoUrl': data.get('photoUrl'),  # Will be None/null if not provided
            'flooring': data.get('flooring', ''),
            'category': data.get('category', '')
        }

        # Atomically add photo to the array
        valuation_report_model.add_photo(report_id, photo_obj)

        current_app.logger.info(f"Empty photo created for report: {report_id}")

        # Fetch updated report to return the created photo
        updated_report = valuation_report_model.get_by_id(report_id)
        report_data = valuation_report_model.serialize(updated_report)
        photos = report_data.get('photos', [])

        # Return the last photo (the one just added)
        created_photo = photos[-1] if photos else photo_obj

        return jsonify(created_photo), 201

    except Exception as e:
        current_app.logger.error(f"Error creating empty photo: {str(e)}")
        return jsonify({'error': f'Failed to create photo: {str(e)}'}), 500

@photos_bp.route('/update/<report_id>', methods=['PUT'])
def update_photos(report_id):
    """Update photos for a valuation report"""
    try:
        # Check if report exists
        report = valuation_report_model.get_by_id(report_id)
        if not report:
            return jsonify({'error': 'Valuation report not found'}), 404

        data = request.get_json()
        photos = data.get('photos', [])

        # Update the report
        valuation_report_model.update(report_id, {'photos': photos})

        return jsonify({
            'message': 'Photos updated successfully',
            'reportId': report_id
        }), 200

    except Exception as e:
        current_app.logger.error(f"Error updating photos: {str(e)}")
        return jsonify({'error': f'Failed to update photos: {str(e)}'}), 500
