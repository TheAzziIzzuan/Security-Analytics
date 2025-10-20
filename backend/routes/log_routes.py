from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import UserLog, Session
from datetime import datetime, timedelta

bp = Blueprint('logs', __name__, url_prefix='/api/logs')

def get_current_user_id():
    """Helper to get user ID as integer from JWT"""
    return int(get_jwt_identity())

@bp.route('/', methods=['GET'])
@jwt_required()
def get_logs():
    """Get user activity logs with optional filters"""
    try:
        user_id = get_current_user_id()
        
        # Get query parameters
        target_user_id = request.args.get('user_id', type=int)
        action_type = request.args.get('action_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = request.args.get('limit', 100, type=int)
        
        query = UserLog.query
        
        # Apply filters
        if target_user_id:
            query = query.filter_by(user_id=target_user_id)
        
        if action_type:
            query = query.filter_by(action_type=action_type)
        
        if start_date:
            start = datetime.fromisoformat(start_date)
            query = query.filter(UserLog.log_timestamp >= start)
        
        if end_date:
            end = datetime.fromisoformat(end_date)
            query = query.filter(UserLog.log_timestamp <= end)
        
        # Order by most recent and limit
        logs = query.order_by(UserLog.log_timestamp.desc()).limit(limit).all()

        return jsonify([log.to_dict() for log in logs]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/sessions', methods=['GET'])
@jwt_required()
def get_sessions():
    """Get user sessions"""
    try:
        user_id = get_current_user_id()
        
        # Get query parameters
        target_user_id = request.args.get('user_id', type=int)
        active_only = request.args.get('active_only', 'false').lower() == 'true'
        
        query = Session.query
        
        if target_user_id:
            query = query.filter_by(user_id=target_user_id)
        
        if active_only:
            query = query.filter_by(is_active=True)
        
        sessions = query.order_by(Session.start_time.desc()).all()
        
        return jsonify([session.to_dict() for session in sessions]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/activity-summary', methods=['GET'])
@jwt_required()
def get_activity_summary():
    """Get summary of user activities"""
    try:
        user_id = request.args.get('user_id', type=int)
        days = request.args.get('days', 7, type=int)

        start_date = datetime.utcnow() - timedelta(days=days)

        query = UserLog.query.filter(UserLog.log_timestamp >= start_date)

        if user_id:
            query = query.filter_by(user_id=user_id)
        
        logs = query.all()
        
        # Aggregate by action type
        summary = {}
        for log in logs:
            action = log.action_type
            if action in summary:
                summary[action] += 1
            else:
                summary[action] = 1
        
        return jsonify({
            'period_days': days,
            'total_activities': len(logs),
            'by_action_type': summary
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
