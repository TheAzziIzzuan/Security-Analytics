from app import app
from services.rule_detection import RuleBasedDetection
from extensions import db
from models import RuleBasedDetection as RModel

with app.app_context():
    detector = RuleBasedDetection()
    detections = detector.run_detection_for_all_users(window_hours=48, force_reprocess=True)
    print('Computed detections:', len(detections))
    saved = 0
    for d in detections:
        existing = RModel.query.filter_by(user_id=d['user_id'], session_id=d['session_id'], detected_at=d['detected_at']).first()
        if existing:
            continue
        rec = RModel(
            user_id=d['user_id'],
            session_id=d['session_id'],
            last_analyzed_log_id=d.get('last_analyzed_log_id'),
            risk_score=d['risk_score'],
            risk_level=d['risk_level'],
            triggered_rules=d.get('triggered_rules',''),
            explanation=d.get('explanation',''),
            detected_at=d['detected_at']
        )
        db.session.add(rec)
        saved += 1
    db.session.commit()
    print('Saved to DB:', saved)
