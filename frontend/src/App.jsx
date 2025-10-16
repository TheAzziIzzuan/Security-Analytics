import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import SupervisorDashboard from './pages/SupervisorDashboard'
import EmployeeDashboard from './pages/EmployeeDashboard'
import ContractorDashboard from './pages/ContractorDashboard'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes */}
          <Route 
            path="/supervisor" 
            element={
              <ProtectedRoute allowedRoles={['supervisor']}>
                <SupervisorDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/employee" 
            element={
              <ProtectedRoute allowedRoles={['employee']}>
                <EmployeeDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/contractor" 
            element={
              <ProtectedRoute allowedRoles={['contractor']}>
                <ContractorDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
