"""
Configuration management for Flask application
"""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """Base configuration class"""
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    DEBUG = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    TESTING = False
    
    # Database configuration
    MONGODB_URI = os.environ.get('MONGODB_URI') or 'mongodb://localhost:27017/flask_app'
    
    # CORS configuration
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
    
    # API configuration
    API_TITLE = 'Flask API'
    API_VERSION = 'v1'
    API_DESCRIPTION = 'A simple Flask API with blueprints'
    
    # File upload configuration
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    
    # Base URL configuration for serving files
    BASE_URL = os.environ.get('BASE_URL')

    GOOGLE_MAPS_API_KEY = os.environ.get('GOOGLE_MAPS_API_KEY')
    
    # AWS S3 configuration
    AWS_ACCESS_KEY_ID = os.environ.get('AWS_ACCESS_KEY_ID')
    AWS_SECRET_ACCESS_KEY = os.environ.get('AWS_SECRET_ACCESS_KEY')
    AWS_REGION = os.environ.get('AWS_REGION', 'ap-southeast-2')
    S3_BUCKET_NAME = os.environ.get('S3_BUCKET_NAME', 'smartval-bucket-copy')

    # RP Data API configuration
    RPDATA_API_URL = os.environ.get('RPDATA_API_URL')
    RPDATA_API_KEY = os.environ.get('RPDATA_API_KEY')
    # Report logo used in PDF and preview templates
    # Default falls back to existing AAP logo until overridden via env
    REPORT_LOGO_URL = os.environ.get('REPORT_LOGO_URL') or 'https://smartval-bucket-copy.s3.ap-southeast-2.amazonaws.com/photos/aap-logo-final.png'

    ALLIANCE_BASE_URL = os.environ.get('ALLIANCE_BASE_URL')
