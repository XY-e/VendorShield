#!/usr/bin/env bash
# Run backend + frontend together in one terminal. Usage: ./run.sh
# (First-time setup: cd backend && pip install -r requirements.txt
#                     cd frontend && npm install)
set -e
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

[ -f "$ROOT_DIR/frontend/.env" ] || echo "VITE_API_URL=http://localhost:8000" > "$ROOT_DIR/frontend/.env"

cleanup() {
  echo -e "\nShutting down..."
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  wait $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit 0
}
trap cleanup SIGINT SIGTERM

echo "Starting backend on http://localhost:8000 and frontend on http://localhost:5173 ..."

(cd "$ROOT_DIR/backend" && uvicorn main:app --host 0.0.0.0 --port 8000 2>&1 | sed 's/^/[backend] /') &
BACKEND_PID=$!

(cd "$ROOT_DIR/frontend" && npm run dev -- --host 0.0.0.0 --port 5173 2>&1 | sed 's/^/[frontend] /') &
FRONTEND_PID=$!

wait $BACKEND_PID $FRONTEND_PID
