from extensions import db
from models import AnomalyScore, User

q = AnomalyScore.query.join(User, AnomalyScore.user_id==User.user_id).order_by(AnomalyScore.created_at.desc()).limit(30).all()
print('Found', len(q), 'AnomalyScore rows joined to users (most recent 30):')
for a in q:
    expl = a.explanation or ''
    print(a.score_id, a.user_id, float(a.risk_score) if a.risk_score else None, a.created_at.isoformat() if a.created_at else None)
    print('  expl:', repr(expl)[:400])
print('\n-- end --')
