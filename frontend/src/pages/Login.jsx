import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logActivity } from '../services/activityLogger'
import './Login.css'

const Login = () => {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login, user } = useAuth()

  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      navigate(`/${user.role}`)
    }
  }, [user, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validation
    if (!username || !password) {
      setError('Please fill in all fields')
      setLoading(false)
      logActivity('login_validation_failed', { reason: 'empty_fields' })
      return
    }

    try {
      const loggedInUser = await login(username, password)
      // Redirect based on role
      navigate(`/${loggedInUser.role}`)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed. Please check your credentials.')
      logActivity('login_error', { username, error: err.message })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    if (field === 'username') {
      setUsername(value)
    } else {
      setPassword(value)
    }
    logActivity('form_input', { field, page: 'login' })
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>Sakura Masas</h1>
          <p>Inventory Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <h2>Login</h2>

          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="Enter your username"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="Enter your password"
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <div className="login-footer">
            <p>
              Need access? Contact your supervisor
            </p>
          </div>

          <div className="demo-credentials">
            <p><strong>Demo Credentials:</strong></p>
            <p>Supervisor: supervisor1 / password123</p>
            <p>Employee: employee1 / password123</p>
            <p>Contractor: contractor1 / password123</p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Login
