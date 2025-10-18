import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token and session ID to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  const sessionId = localStorage.getItem('sessionId')
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  
  if (sessionId) {
    config.headers['X-Session-Id'] = sessionId
  }
  
  return config
})

const userService = {
  // Get all users
  async getUsers() {
    try {
      const response = await api.get('/users/')
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Get single user
  async getUser(userId) {
    try {
      const response = await api.get(`/users/${userId}`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Update user
  async updateUser(userId, userData) {
    try {
      const response = await api.put(`/users/${userId}`, userData)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Delete user (soft delete - deactivates user)
  async deleteUser(userId) {
    try {
      const response = await api.delete(`/users/${userId}`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Get all roles
  async getRoles() {
    try {
      const response = await api.get('/users/roles')
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Get current user info
  async getCurrentUser() {
    try {
      const response = await api.get('/auth/me')
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Error handler
  handleError(error) {
    if (error.response) {
      return new Error(error.response.data.error || 'An error occurred')
    } else if (error.request) {
      return new Error('No response from server. Please check your connection.')
    } else {
      return new Error(error.message || 'An unexpected error occurred')
    }
  }
}

export default userService
