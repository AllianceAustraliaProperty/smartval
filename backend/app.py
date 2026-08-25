"""
Flask Application Factory
"""
import os
from flask import request, jsonify
import firebase_admin
from firebase_admin import credentials, auth
from flask import Flask
from flask_cors import CORS
from config import Config

# Initialize Firebase Admin lazily to prevent crash if env vars are missing
def get_firebase_app():
    if not firebase_admin._apps:
        # Optional: if you use a service account JSON file
        # cred = credentials.Certificate("path/to/serviceAccountKey.json")
        # Or using environment variables like in Next.js:
        if not os.environ.get("FIREBASE_PROJECT_ID"):
            print("Warning: Firebase env vars missing.")
            return None

        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": os.environ.get("FIREBASE_PROJECT_ID"),
            "client_email": os.environ.get("FIREBASE_CLIENT_EMAIL"),
            "private_key": os.environ.get("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n"),
            "token_uri": "https://oauth2.googleapis.com/token",
        })
        firebase_admin.initialize_app(cred)
    return True

def create_app(config_class=Config):
    """Application factory pattern"""
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Enable CORS for all routes
    # Filter out wildcard if specific origins are provided
    cors_origins = config_class.CORS_ORIGINS
    if '*' in cors_origins and len(cors_origins) > 1:
        # Remove wildcard if specific origins are also provided
        cors_origins = [origin for origin in cors_origins if origin != '*']
    
    CORS(app, resources={
        r"/api/*": {
            "origins": cors_origins,
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": [
                "Content-Type",
                "Authorization",
                "Cache-Control",
                "X-Requested-With",
                "Pragma",
                "Accept"
            ],
            "supports_credentials": True
        }
    })
    
    # Register blueprints
    from blueprints.main import main_bp
    from blueprints.api import api_bp
    from blueprints.users import users_bp
    from blueprints.properties import properties_bp
    from blueprints.valuation_reports import valuation_reports_bp
    from blueprints.photos import photos_bp
    from blueprints.additional_photos import additional_photos_bp
    from blueprints.floor_plans import floor_plans_bp
    from blueprints.comparables_photos import comparables_photos_bp
    from blueprints.wikipedia import wikipedia_bp
    from blueprints.rpdata import rpdata_bp
    from blueprints.google_maps import google_maps_bp
    from blueprints.alliance import alliance_bp
    from blueprints.inspection_reports import inspection_bp
    from blueprints.title_search import title_search_bp
    from blueprints.settings import settings_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(users_bp, url_prefix='/users')
    app.register_blueprint(properties_bp, url_prefix='/api/properties')
    app.register_blueprint(valuation_reports_bp, url_prefix='/api/valuation-reports')
    app.register_blueprint(photos_bp, url_prefix='/api/photos')
    app.register_blueprint(additional_photos_bp, url_prefix='/api/additional-photos')
    app.register_blueprint(floor_plans_bp, url_prefix='/api/floor-plans')
    app.register_blueprint(title_search_bp, url_prefix='/api/title-search')
    app.register_blueprint(comparables_photos_bp, url_prefix='/api/comparables-photos')
    app.register_blueprint(wikipedia_bp, url_prefix='/api/wikipedia')
    app.register_blueprint(rpdata_bp, url_prefix='')
    app.register_blueprint(google_maps_bp, url_prefix='/api/google-maps')
    app.register_blueprint(alliance_bp, url_prefix='/api/alliance')
    app.register_blueprint(inspection_bp, url_prefix='/api/inspection-reports')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')

    @app.before_request
    def verify_auth_token():
        # 1. Allow CORS preflight requests to pass through
        if request.method == "OPTIONS":
            return None

        # 2. Skip authentication for public routes (like /health or file uploads)
        if request.path.startswith('/health') or request.path.startswith('/uploads/'):
            return None

        # 3. Only protect /api/ or other specific routes you want secured
        # You can adjust this condition based on your exact routing needs

        # 4. Extract token from the Next.js cookie
        token = request.cookies.get('val-ai-auth')

        # Fallback to Authorization header if testing via Postman
        if not token and 'Authorization' in request.headers:
            auth_header = request.headers.get('Authorization')
            if auth_header.startswith('Bearer '):
                token = auth_header.split('Bearer ')[1]

        if not token:
            return jsonify({'error': 'Unauthorized - Missing Token'}), 401

        try:
            get_firebase_app()
            # Verify the token cryptographically
            try:
                decoded_token = auth.verify_session_cookie(token, check_revoked=True)
            except Exception:
                decoded_token = auth.verify_id_token(token, check_revoked=True)
            # Attach user data to the request for blueprints to use
            request.user = decoded_token
        except Exception as e:
            import logging
            logging.error(f"Token verification failed: {e}")
            return jsonify({'error': 'Invalid or expired token'}), 401

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Not found'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return {'error': 'Internal server error'}, 500
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return {'status': 'healthy', 'message': 'SMARTval API is running'}, 200
    
    # Serve uploaded files
    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        from flask import send_from_directory
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    
    return app


# Create app instance for Vercel
app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)