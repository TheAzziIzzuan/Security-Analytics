import { createContext, useContext, useState, useEffect } from 'react'
import authService from '../services/authService'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is logged in on mount
    const token = authService.getToken()
    const savedUser = authService.getCurrentUser()
    if (token && savedUser) {
      setUser(savedUser)
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    const { token, user } = await authService.login(username, password)
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setUser(user)
    return user
  }

  const register = async (username, email, password, role) => {
    const { token, user } = await authService.register(username, email, password, role)
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    setUser(user)
    return user
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
