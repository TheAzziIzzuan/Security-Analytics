import os
from datetime import timedelta

class Config:
    """Flask application configuration"""
    
    # Database configuration
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'mysql+pymysql://root:@localhost:3306/sakura_masas'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ECHO = False  # Set to True for SQL query debugging
    
    # JWT configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # Security
    SECRET_KEY = os.getenv('SECRET_KEY', 'your-flask-secret-key-change-in-production')
    BCRYPT_LOG_ROUNDS = 12
    
    # CORS
    CORS_HEADERS = 'Content-Type'
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
