import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { logActivity } from '../services/activityLogger'
import InventoryManagement from '../components/InventoryManagement'
import OrderManagement from '../components/OrderManagement'
import './Dashboard.css'

const EmployeeDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState('dashboard')
  const [ordersAutoOpenAdd, setOrdersAutoOpenAdd] = useState(false)

  const handleLogout = () => {
    logActivity('logout_clicked', { role: 'employee' })
    logout()
    navigate('/login')
  }

  const handleAction = (action) => {
    logActivity('dashboard_action', { role: 'employee', action })
    
    if (action === 'view_inventory') {
      setActiveView('inventory')
    } else if (action === 'orders') {
      setOrdersAutoOpenAdd(false)
      setActiveView('orders')
    } else {
      alert(`${action} - Coming soon!`)
    }
  }

  const renderView = () => {
    if (activeView === 'inventory') {
      return <InventoryManagement onClose={() => setActiveView('dashboard')} />
    }
    if (activeView === 'orders') {
      return (
        <div>
          <OrderManagement onClose={() => setActiveView('dashboard')} restrictToCurrentUser={true} openAddOnMount={ordersAutoOpenAdd} />
        </div>
      )
    }
    return renderDashboardGrid()
  }

  const renderDashboardGrid = () => (
    <>
      <div className="dashboard-header">
        <h1>Employee Dashboard</h1>
        <p>Manage inventory and orders</p>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card" onClick={() => handleAction('view_inventory')}>
          <h3>📦 View Inventory</h3>
          <p>View and search inventory items</p>
          <span className="card-action">Access →</span>
        </div>

        <div className="dashboard-card" onClick={() => handleAction('orders')}>
          <h3>📋 Orders</h3>
          <p>Place and track your orders</p>
          <span className="card-action">Access →</span>
        </div>

        <div className="dashboard-card" onClick={() => handleAction('my_activity')}>
          <h3>📊 My Activity</h3>
          <p>View your activity logs</p>
          <span className="card-action">Access →</span>
        </div>
      </div>

      <div className="info-section">
        <h3>Employee Access:</h3>
        <ul>
          <li>View inventory items</li>
          <li>Place and track orders</li>
          <li>View personal activity logs</li>
          <li>Update profile information</li>
        </ul>
      </div>
    </>
  )

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
        {renderView()}
      </div>
    </div>
  )
}

export default EmployeeDashboard
