"""
Users blueprint for user-related web pages
"""
from flask import Blueprint, render_template_string

users_bp = Blueprint('users', __name__)

# HTML template for users page
USERS_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Users - Flask API</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
        .container { max-width: 1000px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .user-card { background: #f8f9fa; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #007bff; }
        .user-name { font-size: 1.2em; font-weight: bold; color: #333; margin-bottom: 5px; }
        .user-email { color: #666; margin-bottom: 10px; }
        .user-id { color: #999; font-size: 0.9em; }
        .api-info { background: #e9ecef; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .endpoint { background: #fff; padding: 10px; margin: 5px 0; border-radius: 3px; border-left: 3px solid #28a745; }
        .method { color: #007bff; font-weight: bold; }
        .url { color: #28a745; font-family: monospace; }
        .back-link { display: inline-block; margin-bottom: 20px; color: #007bff; text-decoration: none; }
        .back-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <a href="/" class="back-link">← Back to Home</a>
        <h1>👥 Users Management</h1>
        <p>This page demonstrates user-related functionality in the Flask application.</p>
        
        <div class="api-info">
            <h3>Available User API Endpoints:</h3>
            
            <div class="endpoint">
                <span class="method">GET</span> <span class="url">/api/users</span> - Get all users
            </div>
            
            <div class="endpoint">
                <span class="method">POST</span> <span class="url">/api/users</span> - Create new user
            </div>
            
            <div class="endpoint">
                <span class="method">GET</span> <span class="url">/api/users/{id}</span> - Get user by ID
            </div>
            
            <div class="endpoint">
                <span class="method">PUT</span> <span class="url">/api/users/{id}</span> - Update user
            </div>
            
            <div class="endpoint">
                <span class="method">DELETE</span> <span class="url">/api/users/{id}</span> - Delete user
            </div>
        </div>
        
        <h2>Sample Users</h2>
        <p>Here are some sample users from the API:</p>
        
        <div class="user-card">
            <div class="user-name">John Doe</div>
            <div class="user-email">john@example.com</div>
            <div class="user-id">ID: 1 | Created: 2024-01-01</div>
        </div>
        
        <div class="user-card">
            <div class="user-name">Jane Smith</div>
            <div class="user-email">jane@example.com</div>
            <div class="user-id">ID: 2 | Created: 2024-01-02</div>
        </div>
        
        <div class="user-card">
            <div class="user-name">Bob Johnson</div>
            <div class="user-email">bob@example.com</div>
            <div class="user-id">ID: 3 | Created: 2024-01-03</div>
        </div>
        
        <h3>Testing the API</h3>
        <p>You can test the user API endpoints using tools like:</p>
        <ul>
            <li><strong>curl</strong> - Command line tool</li>
            <li><strong>Postman</strong> - GUI API testing tool</li>
            <li><strong>Insomnia</strong> - API client</li>
            <li><strong>Browser</strong> - For GET requests</li>
        </ul>
        
        <h4>Example curl commands:</h4>
        <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto;">
# Get all users
curl http://localhost:5000/api/users

# Create a new user
curl -X POST http://localhost:5000/api/users \\
  -H "Content-Type: application/json" \\
  -d '{"name": "Alice Brown", "email": "alice@example.com"}'

# Get user by ID
curl http://localhost:5000/api/users/1

# Update user
curl -X PUT http://localhost:5000/api/users/1 \\
  -H "Content-Type: application/json" \\
  -d '{"name": "John Updated", "email": "john.updated@example.com"}'

# Delete user
curl -X DELETE http://localhost:5000/api/users/1
        </pre>
    </div>
</body>
</html>
"""


@users_bp.route('/')
def users_page():
    """Users management page"""
    return render_template_string(USERS_TEMPLATE)


@users_bp.route('/profile')
def profile():
    """User profile page (placeholder)"""
    return render_template_string("""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>User Profile - Flask API</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; }
            .back-link { display: inline-block; margin-bottom: 20px; color: #007bff; text-decoration: none; }
            .back-link:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="container">
            <a href="/users" class="back-link">← Back to Users</a>
            <h1>👤 User Profile</h1>
            <p>This is a placeholder for user profile functionality.</p>
            <p>In a real application, this would show:</p>
            <ul>
                <li>User information</li>
                <li>Profile settings</li>
                <li>Account preferences</li>
                <li>Activity history</li>
            </ul>
        </div>
    </body>
    </html>
    """)


@users_bp.route('/settings')
def settings():
    """User settings page (placeholder)"""
    return render_template_string("""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>User Settings - Flask API</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background-color: #f5f5f5; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            h1 { color: #333; }
            .back-link { display: inline-block; margin-bottom: 20px; color: #007bff; text-decoration: none; }
            .back-link:hover { text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="container">
            <a href="/users" class="back-link">← Back to Users</a>
            <h1>⚙️ User Settings</h1>
            <p>This is a placeholder for user settings functionality.</p>
            <p>In a real application, this would include:</p>
            <ul>
                <li>Account settings</li>
                <li>Privacy preferences</li>
                <li>Notification settings</li>
                <li>Security options</li>
            </ul>
        </div>
    </body>
    </html>
    """)
