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

const logsService = {
  // Get activity logs with filters
  async getLogs(filters = {}) {
    try {
      const params = new URLSearchParams()
      
      if (filters.user_id) params.append('user_id', filters.user_id)
      if (filters.action_type) params.append('action_type', filters.action_type)
      if (filters.start_date) params.append('start_date', filters.start_date)
      if (filters.end_date) params.append('end_date', filters.end_date)
      if (filters.limit) params.append('limit', filters.limit)
      
      const response = await api.get(`/logs/?${params.toString()}`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Get user sessions
  async getSessions(filters = {}) {
    try {
      const params = new URLSearchParams()
      
      if (filters.user_id) params.append('user_id', filters.user_id)
      if (filters.active_only) params.append('active_only', filters.active_only)
      
      const response = await api.get(`/logs/sessions?${params.toString()}`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Get activity summary
  async getActivitySummary(userId = null, days = 7) {
    try {
      const params = new URLSearchParams()
      
      if (userId) params.append('user_id', userId)
      params.append('days', days)
      
      const response = await api.get(`/logs/activity-summary?${params.toString()}`)
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

export default logsService
