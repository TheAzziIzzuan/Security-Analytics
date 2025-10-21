**Setup**
1. Open Docker Desktop
2. cd frontend
3. docker compose up -d ollama
4. docker exec -it sakura_ollama ollama pull llama3:8b
5. docker compose up -d --build
6. frontend : http://localhost:5173/login

**Health checks**
- http://localhost:5000/api/health (expect: {"status":"healthy","message":"Backend is running"})
- docker compose ps
- docker compose logs backend -f

**Restart DB**
- docker compose down
- docker compose up -d

