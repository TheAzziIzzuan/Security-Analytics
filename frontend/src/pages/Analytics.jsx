import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logActivity } from '../services/activityLogger'
import './Analytics.css'
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const Analytics = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('rule-based')
  const [ruleDetections, setRuleDetections] = useState([])
  const [baselineAnomalies, setBaselineAnomalies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [autoRunning, setAutoRunning] = useState(false)

  // Check sessionStorage instead of component state
  useEffect(() => {
    const hasRunThisSession = sessionStorage.getItem('detectionAutoRun')
    
    if (!hasRunThisSession) {
      runAllDetections()
      sessionStorage.setItem('detectionAutoRun', 'true')  // Persist across refreshes
    } else {
      // Just fetch existing data
      fetchData()
    }
  }, [])  // un only on mount

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const runAllDetections = async () => {
    setAutoRunning(true)
    const token = localStorage.getItem('token')
    const headers = { Authorization: token ? `Bearer ${token}` : undefined }

    try {
      console.log('🔍 Running detection analysis...')
      
      // Run both detections in parallel
      const [ruleRes, baseRes] = await Promise.all([
        axios.post(`${API_URL}/api/analytics/run-rule-detection`, { window_hours: 720 }, { headers }),
        axios.post(`${API_URL}/api/analytics/run-detection`, {}, { headers })
      ])

      console.log('✅ Detection complete')

      // If baseline returned structured anomalies, use them directly (includes std_pct/causes)
      if (baseRes && baseRes.data && Array.isArray(baseRes.data.anomalies)) {
        setBaselineAnomalies(baseRes.data.anomalies)
      } else {
        // otherwise fall back to fetch
        await fetchData()
      }
    } catch (err) {
      console.error('Auto-detection error:', err)
    } finally {
      setAutoRunning(false)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: token ? `Bearer ${token}` : undefined }
      
      if (activeTab === 'rule-based') {
        const res = await axios.get(`${API_URL}/api/analytics/rule-based-detections?top=50&min_score=0`, { headers })
        const data = res.data.detections || []
        setRuleDetections(Array.isArray(data) ? data : [])
      } else {
        // For baseline tab, fetch AnomalyScore rows (statistical baseline) only
        const res = await axios.get(`${API_URL}/api/analytics/anomaly-scores?days=30`, { headers })
        const data = res.data || []
        // API returns array of AnomalyScore.to_dict objects
        setBaselineAnomalies(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const viewLogs = (a) => {
    const detail = { user_id: a.user_id, start_date: a.created_at || a.detected_at }
    window.dispatchEvent(new CustomEvent('openSecurityLogs', { detail }))
  }

  const handleLogout = () => {
    logActivity('logout_clicked', { role: user?.role })
    logout()
    navigate('/login')
  }

  const handleBack = () => {
    logActivity('analytics_close_clicked', { role: user?.role })
    navigate(-1)
  }

  const renderDetections = () => {
    const data = activeTab === 'rule-based' ? ruleDetections : baselineAnomalies
    
    if (loading || autoRunning) {
      return (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>🔍 {autoRunning ? 'Running detection analysis...' : 'Loading...'}</p>
          {autoRunning && <small>This may take a few seconds...</small>}
        </div>
      )
    }
    
    if (error) return <p className="error">{error}</p>
    if (data.length === 0) return <p>No detections found for the selected period.</p>

    return (
      <div className="anomaly-list">
        {data.map(a => {
          const riskClass = (a.risk_level || '').replace(' ', '-').toLowerCase()
          const timestamp = a.detected_at || a.created_at
          
          return (
            <div 
              key={`${a.detection_id || a.score_id}-${a.user_id}-${timestamp}`} 
              onClick={() => viewLogs(a)} 
              className={`anomaly-card ${riskClass}`}
            >
              <div className="score-badge">
                <div className="score-value">{Math.round(a.risk_score || a.score || 0)}</div>
                <div className="score-label">{a.risk_level || 'Unknown'}</div>
                {activeTab === 'baseline' && (a.std_pct !== undefined) && (
                  <div className="score-meta" style={{ fontSize: '12px', marginTop: '6px', color: '#666' }}>
                    std: {a.std_pct}%
                  </div>
                )}
              </div>
              
              <div className="info">
                <div className="info-header">
                  <span className="user-badge">👤 {a.username || `User ${a.user_id}`}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span className="timestamp">{timestamp ? new Date(timestamp).toLocaleString() : 'Unknown'}</span>
                    {activeTab === 'rule-based' && a.session_id && (
                      <span 
                        className="session-badge" 
                        title={`Full Session ID: ${a.session_id}`}
                        style={{ cursor: 'help' }}
                      >
                        Session: {a.session_id}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* RULE-BASED: Enhanced format */}
                {activeTab === 'rule-based' && a.explanation && (
                  <div className="findings">
                    {a.explanation.split('|').map((finding, idx) => {
                      const parts = finding.trim().split(':')
                      const ruleName = parts[0]
                      const details = parts.slice(1).join(':')
                      
                      return (
                        <div key={idx} className="finding-item">
                          <span className="finding-badge">{ruleName}</span>
                          <span className="finding-detail">{details}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
                
                {/* BASELINE: show structured findings when present (std_pct, causes, findings) */}
                {activeTab === 'baseline' && (
                  <div className="findings">
                    {a.deviation_pct !== undefined && (
                      <div className="finding-item"><strong>Deviation:</strong> {a.deviation_pct}% (std: {a.std_pct || 'N/A'}%)</div>
                    )}

                    {a.causes && a.causes.length > 0 && (() => {
                      const names = (a.causes_detail && a.causes_detail.length > 0)
                        ? a.causes_detail.map(c => `${c.name}${c.value !== undefined ? ` (${c.value})` : ''}`)
                        : a.causes;
                      const top = names.slice(0, 2).join(', ')
                      const more = names.length > 2 ? ` (+${names.length - 2} more)` : ''
                      return (
                        <div className="finding-item">
                          <strong>Causes:</strong> {top}{more}
                        </div>
                      )
                    })()}

                    {a.findings && a.findings.length > 0 && a.findings.map((f, idx) => (
                      <div key={idx} className="finding-item">
                        <span className="finding-badge">{f.name}</span>
                        <span className="finding-detail">{f.description} {f.points ? `(+${f.points} pts)` : ''}</span>
                      </div>
                    ))}

                    {/* fallback to explanation text if nothing structured */}
                    {(!a.findings || a.findings.length === 0) && (a.explanation) && (
                      <div className="description">{a.explanation}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="analytics-container">
      <nav className="analytics-nav">
        <div className="nav-brand">
          <h2>Sakura Masas</h2>
          {user && <span className={`role-badge ${user.role?.toLowerCase()}`}>{user.role?.toUpperCase()}</span>}
        </div>
        <div className="nav-user">
          <span>Welcome, {user?.username}</span>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </nav>

      <div className="analytics-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1>Reports & Analytics</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {autoRunning && <span style={{ color: '#1976d2', fontSize: '14px' }}>⚙️ Analyzing...</span>}
            <button 
              onClick={handleBack} 
              className="btn-back"
              title="Back to Dashboard"
            >
              ✕
            </button>
          </div>
        </div>
      
      <div className="analytics-tabs">
        <button 
          className={`tab-button ${activeTab === 'rule-based' ? 'active' : ''}`}
          onClick={() => setActiveTab('rule-based')}
        >
          Rule-Based Detection
        </button>
        <button 
          className={`tab-button ${activeTab === 'baseline' ? 'active' : ''}`}
          onClick={() => setActiveTab('baseline')}
        >
          Baseline Detection
        </button>
      </div>

      <div className="tab-description">
        {activeTab === 'rule-based' ? (
          <p>Immediate rule-based checks: failed logins, unusual exports, after-hours activity, role violations, etc.</p>
        ) : (
          <p>Statistical baseline analysis: compares user behavior against 30-day history and peer groups using Z-scores.</p>
        )}
      </div>

      {renderDetections()}
      </div>
    </div>
  )
}

export default Analytics
