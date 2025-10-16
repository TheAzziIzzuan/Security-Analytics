import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logActivity } from '../services/activityLogger'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    logActivity('unauthorized_access_attempt', { requiredRoles: allowedRoles })
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    logActivity('forbidden_access_attempt', { 
      userRole: user.role, 
      requiredRoles: allowedRoles 
    })
    return <Navigate to="/login" replace />
  }

  return children
}

export default ProtectedRoute
