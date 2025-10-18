# Security Analytics - Backend API

Flask-based REST API for the Security Analytics project with anomaly detection and activity logging.

## Features

- **Authentication & Authorization**: JWT-based user authentication
- **User Management**: CRUD operations for users and roles
- **Inventory Management**: Complete inventory system with CRUD operations
- **Activity Logging**: Comprehensive logging of all user actions
- **Anomaly Detection**: Basic pattern matching for suspicious activities
- **Security Analytics**: Dashboard statistics and risk profiling

## Tech Stack

- **Framework**: Flask 3.0
- **Database**: MySQL/MariaDB with SQLAlchemy ORM
- **Authentication**: JWT (Flask-JWT-Extended)
- **Password Hashing**: Bcrypt
- **CORS**: Flask-CORS
- **Containerization**: Docker

## Project Structure

```
backend/
├── app.py                  # Main Flask application
├── config.py              # Configuration settings
├── models.py              # Database models
├── requirements.txt       # Python dependencies
├── Dockerfile            # Docker configuration
├── .env.example          # Environment variables template
├── routes/               # API route handlers
│   ├── auth_routes.py    # Authentication endpoints
│   ├── user_routes.py    # User management endpoints
│   ├── inventory_routes.py  # Inventory endpoints
│   ├── log_routes.py     # Logging endpoints
│   └── analytics_routes.py  # Analytics endpoints
└── services/             # Business logic services
    └── activity_logger.py  # Activity logging service
```

## Setup Instructions

### Prerequisites

1. **Install Docker Desktop** (Windows)
   - Download from: https://www.docker.com/products/docker-desktop/
   - Install and restart your computer
   - Make sure Docker Desktop is running

### Option 1: Docker Setup (Recommended)

1. **Navigate to frontend directory** (where docker-compose.yml is):
   ```powershell
   cd frontend
   ```

2. **Start all services** (database, backend, frontend):
   ```powershell
   docker-compose up --build
   ```

3. **Access the services**:
   - Backend API: http://localhost:5000
   - Frontend: http://localhost:5173
   - Database: localhost:3306

### Option 2: Local Development (Without Docker)

1. **Install Python 3.11+**

2. **Create virtual environment**:
   ```powershell
   cd backend
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. **Install dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

4. **Set up MySQL database**:
   - Install MySQL/MariaDB
   - Create database: `sakura_masas`
   - Import schema: `mysql -u root -p sakura_masas < ../sakura_masas.sql`

5. **Create .env file**:
   ```powershell
   cp .env.example .env
   ```
   Edit `.env` with your database credentials

6. **Run the application**:
   ```powershell
   python app.py
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info

### Users
- `GET /api/users/` - Get all users
- `GET /api/users/<id>` - Get user by ID
- `PUT /api/users/<id>` - Update user
- `DELETE /api/users/<id>` - Delete user
- `GET /api/users/roles` - Get all roles

### Inventory
- `GET /api/inventory/` - Get all inventory items
- `GET /api/inventory/<id>` - Get item by ID
- `POST /api/inventory/` - Create new item
- `PUT /api/inventory/<id>` - Update item
- `DELETE /api/inventory/<id>` - Delete item
- `GET /api/inventory/categories` - Get all categories

### Logs
- `GET /api/logs/` - Get activity logs
- `GET /api/logs/sessions` - Get user sessions
- `GET /api/logs/activity-summary` - Get activity summary

### Analytics
- `GET /api/analytics/anomaly-scores` - Get anomaly scores
- `GET /api/analytics/flagged-activities` - Get flagged activities
- `GET /api/analytics/dashboard-stats` - Get dashboard statistics
- `GET /api/analytics/user-risk-profile/<id>` - Get user risk profile

### Health Check
- `GET /api/health` - Check if backend is running

## Authentication

Most endpoints require JWT authentication. Include the token in request headers:

```
Authorization: Bearer <your-jwt-token>
```

Also include session ID in headers for activity logging:
```
X-Session-Id: <session-id>
```

## Example API Usage

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'
```

### Get Inventory (with auth)
```bash
curl -X GET http://localhost:5000/api/inventory/ \
  -H "Authorization: Bearer <your-token>" \
  -H "X-Session-Id: <session-id>"
```

### Create Inventory Item
```bash
curl -X POST http://localhost:5000/api/inventory/ \
  -H "Authorization: Bearer <your-token>" \
  -H "X-Session-Id: <session-id>" \
  -H "Content-Type: application/json" \
  -d '{"item_name": "Laptop", "category": "Electronics", "quantity": 10, "unit_price": 1200.00}'
```

## Activity Logging

All user actions are automatically logged with:
- User ID and session ID
- Action type (Login, Create, Update, Delete, View, etc.)
- Target resource
- IP address and user agent
- Timestamp

The `ActivityLogger` service also performs basic anomaly detection:
- Multiple login attempts
- Activity outside business hours
- Rapid successive actions
- Critical actions on sensitive resources

## Database Schema

Key tables:
- `users` - User accounts
- `roles` - User roles (Admin, Supervisor, Employee, Contractor)
- `inventory_items` - Inventory data
- `orders` - Order records
- `user_logs` - Activity logs
- `sessions` - User sessions
- `anomaly_scores` - Anomaly detection results
- `flagged_activity` - Suspicious activities

## Development

### Running Tests
```powershell
# TODO: Add tests
pytest
```

### Database Migrations
```powershell
# Create all tables
python
>>> from app import app, db
>>> with app.app_context():
...     db.create_all()
```

## Troubleshooting

### Docker Issues
- Make sure Docker Desktop is running
- Try: `docker-compose down -v` then `docker-compose up --build`
- Check logs: `docker-compose logs backend`

### Database Connection Issues
- Verify DATABASE_URL in .env or docker-compose.yml
- Check if database container is running: `docker ps`
- Wait for database to initialize (first run takes longer)

### Port Already in Use
- Change ports in docker-compose.yml if 5000, 5173, or 3306 are taken
- Or stop the conflicting service

## Security Notes

⚠️ **Important for Production**:
- Change JWT_SECRET_KEY and SECRET_KEY
- Use strong database passwords
- Enable HTTPS
- Implement rate limiting
- Add input validation
- Use environment variables for all secrets

## Contributing

1. Create a feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## License

MIT License
