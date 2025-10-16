import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { logActivity } from '../services/activityLogger'
import './Dashboard.css'

const EmployeeDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logActivity('logout_clicked', { role: 'employee' })
    logout()
    navigate('/login')
  }

  const handleAction = (action) => {
    logActivity('dashboard_action', { role: 'employee', action })
    alert(`Action: ${action} - This will be implemented with backend integration`)
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <h2>Sakura Masas</h2>
          <span className="role-badge employee">Employee</span>
        </div>
        <div className="nav-user">
          <span>Welcome, {user.username}</span>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Employee Dashboard</h1>
          <p>Standard inventory operations</p>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card" onClick={() => handleAction('view_inventory')}>
            <h3>📦 View Inventory</h3>
            <p>Browse inventory items and stock levels</p>
            <span className="card-action">Access →</span>
          </div>

          <div className="dashboard-card" onClick={() => handleAction('add_items')}>
            <h3>➕ Add Items</h3>
            <p>Add new items to inventory</p>
            <span className="card-action">Access →</span>
          </div>

          <div className="dashboard-card" onClick={() => handleAction('update_stock')}>
            <h3>📝 Update Stock</h3>
            <p>Modify stock quantities</p>
            <span className="card-action">Access →</span>
          </div>

          <div className="dashboard-card" onClick={() => handleAction('create_order')}>
            <h3>🛒 Create Orders</h3>
            <p>Submit new purchase orders</p>
            <span className="card-action">Access →</span>
          </div>

          <div className="dashboard-card" onClick={() => handleAction('view_orders')}>
            <h3>📋 My Orders</h3>
            <p>View your order history</p>
            <span className="card-action">Access →</span>
          </div>

          <div className="dashboard-card" onClick={() => handleAction('export_data')}>
            <h3>📥 Export Data</h3>
            <p>Export inventory reports</p>
            <span className="card-action">Access →</span>
          </div>
        </div>

        <div className="info-section">
          <h3>Employee Access:</h3>
          <ul>
            <li>View inventory items and stock levels</li>
            <li>Add and update inventory items</li>
            <li>Create and manage orders</li>
            <li>Export inventory data</li>
            <li>Limited to own order history</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default EmployeeDashboard
