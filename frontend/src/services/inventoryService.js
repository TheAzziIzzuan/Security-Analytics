import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token and session ID to all requests
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

// Handle response errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - redirect to login
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('sessionId')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

const inventoryService = {
  // Get all inventory items with optional filters
  async getInventory(filters = {}) {
    try {
      const params = new URLSearchParams()
      
      if (filters.category) params.append('category', filters.category)
      if (filters.search) params.append('search', filters.search)
      
      const response = await api.get(`/inventory/?${params.toString()}`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Get single inventory item
  async getItem(itemId) {
    try {
      const response = await api.get(`/inventory/${itemId}`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Create new inventory item
  async createItem(itemData) {
    try {
      const response = await api.post('/inventory/', itemData)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Update inventory item
  async updateItem(itemId, itemData) {
    try {
      const response = await api.put(`/inventory/${itemId}`, itemData)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Delete inventory item
  async deleteItem(itemId) {
    try {
      const response = await api.delete(`/inventory/${itemId}`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Get all categories
  async getCategories() {
    try {
      const response = await api.get('/inventory/categories')
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Error handler
  handleError(error) {
    if (error.response) {
      // Server responded with error
      return new Error(error.response.data.error || 'An error occurred')
    } else if (error.request) {
      // Request made but no response
      return new Error('No response from server. Please check your connection.')
    } else {
      // Something else happened
      return new Error(error.message || 'An unexpected error occurred')
    }
  }
}

export default inventoryService
