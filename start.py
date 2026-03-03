import subprocess
import sys
import os
import time
import shutil

# Root directory of the project
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
# Backend directory
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
# Frontend directory
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend", "ui", "web")

import httpx
import json

# Detect local virtual environment python
VENV_PATH = os.path.join(ROOT_DIR, ".venv")
if os.name == "nt": # Windows
    PYTHON_EXE = os.path.join(VENV_PATH, "Scripts", "python.exe")
else: # Unix/Linux/MacOS
    PYTHON_EXE = os.path.join(VENV_PATH, "bin", "python")

# Fallback to current sys.executable if .venv not found
if not os.path.exists(PYTHON_EXE):
    print(f"Warning: .venv not found at {VENV_PATH}. Using system python.")
    PYTHON_EXE = sys.executable
else:
    print(f"Using virtual environment: {VENV_PATH}")

def run_command(cmd, cwd=None):
    print(f"Executing: {' '.join(cmd)}")
    return subprocess.run(cmd, cwd=cwd, shell=True)

async def check_ollama_async():
    print("Checking Ollama status...")
    # Try API first (most reliable if running as Desktop app)
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get("http://localhost:11434/api/tags", timeout=2.0)
            if response.status_code == 200:
                print("Ollama API is responsive at http://localhost:11434")
                return True
        except Exception:
            pass

    # Fallback to checking CLI
    if shutil.which("ollama"):
        print("Ollama CLI found. Starting Ollama serve...")
        subprocess.Popen(["ollama", "serve"], shell=True)
        # Wait for API to come up
        for _ in range(10):
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get("http://localhost:11434/api/tags", timeout=2.0)
                    if resp.status_code == 200: return True
            except: pass
            time.sleep(2)
        return True
    
    print("Error: Ollama not detected via API (localhost:11434) or CLI.")
    print("Please ensure Ollama is running or install it from https://ollama.com")
    sys.exit(1)

async def pull_model_async(model_name):
    print(f"Ensuring model {model_name} is pulled...")
    
    # Try CLI first if available
    if shutil.which("ollama"):
        run_command(["ollama", "pull", model_name])
        return

    # Fallback to API pull
    print(f"Pulling {model_name} via REST API...")
    async with httpx.AsyncClient(timeout=None) as client:
        try:
            async with client.stream("POST", "http://localhost:11434/api/pull", json={"name": model_name}) as response:
                async for line in response.aiter_lines():
                    if line:
                        status = json.loads(line)
                        if "status" in status:
                            print(f"\rStatus: {status['status']}", end="")
            print("\nPull complete.")
        except Exception as e:
            print(f"Error pulling model via API: {e}")

def init_db():
    print("Initializing SQLite database...")
    # Run initialization in a separate process to ensure venv dependencies are used
    subprocess.run([
        PYTHON_EXE, "-c", 
        "import sys; sys.path.append('backend'); from mcp_server.safety.database import init_db; import asyncio; asyncio.run(init_db())"
    ], cwd=ROOT_DIR, shell=True)

def start_server():
    print("Starting OpsPilot Server (Backend)...")
    # Use Popen so it doesn't block the main thread
    subprocess.Popen([
        PYTHON_EXE, "-m", "uvicorn", 
        "mcp_server.server:app", 
        "--host", "0.0.0.0", 
        "--port", "8000"
    ], cwd=BACKEND_DIR, shell=True)

def start_frontend():
    print("Starting OpsPilot Web UI (Gradio)...")
    # Launch Gradio app
    subprocess.Popen([
        PYTHON_EXE, "app.py"
    ], cwd=FRONTEND_DIR, shell=True)

def main():
    import asyncio
    asyncio.run(check_ollama_async())
    asyncio.run(pull_model_async("qwen2.5:7b"))
    init_db()
    print("\nOpsPilot services are starting...")
    start_server()
    time.sleep(2) # Give backend a moment
    start_frontend()
    print("\nOpsPilot is ready:")
    print("- Backend API: http://localhost:8000")
    print("- Web UI:     http://localhost:7860")
    
    # Keep main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping OpsPilot...")

if __name__ == "__main__":
    main()
