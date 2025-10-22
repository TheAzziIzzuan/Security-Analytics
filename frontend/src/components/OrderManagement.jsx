import { useState, useEffect } from 'react'
import orderService from '../services/orderService'
import inventoryService from '../services/inventoryService'
import userService from '../services/userService'
import { useAuth } from '../context/AuthContext'
import { logActivity } from '../services/activityLogger'
import './OrderManagement.css'

const OrderManagement = ({ onClose, restrictToCurrentUser = false, openAddOnMount = false }) => {
  const { user: currentUser } = useAuth()
  const [orders, setOrders] = useState([])
  const [inventory, setInventory] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [currentOrder, setCurrentOrder] = useState(null)
  
  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteOrderId, setDeleteOrderId] = useState(null)
  const [deleteItemName, setDeleteItemName] = useState('')
  
  // Form data
  const [formData, setFormData] = useState({
    user_id: '',
    item_id: '',
    quantity: 1
  })

  // Filters
  const [filterUserId, setFilterUserId] = useState('')
  const [filterItemId, setFilterItemId] = useState('')

  useEffect(() => {
    loadOrders()
    loadInventory()
    if (currentUser?.role === 'supervisor' || currentUser?.role === 'admin') {
      loadUsers()
    }
  }, [filterUserId, filterItemId])

  // Auto-open add modal on mount when requested (e.g., from Employee "Place Order")
  useEffect(() => {
    if (openAddOnMount) {
      setShowAddModal(true)
      logActivity('order_add_modal_auto_open', {})
    }
  }, [openAddOnMount])

  const loadOrders = async () => {
    try {
      setLoading(true)
      const filters = {}
      const isSup = currentUser?.role === 'supervisor' || currentUser?.role === 'admin'
      if (restrictToCurrentUser || !isSup) {
        if (currentUser?.id) filters.user_id = currentUser.id
      } else if (filterUserId) {
        filters.user_id = filterUserId
      }
      if (filterItemId) filters.item_id = filterItemId
      const data = await orderService.getOrders(filters)
      setOrders(data)
      setError('')
    } catch (err) {
      setError(err.message)
      logActivity('orders_load_failed', { error: err.message })
    } finally {
      setLoading(false)
    }
  }

  const loadInventory = async () => {
    try {
      const data = await inventoryService.getInventory()
      setInventory(data)
    } catch (err) {
      console.error('Failed to load inventory:', err)
    }
  }

  const loadUsers = async () => {
    try {
      const data = await userService.getUsers()
      setUsers(data)
    } catch (err) {
      console.error('Failed to load users:', err)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleAddOrder = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const isSup = currentUser?.role === 'supervisor' || currentUser?.role === 'admin'
      const payload = isSup ? formData : { item_id: formData.item_id, quantity: formData.quantity }
      await orderService.createOrder(payload)
      setSuccess('Order created successfully!')
      setShowAddModal(false)
      setFormData({ user_id: '', item_id: '', quantity: 1 })
      loadOrders()
      loadInventory() // Reload to update quantities
      
      logActivity('order_created', { 
        item_id: formData.item_id,
        quantity: formData.quantity 
      })
    } catch (err) {
      setError(err.message)
      logActivity('order_create_failed', { error: err.message })
    }
  }

  const handleEditOrder = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      await orderService.updateOrder(currentOrder.order_id, { quantity: formData.quantity })
      setSuccess('Order updated successfully!')
      setShowEditModal(false)
      setCurrentOrder(null)
      setFormData({ user_id: '', item_id: '', quantity: 1 })
      loadOrders()
      loadInventory() // Reload to update quantities
      
      logActivity('order_updated', { 
        order_id: currentOrder.order_id 
      })
    } catch (err) {
      setError(err.message)
      logActivity('order_update_failed', { error: err.message })
    }
  }

  const handleDeleteOrder = (order) => {
    logActivity('order_delete_clicked', { order_id: order.order_id })
    setDeleteOrderId(order.order_id)
    setDeleteItemName(order.item_name)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteOrder = async () => {
    if (!deleteOrderId) return

    try {
      await orderService.deleteOrder(deleteOrderId)
      setSuccess('Order cancelled successfully!')
      loadOrders()
      loadInventory() // Reload to update quantities
      
      logActivity('order_deleted', { 
        order_id: deleteOrderId,
        item_name: deleteItemName 
      })
    } catch (err) {
      setError(err.message)
      logActivity('order_delete_failed', { error: err.message })
    } finally {
      setShowDeleteConfirm(false)
      setDeleteOrderId(null)
      setDeleteItemName('')
    }
  }

  const cancelDeleteOrder = () => {
    logActivity('order_delete_cancelled', { order_id: deleteOrderId })
    setShowDeleteConfirm(false)
    setDeleteOrderId(null)
    setDeleteItemName('')
  }

  const openEditModal = (order) => {
    logActivity('order_edit_modal_open', { order_id: order.order_id })
    setCurrentOrder(order)
    setFormData({
      user_id: order.user_id,
      item_id: order.item_id,
      quantity: order.quantity
    })
    setShowEditModal(true)
  }

  const closeModals = () => {
    setShowAddModal(false)
    setShowEditModal(false)
    setShowDeleteConfirm(false)
    setCurrentOrder(null)
    setDeleteOrderId(null)
    setDeleteItemName('')
    setFormData({ user_id: '', item_id: '', quantity: 1 })
    setError('')
    logActivity('order_modal_closed', {})
  }

  const isSupervisor = currentUser?.role === 'supervisor' || currentUser?.role === 'admin'

  // Auto-dismiss success/error messages
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [success])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Export orders to CSV
  const exportOrdersCSV = () => {
    const headers = ['Order ID', 'User', 'Item', 'Quantity', 'Order Time']
    const rows = orders.map((order) => [
      order.order_id,
      order.username || 'Unknown',
      order.item_name || 'Unknown Item',
      order.quantity,
      order.order_time ? new Date(order.order_time).toISOString() : ''
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'orders_export.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    logActivity('orders_export_csv', { count: orders.length, filterUserId: filterUserId || null, filterItemId: filterItemId || null })
  }

  // Dynamic header and labels based on view mode
  const headerTitle = openAddOnMount
    ? '🛒 Place Order'
    : (restrictToCurrentUser ? '📋 My Orders' : '📋 Order Management')
  const addBtnLabel = openAddOnMount ? '+ Create Another Order' : '+ Create New Order'

  return (
    <div className="order-management">
      <div className="order-header">
        <h2>{headerTitle}</h2>
        {onClose && (
          <button onClick={onClose} className="btn-close">✕</button>
        )}
      </div>

      {/* Toast Notifications */}
      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}

      {/* Filters and Actions */}
      <div className="order-controls">
        <div className="filters">
          {isSupervisor && (
            <select
              value={filterUserId}
              onChange={(e) => { setFilterUserId(e.target.value); logActivity('orders_filter_user_changed', { user_id: e.target.value || null }) }}
              className="filter-select"
            >
              <option value="">All Users</option>
              {users.map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {user.username}
                </option>
              ))}
            </select>
          )}
          
          <select
            value={filterItemId}
            onChange={(e) => { setFilterItemId(e.target.value); logActivity('orders_filter_item_changed', { item_id: e.target.value || null }) }}
            className="filter-select"
          >
            <option value="">All Items</option>
            {inventory.map((item) => (
              <option key={item.item_id} value={item.item_id}>
                {item.item_name}
              </option>
            ))}
          </select>
        </div>

        <div className="order-controls-buttons">
          <button 
            onClick={() => { setShowAddModal(true); logActivity('order_add_modal_open', {}) }} 
            className="btn btn-primary"
          >
            {addBtnLabel}
          </button>
          <button 
            onClick={exportOrdersCSV}
            className="btn btn-secondary"
          >
            ⬇️ Export CSV
          </button>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="loading">⚙️ Loading orders...</div>
      ) : (
        <div className="order-table-container">
          <table className="order-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>User</th>
                <th>Item</th>
                <th>Quantity</th>
                <th>Order Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="no-data">No orders found</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.order_id}>
                    <td>#{order.order_id}</td>
                    <td>{order.username || 'Unknown'}</td>
                    <td>{order.item_name || 'Unknown Item'}</td>
                    <td className="quantity">{order.quantity}</td>
                    <td>{formatOrderTime(order.order_time)}</td>
                    <td className="actions">
                      {(isSupervisor || order.user_id === currentUser?.id) && (
                        <button 
                          onClick={() => openEditModal(order)}
                          className="btn-icon btn-edit"
                          title="Edit Quantity"
                        >
                          ✏️
                        </button>
                      )}
                      {(isSupervisor || order.user_id === currentUser?.id) && (
                        <button 
                          onClick={() => handleDeleteOrder(order)}
                          className="btn-icon btn-delete"
                          title="Cancel Order"
                        >
                          🗑️
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Order Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Create New Order</h3>
              <button 
                onClick={closeModals}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddOrder}>
              {isSupervisor && (
                <div className="form-group">
                  <label>User <span className="required">*</span></label>
                  <select
                    name="user_id"
                    value={formData.user_id}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select User</option>
                    {users.map((user) => (
                      <option key={user.user_id} value={user.user_id}>
                        {user.username} ({user.role_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Item <span className="required">*</span></label>
                <select
                  name="item_id"
                  value={formData.item_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Item</option>
                  {inventory.map((item) => (
                    <option key={item.item_id} value={item.item_id}>
                      {item.item_name} (Available: {item.quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Quantity <span className="required">*</span></label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  required
                  min="1"
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModals} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  ➕ Create Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Edit Order Quantity</h3>
              <button 
                onClick={closeModals}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleEditOrder}>
              <div className="form-group">
                <label>Item (Read-only)</label>
                <input
                  type="text"
                  value={currentOrder?.item_name || ''}
                  disabled
                  style={{ backgroundColor: '#f5f5f5' }}
                />
              </div>

              <div className="form-group">
                <label>Quantity <span className="required">*</span></label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  required
                  min="1"
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModals} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  ✓ Update Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={cancelDeleteOrder}>
          <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑️ Cancel Order</h3>
              <button 
                onClick={cancelDeleteOrder}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            
            <div className="confirmation-message">
              <p>Are you sure you want to cancel the order for <strong>"{deleteItemName}"</strong>?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={cancelDeleteOrder}>
                Cancel
              </button>
              <button type="button" className="btn-delete-confirm" onClick={confirmDeleteOrder}>
                🗑️ Cancel Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrderManagement

// Helper: ensure UTC timestamps from backend display in local time
const formatOrderTime = (ts) => {
  try {
    if (!ts) return '—'
    const hasTZ = /[zZ]|[+-]\d{2}:\d{2}$/.test(ts)
    const d = new Date(hasTZ ? ts : ts + 'Z')
    return d.toLocaleString()
  } catch (_) {
    return ts
  }
}
