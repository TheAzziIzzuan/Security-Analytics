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
  
  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteItemId, setDeleteItemId] = useState(null)
  const [deleteItemName, setDeleteItemName] = useState('')
  
  // Form data
  const [formData, setFormData] = useState({
    item_name: '',
    category: '',
    quantity: 0
  })

  // Form validation state
  const [formErrors, setFormErrors] = useState({})

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
      // Auto-dismiss error message
      setTimeout(() => setError(''), 5000)
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
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: '' })
    }
  }

  const validateForm = () => {
    const errors = {}
    
    if (!formData.item_name || formData.item_name.trim() === '') {
      errors.item_name = 'Item name is required'
    } else if (formData.item_name.length > 100) {
      errors.item_name = 'Item name must be less than 100 characters'
    }
    
    if (!formData.category || formData.category.trim() === '') {
      errors.category = 'Category is required'
    } else if (formData.category.length > 50) {
      errors.category = 'Category must be less than 50 characters'
    }
    
    if (formData.quantity === '' || formData.quantity === null) {
      errors.quantity = 'Quantity is required'
    } else if (Number(formData.quantity) < 0) {
      errors.quantity = 'Quantity cannot be negative'
    } else if (!Number.isInteger(Number(formData.quantity))) {
      errors.quantity = 'Quantity must be a whole number'
    }
    
    return errors
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate form
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    try {
      const result = await inventoryService.createItem(formData)
      setSuccess('Item added successfully!')
      setShowAddModal(false)
      setFormData({ item_name: '', category: '', quantity: 0 })
      setFormErrors({})
      loadInventory()
      
      logActivity('inventory_item_created', { 
        item_name: formData.item_name,
        category: formData.category 
      })

      // Auto-dismiss success message
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err.message)
      logActivity('inventory_item_create_failed', { error: err.message })
      // Auto-dismiss error message
      setTimeout(() => setError(''), 5000)
    }
  }

  const handleEditItem = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate form
    const errors = validateForm()
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    try {
      await inventoryService.updateItem(currentItem.item_id, formData)
      setSuccess('Item updated successfully!')
      setShowEditModal(false)
      setCurrentItem(null)
      setFormData({ item_name: '', category: '', quantity: 0 })
      setFormErrors({})
      loadInventory()
      
      logActivity('inventory_item_updated', { 
        item_id: currentItem.item_id,
        item_name: formData.item_name 
      })

      // Auto-dismiss success message
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err.message)
      logActivity('inventory_item_update_failed', { error: err.message })
      // Auto-dismiss error message
      setTimeout(() => setError(''), 5000)
    }
  }

  const handleDeleteItem = (item) => {
    logActivity('inventory_delete_clicked', { item_id: item.item_id })
    setDeleteItemId(item.item_id)
    setDeleteItemName(item.item_name)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteItem = async () => {
    if (!deleteItemId) return

    try {
      await inventoryService.deleteItem(deleteItemId)
      setSuccess('Item deleted successfully!')
      loadInventory()
      
      logActivity('inventory_item_deleted', { 
        item_id: deleteItemId,
        item_name: deleteItemName 
      })

      // Auto-dismiss success message
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err.message)
      logActivity('inventory_item_delete_failed', { error: err.message })
      // Auto-dismiss error message
      setTimeout(() => setError(''), 5000)
    } finally {
      setShowDeleteConfirm(false)
      setDeleteItemId(null)
      setDeleteItemName('')
    }
  }

  const cancelDeleteItem = () => {
    logActivity('inventory_delete_cancelled', { item_id: deleteItemId })
    setShowDeleteConfirm(false)
    setDeleteItemId(null)
    setDeleteItemName('')
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
    setShowDeleteConfirm(false)
    setCurrentItem(null)
    setDeleteItemId(null)
    setDeleteItemName('')
    setFormData({ item_name: '', category: '', quantity: 0 })
    setFormErrors({})
    setError('')
    logActivity('inventory_modal_closed', {})
  }

  const displayedInventory = showLowStock 
    ? inventory.filter((i) => Number(i.quantity) < Number(lowStockThreshold)) 
    : inventory

  const getQuantityBarPercentage = (quantity, threshold = 100) => {
    return Math.min((Number(quantity) / threshold) * 100, 100)
  }

  const getQuantityStatus = (quantity, threshold) => {
    const q = Number(quantity)
    if (q === 0) return 'critical-stock'
    if (q < Number(threshold)) return 'low-stock'
    return 'normal'
  }

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

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

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
            <span>Show low stock</span>
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

        <div className="inventory-controls-buttons">
          {canEdit && (
            <button 
              onClick={() => { logActivity('inventory_add_modal_open', {}); setShowAddModal(true) }} 
              className="btn btn-primary"
            >
              ➕ Add New Item
            </button>
          )}
          <button 
            onClick={exportInventoryCSV} 
            className="btn btn-secondary"
          >
            ⬇️ Export CSV
          </button>
        </div>
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
                  <td colSpan="5" className="no-data">
                    {showLowStock 
                      ? `No items below ${lowStockThreshold} units` 
                      : 'No inventory items found'}
                  </td>
                </tr>
              ) : (
                displayedInventory.map((item) => {
                  const quantityStatus = getQuantityStatus(item.quantity, lowStockThreshold)
                  return (
                    <tr key={item.item_id}>
                      <td className="item-name">{item.item_name}</td>
                      <td>
                        <span className="category-badge">{item.category || 'Uncategorized'}</span>
                      </td>
                      <td className="quantity">
                        <div className="quantity-bar">
                          <div className="bar">
                            <div 
                              className={`bar-fill ${quantityStatus}`}
                              style={{ width: `${getQuantityBarPercentage(item.quantity)}%` }}
                            />
                          </div>
                          <span className={quantityStatus}>{item.quantity}</span>
                        </div>
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
                              title="Edit item"
                              aria-label={`Edit ${item.item_name}`}
                            >
                              ✏️
                            </button>
                            <button 
                              onClick={() => handleDeleteItem(item)}
                              className="btn-icon btn-delete"
                              title="Delete item"
                              aria-label={`Delete ${item.item_name}`}
                            >
                              🗑️
                            </button>
                          </>
                        ) : (
                          <span className="no-actions">View only</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={closeModals}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Add New Inventory Item</h3>
              <button 
                onClick={closeModals}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddItem}>
              <div className="form-group">
                <label htmlFor="add-item-name">
                  Item Name <span className="required">*</span>
                </label>
                <input
                  id="add-item-name"
                  type="text"
                  name="item_name"
                  value={formData.item_name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Widget A, Server Memory, etc."
                  autoFocus
                  maxLength="100"
                  className={formErrors.item_name ? 'input-error' : ''}
                />
                {formErrors.item_name && (
                  <span className="error-text">
                    <span className="error-icon">⚠️</span>
                    {formErrors.item_name}
                  </span>
                )}
                <span className="char-count">{formData.item_name.length}/100</span>
              </div>

              <div className="form-group">
                <label htmlFor="add-category">
                  Category <span className="required">*</span>
                </label>
                <input
                  id="add-category"
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="Select or type a category"
                  list="categories-list"
                  maxLength="50"
                  className={formErrors.category ? 'input-error' : ''}
                />
                <datalist id="categories-list">
                  {categories.map((cat, idx) => (
                    <option key={idx} value={cat} />
                  ))}
                </datalist>
                {formErrors.category && (
                  <span className="error-text">
                    <span className="error-icon">⚠️</span>
                    {formErrors.category}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="add-quantity">
                  Quantity <span className="required">*</span>
                </label>
                <input
                  id="add-quantity"
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  required
                  min="0"
                  placeholder="0"
                  className={formErrors.quantity ? 'input-error' : ''}
                />
                {formErrors.quantity && (
                  <span className="error-text">
                    <span className="error-icon">⚠️</span>
                    {formErrors.quantity}
                  </span>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModals} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  ➕ Add Item
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
            <div className="modal-header">
              <h3>✏️ Edit Inventory Item</h3>
              <button 
                onClick={closeModals}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleEditItem}>
              <div className="form-group">
                <label htmlFor="edit-item-name">
                  Item Name <span className="required">*</span>
                </label>
                <input
                  id="edit-item-name"
                  type="text"
                  name="item_name"
                  value={formData.item_name}
                  onChange={handleInputChange}
                  required
                  maxLength="100"
                  autoFocus
                  className={formErrors.item_name ? 'input-error' : ''}
                />
                {formErrors.item_name && (
                  <span className="error-text">
                    <span className="error-icon">⚠️</span>
                    {formErrors.item_name}
                  </span>
                )}
                <span className="char-count">{formData.item_name.length}/100</span>
              </div>

              <div className="form-group">
                <label htmlFor="edit-category">
                  Category <span className="required">*</span>
                </label>
                <input
                  id="edit-category"
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  list="categories-list"
                  maxLength="50"
                  className={formErrors.category ? 'input-error' : ''}
                />
                <datalist id="categories-list">
                  {categories.map((cat, idx) => (
                    <option key={idx} value={cat} />
                  ))}
                </datalist>
                {formErrors.category && (
                  <span className="error-text">
                    <span className="error-icon">⚠️</span>
                    {formErrors.category}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="edit-quantity">
                  Quantity <span className="required">*</span>
                </label>
                <input
                  id="edit-quantity"
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  required
                  min="0"
                  className={formErrors.quantity ? 'input-error' : ''}
                />
                {formErrors.quantity && (
                  <span className="error-text">
                    <span className="error-icon">⚠️</span>
                    {formErrors.quantity}
                  </span>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" onClick={closeModals} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  ✓ Update Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={cancelDeleteItem}>
          <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑️ Delete Item</h3>
              <button 
                onClick={cancelDeleteItem}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            
            <div className="confirmation-message">
              <p>Are you sure you want to delete item <strong>"{deleteItemName}"</strong>?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={cancelDeleteItem}>
                Cancel
              </button>
              <button type="button" className="btn-delete-confirm" onClick={confirmDeleteItem}>
                🗑️ Delete Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default InventoryManagement
