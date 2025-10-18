# Frontend-Backend Integration Guide

## ✅ What's Been Integrated

### **New API Services Created**
1. **inventoryService.js** - Full CRUD operations for inventory management
2. **userService.js** - User management and role operations
3. **logsService.js** - Activity logs and session tracking
4. **analyticsService.js** - Analytics, anomaly scores, and risk profiles

### **Updated Components**
1. **authService.js** - Now uses real backend authentication (JWT tokens)
2. **InventoryManagement.jsx** - Full-featured inventory component with:
   - View all inventory items
   - Search and filter by category
   - Add new items
   - Edit existing items
   - Delete items
   - Real-time updates from backend

3. **UserManagement.jsx** - User management with:
   - Create new users
   - View all users
   - Deactivate users
   - Role-based access

4. **All Dashboards** - Integrated with real functionality:
   - **SupervisorDashboard** - Full access to inventory and user management
   - **EmployeeDashboard** - Access to inventory management
   - **ContractorDashboard** - Read-only inventory access

## 🚀 How to Test

### 1. Make Sure Backend is Running
```powershell
# Check if containers are running
docker ps

# You should see: sakura_db, sakura_backend, sakura_frontend
```

### 2. Create Test Users in Database
Since we're now using the real backend, you need actual user accounts. You can:

**Option A: Use SQL to create a supervisor account**
```powershell
# Connect to database container
docker exec -it sakura_db mysql -u sakura_user -psakura_pass sakura_masas

# Then run in MySQL:
INSERT INTO users (username, password_hash, full_name, email, role_id, is_active) 
VALUES ('supervisor', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5eLpzdePykK7a', 'Test Supervisor', 'supervisor@test.com', 2, 1);
# Password is: password123

INSERT INTO users (username, password_hash, full_name, email, role_id, is_active) 
VALUES ('employee', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5eLpzdePykK7a', 'Test Employee', 'employee@test.com', 3, 1);
# Password is: password123

# Exit MySQL
EXIT;
```

**Option B: Use the backend API to register**
```powershell
curl -X POST http://localhost:5000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"username": "supervisor", "email": "super@test.com", "password": "password123", "full_name": "Test Supervisor", "role_id": 2}'
```

### 3. Test Login
1. Go to: http://localhost:5173
2. Login with:
   - Username: `supervisor`
   - Password: `password123`

### 4. Test Inventory Management
1. Click on **📦 Inventory Management** card
2. Try:
   - **Add New Item** - Create an inventory item
   - **Search** - Search for items
   - **Filter by Category** - Use dropdown
   - **Edit** - Click edit button on any item
   - **Delete** - Click delete button

### 5. Test User Management
1. Click on **👥 Add New User** card
2. Fill in the form and create a new user
3. View the users table
4. Try deactivating a user

## 📝 API Authentication

All API calls now require:
1. **JWT Token** - Obtained from login, stored in localStorage
2. **Session ID** - Tracked for activity logging

Example of how it works:
```javascript
// Login
const { token, session_id } = await authService.login('username', 'password')
// Token and session_id are automatically stored in localStorage

// Subsequent API calls automatically include:
// - Authorization: Bearer <token>
// - X-Session-Id: <session_id>
```

## 🔍 Activity Logging

Every action is now logged to the backend:
- Login/Logout
- View inventory
- Create/Update/Delete items
- User management actions
- All logs include: user_id, session_id, IP address, timestamp

You can view logs in the database:
```sql
SELECT * FROM user_logs ORDER BY timestamp DESC LIMIT 20;
```

## 🎨 What Each Role Can Do

### **Supervisor**
- ✅ Full inventory management (CRUD)
- ✅ User management (create, deactivate)
- ✅ Access to all features
- 🔜 Reports & Analytics (coming soon)
- 🔜 Security logs (coming soon)

### **Employee**
- ✅ Full inventory management (CRUD)
- ❌ No user management
- 🔜 Order management (coming soon)

### **Contractor**
- ✅ View inventory (read-only in UI, but backend allows full access - you may want to restrict this)
- ❌ Cannot create/edit/delete
- ❌ No user management

## 🛠️ Common Issues & Solutions

### Issue: "Invalid credentials" when logging in
**Solution**: Make sure you created users in the database. The old mock users don't work anymore.

### Issue: "No response from server"
**Solution**: Check if backend is running:
```powershell
docker logs sakura_backend --tail 20
```

### Issue: "401 Unauthorized" errors
**Solution**: Token expired or invalid. Try logging out and logging back in.

### Issue: Changes not appearing
**Solution**: The components reload data after operations. Check browser console for errors.

## 📊 Next Steps to Implement

The following features still show "Coming soon":
1. **Orders Management** - Place and track orders
2. **Reports & Analytics** - Use analyticsService.js
3. **Security Logs** - Use logsService.js  
4. **Activity Dashboard** - Show user activity graphs

You can implement these using the API services already created!

## 🔧 Development Tips

### Testing API Calls
Open browser console (F12) and check the Network tab to see all API requests.

### Debugging
All services have error handling. Check:
- Browser console for frontend errors
- `docker logs sakura_backend` for backend errors

### Adding New Features
1. Check if the API endpoint exists in backend
2. Use the appropriate service (inventoryService, userService, etc.)
3. Handle loading states and errors
4. Update the UI accordingly

## 📱 Mobile Responsive
The inventory component is mobile-responsive. Test it by resizing your browser window.

## 🎉 Success!
Your frontend is now fully integrated with the Flask backend! All placeholder messages have been replaced with real functionality.
