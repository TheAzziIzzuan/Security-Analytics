import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { logActivity } from '../services/activityLogger'
import './Dashboard.css'

const SupervisorDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logActivity('logout_clicked', { role: 'supervisor' })
    logout()
    navigate('/login')
  }

  const handleAction = (action) => {
    logActivity('dashboard_action', { role: 'supervisor', action })
    alert(`Action: ${action} - This will be implemented with backend integration`)
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <h2>Sakura Masas</h2>
          <span className="role-badge supervisor">Supervisor</span>
        </div>
        <div className="nav-user">
          <span>Welcome, {user.username}</span>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Supervisor Dashboard</h1>
          <p>Full system access and oversight</p>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card" onClick={() => handleAction('view_inventory')}>
            <h3>📦 Inventory Management</h3>
            <p>View and manage all inventory items</p>
            <span className="card-action">Access →</span>
          </div>

          <div className="dashboard-card" onClick={() => handleAction('add_user')}>
            <h3>👥 Add New User</h3>
            <p>Create accounts for employees and contractors</p>
            <span className="card-action">Access →</span>
          </div>

          <div className="dashboard-card" onClick={() => handleAction('view_reports')}>
            <h3>📊 Reports & Analytics</h3>
            <p>View system reports and analytics</p>
            <span className="card-action">Access →</span>
          </div>

          <div className="dashboard-card" onClick={() => handleAction('security_logs')}>
            <h3>🔒 Security Logs</h3>
            <p>Monitor security events and alerts</p>
            <span className="card-action">Access →</span>
          </div>

          <div className="dashboard-card" onClick={() => handleAction('approve_orders')}>
            <h3>✅ Order Approvals</h3>
            <p>Review and approve pending orders</p>
            <span className="card-action">Access →</span>
          </div>

          <div className="dashboard-card" onClick={() => handleAction('system_settings')}>
            <h3>⚙️ System Settings</h3>
            <p>Configure system parameters</p>
            <span className="card-action">Access →</span>
          </div>
        </div>

        <div className="info-section">
          <h3>Supervisor Privileges:</h3>
          <ul>
            <li>Full inventory access (view, add, edit, delete)</li>
            <li>User management capabilities</li>
            <li>Access to all reports and analytics</li>
            <li>Security monitoring and alert management</li>
            <li>Order approval authority</li>
            <li>System configuration access</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default SupervisorDashboard
