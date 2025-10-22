from datetime import datetime, timedelta
from collections import defaultdict
import math

from extensions import db
from models import UserLog, User, Role, AnomalyScore, FlaggedActivity, RuleBasedDetection


def compute_features(logs):
    # Simple feature vector for a list of UserLog rows
    # Normalizes checks to lowercase and defensive-access of attributes
    total_actions = len(logs)
    logins = sum(1 for l in logs if getattr(l, 'action_type', '') and l.action_type.lower() == 'login')
    # failed login variations (rule detector checks lower-case variants elsewhere)
    failed_login_terms = {'loginfail', 'login_fail', 'failed_login', 'failed login', 'login_failed', 'loginfail'}
    failed_logins = 0
    for l in logs:
        at = getattr(l, 'action_type', '') or ''
        ad = getattr(l, 'action_detail', '') or ''
        al = at.lower()
        if al in failed_login_terms or ('login' in al and 'fail' in al) or ('failed' in ad.lower() and 'login' in ad.lower()):
            failed_logins += 1

    unique_ips = len(set(l.ip_address for l in logs if getattr(l, 'ip_address', None)))
    sessions = defaultdict(int)
    for l in logs:
        sessions[getattr(l, 'session_id', None)] += 1
    actions_per_session = (sum(sessions.values()) / len(sessions)) if sessions else 0
    outside_hours = sum(1 for l in logs if getattr(l, 'log_timestamp', None) and (l.log_timestamp.hour < 6 or l.log_timestamp.hour > 22))
    outside_fraction = (outside_hours / total_actions) if total_actions else 0

    # exports: action_type == 'export' or log_type indicates data access
    exports = sum(1 for l in logs if (getattr(l, 'action_type', '') or '').lower() == 'export' or (getattr(l, 'log_type', '') or '').lower() == 'data_access')

    # admin access heuristics: page_url or action_detail containing 'admin' or 'privilege' or 'sudo'
    admin_access = 0
    for l in logs:
        ad = (getattr(l, 'action_detail', '') or '').lower()
        pu = (getattr(l, 'page_url', '') or '').lower()
        at = (getattr(l, 'action_type', '') or '').lower()
        if 'admin' in ad or 'admin' in pu or 'privilege' in ad or 'sudo' in ad or at in ('assume_role', 'admin_access', 'elevate'):
            admin_access += 1

    return {
        'total_actions': total_actions,
        'logins': logins,
        'failed_logins': failed_logins,
        'unique_ips': unique_ips,
        'actions_per_session': actions_per_session,
        'outside_fraction': outside_fraction,
        'exports': exports,
        'admin_access': admin_access
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


def compute_anomaly_scores(days=30, obs_hours=24):
    """Compute anomaly scores for users.

    Baseline: previous `days` excluding today.
    Observation window: last `obs_hours` hours.
    Compare per-user baseline vs observation, also compare with role peers.
    Persist AnomalyScore and FlaggedActivity for high scores.
    """
    now = datetime.utcnow()
    start_baseline = now - timedelta(days=days + 1)
    end_baseline = now - timedelta(days=1)
    obs_start = now - timedelta(hours=obs_hours)

    # Collect baseline daily feature samples per user over the baseline window
    # Only include users who have at least one UserLog in the baseline or observation windows
    user_ids_with_logs = set()
    # logs in baseline window
    b_logs = db.session.query(UserLog.user_id).filter(UserLog.log_timestamp >= start_baseline, UserLog.log_timestamp < end_baseline).distinct().all()
    user_ids_with_logs.update([r[0] for r in b_logs])
    # logs in observation window
    o_logs = db.session.query(UserLog.user_id).filter(UserLog.log_timestamp >= obs_start).distinct().all()
    user_ids_with_logs.update([r[0] for r in o_logs])

    if not user_ids_with_logs:
        # nothing to analyze
        return []

    users = User.query.filter(User.user_id.in_(list(user_ids_with_logs))).all()
    per_user_daily = {}
    FEATURE_CONFIG = {
        'total_actions': {'code':'T2001','name': 'High Activity', 'z_threshold': 2.0, 'points': 20},
        'logins': {'code':'T2002','name': 'Login Anomaly', 'z_threshold': 2.0, 'points': 15},
        'unique_ips': {'code':'T2003','name': 'Session Anomaly', 'z_threshold': 2.0, 'points': 30},
        'actions_per_session': {'code':'T2004','name': 'High Session Density', 'z_threshold': 2.0, 'points': 10},
        'outside_fraction': {'code':'T2005','name': 'After-Hours Activity', 'z_threshold': 1.5, 'points': 25}
    }

    # add the new event-specific features with reasonable defaults
    FEATURE_CONFIG.update({
        'failed_logins': {'code': 'T3001', 'name': 'Failed Login Burst', 'z_threshold': 2.0, 'points': 30},
        'exports': {'code': 'T3002', 'name': 'Bulk Export Activity', 'z_threshold': 2.0, 'points': 40},
        'admin_access': {'code': 'T3003', 'name': 'Admin/Privilege Access', 'z_threshold': 1.5, 'points': 35}
    })

    # build per-user daily samples (list of dicts per day)
    day = start_baseline
    days_list = []
    while day < end_baseline:
        days_list.append(day)
        day = day + timedelta(days=1)

    for u in users:
        samples = []
        for d in days_list:
            d_start = d
            d_end = d + timedelta(days=1)
            logs = UserLog.query.filter(UserLog.user_id == u.user_id, UserLog.log_timestamp >= d_start, UserLog.log_timestamp < d_end).all()
            samples.append(compute_features(logs))
        per_user_daily[u.user_id] = samples

    # compute per-role peer samples by concatenating daily samples for users in role
    role_peer_samples = defaultdict(list)
    for u in users:
        role = u.role.role_name if u.role else 'unknown'
        role_peer_samples[role].extend(per_user_daily.get(u.user_id, []))

    # For each user, compute observation features and compare
    anomaly_records = []
    aggregate_samples = []
    out_records = []

    # helper to compute mean/std from list of daily samples for a feature
    def stats_from_samples(samples, key):
        vals = [s.get(key,0) for s in samples if s]
        if not vals:
            return 0.0, 0.0
        mean = sum(vals)/len(vals)
        std = robust_std(vals)
        return mean, std

    # process users
    for u in users:
        # observation window last 24h
        obs_logs = UserLog.query.filter(UserLog.user_id == u.user_id, UserLog.log_timestamp >= obs_start).all()
        obs_f = compute_features(obs_logs)

        role = u.role.role_name if u.role else 'unknown'
        daily_samples = per_user_daily.get(u.user_id, [])

        per_feature_findings = []
        feature_z_user = {}
        feature_z_peer = {}
        weighted_z_sum = 0.0
        weight_sum = 0.0

        for key, cfg in FEATURE_CONFIG.items():
            user_mean, user_std = stats_from_samples(daily_samples, key)
            peer_mean, peer_std = stats_from_samples(role_peer_samples.get(role, []), key)

            # handle degenerate std
            ustd = user_std if user_std and user_std > 0.001 else (1.0 if user_mean == 0 and obs_f.get(key,0) == 0 else 1.0)
            pstd = peer_std if peer_std and peer_std > 0.001 else (1.0 if peer_mean == 0 and obs_f.get(key,0) == 0 else 1.0)

            obs_val = obs_f.get(key, 0)
            z_user = abs(zscore(obs_val, user_mean, ustd))
            z_peer = abs(zscore(obs_val, peer_mean, pstd))

            feature_z_user[key] = z_user
            feature_z_peer[key] = z_peer

            # weight by cfg points
            pts = cfg.get('points', 10)
            weighted_z_sum += pts * max(z_user, z_peer)
            weight_sum += pts

            # create finding if exceeds threshold
            if z_user >= cfg.get('z_threshold', 2.0) or z_peer >= cfg.get('z_threshold', 2.0):
                # create concise reason
                if key == 'outside_fraction':
                    outside_count = int(obs_val * obs_f.get('total_actions', 0))
                    reason = f"{outside_count} action(s) outside working hours"
                elif key == 'actions_per_session':
                    reason = f"{obs_val:.1f} actions per session (high)"
                else:
                    reason = f"observed {obs_val} vs baseline {user_mean}"

                code = cfg.get('code')
                per_feature_findings.append({
                    'rule': key,
                    'code': code,
                    'name': cfg.get('name'),
                    'points': pts,
                    'value': obs_val,
                    'baseline': user_mean,
                    'z_user': z_user,
                    'z_peer': z_peer,
                    'reason': reason,
                    'description': f"{cfg.get('name')}: {reason} (z_user={z_user:.2f}, z_peer={z_peer:.2f})"
                })

    # combined weighted z normalized by weight_sum (raw combined value)
        combined = (weighted_z_sum / weight_sum) if weight_sum else 0.0

        # Keep aggregate of raw combined for percentile mapping; include z dicts for later scoring
        aggregate_samples.append(combined)
        # pick a representative session_id from observation logs (most common or latest)
        session_id = None
        if obs_logs:
            # count sessions and pick the session with most actions; fallback to last
            sess_counts = defaultdict(int)
            for l in obs_logs:
                sess_counts[getattr(l, 'session_id', None)] += 1
            try:
                session_id = max(sess_counts.items(), key=lambda x: (x[1] or 0, x[0]))[0]
            except Exception:
                session_id = obs_logs[-1].session_id if obs_logs else None

        anomaly_records.append((u, combined, obs_f, per_feature_findings, feature_z_user, feature_z_peer, session_id))

    # Convert combined values to percentiles 0-100
    sorted_samples = sorted(aggregate_samples)
    results = []
    # scoring improvements: combine empirical percentile with a normalized absolute scale
    MAX_Z_CAP = 6.0
    total_possible_points = sum(cfg.get('points', 10) for cfg in FEATURE_CONFIG.values())

    for (u, combined, obs_f, findings, fz_user, fz_peer, session_id) in anomaly_records:
        # empirical percentile
        pct = percentile_map(combined, sorted_samples)

        # normalized absolute percent: recompute by capping per-feature z to avoid extreme outliers
        # To do this we recompute a capped-weighted sum based on recorded feature z-values
        capped_weighted = 0.0
        for key, cfg in FEATURE_CONFIG.items():
            z_val = min(MAX_Z_CAP, max(fz_user.get(key, 0.0), fz_peer.get(key, 0.0)))
            pts = cfg.get('points', 10)
            capped_weighted += pts * z_val

        normalized_pct = 0
        if total_possible_points and MAX_Z_CAP:
            normalized_pct = int(100.0 * (capped_weighted / (total_possible_points * MAX_Z_CAP)))

        # combine scores: use the higher signal to be more sensitive
        score = max(int(pct), int(normalized_pct))

        # heuristic: if there is an obvious export burst, boost the score so it surfaces
        export_count = obs_f.get('exports', 0)
        EXPORT_BURST_THRESHOLD = 8
        if export_count >= EXPORT_BURST_THRESHOLD:
            # add an explicit finding if not already present
            found = any(f.get('rule') == 'exports' or 'Export' in f.get('name','') for f in findings)
            if not found:
                findings.append({
                    'rule': 'exports',
                    'code': FEATURE_CONFIG.get('exports', {}).get('code','T3002'),
                    'name': 'Bulk Export Activity',
                    'points': FEATURE_CONFIG.get('exports', {}).get('points',40),
                    'value': export_count,
                    'baseline': 0,
                    'z_user': float(export_count),
                    'z_peer': float(export_count),
                    'reason': f'{export_count} exports observed (burst)',
                    'description': f'Bulk export burst: {export_count} exports in observation window'
                })
            # apply boost
            score = min(100, score + 30)
        if score >= 90:
            level = 'High Alert'
        elif score >= 70:
            level = 'Medium Alert'
        elif score >= 40:
            level = 'Low Alert'
        else:
            level = 'Normal'
        # Build explanation and findings summary including standard deviation info and explicit causes
        findings_details = []
        causes_list = []
        per_feature_stats = {}
        for key, cfg in FEATURE_CONFIG.items():
            # collect mean/std for the feature for this user
            user_mean, user_std = stats_from_samples(daily_samples, key)
            per_feature_stats[key] = {'mean': round(float(user_mean), 2), 'std': round(float(user_std), 2)}

        for f in findings:
            findings_details.append(f"{f.get('name')}: {f.get('description','')} (+{f.get('points',0)} pts)")
            causes_list.append({'name': f.get('name'), 'code': f.get('code'), 'value': f.get('value'), 'points': f.get('points')})

        findings_summary = ' | '.join(findings_details) if findings_details else ''
        # human-friendly explanation includes deviation, percentile, top causes and per-feature std info
        top_causes = ', '.join([c['name'] for c in causes_list[:3]]) if causes_list else ''
        std_info = ', '.join([f"{k}: mean={v['mean']}, std={v['std']}" for k, v in per_feature_stats.items()])
        # Build explanation: include causes segment only when there are causes
        causes_segment = f"causes=[{top_causes}]. " if top_causes else ''
        explanation = (
            f"Baseline deviation {combined:.2f} (pct={pct}). "
            f"{causes_segment}Per-feature stats: {std_info}. "
            f"Findings: {findings_summary}"
        )

        # Persist as AnomalyScore (baseline detection should remain separate from rule-based detections)
        try:
            triggered_rules = ', '.join([f"{f.get('name')} [{f.get('code')} ]" for f in findings]) if findings else ''

            # Dedupe: check for an existing comparable AnomalyScore within the observation window
            recent_as = AnomalyScore.query.filter(AnomalyScore.user_id == u.user_id, AnomalyScore.created_at >= obs_start).order_by(AnomalyScore.created_at.desc()).first()
            if recent_as and (recent_as.explanation or '') == explanation and float(recent_as.risk_score or 0) == float(score):
                as_rec = recent_as
                # refresh timestamp
                as_rec.created_at = datetime.utcnow()
                db.session.add(as_rec)
                db.session.flush()
            else:
                as_rec = AnomalyScore(user_id=u.user_id, session_id=session_id, risk_score=int(score), risk_level=level, explanation=explanation)
                db.session.add(as_rec)
                db.session.flush()

            # Flag underlying logs if very high
            if score >= 90 and obs_f.get('total_actions',0) > 0:
                recent_logs = UserLog.query.filter(UserLog.user_id==u.user_id, UserLog.log_timestamp>=obs_start).all()
                for rl in recent_logs:
                    try:
                        rl.is_flagged = True
                        db.session.add(rl)
                    except Exception:
                        pass
                    try:
                        flag = FlaggedActivity(log_id=rl.log_id, reason='High baseline anomaly', severity='High')
                        db.session.add(flag)
                    except Exception:
                        # If the flagged_activity view/table schema doesn't match our model (seed SQL may define a view), skip creating flags
                        pass

            # append structured result for API consumption (AnomalyScore shape + extra fields)
            # compute per-feature z-values summary
            std_devs_map = {k: round(float(fz_user.get(k, 0.0)), 2) for k in FEATURE_CONFIG.keys()}
            max_z = max(std_devs_map.values()) if std_devs_map else 0.0
            std_pct = int(min(100, 100.0 * (max_z / MAX_Z_CAP))) if MAX_Z_CAP else 0

            out_records.append({
                'detection_id': None,
                'score_id': as_rec.score_id,
                'user_id': u.user_id,
                'username': u.username if getattr(u, 'username', None) else None,
                'role_name': u.role.role_name if getattr(u, 'role', None) else None,
                'session_id': session_id if 'session_id' in locals() else None,
                'last_analyzed_log_id': None,
                'risk_score': int(score),
                'risk_level': level,
                'triggered_rules': triggered_rules,
                'deviation_value': float(combined),
                'deviation_pct': int(pct),
                'causes': [f.get('name') for f in findings],
                'causes_detail': causes_list,
                'per_feature_stats': per_feature_stats,
                'std_devs': std_devs_map,
                'std_pct': std_pct,
                'explanation': explanation,
                'detected_at': as_rec.created_at.isoformat() if getattr(as_rec, 'created_at', None) else datetime.utcnow().isoformat(),
                'findings': findings
            })

        except Exception as e:
            db.session.rollback()
            print('Error persisting baseline detection:', e)

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print('Error committing anomaly scores:', e)

    return out_records
