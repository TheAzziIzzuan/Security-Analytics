/**
 * Activity Logger for SIEM System
 * Captures user interactions for behavioral analytics
 */

const activityLog = []

export const logActivity = (eventType, data) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    userId: getCurrentUserId(),
    sessionId: getSessionId(),
    userAgent: navigator.userAgent,
    ...data,
  }

  activityLog.push(logEntry)
  console.log('[Activity Log]', logEntry)

  // TODO: Send to backend when API is ready
  // sendToBackend(logEntry)
}

const getCurrentUserId = () => {
  const userStr = localStorage.getItem('user')
  if (userStr) {
    const user = JSON.parse(userStr)
    return user.id
  }
  return null
}

const getSessionId = () => {
  let sessionId = sessionStorage.getItem('sessionId')
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    sessionStorage.setItem('sessionId', sessionId)
  }
  return sessionId
}

// Function to send logs to backend (uncomment when backend is ready)
// const sendToBackend = async (logEntry) => {
//   try {
//     await axios.post('/api/logs', logEntry)
//   } catch (error) {
//     console.error('Failed to send log to backend:', error)
//   }
// }

export const getActivityLogs = () => activityLog

export default { logActivity, getActivityLogs }
