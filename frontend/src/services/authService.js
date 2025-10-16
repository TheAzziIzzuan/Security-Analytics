import axios from 'axios'
import { logActivity } from './activityLogger'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Mock API responses for development (remove when backend is ready)
const MOCK_MODE = true

const mockUsers = [
  { id: 1, username: 'supervisor1', password: 'password123', role: 'supervisor', email: 'supervisor@sakuramasas.com' },
  { id: 2, username: 'employee1', password: 'password123', role: 'employee', email: 'employee@sakuramasas.com' },
  { id: 3, username: 'contractor1', password: 'password123', role: 'contractor', email: 'contractor@sakuramasas.com' },
]

const authService = {
  async login(username, password) {
    // Log login attempt
    logActivity('login_attempt', { username })

    if (MOCK_MODE) {
      // Mock login
      const user = mockUsers.find(u => u.username === username && u.password === password)
      if (user) {
        const token = `mock-token-${user.id}-${Date.now()}`
        const userData = { id: user.id, username: user.username, role: user.role, email: user.email }
        
        // Log successful login
        logActivity('login_success', { username, role: user.role })
        
        return { token, user: userData }
      } else {
        // Log failed login
        logActivity('login_failed', { username, reason: 'invalid_credentials' })
        throw new Error('Invalid username or password')
      }
    }

    try {
      const response = await api.post('/auth/login', { username, password })
      logActivity('login_success', { username, role: response.data.user.role })
      return response.data
    } catch (error) {
      logActivity('login_failed', { username, reason: error.response?.data?.message || 'unknown' })
      throw error
    }
  },

  async register(username, email, password, role) {
    // Log registration attempt
    logActivity('registration_attempt', { username, email, role })

    if (MOCK_MODE) {
      // Mock registration
      const existingUser = mockUsers.find(u => u.username === username || u.email === email)
      if (existingUser) {
        logActivity('registration_failed', { username, email, reason: 'user_exists' })
        throw new Error('Username or email already exists')
      }

      const newUser = {
        id: mockUsers.length + 1,
        username,
        email,
        role,
      }
      mockUsers.push({ ...newUser, password })
      const token = `mock-token-${newUser.id}-${Date.now()}`
      
      logActivity('registration_success', { username, email, role })
      
      return { token, user: newUser }
    }

    try {
      const response = await api.post('/auth/register', { username, email, password, role })
      logActivity('registration_success', { username, email, role })
      return response.data
    } catch (error) {
      logActivity('registration_failed', { username, email, reason: error.response?.data?.message || 'unknown' })
      throw error
    }
  },

  logout() {
    logActivity('logout', {})
    localStorage.removeItem('token')
    localStorage.removeItem('user')
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
