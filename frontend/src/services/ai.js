const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function askSql(question, token) {
  const res = await fetch(`${API}/api/ai/ask-sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ question })
  });
  return res.json();
}

export async function chat(message, history = [], token) {
  const res = await fetch(`${API}/api/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({ message, history })
  });
  return res.json();
}
