import os
from app import create_app
from config import Config

# Create the Flask app instance for WSGI
app = create_app(Config)

# Expose the Flask app as WSGI callable for Gunicorn/uwsgi
# gunicorn command example: gunicorn -w 4 -b 0.0.0.0:8000 wsgi:app

if __name__ == "__main__":
    # Optional local run for debugging this entrypoint
    app.run(host="0.0.0.0", port=8000)


