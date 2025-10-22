from datetime import datetime, timedelta
from collections import defaultdict
from extensions import db
from models import UserLog, User, Session
from models import RuleBasedDetection as RuleBasedDetectionModel

class RuleBasedDetection:
    """
    Enterprise security rule-based detection based on NIST SP 800-53 Rev. 5 
    and MITRE ATT&CK framework.
    """
    
    def __init__(self):
        self.rules = {
            'failed_logins': {
                'points': 25,
                'threshold': 3,
                'timeframe_minutes': 15,
                'name': 'Multiple Failed Logins',
                'mitre_id': 'T1110',
                'description': 'Potential brute force attack (MITRE ATT&CK T1110)'
            },
            'mass_export': {
                'points': 35,
                'threshold': 10,
                'name': 'Bulk Data Export',
                'mitre_id': 'T1567',
                'description': 'Unusual volume indicating data exfiltration'
            },
            'after_hours_critical': {
                'points': 20,
                'name': 'After-Hours Critical Actions',
                'description': 'Sensitive ops outside business hours (NIST AC-2)'
            },
            'velocity_anomaly': {
                'points': 25,
                'threshold': 50,
                'timeframe_minutes': 60,
                'name': 'High Activity Velocity',
                'description': 'Abnormal rate suggesting automation/bot'
            },
            'privilege_escalation': {
                'points': 45,
                'name': 'Unauthorized Action',
                'mitre_id': 'T1078',
                'description': 'Action violating role-based access control (CRITICAL)'
            },
            'data_destruction': {
                'points': 40,
                'name': 'Data Deletion',
                'mitre_id': 'T1485',
                'description': 'Deletion of sensitive resources (CRITICAL)'
            },
            'location_anomaly': {
                'points': 30,
                'threshold': 3,
                'name': 'Session Anomaly',
                'mitre_id': 'T1185',
                'description': 'Multiple IPs indicate possible session hijacking'
            },
            'sensitive_data_access': {
                'points': 15,
                'threshold': 30,
                'name': 'Excessive Data Access',
                'mitre_id': 'T1213',
                'description': 'High volume view operations (reconnaissance)'
            }
        }
        # Add admin access rule explicitly (accessing admin pages by non-supervisors)
        self.rules['admin_access'] = {
            'points': 40,
            'name': 'Unauthorized Admin Access',
            'mitre_id': 'T1078',
            'description': 'Access to admin pages or privileged operations by non-admins'
        }
    
    def get_last_detection(self, user_id, session_id):
        """Get the most recent detection for this user+session"""
        try:
            return RuleBasedDetectionModel.query.filter_by(
                user_id=user_id,
                session_id=session_id
            ).order_by(RuleBasedDetectionModel.detected_at.desc()).first()
        except Exception as e:
            print(f"Error getting last detection: {str(e)}")
            return None
    
    def run_detection_for_all_users(self, window_hours=24, force_reprocess=False):
        """Run detection for all users with recent activity"""
        now = datetime.utcnow()
        window_start = now - timedelta(hours=window_hours)
        
        print(f"{'Force reprocessing' if force_reprocess else 'Incremental'}: analyzing logs since {window_start}")
        
        recent_user_ids = db.session.query(UserLog.user_id).filter(
            UserLog.log_timestamp >= window_start
        ).distinct().all()
        
        recent_user_ids = [uid[0] for uid in recent_user_ids]
        
        if not recent_user_ids:
            print("No new user activity to analyze")
            return []
        
        print(f"Analyzing {len(recent_user_ids)} users with activity")
        
        detections = []
        
        for user_id in recent_user_ids:
            session_ids = db.session.query(UserLog.session_id).filter(
                UserLog.user_id == user_id,
                UserLog.log_timestamp >= window_start
            ).distinct().all()
            
            session_ids = [sid[0] for sid in session_ids if sid[0]]
            
            for session_id in session_ids:
                # Get last detection
                last_detection = None if force_reprocess else self.get_last_detection(user_id, session_id)
                # guard against None last_analyzed_log_id from seeded rows
                last_analyzed_log_id = (last_detection.last_analyzed_log_id if last_detection and last_detection.last_analyzed_log_id is not None else 0)
                
                # Get ALL logs in window
                all_logs = UserLog.query.filter(
                    UserLog.user_id == user_id,
                    UserLog.session_id == session_id,
                    UserLog.log_timestamp >= window_start
                ).order_by(UserLog.log_timestamp.desc()).all()
                
                if not all_logs:
                    continue
                
                # Check if there are NEW logs
                new_logs = [log for log in all_logs if log.log_id > last_analyzed_log_id]
                
                if not new_logs and not force_reprocess:
                    print(f"✓ No new logs for user={user_id}, session={session_id[:12]}... (last analyzed: log_id {last_analyzed_log_id})")
                    continue
                
                print(f"⚡ Analyzing session: user={user_id}, session={session_id[:12] if len(session_id) > 12 else session_id}, total_logs={len(all_logs)}, new_logs={len(new_logs)}")
                
                # Analyze ALL logs (for pattern correlation)
                result = self.check_session_logs(user_id, session_id, all_logs, window_hours)
                
                if not result:
                    print(f"   → No violations detected")
                    continue
                
                # ALWAYS ALERT if violations found
                result['last_analyzed_log_id'] = max(log.log_id for log in all_logs)
                detections.append(result)
                
                current_score = result['risk_score']
                previous_score = last_detection.risk_score if last_detection else 0
                print(f"   ⚠ NEW ALERT: Score {current_score} (was {previous_score})")
        
        print(f"Detection complete: {len(detections)} new alerts")
        return detections
    
    def check_session_logs(self, user_id, session_id, logs, window_hours=24):
        """Check provided logs for rule violations"""
        if not logs:
            return None
        
        user = User.query.get(user_id)
        if not user:
            return None
        
        # Use the latest log timestamp in the session as the reference time so
        # checks using timeframes work correctly for historical/seeded logs
        try:
            now = max((l.log_timestamp for l in logs if getattr(l, 'log_timestamp', None)))
        except Exception:
            now = datetime.utcnow()
        
        findings = []
        total_points = 0
        
        checks = [
            self._check_admin_access,
            self._check_failed_logins,
            self._check_mass_exports,
            self._check_after_hours,
            self._check_velocity_anomaly,
            self._check_privilege_escalation,
            self._check_data_destruction,
            self._check_location_anomaly,
            self._check_sensitive_data_access
        ]
        
        for check in checks:
            result = check(logs, user)
            if result:
                findings.append(result)
                total_points += result['points']
        
        if not findings:
            return None
        
        has_privilege_violation = any(f['rule'] == 'privilege_escalation' for f in findings)
        has_location_anomaly = any(f['rule'] == 'location_anomaly' for f in findings)
        has_data_action = any(f['rule'] in ['mass_export', 'data_destruction'] for f in findings)
        
        if has_privilege_violation and (has_location_anomaly or has_data_action):
            total_points = int(total_points * 1.3)
        
        risk_score = min(100, total_points)
        
        if risk_score >= 90:
            risk_level = 'Critical Alert'
        elif risk_score >= 70:
            risk_level = 'High Alert'
        elif risk_score >= 40:
            risk_level = 'Medium Alert'
        elif risk_score >= 20:
            risk_level = 'Low Alert'
        else:
            risk_level = 'Normal'
        
        findings_details = []
        for f in findings:
            mitre = f.get('mitre_id', '')
            mitre_ref = f" [{mitre}]" if mitre else ""
            findings_details.append(f"{f['name']}{mitre_ref}: {f['description']} (+{f['points']} pts)")
        
        explanation = ' | '.join(findings_details)
        triggered_rules = ', '.join([f['name'] for f in findings])
        
        return {
            'user_id': user_id,
            'session_id': session_id,
            'risk_score': risk_score,
            'risk_level': risk_level,
            'total_points': total_points,
            'triggered_rules': triggered_rules,
            'findings': findings,
            'findings_summary': explanation,
            'explanation': explanation,
            'detected_at': now
        }
    
    def _check_failed_logins(self, logs, user):
        # reference timeframe anchored to the latest log in the session
        try:
            latest = max((l.log_timestamp for l in logs if getattr(l, 'log_timestamp', None)))
        except Exception:
            latest = datetime.utcnow()

        timeframe = latest - timedelta(minutes=self.rules['failed_logins']['timeframe_minutes'])
        failed_logins = []
        for l in logs:
            if not getattr(l, 'log_timestamp', None) or l.log_timestamp < timeframe:
                continue
            at = (getattr(l, 'action_type', '') or '').lower()
            ad = (getattr(l, 'action_detail', '') or '').lower()
            lt = (getattr(l, 'log_type', '') or '').lower()

            # consider many representations: action_type, action_detail, log_type
            is_failed = False
            if 'login' in at and ('fail' in at or 'failed' in at):
                is_failed = True
            if 'failed' in ad and 'login' in ad:
                is_failed = True
            if at in ['loginfail', 'login_fail', 'failed_login', 'login_failed', 'auth_fail']:
                is_failed = True
            if lt == 'auth' and ('fail' in ad or 'failed' in ad):
                is_failed = True

            if is_failed:
                failed_logins.append(l)

        if len(failed_logins) >= self.rules['failed_logins']['threshold']:
            return {
                'rule': 'failed_logins',
                'name': self.rules['failed_logins']['name'],
                'mitre_id': self.rules['failed_logins']['mitre_id'],
                'severity': 'High' if len(failed_logins) > 5 else 'Medium',
                'count': len(failed_logins),
                'description': f"{len(failed_logins)} failed attempts in {self.rules['failed_logins']['timeframe_minutes']}min",
                'points': self.rules['failed_logins']['points']
            }
        return None
    
    def _check_mass_exports(self, logs, user):
        exports = []
        for l in logs:
            at = (getattr(l, 'action_type', '') or '').lower()
            ad = (getattr(l, 'action_detail', '') or '').lower()
            pu = (getattr(l, 'page_url', '') or '').lower()
            lt = (getattr(l, 'log_type', '') or '').lower()

            if at == 'export' or 'export' in ad or 'export' in pu or lt == 'data_access' or at in ('download', 'bulk_export'):
                exports.append(l)

        if len(exports) >= self.rules['mass_export']['threshold']:
            return {
                'rule': 'mass_export',
                'name': self.rules['mass_export']['name'],
                'mitre_id': self.rules['mass_export']['mitre_id'],
                'severity': 'High' if len(exports) > 20 else 'Medium',
                'count': len(exports),
                'description': f"{len(exports)} data exports detected",
                'points': self.rules['mass_export']['points']
            }
        return None
    
    def _check_after_hours(self, logs, user):
        after_hours_logs = [l for l in logs if l.log_timestamp and 
                           (l.log_timestamp.hour < 6 or l.log_timestamp.hour >= 23)]
        
        critical_actions = [l for l in after_hours_logs if 
                           l.action_type.lower() in ['export', 'edit', 'delete']]
        
        if len(critical_actions) >= 3:
            return {
                'rule': 'after_hours_critical',
                'name': self.rules['after_hours_critical']['name'],
                'severity': 'Medium',
                'count': len(critical_actions),
                'description': f"{len(critical_actions)} sensitive ops between 11PM-6AM",
                'points': self.rules['after_hours_critical']['points']
            }
        return None
    
    def _check_velocity_anomaly(self, logs, user):
        # anchor velocity check to the latest log timestamp in the session
        try:
            latest = max((l.log_timestamp for l in logs if getattr(l, 'log_timestamp', None)))
        except Exception:
            latest = datetime.utcnow()

        recent_hour = latest - timedelta(minutes=self.rules['velocity_anomaly']['timeframe_minutes'])
        recent_logs = [l for l in logs if getattr(l, 'log_timestamp', None) and l.log_timestamp >= recent_hour]
        
        if len(recent_logs) >= self.rules['velocity_anomaly']['threshold']:
            return {
                'rule': 'velocity_anomaly',
                'name': self.rules['velocity_anomaly']['name'],
                'severity': 'High' if len(recent_logs) > 100 else 'Medium',
                'count': len(recent_logs),
                'description': f"{len(recent_logs)} actions in {self.rules['velocity_anomaly']['timeframe_minutes']}min (automation suspected)",
                'points': self.rules['velocity_anomaly']['points']
            }
        return None
    
    def _check_privilege_escalation(self, logs, user):
        role_name = (user.role.role_name if user.role else 'unknown')
        role_name = role_name.lower() if isinstance(role_name, str) else role_name
        violations = []
        
        if role_name == 'contractor':
            violations = [l for l in logs if l.action_type.lower() in ['edit', 'delete', 'export']]
        elif role_name == 'employee':
            violations = [l for l in logs if l.action_type.lower() == 'delete']
        
        if violations:
            return {
                'rule': 'privilege_escalation',
                'name': self.rules['privilege_escalation']['name'],
                'mitre_id': self.rules['privilege_escalation']['mitre_id'],
                'severity': 'Critical',
                'count': len(violations),
                'description': f"{role_name} violated RBAC: {len(violations)} unauthorized operation(s)",
                'points': self.rules['privilege_escalation']['points']
            }
        return None

    def _check_admin_access(self, logs, user):
        """Flag admin page accesses or admin actions performed by non-supervisors."""
        role_name = (user.role.role_name if user.role else '').lower()
        # supervisors are allowed
        if role_name == 'supervisor':
            return None

        admin_hits = []
        for l in logs:
            pu = (getattr(l, 'page_url', '') or '').lower()
            ad = (getattr(l, 'action_detail', '') or '').lower()
            at = (getattr(l, 'action_type', '') or '').lower()
            # admin patterns: page under /admin, action mentioning 'admin' or 'user management', or named admin actions
            if '/admin' in pu or 'admin' in ad or at in ('add_user', 'admin_action', 'assume_role'):
                admin_hits.append(l)

        if admin_hits:
            return {
                'rule': 'admin_access',
                'name': self.rules['admin_access']['name'],
                'mitre_id': self.rules['admin_access'].get('mitre_id', ''),
                'severity': 'High',
                'count': len(admin_hits),
                'description': f"{len(admin_hits)} admin/privileged actions by non-supervisor role ({role_name})",
                'points': self.rules['admin_access']['points']
            }
        return None
    
    def _check_data_destruction(self, logs, user):
        deletes = [l for l in logs if l.action_type.lower() == 'delete' or 
                  (l.action_detail and 'delete' in l.action_detail.lower())]
        
        if deletes:
            return {
                'rule': 'data_destruction',
                'name': self.rules['data_destruction']['name'],
                'mitre_id': self.rules['data_destruction']['mitre_id'],
                'severity': 'Critical',
                'count': len(deletes),
                'description': f"{len(deletes)} deletion(s) on sensitive data",
                'points': self.rules['data_destruction']['points']
            }
        return None
    
    def _check_location_anomaly(self, logs, user):
        unique_ips = set(l.ip_address for l in logs if l.ip_address and l.ip_address != 'unknown')
        
        if len(unique_ips) >= self.rules['location_anomaly']['threshold']:
            return {
                'rule': 'location_anomaly',
                'name': self.rules['location_anomaly']['name'],
                'mitre_id': self.rules['location_anomaly']['mitre_id'],
                'severity': 'High',
                'count': len(unique_ips),
                'description': f"{len(unique_ips)} IPs in single session (hijacking suspected)",
                'points': self.rules['location_anomaly']['points']
            }
        return None
    
    def _check_sensitive_data_access(self, logs, user):
        views = [l for l in logs if l.action_type.lower() == 'view']
        
        if len(views) >= self.rules['sensitive_data_access']['threshold']:
            return {
                'rule': 'sensitive_data_access',
                'name': self.rules['sensitive_data_access']['name'],
                'mitre_id': self.rules['sensitive_data_access']['mitre_id'],
                'severity': 'Low',
                'count': len(views),
                'description': f"{len(views)} view ops (reconnaissance pattern)",
                'points': self.rules['sensitive_data_access']['points']
            }
        return None
