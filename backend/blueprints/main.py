"""
Main blueprint for general routes
"""
from flask import Blueprint, jsonify, render_template_string

main_bp = Blueprint('main', __name__)

# HTML template for the home page
HOME_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flask API</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .endpoint { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #007bff; }
        .method { color: #007bff; font-weight: bold; }
        .url { color: #28a745; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Flask API Server</h1>
        <p>Welcome to your Flask application with blueprints!</p>
        
        <h2>Available Endpoints:</h2>
        
        <div class="endpoint">
            <span class="method">GET</span> <span class="url">/</span> - Home page
        </div>
        
        <div class="endpoint">
            <span class="method">GET</span> <span class="url">/health</span> - Health check
        </div>
        
        <div class="endpoint">
            <span class="method">GET</span> <span class="url">/api/status</span> - API status
        </div>
        
        <div class="endpoint">
            <span class="method">GET</span> <span class="url">/api/users</span> - Get all users
        </div>
        
        <div class="endpoint">
            <span class="method">POST</span> <span class="url">/api/users</span> - Create user
        </div>
        
        <div class="endpoint">
            <span class="method">GET</span> <span class="url">/users</span> - Users page
        </div>
        
        <h2>Next Steps:</h2>
        <ul>
            <li>Add database models</li>
            <li>Implement authentication</li>
            <li>Add more API endpoints</li>
            <li>Add input validation</li>
            <li>Add logging</li>
        </ul>
    </div>
</body>
</html>
"""


@main_bp.route('/')
def home():
    """Home page"""
    return render_template_string(HOME_TEMPLATE)


@main_bp.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Flask application is running',
        'version': '1.0.0'
    })


@main_bp.route('/about')
def about():
    """About page"""
    return jsonify({
        'name': 'Flask API',
        'description': 'A simple Flask API with blueprints',
        'version': '1.0.0',
        'author': 'Your Name'
    })
