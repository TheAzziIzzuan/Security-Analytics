from flask import Flask
from flask_cors import CORS
from config import Config
from extensions import db, bcrypt, jwt

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize extensions with app
db.init_app(app)
bcrypt.init_app(app)
jwt.init_app(app)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Import routes AFTER app is configured
from routes import auth_routes, user_routes, inventory_routes, log_routes, analytics_routes, order_routes

# Register blueprints
app.register_blueprint(auth_routes.bp)
app.register_blueprint(user_routes.bp)
app.register_blueprint(inventory_routes.bp)
app.register_blueprint(log_routes.bp)
app.register_blueprint(analytics_routes.bp)
app.register_blueprint(order_routes.bp)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return {'status': 'healthy', 'message': 'Backend is running'}, 200

if __name__ == '__main__':
    # Create tables if they don't exist
    with app.app_context():
        db.create_all()
    
    app.run(host='0.0.0.0', port=5000, debug=True)
