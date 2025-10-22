import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logActivity } from "../services/activityLogger";
import { askSql, chat } from "../services/ai";
import "./AIChat.css";

export default function AIChat() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [q, setQ] = useState("");
  const [history, setHistory] = useState([]);
  const [sqlBlock, setSqlBlock] = useState(null);
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, sqlBlock]);

  async function onAskSql() {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const nl = q.trim();
      setHistory(h => [...h, { role: "user", content: nl }]);
      const data = await askSql(nl);
      // show SQL card + assistant message
      setSqlBlock({ sql: data.sql, columns: data.columns || [], rows: data.rows || [] });
      setHistory(h => [...h, { role: "assistant", content: data.explanation || "Here are the results." }]);
      setQ("");
    } catch (e) {
      setHistory(h => [...h, { role: "assistant", content: `Error: ${e.message || e}` }]);
    } finally {
      setLoading(false);
    }
  }

  async function onChat() {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const msg = q.trim();
      setHistory(h => [...h, { role: "user", content: msg }]);
      const data = await chat(msg, history);
      setHistory(h => [...h, { role: "assistant", content: data.reply || "(no reply)" }]);
      setQ("");
      setSqlBlock(null);
    } catch (e) {
      setHistory(h => [...h, { role: "assistant", content: `Error: ${e.message || e}` }]);
    } finally {
      setLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onChat();
    }
  }

  const handleLogout = () => {
    logActivity('logout_clicked', { role: user?.role });
    logout();
    navigate('/login');
  };

  const handleBack = () => {
    logActivity('ai_chat_close_clicked', { role: user?.role });
    navigate(-1);
  };

  return (
    <div className="ai-container">
      <nav className="ai-nav">
        <div className="nav-brand">
          <h2>Sakura Masas</h2>
          {user && <span className={`role-badge ${user.role?.toLowerCase()}`}>{user.role?.toUpperCase()}</span>}
        </div>
        <div className="nav-user">
          <span>Welcome, {user?.username}</span>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </nav>

      <div className="ai-chat">
        <div className="ai-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <h2>Sakura Masas Generative AI</h2>
              <p>Ask data questions (NL→SQL) or chat for explanations.</p>
            </div>
            <button 
              onClick={handleBack} 
              className="btn-back"
              title="Back to Dashboard"
            >
              ✕
            </button>
          </div>
        </div>

      <div className="ai-body">
        {/* Messages */}
        <div className="ai-thread">
          {history.map((m, i) => (
            <div key={i} className={`msg ${m.role === "user" ? "msg-user" : "msg-assistant"}`}>
              <div className="avatar">{m.role === "user" ? "🧑" : "🤖"}</div>
              <div className="bubble">
                <pre className="content">{m.content}</pre>
              </div>
            </div>
          ))}

          {/* SQL results card (if any) */}
          {sqlBlock && (
            <div className="sql-card">
              <div className="sql-header">
                <span className="badge">SQL</span>
                <code className="sql-text">{sqlBlock.sql}</code>
              </div>
              {sqlBlock.rows?.length ? (
                <div className="sql-table-wrap">
                  <table className="sql-table">
                    <thead>
                      <tr>{sqlBlock.columns.map(c => <th key={c}>{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {sqlBlock.rows.map((r, i) => (
                        <tr key={i}>
                          {r.map((v, j) => <td key={j}>{String(v)}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="no-data">No rows returned.</div>
              )}
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Composer */}
        <div className="composer">
          <textarea
            className="composer-input"
            rows={3}
            placeholder="Type a message…  (Shift+Enter for newline)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={loading}
          />
          <div className="composer-actions">
            <button className="btn btn-secondary" onClick={onAskSql} disabled={loading || !q.trim()}>
              Ask Data (NL→SQL)
            </button>
            <button className="btn btn-primary" onClick={onChat} disabled={loading || !q.trim()}>
              {loading ? "Sending…" : "Chat"}
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
