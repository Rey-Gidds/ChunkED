import socket
import uvicorn
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from typing import Dict, List
from fastapi.middleware.cors import CORSMiddleware
import dotenv
import os

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

# Serve static files — tries "next-frontend/out" first (production build),
# then falls back to the legacy "web" directory.
out_dir = Path(__file__).parent.parent / "next-frontend" / "out"
web_dir = Path(__file__).parent.parent / "web"

if out_dir.exists():
    app.mount("/", StaticFiles(directory=str(out_dir), html=True), name="static")
elif web_dir.exists():
    app.mount("/", StaticFiles(directory=str(web_dir), html=True), name="static")
else:
    print("[WARN] No static directory found. Run 'npm run build' inside next-frontend/ first, or use the Next.js dev server on port 3000.")

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
