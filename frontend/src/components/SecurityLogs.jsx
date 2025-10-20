import { useEffect, useState } from 'react'
import logsService from '../services/logsService'
import './SecurityLogs.css'

const SecurityLogs = ({ onClose } ) => {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true)
      setError(null)
      try {
        // Request top 15 most recent logs
        const data = await logsService.getLogs({ limit: 15 })
        setLogs(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()
  }, [])

  return (
    <div className="security-logs-container">
      <div className="security-logs-header">
        <h2>Latest Security Logs</h2>
        <button aria-label="close" onClick={onClose} className="btn-close">✕</button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <table className="logs-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Detail</th>
              <th>IP</th>
              <th>Type</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 && (
              <tr><td colSpan={6}>No logs found</td></tr>
            )}
            {logs.map(log => (
              <tr key={log.log_id}>
                <td>{new Date(log.timestamp).toLocaleString()}</td>
                <td>{log.username || log.user_id}</td>
                <td>{log.action_type}</td>
                <td className="detail">{log.action_detail}</td>
                <td>{log.ip_address}</td>
                <td>{log.log_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default SecurityLogs
