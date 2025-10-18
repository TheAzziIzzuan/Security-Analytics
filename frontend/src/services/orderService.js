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

const orderService = {
  // Get all orders or filtered orders
  async getOrders(filters = {}) {
    try {
      const params = new URLSearchParams()
      if (filters.user_id) params.append('user_id', filters.user_id)
      if (filters.item_id) params.append('item_id', filters.item_id)
      
      const response = await api.get(`/orders/?${params}`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Get single order
  async getOrder(orderId) {
    try {
      const response = await api.get(`/orders/${orderId}`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Create new order
  async createOrder(orderData) {
    try {
      const response = await api.post('/orders/', orderData)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Update order
  async updateOrder(orderId, orderData) {
    try {
      const response = await api.put(`/orders/${orderId}`, orderData)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Delete order
  async deleteOrder(orderId) {
    try {
      const response = await api.delete(`/orders/${orderId}`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Get orders for specific user
  async getUserOrders(userId) {
    try {
      const response = await api.get(`/orders/user/${userId}`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Error handler
  handleError(error) {
    if (error.response) {
      // Server responded with error
      const message = error.response.data?.error || error.response.data?.message || 'An error occurred'
      return new Error(message)
    } else if (error.request) {
      // Request made but no response
      return new Error('No response from server. Please check your connection.')
    } else {
      // Something else happened
      return new Error(error.message || 'An unexpected error occurred')
    }
  }
}

export default orderService
