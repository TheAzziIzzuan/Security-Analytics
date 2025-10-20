from extensions import db
from datetime import datetime

class User(db.Model):
    """User model - represents users table"""
    __tablename__ = 'users'
    
    user_id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.role_id'))
    
    # Relationships
    role = db.relationship('Role', backref='users')
    logs = db.relationship('UserLog', backref='user', lazy='dynamic')
    sessions = db.relationship('Session', backref='user', lazy='dynamic')
    
    def to_dict(self):
        return {
            'user_id': self.user_id,
            'username': self.username,
            'role_id': self.role_id,
            'role_name': self.role.role_name if self.role else None,
            'is_active': True,  # Default to True since column doesn't exist
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Role(db.Model):
    """Role model - represents roles table"""
    __tablename__ = 'roles'
    
    role_id = db.Column(db.Integer, primary_key=True)
    role_name = db.Column(db.String(50), unique=True, nullable=False)
    
    def to_dict(self):
        return {
            'role_id': self.role_id,
            'role_name': self.role_name
        }


class InventoryItem(db.Model):
    """Inventory item model"""
    __tablename__ = 'inventory_items'
    
    item_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    quantity = db.Column(db.Integer, default=0)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'item_id': self.item_id,
            'item_name': self.name,  # Map to frontend expectation
            'name': self.name,
            'description': self.description,
            'category': self.description,  # Use description as category for compatibility
            'quantity': self.quantity,
            'unit_price': 0.00,  # Default since it doesn't exist in DB
            'last_updated': self.last_updated.isoformat() if self.last_updated else None
        }


class Order(db.Model):
    """Order model"""
    __tablename__ = 'orders'
    
    order_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    item_id = db.Column(db.Integer, db.ForeignKey('inventory_items.item_id'))
    quantity = db.Column(db.Integer, nullable=False)
    order_time = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='orders')
    item = db.relationship('InventoryItem', backref='orders')
    
    def to_dict(self):
        return {
            'order_id': self.order_id,
            'user_id': self.user_id,
            'item_id': self.item_id,
            'quantity': self.quantity,
            'order_time': self.order_time.isoformat() if self.order_time else None,
            'username': self.user.username if self.user else None,
            'item_name': self.item.name if self.item else None
        }


class UserLog(db.Model):
    """User activity log model"""
    __tablename__ = 'user_logs'
    
    log_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    session_id = db.Column(db.String(64))
    action_type = db.Column(db.String(50))
    action_detail = db.Column(db.Text)
    page_url = db.Column(db.String(255))
    ip_address = db.Column(db.String(45))
    log_timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    user_agent = db.Column(db.String(255))
    geo_location = db.Column(db.String(100))
    is_flagged = db.Column(db.Boolean, default=False)
    log_type = db.Column(db.Enum('ui_event', 'system', 'auth', 'data_access'), default='ui_event')
    
    def to_dict(self):
        return {
            'log_id': self.log_id,
            'user_id': self.user_id,
            'session_id': self.session_id,
            'action_type': self.action_type,
            'action_detail': self.action_detail,
            'page_url': self.page_url,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'timestamp': self.log_timestamp.isoformat() if self.log_timestamp else None
        }


class Session(db.Model):
    """Session model"""
    __tablename__ = 'sessions'
    
    session_id = db.Column(db.String(64), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    start_time = db.Column(db.DateTime, default=datetime.utcnow)
    end_time = db.Column(db.DateTime)
    
    def to_dict(self):
        return {
            'session_id': self.session_id,
            'user_id': self.user_id,
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None
        }


class AnomalyScore(db.Model):
    """Anomaly detection score model"""
    __tablename__ = 'anomaly_scores'
    
    score_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.user_id'))
    session_id = db.Column(db.String(64))
    risk_score = db.Column(db.Numeric(5, 2))
    risk_level = db.Column(db.Enum('Normal', 'Low Alert', 'Medium Alert', 'High Alert'))
    explanation = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='anomaly_scores')
    
    def to_dict(self):
        return {
            'score_id': self.score_id,
            'user_id': self.user_id,
            'session_id': self.session_id,
            'risk_score': float(self.risk_score) if self.risk_score else None,
            'risk_level': self.risk_level,
            'explanation': self.explanation,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class FlaggedActivity(db.Model):
    """Flagged activity model for suspicious behavior"""
    __tablename__ = 'flagged_activity'
    
    flag_id = db.Column(db.Integer, primary_key=True)
    log_id = db.Column(db.Integer, db.ForeignKey('user_logs.log_id'))
    reason = db.Column(db.Text)
    severity = db.Column(db.Enum('Low', 'Medium', 'High', 'Critical'))
    flagged_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    log = db.relationship('UserLog', backref='flags')
    
    def to_dict(self):
        return {
            'flag_id': self.flag_id,
            'log_id': self.log_id,
            'reason': self.reason,
            'severity': self.severity,
            'flagged_at': self.flagged_at.isoformat() if self.flagged_at else None
        }
