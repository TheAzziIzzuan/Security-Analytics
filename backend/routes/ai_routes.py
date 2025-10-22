from flask import Blueprint, request, jsonify
from sqlalchemy import text
from services.llm_client import chat as llm_chat
from services.sql_guard import validate_and_fix
from extensions import db
import json, re

ai_bp = Blueprint("ai", __name__, url_prefix="/api/ai")

COLS = (
    "log_id,user_id,action_type,action_detail,page_url,ip_address,"
    "log_timestamp,session_id,user_agent,geo_location,is_flagged,log_type"
)

EXPLAIN_SYSTEM = (
    "You are a security analyst. Using ONLY the information provided, write one short paragraph "
    "(max 120 words) explaining what the SQL result shows and any notable signals. "
    "Be cautious—do not invent facts. If there are zero rows, say so. Keep it concise and useful to an admin."
)

SQL_SYSTEM_PROMPT = (
    "Translate the user's English request into ONE safe MySQL SELECT over these tables:\n"
    "user_logs(log_id,user_id,action_type,action_detail,page_url,ip_address,log_timestamp,session_id,user_agent,geo_location,is_flagged,log_type),\n"
    "sessions(session_id,user_id,start_time,end_time),\n"
    "users(user_id,username,password_hash,created_at,role_id).\n"
    "Output ONLY valid JSON: {\"sql\":\"...\"}\n"
    "Rules:\n"
    "- Exactly one SELECT; no INSERT/UPDATE/DELETE/ALTER/DROP; no multiple statements; no comments.\n"
    "- Use explicit column list: " + COLS + "\n"
    "- Always include LIMIT (<=200). Prefer ORDER BY log_timestamp DESC for listings.\n"
    "- If the user says 'log N' (or 'log_id N'): use WHERE log_id = N LIMIT 1 (do NOT interpret this as row number).\n"
    "- If the user says 'row N': return the Nth row by time (oldest first), using ORDER BY log_timestamp ASC LIMIT 1 OFFSET N-1.\n"
    "\n"
    "Examples:\n"
    "User: show log 100\n"
    "Assistant: {\"sql\":\"SELECT " + COLS + " FROM user_logs WHERE log_id = 100 LIMIT 1\"}\n"
    "User: show row 100 of my user logs\n"
    "Assistant: {\"sql\":\"SELECT " + COLS + " FROM user_logs ORDER BY log_timestamp ASC LIMIT 1 OFFSET 99\"}\n"
    "User: last 5 logs\n"
    "Assistant: {\"sql\":\"SELECT " + COLS + " FROM user_logs ORDER BY log_timestamp DESC LIMIT 5\"}\n"
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
        return jsonify({"error": "LLM unavailable", "detail": str(e)}), 503
    
@ai_bp.post("/ask-sql")
def ask_sql():
    data = request.get_json(force=True)
    q = (data or {}).get("question", "").strip()
    if not q:
        return jsonify({"error": "missing_question"}), 400

    q_lc = q.lower()

    # 1) multiple logs in a range
    m = re.search(r'\blogs?\s*(\d+)\s*(?:-|to)\s*(\d+)\b', q_lc)
    if m:
        a, b = int(m.group(1)), int(m.group(2))
        lo, hi = (a, b) if a <= b else (b, a)
        span = min(hi - lo + 1, 200)
        sql = (
            f"SELECT {COLS} FROM user_logs "
            f"WHERE log_id BETWEEN {lo} AND {hi} "
            f"ORDER BY log_id ASC LIMIT {span}"
        )

    else:
        # 2) multiple explicit logs
        m = re.search(r'\blogs?\s+((?:\d+[,\s]+)+\d+)\b', q_lc)
        if m:
            nums = [int(x) for x in re.findall(r'\d+', m.group(1))]
            ids = sorted(set(nums))[:200]
            id_list = ",".join(str(x) for x in ids)
            sql = (
                f"SELECT {COLS} FROM user_logs "
                f"WHERE log_id IN ({id_list}) "
                f"ORDER BY log_id ASC LIMIT {len(ids)}"
            )

        else:
            # 3) deals with single ids
            m = re.search(r'\b(?:log_id|log)\s*[:#]?\s*(\d+)\b', q_lc)
            if m:
                log_id = int(m.group(1))
                sql = f"SELECT {COLS} FROM user_logs WHERE log_id = {log_id} LIMIT 1"

            else:
                # 4) deals with nth role by time
                m = re.search(r'\brow\s+(\d+)\b', q_lc)
                if m:
                    n = max(1, int(m.group(1)))
                    sql = (
                        f"SELECT {COLS} FROM user_logs "
                        f"ORDER BY log_timestamp ASC LIMIT 1 OFFSET {n-1}"
                    )
                else:
                    # 5) fallback to the LLM prompt
                    messages = [
                        {"role": "system", "content": SQL_SYSTEM_PROMPT},
                        {"role": "user", "content": q}
                    ]
                    out = llm_chat(messages, json_mode=True, temperature=0.0) or {}
                    sql = (out.get("sql") or "").strip()

    # Guard (read-only, LIMIT, etc.)
    try:
        sql = validate_and_fix(sql)
    except Exception as e:
        return jsonify({"error": "unsafe_sql", "message": str(e), "llm_sql": sql}), 400

    # Execute
    try:
        with db.engine.connect() as conn:
            result = conn.execute(text(sql))
            rows = [list(r) for r in result.fetchall()]
            cols = list(result.keys())
    except Exception as e:
        return jsonify({"error": "db_error", "message": str(e), "sql": sql}), 400

    # Explanation (second pass, based on actual rows)
    explanation = None
    try:
        context = {
            "question": q,
            "sql": sql,
            "columns": cols,
            "sample_rows": rows[:20],
            "row_count": len(rows),
        }
        msgs = [
            {"role": "system", "content": EXPLAIN_SYSTEM},
            {"role": "user", "content": json.dumps(context, ensure_ascii=False)},
        ]
        explanation = llm_chat(msgs, temperature=0.2)
    except Exception:
        explanation = None

    return jsonify({"sql": sql, "columns": cols, "rows": rows, "explanation": explanation})

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
