import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { logActivity } from '../services/activityLogger'
import InventoryManagement from '../components/InventoryManagement'
import './Dashboard.css'

const ContractorDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState('dashboard')

  const handleLogout = () => {
    logActivity('logout_clicked', { role: 'contractor' })
    logout()
    navigate('/login')
  }

  const handleAction = (action) => {
    logActivity('dashboard_action', { role: 'contractor', action })
    
    if (action === 'view_inventory') {
      setActiveView('inventory')
    } else {
      alert(`${action} - Coming soon!`)
    }
  }

  const renderView = () => {
    if (activeView === 'inventory') {
      return <InventoryManagement onClose={() => setActiveView('dashboard')} />
    }
    return renderDashboardGrid()
  }

  const renderDashboardGrid = () => (
    <>
      <div className="dashboard-header">
        <h1>Contractor Dashboard</h1>
        <p>Limited read-only inventory access</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card" onClick={() => handleAction('view_inventory')}>
          <h3>📦 View Inventory</h3>
          <p>Browse available inventory items (Read-Only)</p>
          <span className="card-action">Access →</span>
        </div>

        <div className="dashboard-card" onClick={() => handleAction('my_activity')}>
          <h3>📊 My Activity</h3>
          <p>View your access logs</p>
          <span className="card-action">Access →</span>
        </div>
      </div>

      <div className="info-section">
        <h3>Contractor Access:</h3>
        <ul>
          <li>View-only access to inventory</li>
          <li>Cannot modify or delete items</li>
          <li>Cannot place orders</li>
          <li>All actions are monitored and logged</li>
        </ul>
      </div>
    </>
  )

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
        {renderView()}
      </div>
    </div>
  )
}

export default ContractorDashboard
