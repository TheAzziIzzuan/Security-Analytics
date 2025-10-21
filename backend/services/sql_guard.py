# backend/services/sql_guard.py
import re, sqlparse

ALLOWED_TABLES = {"user_logs", "sessions", "users"}
FORBIDDEN = r"\b(insert|update|delete|drop|alter|create|grant|revoke|truncate)\b"

def validate_and_fix(sql: str) -> str:
    if not sql:
        raise ValueError("Empty SQL")
    s = sql.strip().strip(";")

    if not s.lower().startswith("select"):
        raise ValueError("Only SELECT allowed")

    if re.search(r";\s*\S", s):
        raise ValueError("Multiple statements not allowed")

    if re.search(FORBIDDEN, s, re.I):
        raise ValueError("Write keywords not allowed")

    if "limit" not in s.lower():
        s += " LIMIT 200"

    # Very simple FROM/JOIN table allow-list (keeps you safe)
    tbls = re.findall(r"\bfrom\s+([`a-zA-Z0-9_\.]+)|\bjoin\s+([`a-zA-Z0-9_\.]+)", s, re.I)
    for a, b in tbls:
        t = (a or b).split(".")[-1].strip("`")
        if t not in ALLOWED_TABLES:
            raise ValueError(f"Table {t} not allowed")

    # Optional formatting
    return sqlparse.format(s, reindent=True, keyword_case="upper")
