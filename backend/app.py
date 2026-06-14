"""
Flask Application Factory
"""
from flask import Flask
from flask_cors import CORS
from config import Config


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