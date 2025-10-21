from flask import Flask, request
from flask_cors import CORS
from config import Config
from extensions import db, bcrypt, jwt
from routes.ai_routes import ai_bp

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# CORS: allow your Vite dev server
CORS(
    app,
    resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173"]}},
    supports_credentials=True
)

# Initialize extensions with app
db.init_app(app)
bcrypt.init_app(app)
jwt.init_app(app)

# Import routes AFTER app is configured
from routes import auth_routes, user_routes, inventory_routes, log_routes, analytics_routes, order_routes

# Register blueprints
app.register_blueprint(auth_routes.bp)
app.register_blueprint(user_routes.bp)
app.register_blueprint(inventory_routes.bp)
app.register_blueprint(log_routes.bp)
app.register_blueprint(analytics_routes.bp)
app.register_blueprint(order_routes.bp)
app.register_blueprint(ai_bp)

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin")
    if origin in ("http://localhost:5173", "http://127.0.0.1:5173"):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Session-Id"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return {'status': 'healthy', 'message': 'Backend is running'}, 200

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
