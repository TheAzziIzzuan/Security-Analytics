import axios from 'axios'
import { logActivity } from './activityLogger'

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

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired - clear storage and redirect
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('sessionId')
    }
    return Promise.reject(error)
  }
)

const authService = {
  async login(username, password) {
    // Log login attempt
    logActivity('login_attempt', { username })

    try {
      const response = await api.post('/auth/login', { username, password })
      const { access_token, session_id, user } = response.data
      
      // Map role_id to role name for frontend compatibility
      const roleMap = {
        1: 'admin',
        2: 'supervisor',
        3: 'employee',
        4: 'contractor'
      }
      
      const userData = {
        id: user.user_id,
        username: user.username,
        email: user.email,
        role: user.role_name ? user.role_name.toLowerCase() : roleMap[user.role_id] || 'employee',
        full_name: user.full_name
      }
      
      // Store token, session ID, and user data
      localStorage.setItem('token', access_token)
      localStorage.setItem('sessionId', session_id)
      localStorage.setItem('user', JSON.stringify(userData))
      
      // Log successful login
      logActivity('login_success', { username, role: userData.role })
      
      return { token: access_token, user: userData, session_id }
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Invalid username or password'
      logActivity('login_failed', { username, reason: errorMessage })
      throw new Error(errorMessage)
    }
  },

  async register(username, email, password, full_name, role_id = 3) {
    // Log registration attempt
    logActivity('registration_attempt', { username, email })

    try {
      const response = await api.post('/auth/register', { 
        username, 
        email, 
        password, 
        full_name,
        role_id 
      })
      
      const { user } = response.data
      
      logActivity('registration_success', { username, email })
      
      return response.data
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed'
      logActivity('registration_failed', { username, email, reason: errorMessage })
      throw new Error(errorMessage)
    }
  },

  async logout() {
    const sessionId = localStorage.getItem('sessionId')
    
    try {
      // Call backend logout endpoint
      await api.post('/auth/logout', { session_id: sessionId })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      // Always clear local storage
      logActivity('logout', {})
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('sessionId')
    }
  },

  getCurrentUser() {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  },

  getToken() {
    return localStorage.getItem('token')
  },
}

export default authService
