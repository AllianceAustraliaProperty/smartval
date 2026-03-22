# Flask API Backend

A modern Flask application built with best practices, featuring blueprints, configuration management, and a clean project structure.

## 🚀 Features

- **Application Factory Pattern** - Clean, scalable app initialization
- **Blueprint Architecture** - Modular route organization
- **Configuration Management** - Environment-based settings
- **RESTful API** - Complete CRUD operations for users and posts
- **Error Handling** - Proper HTTP status codes and error responses
- **Development Server** - Easy-to-use development setup
- **Sample Data** - Pre-populated with example users and posts

## 📁 Project Structure

```
backend/
├── app.py                 # Application factory
├── config.py             # Configuration management
├── run.py                # Development server runner
├── requirements.txt      # Python dependencies
├── env.example          # Environment variables template
├── README.md            # This file
└── blueprints/          # Blueprint modules
    ├── __init__.py
    ├── main.py          # Main routes (home, health, about)
    ├── api.py           # REST API endpoints
    └── users.py         # User-related web pages
```

## 🛠️ Setup Instructions

### 1. Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Virtual environment (recommended)

### 2. Installation

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment:**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   ```bash
   # Copy the example environment file
   copy env.example .env  # Windows
   cp env.example .env    # macOS/Linux
   
   # Edit .env file with your configuration
   ```

### 3. Running the Application

**Option 1: Using the development runner (recommended):**
```bash
python run.py
```

**Option 2: Using Flask directly:**
```bash
python app.py
```

**Option 3: Using Flask CLI:**
```bash
flask run --host=0.0.0.0 --port=5000
```

The server will start at `http://localhost:5000`

## 🌐 API Endpoints

### Main Routes
- `GET /` - Home page with API documentation
- `GET /health` - Health check endpoint
- `GET /about` - About information

### User Management
- `GET /users` - Users management page
- `GET /users/profile` - User profile page
- `GET /users/settings` - User settings page

### REST API
- `GET /api/status` - API status and information
- `GET /api/users` - Get all users
- `POST /api/users` - Create a new user
- `GET /api/users/{id}` - Get user by ID
- `PUT /api/users/{id}` - Update user
- `DELETE /api/users/{id}` - Delete user
- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create a new post
- `GET /api/posts/{id}` - Get post by ID

## 📝 API Usage Examples

### Get all users
```bash
curl http://localhost:5000/api/users
```

### Create a new user
```bash
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice Brown", "email": "alice@example.com"}'
```

### Get user by ID
```bash
curl http://localhost:5000/api/users/1
```

### Update user
```bash
curl -X PUT http://localhost:5000/api/users/1 \
  -H "Content-Type: application/json" \
  -d '{"name": "John Updated", "email": "john.updated@example.com"}'
```

### Delete user
```bash
curl -X DELETE http://localhost:5000/api/users/1
```

### Create a new post
```bash
curl -X POST http://localhost:5000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"title": "My First Post", "content": "This is my first post!", "author_id": 1}'
```

## ⚙️ Configuration

The application uses environment-based configuration. Key settings:

- `FLASK_ENV` - Environment (development, production, testing)
- `FLASK_DEBUG` - Debug mode (True/False)
- `FLASK_HOST` - Server host (default: 0.0.0.0)
- `FLASK_PORT` - Server port (default: 5000)
- `SECRET_KEY` - Flask secret key for sessions
- `MONGODB_URI` - MongoDB connection string
- `CORS_ORIGINS` - Allowed CORS origins (comma-separated)

## 🧪 Testing

Run tests using pytest:
```bash
pytest
```

Run tests with coverage:
```bash
pytest --cov=.
```

## 🔧 Development

### Code Formatting
```bash
# Format code with black
black .

# Sort imports with isort
isort .

# Lint with flake8
flake8 .
```

### Adding New Blueprints

1. Create a new file in `blueprints/` directory
2. Define your blueprint with routes
3. Register the blueprint in `app.py`

Example:
```python
# blueprints/products.py
from flask import Blueprint

products_bp = Blueprint('products', __name__)

@products_bp.route('/products')
def get_products():
    return {'products': []}
```

Then register in `app.py`:
```python
from blueprints.products import products_bp
app.register_blueprint(products_bp, url_prefix='/api')
```

## 🚀 Production Deployment

1. Set `FLASK_ENV=production` in your environment
2. Set a strong `SECRET_KEY`
3. Configure proper database connection
4. Use a production WSGI server like Gunicorn
5. Set up proper logging and monitoring

## 📚 Next Steps

- Add database models with SQLAlchemy or MongoDB ODM
- Implement user authentication and authorization
- Add input validation and serialization
- Set up logging and monitoring
- Add API documentation with Swagger/OpenAPI
- Implement rate limiting and security headers
- Add unit and integration tests
- Set up CI/CD pipeline

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
