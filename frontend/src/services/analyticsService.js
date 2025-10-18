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

const analyticsService = {
  // Get anomaly scores
  async getAnomalyScores(filters = {}) {
    try {
      const params = new URLSearchParams()
      
      if (filters.user_id) params.append('user_id', filters.user_id)
      if (filters.risk_level) params.append('risk_level', filters.risk_level)
      if (filters.days) params.append('days', filters.days)
      
      const response = await api.get(`/analytics/anomaly-scores?${params.toString()}`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Get flagged activities
  async getFlaggedActivities(filters = {}) {
    try {
      const params = new URLSearchParams()
      
      if (filters.severity) params.append('severity', filters.severity)
      if (filters.days) params.append('days', filters.days)
      
      const response = await api.get(`/analytics/flagged-activities?${params.toString()}`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Get dashboard statistics
  async getDashboardStats(days = 7) {
    try {
      const response = await api.get(`/analytics/dashboard-stats?days=${days}`)
      return response.data
    } catch (error) {
      throw this.handleError(error)
    }
  },

  // Get user risk profile
  async getUserRiskProfile(userId, days = 30) {
    try {
      const response = await api.get(`/analytics/user-risk-profile/${userId}?days=${days}`)
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

export default analyticsService
