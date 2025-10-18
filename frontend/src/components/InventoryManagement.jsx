import { useState, useEffect } from 'react'
import inventoryService from '../services/inventoryService'
import { logActivity } from '../services/activityLogger'
import './InventoryManagement.css'

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
    if (!window.confirm(`Are you sure you want to delete "${item.item_name}"?`)) {
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
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="category-filter"
          >
            <option value="">All Categories</option>
            {categories.map((cat, idx) => (
              <option key={idx} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <button 
          onClick={() => setShowAddModal(true)} 
          className="btn btn-primary"
        >
          + Add New Item
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
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan="5" className="no-data">No inventory items found</td>
                </tr>
              ) : (
                inventory.map((item) => (
                  <tr key={item.item_id}>
                    <td className="item-name">{item.item_name}</td>
                    <td>
                      <span className="category-badge">{item.category || 'N/A'}</span>
                    </td>
                    <td className="quantity">
                      <span className={item.quantity < 10 ? 'low-stock' : ''}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="last-updated">
                      {item.last_updated ? new Date(item.last_updated).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="actions">
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
