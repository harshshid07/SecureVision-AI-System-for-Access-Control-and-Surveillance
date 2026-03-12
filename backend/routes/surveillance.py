"""
Surveillance API routes for SecureVision
Handles: live feed streaming, recording control, surveillance logs, attendance
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends  # type: ignore
from fastapi.responses import StreamingResponse  # type: ignore
from typing import List, Optional
from datetime import datetime
import asyncio
import json
import logging

from models import (  # type: ignore
    RecordingDurationRequest,
    VerifyUnlockRequest,
    VerificationResponse,
)
from supabase_client import db  # type: ignore

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/surveillance", tags=["surveillance"])

# WebSocket connection manager
class ConnectionManager:
    """Manages active WebSocket connections for real-time alerts"""
    
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"✓ WebSocket connected ({len(self.active_connections)} total)")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"✓ WebSocket disconnected ({len(self.active_connections)} total)")
    
    async def broadcast(self, message: dict):
        """Send alert to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        
        for conn in disconnected:
            self.disconnect(conn)


ws_manager = ConnectionManager()


# ==================== SURVEILLANCE CONTROL ====================

@router.post("/start")
async def start_surveillance(camera_id: str = "0"):
    """Start the surveillance engine for a specific camera"""
    from surveillance_engine import engine_manager  # type: ignore
    
    # Int for local USB cameras, Str for RTSP streams
    try:
        cam = int(camera_id)
    except ValueError:
        cam = camera_id
    
    # Set up the event loop for async callbacks from threads
    if not engine_manager._loop:
        loop = asyncio.get_event_loop()
        engine_manager.set_event_loop(loop)
        
        # Register database callbacks
        engine_manager.register_db_callbacks({
            "create_attendance": db.create_attendance,
            "create_surveillance_log": db.create_surveillance_log,
            "create_recording": db.create_local_recording,
            "update_recording_end": db.update_recording_end_time,
            "upload_threat_clip": db.upload_threat_clip,
            "upload_security_audit": db.upload_security_audit,
        })
    
    # Register WebSocket alert broadcast
    async def ws_alert(alert_data: dict):
        await ws_manager.broadcast(alert_data)
    
    # Load user embeddings for face matching
    embeddings = await db.get_all_user_embeddings()
    # Initial update for any existing analyst before starting a new engine
    for engine_instance in engine_manager.engines.values():
        if engine_instance.analyst:
            engine_instance.analyst.update_user_embeddings(embeddings)
    
    # Start engine
    started = engine_manager.start_engine(cam)
    
    if not started:
        return {"status": "already_running", "message": f"Camera {cam} is already active"}
    
    # After start, update embeddings
    engine = engine_manager.get_engine(cam)
    if engine and engine.analyst:
        embeddings = await db.get_all_user_embeddings()
        engine.analyst.update_user_embeddings(embeddings)
        
    return {"status": "started", "message": f"Surveillance started for camera {cam}", "camera_id": camera_id}


@router.post("/stop")
async def stop_surveillance(camera_id: str = "0"):
    """Stop the surveillance engine for a specific camera"""
    from surveillance_engine import engine_manager  # type: ignore
    engine_manager.stop_engine(camera_id)
    return {"status": "stopped", "message": f"Surveillance stopped for camera {camera_id}"}


@router.get("/status")
async def get_surveillance_status():
    """Get current surveillance aggregate engine status"""
    from surveillance_engine import engine_manager  # type: ignore
    return engine_manager.get_status()


@router.post("/refresh-embeddings")
async def refresh_embeddings():
    """Refresh user embeddings cache across all active cameras"""
    from surveillance_engine import engine_manager  # type: ignore
    
    embeddings = await db.get_all_user_embeddings()
    updated = 0
    for cam_id, engine in engine_manager.engines.items():
        if engine.analyst:
            engine.analyst.update_user_embeddings(embeddings)
            updated += 1
            
    return {"status": "refreshed", "user_count": len(embeddings), "active_cameras_updated": updated}


# ==================== RECORDING CONTROL ====================

@router.post("/recording/duration")
async def set_recording_duration(request: RecordingDurationRequest):
    """Change recording chunk duration for all active engines"""
    from surveillance_engine import engine_manager  # type: ignore
    for eng in engine_manager.engines.values():
        eng.set_chunk_duration(request.duration_minutes)
    return {
        "status": "updated",
        "duration_minutes": request.duration_minutes
    }


@router.get("/recordings")
async def get_recordings(limit: int = 50):
    """Get local recording entries"""
    recordings = await db.get_local_recordings(limit=limit)
    return recordings

@router.get("/recordings/{filename}")
async def serve_recording_file(filename: str):
    """Serve the physical video recording file"""
    import os
    from config import settings  # type: ignore
    from fastapi.responses import FileResponse  # type: ignore
    
    file_path = os.path.join(settings.RECORDINGS_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(file_path)


# ==================== LIVE FEED ====================

@router.get("/feed")
async def mjpeg_feed(camera_id: str = "0"):
    """MJPEG live video stream for a specific camera"""
    from surveillance_engine import engine_manager  # type: ignore
    
    async def generate():
        while True:
            engine = engine_manager.get_engine(camera_id)
            if engine:
                frame = engine.get_mjpeg_frame()
                if frame:
                    yield (
                        b'--frame\r\n'
                        b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n'
                    )
            await asyncio.sleep(0.033)  # ~30fps
    
    return StreamingResponse(
        generate(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


# ==================== WEBSOCKET ====================

@router.websocket("/ws/alerts")
async def websocket_alerts(websocket: WebSocket):
    """WebSocket endpoint for real-time surveillance alerts"""
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, receive any client messages
            data = await websocket.receive_text()
            # Client can send commands via WebSocket too
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


# ==================== SURVEILLANCE LOGS ====================

@router.get("/logs")
async def get_surveillance_logs(limit: int = 50, event_type: Optional[str] = None):
    """Get surveillance event logs"""
    logs = await db.get_surveillance_logs(limit=limit, event_type=event_type)
    return logs


# ==================== ATTENDANCE ====================

@router.get("/attendance")
async def get_attendance(date: Optional[str] = None, limit: int = 100):
    """Get attendance records, defaults to today"""
    if date is None:
        date = datetime.now().strftime("%Y-%m-%d")
    
    records = await db.get_attendance_by_date(date=date, limit=limit)
    return records


# ==================== KIOSK FILE EXPLORER BRIDGE ====================

# Store pending file explorer commands for the kiosk to poll
_pending_explorer_commands: List[str] = []

@router.post("/open-explorer")
async def open_file_explorer(local_path: str):
    """Queue a command to open File Explorer at the given path (kiosk will poll)"""
    _pending_explorer_commands.append(local_path)
    return {"status": "queued", "path": local_path}


@router.get("/explorer-commands")
async def get_explorer_commands():
    """Kiosk polls this to check for pending file explorer open commands"""
    global _pending_explorer_commands
    commands = _pending_explorer_commands.copy()
    _pending_explorer_commands.clear()
    return {"commands": commands}

@router.get("/cameras")
async def get_available_cameras():
    """Fetch available camera devices for the dashboard"""
    import cv2  # type: ignore
    
    available = []
    # Test first 5 indices
    for i in range(5):
        cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
        if not cap.isOpened():
            cap = cv2.VideoCapture(i)
        
        if cap.isOpened():
            ret, _ = cap.read()
            if ret:
                w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                available.append({
                    "id": i,
                    "name": f"Camera {i} ({w}x{h})"
                })
            cap.release()
    
    return {"cameras": available}

@router.post("/set-path")
async def set_recordings_path(path: str):
    """Update the directory where local recordings are saved"""
    import os
    from config import settings  # type: ignore
    from surveillance_engine import engine_manager  # type: ignore
    
    if not os.path.exists(path):
        try:
            os.makedirs(path, exist_ok=True)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid path: {e}")
            
    # Update settings and active recorders
    settings.RECORDINGS_DIR = path
    for engine in engine_manager.engines.values():
        if engine.recorder:
            engine.recorder.recordings_dir = path
        
    return {"status": "success", "path": path}


# ==================== STORAGE MODE ====================

@router.get("/storage-mode")
async def get_storage_mode():
    """Get current storage mode setting"""
    from config import settings  # type: ignore
    return {"mode": settings.STORAGE_MODE}

@router.post("/storage-mode")
async def set_storage_mode(mode: str):
    """Set storage mode: local, cloud, or both"""
    from config import settings  # type: ignore
    if mode not in ("local", "cloud", "both"):
        raise HTTPException(status_code=400, detail="Mode must be 'local', 'cloud', or 'both'")
    settings.STORAGE_MODE = mode
    return {"status": "updated", "mode": mode}


# ==================== USER SNAPSHOTS ====================

@router.get("/user-snapshots/{user_id}")
async def get_user_snapshots(user_id: str, limit: int = 50):
    """Get login snapshots for a specific user (from DB + local files)"""
    import os
    from config import settings  # type: ignore
    
    # Get user info to find their folder
    user = None
    try:
        all_users = await db.get_all_users()
        user = next((u for u in all_users if u["id"] == user_id), None)
    except Exception:
        pass
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    username = user["username"]
    user_dir = os.path.join(settings.SNAPSHOTS_DIR, username)
    
    snapshots = []
    if os.path.exists(user_dir):
        files = sorted(os.listdir(user_dir), reverse=True)[:limit]
        for f in files:
            if f.lower().endswith(('.jpg', '.jpeg', '.png')):
                filepath = os.path.join(user_dir, f)
                stat = os.stat(filepath)
                snapshots.append({
                    "filename": f,
                    "username": username,
                    "size": stat.st_size,
                    "created_at": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "local_path": filepath,
                    "cloud_url": None  # Will be populated from DB if available
                })
    
    # Merge cloud URLs from login_logs if available
    try:
        db_logs = await db.get_login_snapshots(user_id, limit=limit)
        # Create a lookup by approximate timestamp match
        for snap in snapshots:
            for log in db_logs:
                if log.get("snapshot_cloud_url"):
                    snap["cloud_url"] = log["snapshot_cloud_url"]
                    break
    except Exception:
        pass
    
    return {"user_id": user_id, "username": username, "snapshots": snapshots}


@router.get("/snapshot-file/{username}/{filename}")
async def serve_snapshot_file(username: str, filename: str):
    """Serve a local snapshot image file"""
    import os
    from config import settings  # type: ignore
    from fastapi.responses import FileResponse  # type: ignore
    
    file_path = os.path.join(settings.SNAPSHOTS_DIR, username, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Snapshot not found")
    
    return FileResponse(file_path, media_type="image/jpeg")


# ==================== FOLDER BROWSE DIALOG ====================

@router.post("/browse-folder")
async def browse_folder():
    """Open a native folder picker dialog on the server and return chosen path.
    Uses tkinter since backend runs on the same machine as the kiosk."""
    import threading
    result = {"path": None}
    
    def _pick():
        try:
            import tkinter as tk
            from tkinter import filedialog
            root = tk.Tk()
            root.withdraw()
            root.attributes("-topmost", True)
            folder = filedialog.askdirectory(title="Select Recordings Directory")
            root.destroy()
            if folder:
                result["path"] = folder
        except Exception as e:
            print(f"Folder picker error: {e}")
    
    # Run on a separate thread to avoid blocking the event loop
    t = threading.Thread(target=_pick)
    t.start()
    t.join(timeout=60)  # Wait up to 60 seconds for user selection
    
    if result["path"]:
        return {"status": "selected", "path": result["path"]}
    else:
        return {"status": "cancelled", "path": None}


# ==================== LIST ALL USERS WITH SNAPSHOT COUNTS ====================

@router.get("/users-with-snapshots")
async def get_users_with_snapshot_counts():
    """Returns all users with the count of their local snapshots"""
    import os
    from config import settings  # type: ignore
    
    users = await db.get_all_users()
    result = []
    for u in users:
        user_dir = os.path.join(settings.SNAPSHOTS_DIR, u["username"])
        count = 0
        if os.path.exists(user_dir):
            count = len([f for f in os.listdir(user_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
        result.append({
            "id": u["id"],
            "username": u["username"],
            "email": u["email"],
            "snapshot_count": count,
            "last_login": u.get("last_login")
        })
    return result
