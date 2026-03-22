"""
API endpoint tests
"""
import pytest
from app import create_app
from config import TestingConfig


@pytest.fixture
def app():
    """Create test application"""
    app = create_app(TestingConfig)
    return app


@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()


def test_health_check(client):
    """Test health check endpoint"""
    response = client.get('/health')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'healthy'


def test_api_status(client):
    """Test API status endpoint"""
    response = client.get('/api/status')
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'active'


def test_get_users(client):
    """Test get all users endpoint"""
    response = client.get('/api/users')
    assert response.status_code == 200
    data = response.get_json()
    assert 'users' in data
    assert 'count' in data


def test_create_user(client):
    """Test create user endpoint"""
    user_data = {
        'name': 'Test User',
        'email': 'test@example.com'
    }
    response = client.post('/api/users', json=user_data)
    assert response.status_code == 201
    data = response.get_json()
    assert data['message'] == 'User created successfully'
    assert 'user' in data


def test_create_user_missing_data(client):
    """Test create user with missing data"""
    response = client.post('/api/users', json={})
    assert response.status_code == 400
    data = response.get_json()
    assert 'error' in data


def test_get_user_by_id(client):
    """Test get user by ID endpoint"""
    response = client.get('/api/users/1')
    assert response.status_code == 200
    data = response.get_json()
    assert 'user' in data


def test_get_nonexistent_user(client):
    """Test get nonexistent user"""
    response = client.get('/api/users/999')
    assert response.status_code == 404
    data = response.get_json()
    assert 'error' in data


def test_home_page(client):
    """Test home page"""
    response = client.get('/')
    assert response.status_code == 200
    assert b'Flask API Server' in response.data


def test_users_page(client):
    """Test users page"""
    response = client.get('/users')
    assert response.status_code == 200
    assert b'Users Management' in response.data
