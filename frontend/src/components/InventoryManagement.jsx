import { useState, useEffect } from 'react'
import inventoryService from '../services/inventoryService'
import { logActivity } from '../services/activityLogger'
import './InventoryManagement.css'
 import { useAuth } from '../context/AuthContext'

const InventoryManagement = ({ onClose }) => {
  const [inventory, setInventory] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [currentItem, setCurrentItem] = useState(null)
  
  // Form data
  const [formData, setFormData] = useState({
    item_name: '',
    category: '',
    quantity: 0
  })

  // Role and stock tracking controls
  const { user: currentUser } = useAuth()
  const canEdit = currentUser?.role === 'supervisor' || currentUser?.role === 'admin'
  const [showLowStock, setShowLowStock] = useState(false)
  const [lowStockThreshold, setLowStockThreshold] = useState(10)
  useEffect(() => {
    loadInventory()
    loadCategories()
  }, [selectedCategory, searchTerm])

  const loadInventory = async () => {
    try {
      setLoading(true)
      const filters = {}
      if (selectedCategory) filters.category = selectedCategory
      if (searchTerm) filters.search = searchTerm
      
      const data = await inventoryService.getInventory(filters)
      setInventory(data)
      setError('')
    } catch (err) {
      setError(err.message)
      logActivity('inventory_load_failed', { error: err.message })
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const data = await inventoryService.getCategories()
      setCategories(data)
    } catch (err) {
      console.error('Failed to load categories:', err)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const result = await inventoryService.createItem(formData)
      setSuccess('Item added successfully!')
      setShowAddModal(false)
      setFormData({ item_name: '', category: '', quantity: 0 })
      loadInventory()
      
      logActivity('inventory_item_created', { 
        item_name: formData.item_name,
        category: formData.category 
      })
    } catch (err) {
      setError(err.message)
      logActivity('inventory_item_create_failed', { error: err.message })
    }
  }

  const handleEditItem = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      await inventoryService.updateItem(currentItem.item_id, formData)
      setSuccess('Item updated successfully!')
      setShowEditModal(false)
      setCurrentItem(null)
      setFormData({ item_name: '', category: '', quantity: 0 })
      loadInventory()
      
      logActivity('inventory_item_updated', { 
        item_id: currentItem.item_id,
        item_name: formData.item_name 
      })
    } catch (err) {
      setError(err.message)
      logActivity('inventory_item_update_failed', { error: err.message })
    }
  }

  const handleDeleteItem = async (item) => {
    logActivity('inventory_delete_clicked', { item_id: item.item_id })
    if (!window.confirm(`Are you sure you want to delete "${item.item_name}"?`)) {
      logActivity('inventory_delete_cancelled', { item_id: item.item_id })
      return
    }

    try {
      await inventoryService.deleteItem(item.item_id)
      setSuccess('Item deleted successfully!')
      loadInventory()
      
      logActivity('inventory_item_deleted', { 
        item_id: item.item_id,
        item_name: item.item_name 
      })
    } catch (err) {
      setError(err.message)
      logActivity('inventory_item_delete_failed', { error: err.message })
    }
  }

  const openEditModal = (item) => {
    logActivity('inventory_edit_modal_open', { item_id: item.item_id })
    setCurrentItem(item)
    setFormData({
      item_name: item.item_name,
      category: item.category || '',
      quantity: item.quantity
    })
    setShowEditModal(true)
  }

  const closeModals = () => {
    setShowAddModal(false)
    setShowEditModal(false)
    setCurrentItem(null)
    setFormData({ item_name: '', category: '', quantity: 0 })
    setError('')
    logActivity('inventory_modal_closed', {})
  }

  const displayedInventory = showLowStock 
    ? inventory.filter((i) => Number(i.quantity) < Number(lowStockThreshold)) 
    : inventory

  const exportInventoryCSV = () => {
    const headers = ['Item Name', 'Category', 'Quantity', 'Last Updated']
    const rows = displayedInventory.map((item) => [
      item.item_name,
      item.category || '',
      item.quantity,
      item.last_updated ? new Date(item.last_updated).toISOString() : ''
    ])

    const csvContent = [headers, ...rows]
      .map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'inventory_export.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    logActivity('inventory_export_csv', {
      count: displayedInventory.length,
      category: selectedCategory || null,
      searchTerm: searchTerm || null,
      showLowStock,
      lowStockThreshold
    })
  }

  return (
    <div className="inventory-management">
      <div className="inventory-header">
        <h2>📦 Inventory Management</h2>
        {onClose && (
          <button onClick={onClose} className="btn-close">✕</button>
        )}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Filters and Actions */}
      <div className="inventory-controls">
        <div className="filters">
          <input
            type="text"
            placeholder="🔍 Search items..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); logActivity('inventory_search_changed', { searchTerm: e.target.value }) }}
            className="search-input"
          />
          
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); logActivity('inventory_category_filter_changed', { category: e.target.value }) }}
            className="category-filter"
          >
            <option value="">All Categories</option>
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>

          <label className="low-stock-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={showLowStock}
              onChange={(e) => { setShowLowStock(e.target.checked); logActivity('inventory_low_stock_toggle', { enabled: e.target.checked }) }}
            />
            <span>Show low stock only</span>
          </label>

          {showLowStock && (
            <input
              type="number"
              min="1"
              value={lowStockThreshold}
              onChange={(e) => { setLowStockThreshold(Number(e.target.value)); logActivity('inventory_low_stock_threshold_changed', { threshold: Number(e.target.value) }) }}
              className="threshold-input"
              placeholder="Threshold"
              style={{ width: '110px' }}
            />
          )}
        </div>

        {canEdit && (
          <button 
            onClick={() => { logActivity('inventory_add_modal_open', {}); setShowAddModal(true) }} 
            className="btn btn-primary"
          >
            + Add New Item
          </button>
        )}
        <button 
          onClick={exportInventoryCSV} 
          className="btn btn-secondary"
          style={{ marginLeft: '8px' }}
        >
          ⬇️ Export CSV
        </button>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <div className="loading">Loading inventory...</div>
      ) : (
        <div className="inventory-table-container">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Last Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedInventory.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-data">No inventory items found</td>
                </tr>
              ) : (
                displayedInventory.map((item) => (
                  <tr key={item.item_id}>
                    <td className="item-name">{item.item_name}</td>
                    <td>
                      <span className="category-badge">{item.category || 'N/A'}</span>
                    </td>
                    <td className="quantity">
                      <span className={Number(item.quantity) < Number(lowStockThreshold) ? 'low-stock' : ''}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="last-updated">
                      {item.last_updated ? new Date(item.last_updated).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="actions">
                      {canEdit ? (
                        <>
                          <button 
                            onClick={() => openEditModal(item)}
                            className="btn-icon btn-edit"
                            title="Edit"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item)}
                            className="btn-icon btn-delete"
                            title="Delete"
                          >
                            🗑️
                          </button>
                        </>
                      ) : (
                        <span className="no-actions">View only</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Add New Inventory Item</h3>
            <form onSubmit={handleAddItem}>
              <div className="form-group">
                <label>Item Name *</label>
                <input
                  type="text"
                  name="item_name"
                  value={formData.item_name}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter item name"
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="Enter category"
                  list="categories-list"
                />
                <datalist id="categories-list">
                  {categories.map((cat, idx) => (
                    <option key={idx} value={cat} />
                  ))}
                </datalist>
              </div>

              <div className="form-group">
                <label>Quantity *</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  required
                  min="0"
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModals} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Inventory Item</h3>
            <form onSubmit={handleEditItem}>
              <div className="form-group">
                <label>Item Name *</label>
                <input
                  type="text"
                  name="item_name"
                  value={formData.item_name}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  list="categories-list"
                />
              </div>

              <div className="form-group">
                <label>Quantity *</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  required
                  min="0"
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModals} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryManagement
