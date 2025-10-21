# backend/routes/ai_routes.py
from flask import Blueprint, request, jsonify
from sqlalchemy import text
from services.llm_client import chat as llm_chat
from services.sql_guard import validate_and_fix
from extensions import db

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")

SQL_SYSTEM_PROMPT = (
    "You translate English questions into ONE safe MySQL SELECT over these tables:\n"
    "user_logs(log_id,user_id,action_type,action_detail,page_url,ip_address,log_timestamp,session_id,user_agent,is_flagged,log_type),\n"
    "sessions(session_id,user_id,start_time,end_time), users(id,username,role).\n"
    "Rules: return ONLY JSON like {\"sql\":\"...\"}; single SELECT; include LIMIT 200; "
    "no writes; no multiple statements; use explicit column names."
)

CHAT_SYSTEM = (
    "You are a helpful assistant for a Security Analytics web app. Be concise. "
    "If the user asks about data, suggest using the Ask Data box (NL→SQL)."
)

@ai_bp.route("/chat", methods=["POST", "OPTIONS"])
def chat_route():
    if request.method == "OPTIONS":
        return ("", 204)

    data = request.get_json(silent=True) or {}
    message  = data.get("message", "")
    history  = data.get("history", [])

    try:
        reply = llm_chat(
            messages=[*history, {"role":"user","content": message}],
            temperature=0.2,
        )
        return jsonify({"reply": reply})
    except Exception as e:
        # Don’t raise the Werkzeug debugger HTML (which has no CORS headers)
        return jsonify({"error": "LLM unavailable", "detail": str(e)}), 503

@ai_bp.post("/ask-sql")
def ask_sql():
    data = request.get_json(force=True)
    q = (data or {}).get("question", "").strip()
    if not q:
        return jsonify({"error":"missing_question"}), 400

    messages = [
        {"role":"system","content": SQL_SYSTEM_PROMPT},
        {"role":"user","content": q}
    ]
    out = llm_chat(messages, json_mode=True, temperature=0.0)
    sql = out.get("sql", "")

    try:
        sql = validate_and_fix(sql)
    except Exception as e:
        return jsonify({"error":"unsafe_sql", "message": str(e), "llm_sql": sql}), 400

    try:
        with db.engine.connect() as conn:
            result = conn.execute(text(sql))
            rows = [list(r) for r in result.fetchall()]
            cols = list(result.keys())
        return jsonify({"sql": sql, "columns": cols, "rows": rows})
    except Exception as e:
        return jsonify({"error":"db_error", "message": str(e), "sql": sql}), 400


@ai_bp.post("/chat")
def chat():
    data = request.get_json(force=True)
    user_msg = (data or {}).get("message", "").strip()
    history = (data or {}).get("history", [])

    msgs = [{"role":"system","content": CHAT_SYSTEM}]
    msgs.extend(history)
    if user_msg:
        msgs.append({"role":"user","content": user_msg})

    reply = llm_chat(msgs, temperature=0.4)
    return jsonify({"reply": reply})
