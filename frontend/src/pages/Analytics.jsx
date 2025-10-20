import React, { useEffect, useState } from 'react'
import axios from 'axios'
import './Analytics.css'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const Analytics = () => {
  const [anomalies, setAnomalies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('token')
        const res = await axios.get(`${API_URL}/api/analytics/top-anomalies?top=50&min_score=0`, { headers: { Authorization: token ? `Bearer ${token}` : undefined } })
        const data = res.data && (res.data.anomalies || res.data)
        setAnomalies(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  const viewLogs = (a) => {
    const detail = { user_id: a.user_id, start_date: a.created_at }
    window.dispatchEvent(new CustomEvent('openSecurityLogs', { detail }))
  }

  return (
    <div className="analytics-page">
      <h1>Reports & Analytics</h1>
      {loading && <p>Loading...</p>}
      {error && <p className="error">{error}</p>}
      <div className="anomaly-list">
        {anomalies.length === 0 && !loading && <p>No anomalies found for the selected period.</p>}
        {anomalies.map(a => (
          <div key={`${a.user_id}-${a.created_at}`} onClick={() => viewLogs(a)} className={`anomaly-card ${(a.risk_level || '').replace(' ', '-').toLowerCase()}`}>
            <div className="score">{Math.round(a.risk_score || a.score || 0)}</div>
            <div className="info">
              <div>User: {a.username || a.user_id}</div>
              <div>{a.explanation || a.description}</div>
              <div>{a.created_at ? new Date(a.created_at).toLocaleString() : (a.detected_at || '')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Analytics
