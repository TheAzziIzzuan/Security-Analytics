import { useState } from 'react'
import { logActivity } from '../services/activityLogger'
import './UserManagement.css'

const UserManagement = () => {
  const [showAddUser, setShowAddUser] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'employee',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  // Mock users list (will be replaced with API call)
  const [users] = useState([
    { id: 1, username: 'supervisor1', email: 'supervisor@sakuramasas.com', role: 'supervisor' },
    { id: 2, username: 'employee1', email: 'employee@sakuramasas.com', role: 'employee' },
    { id: 3, username: 'contractor1', email: 'contractor@sakuramasas.com', role: 'contractor' },
  ])

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
      role: formData.role 
    })

    try {
      // TODO: Replace with actual API call
      // await api.post('/api/users', formData)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setSuccess(`User "${formData.username}" created successfully!`)
      setFormData({ username: '', email: '', password: '', role: 'employee' })
      setShowAddUser(false)
      
      logActivity('supervisor_create_user_success', { 
        username: formData.username, 
        role: formData.role 
      })
    } catch (err) {
      setError('Failed to create user. Please try again.')
      logActivity('supervisor_create_user_failed', { error: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = (userId, username) => {
    if (window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      logActivity('supervisor_delete_user', { userId, username })
      // TODO: Implement delete user API call
      alert('Delete user functionality will be implemented with backend integration')
    }
  }

  const handleEditUser = (userId, username) => {
    logActivity('supervisor_edit_user', { userId, username })
    // TODO: Implement edit user functionality
    alert('Edit user functionality will be implemented with backend integration')
  }

  return (
    <div className="user-management">
      <div className="user-management-header">
        <h2>👥 User Management</h2>
        <button 
          className="btn-add-user" 
          onClick={() => setShowAddUser(!showAddUser)}
        >
          {showAddUser ? '✕ Cancel' : '+ Add New User'}
        </button>
      </div>

      {success && <div className="success-message">{success}</div>}

      {showAddUser && (
        <div className="add-user-form">
          <h3>Create New User</h3>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="username">Username *</label>
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
                <label htmlFor="email">Email *</label>
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
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="password">Password *</label>
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

              <div className="form-group">
                <label htmlFor="role">Role *</label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="employee">Employee</option>
                  <option value="contractor">Contractor</option>
                  <option value="supervisor">Supervisor</option>
                </select>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Creating User...' : 'Create User'}
            </button>
          </form>
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
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.username}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <button 
                    className="btn-edit"
                    onClick={() => handleEditUser(user.id, user.username)}
                  >
                    Edit
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => handleDeleteUser(user.id, user.username)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default UserManagement
