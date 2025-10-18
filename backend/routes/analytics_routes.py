from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import AnomalyScore, FlaggedActivity, UserLog
from datetime import datetime, timedelta

bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

def get_current_user_id():
    """Helper to get user ID as integer from JWT"""
    return int(get_jwt_identity())

@bp.route('/anomaly-scores', methods=['GET'])
@jwt_required()
def get_anomaly_scores():
    """Get anomaly detection scores"""
    try:
        # Get query parameters
        user_id = request.args.get('user_id', type=int)
        risk_level = request.args.get('risk_level')
        days = request.args.get('days', 30, type=int)
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        query = AnomalyScore.query.filter(AnomalyScore.created_at >= start_date)
        
        if user_id:
            query = query.filter_by(user_id=user_id)
        
        if risk_level:
            query = query.filter_by(risk_level=risk_level)
        
        scores = query.order_by(AnomalyScore.created_at.desc()).all()
        
        return jsonify([score.to_dict() for score in scores]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/flagged-activities', methods=['GET'])
@jwt_required()
def get_flagged_activities():
    """Get flagged suspicious activities"""
    try:
        # Get query parameters
        severity = request.args.get('severity')
        days = request.args.get('days', 30, type=int)
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        query = FlaggedActivity.query.filter(FlaggedActivity.flagged_at >= start_date)
        
        if severity:
            query = query.filter_by(severity=severity)
        
        activities = query.order_by(FlaggedActivity.flagged_at.desc()).all()
        
        return jsonify([activity.to_dict() for activity in activities]), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/dashboard-stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    """Get dashboard statistics for analytics"""
    try:
        user_id = get_current_user_id()
        days = request.args.get('days', 7, type=int)
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get total activities
        total_activities = UserLog.query.filter(
            UserLog.timestamp >= start_date
        ).count()
        
        # Get high risk alerts
        high_risk_alerts = AnomalyScore.query.filter(
            AnomalyScore.created_at >= start_date,
            AnomalyScore.risk_level == 'High Alert'
        ).count()
        
        # Get flagged activities by severity
        flagged_critical = FlaggedActivity.query.filter(
            FlaggedActivity.flagged_at >= start_date,
            FlaggedActivity.severity == 'Critical'
        ).count()
        
        flagged_high = FlaggedActivity.query.filter(
            FlaggedActivity.flagged_at >= start_date,
            FlaggedActivity.severity == 'High'
        ).count()
        
        # Get recent anomaly scores
        recent_scores = AnomalyScore.query.filter(
            AnomalyScore.created_at >= start_date
        ).order_by(AnomalyScore.created_at.desc()).limit(10).all()
        
        return jsonify({
            'period_days': days,
            'total_activities': total_activities,
            'high_risk_alerts': high_risk_alerts,
            'flagged_critical': flagged_critical,
            'flagged_high': flagged_high,
            'recent_anomaly_scores': [score.to_dict() for score in recent_scores]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/user-risk-profile/<int:user_id>', methods=['GET'])
@jwt_required()
def get_user_risk_profile(user_id):
    """Get risk profile for specific user"""
    try:
        days = request.args.get('days', 30, type=int)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Get anomaly scores for user
        scores = AnomalyScore.query.filter(
            AnomalyScore.user_id == user_id,
            AnomalyScore.created_at >= start_date
        ).order_by(AnomalyScore.created_at.desc()).all()
        
        # Calculate average risk score
        if scores:
            avg_score = sum(float(s.risk_score) for s in scores) / len(scores)
        else:
            avg_score = 0
        
        # Get flagged activities
        flagged = db.session.query(FlaggedActivity).join(UserLog).filter(
            UserLog.user_id == user_id,
            FlaggedActivity.flagged_at >= start_date
        ).all()
        
        return jsonify({
            'user_id': user_id,
            'period_days': days,
            'average_risk_score': round(avg_score, 2),
            'total_anomaly_detections': len(scores),
            'total_flagged_activities': len(flagged),
            'recent_scores': [score.to_dict() for score in scores[:10]]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
