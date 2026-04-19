import socket
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from typing import Dict, List
from fastapi.middleware.cors import CORSMiddleware
import dotenv
import os
from fastapi.responses import FileResponse

dotenv.load_dotenv()

app = FastAPI(
    title="ChunkED Agent",
    description="A simple file transfer application using WebRTC",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Session ID -> List of active WebSockets
rooms: Dict[str, List[WebSocket]] = {}

@app.websocket("/ws/signal/{sid}")
async def websocket_endpoint(websocket: WebSocket, sid: str):
    await websocket.accept()
    if sid not in rooms:
        rooms[sid] = []
    
    rooms[sid].append(websocket)
    
    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast to everyone else in the same session
            for client in rooms[sid]:
                if client != websocket:
                    await client.send_text(data)
    except WebSocketDisconnect:
        rooms[sid].remove(websocket)
        if not rooms[sid]:
            del rooms[sid]

# Resolve static directories
BASE_DIR = Path(__file__).parent.parent
out_dir = BASE_DIR / "next-frontend" / "out"
web_dir = BASE_DIR / "web"

print(f"[INFO] Checking for static files in: {out_dir}")

if out_dir.exists():
    print(f"[INFO] Serving static files from: {out_dir}")
    app.mount("/_next", StaticFiles(directory=str(out_dir / "_next")), name="next-static")
    app.mount("/static", StaticFiles(directory=str(out_dir)), name="static")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # Check if file exists in out_dir
        file_path = out_dir / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        
        # Fallback to index.html for SPA routing
        index_path = out_dir / "index.html"
        if index_path.exists():
            return FileResponse(str(index_path))
        
        return {"detail": "Not Found", "searched": str(full_path)}

elif web_dir.exists():
    print(f"[INFO] Serving legacy static files from: {web_dir}")
    app.mount("/", StaticFiles(directory=str(web_dir), html=True), name="static")
else:
    print(f"[WARN] No static directory found. BASE_DIR={BASE_DIR}")
    @app.get("/")
    async def root_fallback():
        import os
        return {
            "error": "Static directory not found",
            "searched_paths": [str(out_dir), str(web_dir)],
            "cwd": os.getcwd(),
            "base_dir": str(BASE_DIR),
            "contents_of_base_dir": os.listdir(BASE_DIR) if BASE_DIR.exists() else "BASE_DIR missing",
            "contents_of_next_frontend": os.listdir(BASE_DIR / "next-frontend") if (BASE_DIR / "next-frontend").exists() else "next-frontend missing"
        }

# To get the device's own IP address
def get_local_ip():
    try:
        # Create a dummy socket to find the default route IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0.1)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

if __name__ == "__main__":
    ip = get_local_ip()
    port = int(os.getenv("PORT", 7734))
    print("\n" + "="*40)
    print(f" ChunkED Agent Starting on port {port}")
    print(f" URL: http://{ip}:{port}")
    print("="*40 + "\n")
    uvicorn.run(app, host="0.0.0.0", port=port)
