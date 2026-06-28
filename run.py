#!/usr/bin/env python3
"""
Run the whole Vendor Risk Platform (backend + frontend) with a single command:

    python run.py

It starts FastAPI (uvicorn, port 8000) and the Vite dev server (port 5173) as
subprocesses, streams both logs into this one terminal with [backend]/[frontend]
prefixes, and shuts both down together on Ctrl+C.

First-time setup is still required once:
    cd backend  && pip install -r requirements.txt
    cd frontend && npm install
"""
import os
import subprocess
import sys
import threading
import signal

ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT, "backend")
FRONTEND_DIR = os.path.join(ROOT, "frontend")

processes = []


def stream(proc, label):
    for line in iter(proc.stdout.readline, b""):
        sys.stdout.write(f"[{label}] {line.decode(errors='replace')}")
    proc.stdout.close()


def check_setup():
    if not os.path.isdir(os.path.join(BACKEND_DIR, "venv")) and \
       subprocess.run([sys.executable, "-c", "import fastapi"], capture_output=True).returncode != 0:
        print("⚠️  Backend dependencies not found. Run this once first:")
        print("   cd backend && pip install -r requirements.txt\n")
    if not os.path.isdir(os.path.join(FRONTEND_DIR, "node_modules")):
        print("⚠️  Frontend dependencies not found. Run this once first:")
        print("   cd frontend && npm install\n")
        sys.exit(1)


def main():
    check_setup()

    env_file = os.path.join(FRONTEND_DIR, ".env")
    if not os.path.exists(env_file):
        with open(env_file, "w") as f:
            f.write("VITE_API_URL=http://localhost:8000\n")

    print("Starting backend on http://localhost:8000 and frontend on http://localhost:5173 ...\n")

    backend = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
        cwd=BACKEND_DIR, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
    )
    frontend = subprocess.Popen(
        "npm run dev -- --host 0.0.0.0 --port 5173",
        cwd=FRONTEND_DIR, 
        stdout=subprocess.PIPE, 
        stderr=subprocess.STDOUT,
        shell=True
    )
    processes.extend([backend, frontend])

    t1 = threading.Thread(target=stream, args=(backend, "backend"), daemon=True)
    t2 = threading.Thread(target=stream, args=(frontend, "frontend"), daemon=True)
    t1.start()
    t2.start()

    def shutdown(*_):
        print("\nShutting down...")
        for p in processes:
            if p.poll() is None:
                p.terminate()
        for p in processes:
            try:
                p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                p.kill()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    while True:
        for p, name in [(backend, "backend"), (frontend, "frontend")]:
            ret = p.poll()
            if ret is not None:
                print(f"\n[{name}] exited with code {ret}. Shutting everything down.")
                shutdown()
        t1.join(timeout=1)
        if not t1.is_alive() and not t2.is_alive():
            break


if __name__ == "__main__":
    main()
