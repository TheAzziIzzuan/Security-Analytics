import os, json, re, requests

# Use the docker service host, override via env if needed
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")
LLM_MODEL  = os.getenv("LLM_MODEL", "llama3:8b")

def chat(messages, temperature=0.2, json_mode=False, model=None, timeout=120):
    """Call Ollama /api/chat. messages=[{role:'system'|'user'|'assistant', content:str}]"""
    url = f"{OLLAMA_URL.rstrip('/')}/api/chat"
    payload = {
        "model": LLM_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_ctx": 2048,
        },
        "keep_alive": "30m"
    }

    try:
        r = requests.post(url, json=payload, timeout=timeout)
        r.raise_for_status()
        data = r.json()
        content = data.get("message", {}).get("content") or data.get("response", "")
    except Exception as e:
        raise RuntimeError(f"Ollama call failed: {e}")

    if not json_mode:
        return content

    try:
        return json.loads(content)
    except Exception:
        m = re.search(r"\{[\s\S]*\}", content)
        return json.loads(m.group(0)) if m else {}
