from extensions import db
from models import UserLog
from datetime import datetime

class ActivityLogger:
    """
    Service to log user activities and send to detection engine
    This captures all user actions for security analytics
    """
    
    def log_activity(self, user_id, session_id, action_type, target_resource, request):
        """
        Log a user activity
        
        Args:
            user_id: ID of the user performing the action
            session_id: Current session ID
            action_type: Type of action (Login, Logout, Create, Update, Delete, View, etc.)
            target_resource: The resource being accessed/modified
            request: Flask request object to extract IP and user agent
        
        Returns:
            Created log entry
        """
        try:
            # Extract request information
            ip_address = request.remote_addr or request.environ.get('HTTP_X_FORWARDED_FOR', 'unknown')
            user_agent = request.headers.get('User-Agent', 'unknown')[:255]  # Truncate to match DB schema
            page_url = request.url or 'unknown'
            
            # Create log entry
            log_entry = UserLog(
                user_id=user_id,
                session_id=session_id,
                action_type=action_type,
                action_detail=f"Action on {target_resource}",
                page_url=page_url,
                ip_address=ip_address,
                user_agent=user_agent,
                log_timestamp=datetime.utcnow(),
                log_type='ui_event'
            )
            
            db.session.add(log_entry)
            db.session.commit()
            
            # Here you can add logic to send to detection engine
            # For example: send to a queue, webhook, or ML model
            self._send_to_detection_engine(log_entry)
            
            return log_entry
            
        except Exception as e:
            print(f"Error logging activity: {str(e)}")
            db.session.rollback()
            return None
    
    def _send_to_detection_engine(self, log_entry):
        """
        Send log to detection engine for anomaly detection
        This is a placeholder for integration with your detection system
        
        You can implement:
        - Send to message queue (RabbitMQ, Kafka)
        - Call ML model API
        - Store in separate analytics database
        - Trigger real-time alerts
        """
        try:
            # Example: Check for suspicious patterns
            self._check_suspicious_patterns(log_entry)
            
            # TODO: Implement actual detection engine integration
            # Example: requests.post('http://detection-engine:8000/analyze', json=log_entry.to_dict())
            
        except Exception as e:
            print(f"Error sending to detection engine: {str(e)}")
    
    def _check_suspicious_patterns(self, log_entry):
        """
        Basic pattern checking for suspicious activities
        This is a simple implementation - replace with actual ML model
        """
        from models import FlaggedActivity
        
        suspicious = False
        reason = None
        severity = 'Low'
        
        # Example checks:
        # 1. Multiple failed login attempts
        if log_entry.action_type == 'Login':
            recent_logins = UserLog.query.filter_by(
                user_id=log_entry.user_id,
                action_type='Login'
            ).filter(
                UserLog.timestamp >= datetime.utcnow().replace(hour=0, minute=0, second=0)
            ).count()
            
            if recent_logins > 10:
                suspicious = True
                reason = "Multiple login attempts detected"
                severity = 'Medium'
        
        # 2. Unusual time access (outside business hours)
        current_hour = datetime.utcnow().hour
        if current_hour < 6 or current_hour > 22:
            if log_entry.action_type in ['Delete', 'Update', 'Export']:
                suspicious = True
                reason = "Activity outside business hours"
                severity = 'Medium'
        
        # 3. Rapid successive actions
        recent_actions = UserLog.query.filter_by(
            user_id=log_entry.user_id,
            session_id=log_entry.session_id
        ).filter(
            UserLog.timestamp >= datetime.utcnow()
        ).count()
        
        if recent_actions > 20:  # More than 20 actions in a minute
            suspicious = True
            reason = "Unusually high activity rate"
            severity = 'High'
        
        # 4. Critical actions
        if log_entry.action_type in ['Delete', 'Export'] and 'inventory' in log_entry.target_resource:
            suspicious = True
            reason = "Critical action on sensitive resource"
            severity = 'High'
        
        # Flag the activity if suspicious
        if suspicious:
            try:
                flag = FlaggedActivity(
                    log_id=log_entry.log_id,
                    reason=reason,
                    severity=severity,
                    flagged_at=datetime.utcnow()
                )
                db.session.add(flag)
                db.session.commit()
            except Exception as e:
                print(f"Error flagging activity: {str(e)}")
                db.session.rollback()
    
    def batch_log_activities(self, activities):
        """
        Log multiple activities at once
        
        Args:
            activities: List of activity dictionaries
        
        Returns:
            Number of successfully logged activities
        """
        success_count = 0
        
        for activity in activities:
            try:
                log_entry = UserLog(**activity)
                db.session.add(log_entry)
                success_count += 1
            except Exception as e:
                print(f"Error in batch logging: {str(e)}")
                continue
        
        try:
            db.session.commit()
            return success_count
        except Exception as e:
            print(f"Error committing batch logs: {str(e)}")
            db.session.rollback()
            return 0
