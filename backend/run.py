"""
Development server runner
"""
import os
from app import create_app
from config import Config

# Get environment from environment variable or default to development
env = os.environ.get('FLASK_ENV', 'development')

# Create app with appropriate configuration
app = create_app(Config)

if __name__ == '__main__':
    # Get configuration from environment variables
    # host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    
    print(f"🚀 Starting Flask server...")
    print(f"Environment: {env}")
    print(f"Debug mode: {debug}")
    # print(f"Server: http://{host}:{port}")
    # print(f"API docs: http://{host}:{port}/api/status")
    print("Press Ctrl+C to stop the server")
    
    app.run(port=port, debug=debug)
