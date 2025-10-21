from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db, bcrypt
from models import User, Role
from services.activity_logger import ActivityLogger

bp = Blueprint('users', __name__, url_prefix='/api/users')
logger = ActivityLogger()

def get_current_user_id():
    """Helper to get user ID as integer from JWT"""
    return int(get_jwt_identity())

@bp.route('/', methods=['GET'])
@jwt_required()
def get_users():
    """Get all users"""
    try:
        user_id = get_current_user_id()
        
        users = User.query.all()
        
        # Log the view activity
        logger.log_activity(
            user_id=user_id,
            session_id=request.headers.get('X-Session-Id'),
            action_type='View',
            target_resource='users',
            request=request
        )
        
        return jsonify([user.to_dict() for user in users]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    """Get specific user by ID"""
    try:
        current_user_id = get_current_user_id()
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Log the view activity
        logger.log_activity(
            user_id=current_user_id,
            session_id=request.headers.get('X-Session-Id'),
            action_type='View',
            target_resource=f'users/{user_id}',
            request=request
        )
        
        return jsonify(user.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    """Update user information"""
    try:
        current_user_id = get_current_user_id()
        data = request.get_json()
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Prevent supervisor from changing their own role
        if user_id == current_user_id and 'role_id' in data:
            current_user = User.query.get(current_user_id)
            if current_user and current_user.role_id == 2:  # 2 is Supervisor role
                return jsonify({'error': 'You cannot change your own role'}), 403
        
        # Update fields
        if 'role_id' in data:
            user.role_id = data['role_id']
        if 'password' in data and data['password']:
            user.password_hash = bcrypt.generate_password_hash(data['password']).decode('utf-8')
        
        db.session.commit()
        
        # Log the update activity
        logger.log_activity(
            user_id=current_user_id,
            session_id=request.headers.get('X-Session-Id'),
            action_type='Update',
            target_resource=f'users/{user_id}',
            request=request
        )
        
        return jsonify({
            'message': 'User updated successfully',
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    """Delete user (hard delete since is_active doesn't exist)"""
    try:
        current_user_id = get_current_user_id()
        
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if trying to delete self
        if user_id == current_user_id:
            return jsonify({'error': 'Cannot delete your own account'}), 400
        
        # Hard delete - remove from database
        db.session.delete(user)
        db.session.commit()
        
        # Log the delete activity
        logger.log_activity(
            user_id=current_user_id,
            session_id=request.headers.get('X-Session-Id'),
            action_type='Delete',
            target_resource=f'users/{user_id}',
            request=request
        )
        
        return jsonify({'message': 'User deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/roles', methods=['GET'])
@jwt_required()
def get_roles():
    """Get all roles"""
    try:
        roles = Role.query.all()
        return jsonify([role.to_dict() for role in roles]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
