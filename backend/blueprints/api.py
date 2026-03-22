"""
API blueprint for REST endpoints
"""
from flask import Blueprint, jsonify, request
from datetime import datetime

api_bp = Blueprint('api', __name__)

# Sample data store (in production, use a database)
users = [
    {'id': 1, 'name': 'John Doe', 'email': 'john@example.com', 'created_at': '2024-01-01T00:00:00Z'},
    {'id': 2, 'name': 'Jane Smith', 'email': 'jane@example.com', 'created_at': '2024-01-02T00:00:00Z'},
    {'id': 3, 'name': 'Bob Johnson', 'email': 'bob@example.com', 'created_at': '2024-01-03T00:00:00Z'}
]

posts = [
    {'id': 1, 'title': 'First Post', 'content': 'This is the first post', 'author_id': 1, 'created_at': '2024-01-01T00:00:00Z'},
    {'id': 2, 'title': 'Second Post', 'content': 'This is the second post', 'author_id': 2, 'created_at': '2024-01-02T00:00:00Z'},
    {'id': 3, 'title': 'Third Post', 'content': 'This is the third post', 'author_id': 1, 'created_at': '2024-01-03T00:00:00Z'}
]


@api_bp.route('/status')
def api_status():
    """API status endpoint"""
    return jsonify({
        'status': 'active',
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'version': '1.0.0',
        'endpoints': {
            'users': '/api/users',
            'posts': '/api/posts',
            'status': '/api/status'
        }
    })


# User endpoints
@api_bp.route('/users', methods=['GET'])
def get_users():
    """Get all users"""
    return jsonify({
        'users': users,
        'count': len(users)
    })


@api_bp.route('/users', methods=['POST'])
def create_user():
    """Create a new user"""
    data = request.get_json()
    
    if not data or 'name' not in data or 'email' not in data:
        return jsonify({'error': 'Name and email are required'}), 400
    
    # Generate new ID
    new_id = max([user['id'] for user in users]) + 1 if users else 1
    
    new_user = {
        'id': new_id,
        'name': data['name'],
        'email': data['email'],
        'created_at': datetime.utcnow().isoformat() + 'Z'
    }
    
    users.append(new_user)
    
    return jsonify({
        'message': 'User created successfully',
        'user': new_user
    }), 201


@api_bp.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Get a specific user by ID"""
    user = next((user for user in users if user['id'] == user_id), None)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user})


@api_bp.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    """Update a specific user by ID"""
    user = next((user for user in users if user['id'] == user_id), None)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Update user fields
    if 'name' in data:
        user['name'] = data['name']
    if 'email' in data:
        user['email'] = data['email']
    
    return jsonify({
        'message': 'User updated successfully',
        'user': user
    })


@api_bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    """Delete a specific user by ID"""
    global users
    user = next((user for user in users if user['id'] == user_id), None)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    users = [user for user in users if user['id'] != user_id]
    
    return jsonify({'message': 'User deleted successfully'})


# Post endpoints
@api_bp.route('/posts', methods=['GET'])
def get_posts():
    """Get all posts"""
    return jsonify({
        'posts': posts,
        'count': len(posts)
    })


@api_bp.route('/posts', methods=['POST'])
def create_post():
    """Create a new post"""
    data = request.get_json()
    
    if not data or 'title' not in data or 'content' not in data or 'author_id' not in data:
        return jsonify({'error': 'Title, content, and author_id are required'}), 400
    
    # Check if author exists
    author = next((user for user in users if user['id'] == data['author_id']), None)
    if not author:
        return jsonify({'error': 'Author not found'}), 400
    
    # Generate new ID
    new_id = max([post['id'] for post in posts]) + 1 if posts else 1
    
    new_post = {
        'id': new_id,
        'title': data['title'],
        'content': data['content'],
        'author_id': data['author_id'],
        'created_at': datetime.utcnow().isoformat() + 'Z'
    }
    
    posts.append(new_post)
    
    return jsonify({
        'message': 'Post created successfully',
        'post': new_post
    }), 201


@api_bp.route('/posts/<int:post_id>', methods=['GET'])
def get_post(post_id):
    """Get a specific post by ID"""
    post = next((post for post in posts if post['id'] == post_id), None)
    
    if not post:
        return jsonify({'error': 'Post not found'}), 404
    
    return jsonify({'post': post})
