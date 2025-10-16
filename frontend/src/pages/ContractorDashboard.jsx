import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { logActivity } from '../services/activityLogger'
import './Dashboard.css'

const ContractorDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logActivity('logout_clicked', { role: 'contractor' })
    logout()
    navigate('/login')
  }

  const handleAction = (action) => {
    logActivity('dashboard_action', { role: 'contractor', action })
    alert(`Action: ${action} - This will be implemented with backend integration`)
  }

  return (
    <div className="dashboard-container">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <h2>Sakura Masas</h2>
          <span className="role-badge contractor">Contractor</span>
        </div>
        <div className="nav-user">
          <span>Welcome, {user.username}</span>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>Contractor Dashboard</h1>
          <p>Limited read-only access</p>
        </div>

        <div className="dashboard-grid">
          <div className="dashboard-card" onClick={() => handleAction('view_inventory')}>
            <h3>📦 View Inventory</h3>
            <p>Browse available inventory items</p>
            <span className="card-action">Access →</span>
          </div>

          <div className="dashboard-card" onClick={() => handleAction('view_assigned')}>
            <h3>📌 Assigned Items</h3>
            <p>View items assigned to you</p>
            <span className="card-action">Access →</span>
          </div>

          <div className="dashboard-card" onClick={() => handleAction('submit_request')}>
            <h3>📤 Submit Request</h3>
            <p>Request items or submit queries</p>
            <span className="card-action">Access →</span>
          </div>

          <div className="dashboard-card" onClick={() => handleAction('view_requests')}>
            <h3>📋 My Requests</h3>
            <p>View your submitted requests</p>
            <span className="card-action">Access →</span>
          </div>
        </div>

        <div className="info-section">
          <h3>Contractor Access:</h3>
          <ul>
            <li>Read-only access to inventory</li>
            <li>View assigned items only</li>
            <li>Submit requests for items or information</li>
            <li>View own request history</li>
            <li>No modification or export capabilities</li>
          </ul>
          <div className="warning-box">
            <strong>⚠️ Note:</strong> As a contractor, you have limited access. Contact your supervisor for elevated privileges.
          </div>
        </div>
      </div>
    </div>
  )
}

export default ContractorDashboard
