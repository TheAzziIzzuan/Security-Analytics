**Setup**
1. Open Docker Desktop
2. cd frontend
3. docker compose up -d --build
4. frontend : http://localhost:5173/login

**Health checks**
- http://localhost:5000/api/health (expect: {"status":"healthy","message":"Backend is running"})
- docker compose ps
- docker compose logs backend -f
- docker compose logs db -f


