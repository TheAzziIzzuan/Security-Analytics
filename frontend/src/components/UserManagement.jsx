import { useState, useEffect } from 'react'
import { logActivity } from '../services/activityLogger'
import authService from '../services/authService'
import userService from '../services/userService'
import { useAuth } from '../context/AuthContext'
import './UserManagement.css'

const UserManagement = ({ onClose }) => {
  const { user: currentUser } = useAuth()
  const [showAddUser, setShowAddUser] = useState(false)
  const [showEditUser, setShowEditUser] = useState(false)
  const [editingUserId, setEditingUserId] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteUserId, setDeleteUserId] = useState(null)
  const [deleteUsername, setDeleteUsername] = useState('')
  const [formData, setFormData] = useState({
    username: '',
    full_name: '',
    email: '',
    password: '',
    role_id: 3, // Default to employee
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])

  // Load users and roles on component mount
  useEffect(() => {
    loadUsers()
    loadRoles()
  }, [])

  const loadUsers = async () => {
    try {
      const data = await userService.getUsers()
      setUsers(data)
    } catch (err) {
      setError('Failed to load users: ' + err.message)
    }
  }

  const loadRoles = async () => {
    try {
      const data = await userService.getRoles()
      setRoles(data)
    } catch (err) {
      console.error('Failed to load roles:', err)
      // Set default roles if API fails
      setRoles([
        { role_id: 1, role_name: 'Admin' },
        { role_id: 2, role_name: 'Supervisor' },
        { role_id: 3, role_name: 'Employee' },
        { role_id: 4, role_name: 'Contractor' }
      ])
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    logActivity('user_management_form_input', { field: name })
  }

  const validateForm = () => {
    if (!formData.username || !formData.email || !formData.password) {
      setError('Please fill in all fields')
      return false
    }

    if (formData.username.length < 3) {
      setError('Username must be at least 3 characters long')
      return false
    }

    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!validateForm()) {
      return
    }

    setLoading(true)
    logActivity('supervisor_create_user_attempt', { 
      username: formData.username, 
      role_id: formData.role_id 
    })

    try {
      // Use authService register endpoint
      await authService.register(
        formData.username,
        formData.email,
        formData.password,
        formData.full_name,
        parseInt(formData.role_id)
      )
      
      setSuccess(`User "${formData.username}" created successfully!`)
      setFormData({ username: '', full_name: '', email: '', password: '', role_id: 3 })
      setShowAddUser(false)
      
      // Reload users list
      loadUsers()
      
      logActivity('supervisor_create_user_success', { 
        username: formData.username, 
        role_id: formData.role_id 
      })
      
      // Auto-dismiss success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err.message || 'Failed to create user. Please try again.')
      logActivity('supervisor_create_user_failed', { error: err.message })
      // Auto-dismiss error message after 5 seconds
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId, username) => {
    // Prevent deleting own account
    if (currentUser && currentUser.id === userId) {
      setError('You cannot delete your own account!')
      setTimeout(() => setError(''), 5000)
      return
    }

    // Show confirmation modal instead of window.confirm
    setDeleteUserId(userId)
    setDeleteUsername(username)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    try {
      await userService.deleteUser(deleteUserId)
      setSuccess(`User "${deleteUsername}" has been deleted.`)
      loadUsers() // Reload the users list
      setShowDeleteConfirm(false)
      setDeleteUserId(null)
      setDeleteUsername('')
      
      logActivity('supervisor_delete_user', { userId: deleteUserId, username: deleteUsername })
      
      // Auto-dismiss success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err.message || 'Failed to delete user.')
      logActivity('supervisor_delete_user_failed', { userId: deleteUserId, error: err.message })
      // Auto-dismiss error message after 5 seconds
      setTimeout(() => setError(''), 5000)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setDeleteUserId(null)
    setDeleteUsername('')
  }

  const handleEditUser = (user) => {
    setEditingUserId(user.user_id)
    setFormData({
      username: user.username,
      full_name: '',
      email: '',
      password: '', // Leave blank, only update if filled
      role_id: user.role_id
    })
    setShowEditUser(true)
    setShowAddUser(false)
    logActivity('supervisor_edit_user', { userId: user.user_id, username: user.username })
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    setLoading(true)
    logActivity('supervisor_update_user_attempt', { 
      userId: editingUserId, 
      role_id: formData.role_id 
    })

    try {
      const updateData = {
        role_id: parseInt(formData.role_id)
      }
      
      // Only include password if it's filled
      if (formData.password) {
        updateData.password = formData.password
      }

      await userService.updateUser(editingUserId, updateData)
      
      setSuccess(`User updated successfully!`)
      setFormData({ username: '', full_name: '', email: '', password: '', role_id: 3 })
      setShowEditUser(false)
      setEditingUserId(null)
      
      // Reload users list
      loadUsers()
      
      logActivity('supervisor_update_user_success', { userId: editingUserId })
      
      // Auto-dismiss success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000)
    } catch (err) {
      setError(err.message || 'Failed to update user. Please try again.')
      logActivity('supervisor_update_user_failed', { userId: editingUserId, error: err.message })
      // Auto-dismiss error message after 5 seconds
      setTimeout(() => setError(''), 5000)
    } finally {
      setLoading(false)
    }
  }

  const cancelEdit = () => {
    setShowEditUser(false)
    setEditingUserId(null)
    setFormData({ username: '', full_name: '', email: '', password: '', role_id: 3 })
    setError('')
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h2>👥 User Management</h2>
        <div className="header-buttons">
          <button 
            className="btn-add-user" 
            onClick={() => setShowAddUser(!showAddUser)}
          >
            {showAddUser ? '✕ Cancel' : '+ Add New User'}
          </button>
          {onClose && (
            <button onClick={onClose} className="btn-close-section">✕</button>
          )}
        </div>
      </div>

      {success && <div className="success-message">{success}</div>}

      {showAddUser && (
        <div className="modal-overlay" onClick={() => setShowAddUser(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>➕ Create New User</h3>
              <button 
                onClick={() => setShowAddUser(false)}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="username">Username <span className="required">*</span></label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Enter username"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="full_name">Full Name</label>
                  <input
                    type="text"
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">Email <span className="required">*</span></label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter email"
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="password">Password <span className="required">*</span></label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min. 6 characters"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="role_id">Role <span className="required">*</span></label>
                <select
                  id="role_id"
                  name="role_id"
                  value={formData.role_id}
                  onChange={handleChange}
                  disabled={loading}
                >
                  {roles.map(role => (
                    <option key={role.role_id} value={role.role_id}>
                      {role.role_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowAddUser(false)} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? 'Creating User...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditUser && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Edit User</h3>
              <button 
                onClick={cancelEdit}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            <form onSubmit={handleUpdateUser}>
              <div className="form-group">
                <label htmlFor="edit-username">Username (Read-only)</label>
                <input
                  type="text"
                  id="edit-username"
                  value={formData.username}
                  disabled
                  style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-role_id">
                  Role {currentUser && currentUser.id === editingUserId && currentUser.role === 'supervisor' ? '(Read-only - Cannot change your own role)' : <span className="required">*</span>}
                </label>
                <select
                  id="edit-role_id"
                  name="role_id"
                  value={formData.role_id}
                  onChange={handleChange}
                  disabled={loading || (currentUser && currentUser.id === editingUserId && currentUser.role === 'supervisor')}
                  style={currentUser && currentUser.id === editingUserId && currentUser.role === 'supervisor' ? { backgroundColor: '#f5f5f5', cursor: 'not-allowed' } : {}}
                >
                  {roles.map(role => (
                    <option key={role.role_id} value={role.role_id}>
                      {role.role_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="edit-password">New Password (Leave blank to keep current)</label>
                <input
                  type="password"
                  id="edit-password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter new password or leave blank"
                  disabled={loading}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={cancelEdit} disabled={loading}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={loading}>
                  {loading ? 'Updating User...' : 'Update User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑️ Delete User</h3>
              <button 
                onClick={cancelDelete}
                className="modal-close-btn"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
            
            <div className="confirmation-message">
              <p>Are you sure you want to delete user <strong>"{deleteUsername}"</strong>?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={cancelDelete} disabled={loading}>
                Cancel
              </button>
              <button type="button" className="btn-delete-confirm" onClick={confirmDelete} disabled={loading}>
                {loading ? 'Deleting...' : '🗑️ Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="users-list">
        <h3>Existing Users</h3>
        <table className="users-table">
          <thead>
            <tr>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#7f8c8d' }}>
                  {loading ? 'Loading users...' : 'No users found'}
                </td>
              </tr>
            ) : (
              users.map(user => {
                const isCurrentUser = currentUser && currentUser.id === user.user_id
                return (
                  <tr key={user.user_id}>
                    <td>
                      {user.username}
                      {isCurrentUser && <span style={{ color: '#3498db', marginLeft: '8px', fontWeight: '600' }}>(You)</span>}
                    </td>
                    <td>{user.email || 'N/A'}</td>
                    <td>
                      <span className={`role-badge ${user.role_name ? user.role_name.toLowerCase() : 'employee'}`}>
                        {user.role_name || 'Employee'}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn-edit"
                        onClick={() => handleEditUser(user)}
                      >
                        Edit
                      </button>
                      <button 
                        className="btn-delete"
                        onClick={() => handleDeleteUser(user.user_id, user.username)}
                        disabled={isCurrentUser}
                        title={isCurrentUser ? 'You cannot delete your own account' : 'Delete user'}
                      >
                        {isCurrentUser ? 'Cannot Delete Self' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default UserManagement
