from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from extensions import db, bcrypt
from models import User, Session
from services.activity_logger import ActivityLogger
import uuid
from datetime import datetime

bp = Blueprint('auth', __name__, url_prefix='/api/auth')
logger = ActivityLogger()

def get_current_user_id():
    """Helper to get user ID as integer from JWT"""
    return int(get_jwt_identity())

@bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Check if user already exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 409
        
        # Hash password
        password_hash = bcrypt.generate_password_hash(data['password']).decode('utf-8')
        
        # Create new user
        new_user = User(
            username=data['username'],
            password_hash=password_hash,
            role_id=data.get('role_id', 3)  # Default to Employee role
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            'message': 'User registered successfully',
            'user': new_user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return JWT token"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Username and password are required'}), 400
        
        # Find user
        user = User.query.filter_by(username=data['username']).first()
        
        if not user or not bcrypt.check_password_hash(user.password_hash, data['password']):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Create JWT token
        access_token = create_access_token(identity=str(user.user_id))
        
        # Create session
        session_id = str(uuid.uuid4())
        
        new_session = Session(
            session_id=session_id,
            user_id=user.user_id
        )
        db.session.add(new_session)
        db.session.commit()
        
        # Log the login activity
        logger.log_activity(
            user_id=user.user_id,
            session_id=session_id,
            action_type='Login',
            target_resource='auth',
            request=request
        )
        
        return jsonify({
            'message': 'Login successful',
            'token': access_token,
            'access_token': access_token,  # For compatibility
            'session_id': session_id,
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Log out user and end session"""
    try:
        user_id = get_current_user_id()
        data = request.get_json()
        session_id = data.get('session_id')
        
        if session_id:
            session = Session.query.get(session_id)
            if session and session.user_id == user_id:
                session.is_active = False
                session.end_time = datetime.utcnow()
                db.session.commit()
                
                # Log the logout activity
                logger.log_activity(
                    user_id=user_id,
                    session_id=session_id,
                    action_type='Logout',
                    target_resource='auth',
                    request=request
                )
        
        return jsonify({'message': 'Logout successful'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user info"""
    try:
        user_id = get_current_user_id()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify(user.to_dict()), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
