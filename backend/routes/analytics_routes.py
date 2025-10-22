from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models import AnomalyScore, FlaggedActivity, UserLog, RuleBasedDetection, User
from datetime import datetime, timedelta
from services.detection import compute_anomaly_scores
from services.rule_detection import RuleBasedDetection as RuleDetector

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

        # Only return anomaly scores for users that exist in the users table
        query = AnomalyScore.query.join(User, AnomalyScore.user_id == User.user_id).filter(AnomalyScore.created_at >= start_date)

        if user_id:
            query = query.filter_by(user_id=user_id)

        if risk_level:
            query = query.filter_by(risk_level=risk_level)

        scores = query.order_by(AnomalyScore.created_at.desc()).all()

        # Convert to dicts for the API and detect whether enrichment is needed
        score_dicts = [s.to_dict() for s in scores]
        need_enrich = any(not d.get('explanation') or 'Auto-generated risk' in (d.get('explanation') or '') for d in score_dicts)

        # If some rows look like legacy seeded rows (Auto-generated risk...) then run the baseline detector once
        # and merge enriched structured fields for matching users. This avoids showing the old seed text.
        if need_enrich:
            try:
                enriched = compute_anomaly_scores(days=30, obs_hours=24)
                # Build map user_id -> latest enriched record
                enrich_map = {}
                for e in enriched:
                    uid = e.get('user_id')
                    if uid is None:
                        continue
                    # prefer highest risk_score per user
                    existing = enrich_map.get(uid)
                    if not existing or int(e.get('risk_score', 0)) > int(existing.get('risk_score', 0)):
                        enrich_map[uid] = e

                # Merge into score_dicts when missing structured fields
                for d in score_dicts:
                    if (not d.get('explanation') or 'Auto-generated risk' in (d.get('explanation') or '')):
                        em = enrich_map.get(d.get('user_id'))
                        if em:
                            # Merge selected fields
                            for key in ('per_feature_stats', 'causes_detail', 'std_pct', 'deviation_pct', 'findings', 'explanation'):
                                if em.get(key) is not None:
                                    d[key] = em.get(key)
            except Exception:
                # If enrichment fails, fall back to seeded rows unchanged
                pass

        return jsonify(score_dicts), 200
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
            UserLog.log_timestamp >= start_date
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


@bp.route('/run-detection', methods=['POST'])
@jwt_required()
def run_detection():
    """Manual trigger to run detection (protected)
    Note: In production restrict this endpoint to admins only.
    """
    try:
        results = compute_anomaly_scores(days=30)
        return jsonify({'anomalies': results}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/top-anomalies', methods=['GET'])
@jwt_required()
def get_top_anomalies():
    try:
        top = request.args.get('top', 15, type=int)
        min_score = request.args.get('min_score', 0, type=int)
        days = request.args.get('days', 30, type=int)

        start_date = datetime.utcnow() - timedelta(days=days)

        # Get recent RuleBasedDetection (only for users that exist in users table)
        rule_q = RuleBasedDetection.query.join(User, RuleBasedDetection.user_id == User.user_id).filter(
            RuleBasedDetection.detected_at >= start_date,
            RuleBasedDetection.risk_score >= min_score
        ).order_by(RuleBasedDetection.detected_at.desc()).limit(top)
        rule_rows = rule_q.all()

        # Get fallback/legacy AnomalyScore rows (only for existing users)
        as_q = AnomalyScore.query.join(User, AnomalyScore.user_id == User.user_id).filter(
            AnomalyScore.created_at >= start_date,
            AnomalyScore.risk_score >= min_score
        ).order_by(AnomalyScore.created_at.desc()).limit(top)
        as_rows = as_q.all()

        # Normalize to a common shape and merge-sort by timestamp
        unified = []
        for r in rule_rows:
            d = r.to_dict()
            d['source'] = 'rule_detection'
            d['timestamp'] = d.get('detected_at')
            unified.append(d)

        for r in as_rows:
            d = r.to_dict()
            d['source'] = 'anomaly_score'
            d['timestamp'] = d.get('created_at')
            unified.append(d)

        # Sort by timestamp desc and dedupe by (user_id, session_id, triggered_rules) keeping highest risk_score
        grouped = {}
        for d in unified:
            key = (d.get('user_id'), d.get('session_id'), d.get('triggered_rules'))
            existing = grouped.get(key)
            if not existing or (d.get('risk_score', 0) > existing.get('risk_score', 0)):
                grouped[key] = d

        unified_top = sorted(grouped.values(), key=lambda x: x.get('timestamp') or '', reverse=True)[:top]

        return jsonify({'anomalies': unified_top}), 200
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


@bp.route('/rule-based-detections', methods=['GET'])
@jwt_required()
def get_rule_based_detections():
    """Get rule-based detections"""
    try:
        days = request.args.get('days', 7, type=int)
        top = request.args.get('top', 50, type=int)
        min_score = request.args.get('min_score', 0, type=int)
        
        start_date = datetime.utcnow() - timedelta(days=days)
        
        query = RuleBasedDetection.query.filter(
            RuleBasedDetection.detected_at >= start_date,
            RuleBasedDetection.risk_score >= min_score
        ).order_by(RuleBasedDetection.detected_at.desc()).limit(top)
        
        detections = query.all()
        
        return jsonify({
            'detections': [d.to_dict() for d in detections]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/run-rule-detection', methods=['POST'])
@jwt_required()
def run_rule_detection():
    """Manual trigger to run rule-based detection"""
    try:
        detector = RuleDetector()
        
        data = request.json or {}
        window_hours = data.get('window_hours', 24)
        force_reprocess = data.get('force_reprocess', False)
        
        detections = detector.run_detection_for_all_users(
            window_hours=window_hours,
            force_reprocess=force_reprocess
        )
        
        saved = []
        skipped = 0
        
        # Build a set of (user_id, session_id) we've already saved in THIS run
        saved_sessions = set()
        
        for d in detections:
            session_key = (d['user_id'], d['session_id'])
            
            # Skip if we already saved this session in THIS run
            if session_key in saved_sessions:
                print(f"⏭️  Skipping duplicate in same run: user={d['user_id']}, session={d['session_id'][:12]}")
                skipped += 1
                continue
            
            # Build explanation from findings
            findings_list = []
            for f in d['findings']:
                findings_list.append(f"{f['name']}: {f['description']} (+{f['points']} pts)")
            
            explanation = ' | '.join(findings_list)
            triggered_rules = d.get('triggered_rules', '')
            # If the detector provided per-feature stats or causes, append them to the explanation
            per_feat = d.get('per_feature_stats') or d.get('std_devs')
            if per_feat:
                try:
                    stats_parts = []
                    for k, v in per_feat.items():
                        if isinstance(v, dict):
                            mean = v.get('mean', v)
                            std = v.get('std', 'N/A')
                            stats_parts.append(f"{k}: mean={mean}, std={std}")
                        else:
                            stats_parts.append(f"{k}: {v}")
                    stats_str = ', '.join(stats_parts)
                    explanation = explanation + ' | Per-feature: ' + stats_str
                except Exception:
                    pass
            
            # Create new detection record
            detection = RuleBasedDetection(
                user_id=d['user_id'],
                session_id=d['session_id'],
                last_analyzed_log_id=d.get('last_analyzed_log_id'),
                risk_score=d['risk_score'],
                risk_level=d['risk_level'],
                triggered_rules=triggered_rules,
                explanation=explanation,
                detected_at=d['detected_at']
            )
            db.session.add(detection)
            saved.append(d)
            saved_sessions.add(session_key)
        
        db.session.commit()
        
        return jsonify({
            'message': f'Detection completed. {len(saved)} new alerts, {skipped} duplicates skipped.',
            'detections': saved,
            'total_analyzed': len(detections),
            'new_alerts': len(saved),
            'skipped_duplicates': skipped
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
