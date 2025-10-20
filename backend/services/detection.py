from datetime import datetime, timedelta
from collections import defaultdict
import math

from extensions import db
from models import UserLog, User, Role, AnomalyScore, FlaggedActivity


def compute_features(logs):
    # Simple feature vector for a list of UserLog rows
    total_actions = len(logs)
    logins = sum(1 for l in logs if l.action_type == 'Login')
    unique_ips = len(set(l.ip_address for l in logs if l.ip_address))
    sessions = defaultdict(int)
    for l in logs:
        sessions[l.session_id] += 1
    actions_per_session = (sum(sessions.values()) / len(sessions)) if sessions else 0
    outside_hours = sum(1 for l in logs if l.log_timestamp and (l.log_timestamp.hour < 6 or l.log_timestamp.hour > 22))
    outside_fraction = (outside_hours / total_actions) if total_actions else 0
    return {
        'total_actions': total_actions,
        'logins': logins,
        'unique_ips': unique_ips,
        'actions_per_session': actions_per_session,
        'outside_fraction': outside_fraction
    }


def robust_std(values):
    # fallback to std with small epsilon
    if not values:
        return 0.0
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    return math.sqrt(variance) or 1.0


def zscore(value, mean, std):
    if std == 0:
        return 0.0
    return (value - mean) / std


def percentile_map(x, samples):
    # Map z-like aggregate to 0-100 roughly using empirical percentile
    if not samples:
        return 0
    less = sum(1 for s in samples if s <= x)
    return int(100.0 * less / len(samples))


def compute_anomaly_scores(days=30):
    """Compute anomaly scores for users.

    Baseline: previous `days` excluding today.
    Observation window: last 24 hours.
    Compare per-user baseline vs observation, also compare with role peers.
    Persist AnomalyScore and FlaggedActivity for high scores.
    """
    now = datetime.utcnow()
    start_baseline = now - timedelta(days=days + 1)
    end_baseline = now - timedelta(days=1)
    obs_start = now - timedelta(hours=24)

    # Collect baseline features per user
    users = User.query.all()
    baseline_features = {}
    for u in users:
        logs = UserLog.query.filter(UserLog.user_id == u.user_id, UserLog.log_timestamp >= start_baseline, UserLog.log_timestamp < end_baseline).all()
        baseline_features[u.user_id] = compute_features(logs)

    # Collect peer stats per role
    role_features = defaultdict(list)
    for u in users:
        role = u.role.role_name if u.role else 'unknown'
        f = baseline_features.get(u.user_id) or {}
        role_features[role].append(f)

    # For each user, compute observation features and compare
    anomaly_records = []
    aggregate_samples = []

    for u in users:
        obs_logs = UserLog.query.filter(UserLog.user_id == u.user_id, UserLog.log_timestamp >= obs_start).all()
        obs_f = compute_features(obs_logs)
        base_f = baseline_features.get(u.user_id) or {'total_actions':0,'logins':0,'unique_ips':0,'actions_per_session':0,'outside_fraction':0}

        role = u.role.role_name if u.role else 'unknown'
        # compute per-feature z-scores vs user baseline
        z_scores = []
        for key in ['total_actions','logins','unique_ips','actions_per_session','outside_fraction']:
            base_val = base_f.get(key, 0)
            obs_val = obs_f.get(key, 0)
            # build sample for user baseline - use small sample of repeated base_val
            std = 1.0
            mean = base_val
            z = zscore(obs_val, mean, std)
            z_scores.append(abs(z))

        # Compare vs peer group: compute mean/std across peers for each feature
        peer_samples = role_features.get(role, [])
        peer_means = {}
        peer_stds = {}
        for key in ['total_actions','logins','unique_ips','actions_per_session','outside_fraction']:
            vals = [p.get(key,0) for p in peer_samples if p]
            peer_means[key] = sum(vals)/len(vals) if vals else 0
            peer_stds[key] = robust_std(vals)

        peer_zs = []
        for key in ['total_actions','logins','unique_ips','actions_per_session','outside_fraction']:
            obs_val = obs_f.get(key,0)
            mean = peer_means.get(key,0)
            std = peer_stds.get(key,1.0)
            peer_zs.append(abs(zscore(obs_val, mean, std)))

        # Combine z-scores (weighted)
        combined = 0.6 * (sum(z_scores)/len(z_scores)) + 0.4 * (sum(peer_zs)/len(peer_zs))

        # Map combined to 0-100 using an empirical heuristic
        # We'll build aggregate_samples later; for now store combined
        aggregate_samples.append(combined)
        anomaly_records.append((u, combined, obs_f))

    # Convert combined values to percentiles 0-100
    sorted_samples = sorted(aggregate_samples)
    results = []
    for (u, combined, obs_f) in anomaly_records:
        pct = percentile_map(combined, sorted_samples)
        score = pct
        if score >= 90:
            level = 'High Alert'
        elif score >= 70:
            level = 'Medium Alert'
        elif score >= 40:
            level = 'Low Alert'
        else:
            level = 'Normal'

        explanation = f"Deviation score {combined:.2f}, percentile {pct}"

        # Persist AnomalyScore
        try:
            a = AnomalyScore(user_id=u.user_id, session_id=None, risk_score=score, risk_level=level, explanation=explanation)
            db.session.add(a)
            db.session.flush()
            results.append(a)

            # Flag any underlying logs if very high
            if score >= 90 and obs_f.get('total_actions',0) > 0:
                recent_logs = UserLog.query.filter(UserLog.user_id==u.user_id, UserLog.log_timestamp>=obs_start).all()
                for rl in recent_logs:
                    # mark the underlying log as flagged so the user_logs view/table reflects it
                    try:
                        rl.is_flagged = True
                        db.session.add(rl)
                    except Exception:
                        pass
                    flag = FlaggedActivity(log_id=rl.log_id, reason='High anomaly score', severity='High')
                    db.session.add(flag)

        except Exception as e:
            db.session.rollback()
            print('Error persisting anomaly score:', e)

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print('Error committing anomaly scores:', e)

    return [r.to_dict() for r in results]
