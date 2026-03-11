"""
Surveillance API routes for SecureVision
Handles: live feed streaming, recording control, surveillance logs, attendance
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import List, Optional
from datetime import datetime
import asyncio
import json
import logging

from models import (
    RecordingDurationRequest,
    VerifyUnlockRequest,
    VerificationResponse,
)
from supabase_client import db

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
async def start_surveillance(camera_index: int = 0):
    """Start the surveillance engine"""
    from surveillance_engine import surveillance_engine
    
    if surveillance_engine._is_running:
        return {"status": "already_running", "message": "Surveillance is already active"}
    
    # Set up the event loop for async callbacks from threads
    loop = asyncio.get_event_loop()
    surveillance_engine.set_event_loop(loop)
    
    # Register database callbacks
    surveillance_engine.register_db_callbacks({
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
    
    surveillance_engine.register_alert_callback(ws_alert)
    
    # Load user embeddings for face matching
    embeddings = await db.get_all_user_embeddings()
    if surveillance_engine.analyst:
        surveillance_engine.analyst.update_user_embeddings(embeddings)
    
    # Start engine
    surveillance_engine.start(camera_index=camera_index)
    
    # After start, update embeddings (analyst created in start())
    if surveillance_engine.analyst:
        surveillance_engine.analyst.update_user_embeddings(embeddings)
    
    return {"status": "started", "message": "Surveillance engine started"}


@router.post("/stop")
async def stop_surveillance():
    """Stop the surveillance engine"""
    from surveillance_engine import surveillance_engine
    surveillance_engine.stop()
    return {"status": "stopped", "message": "Surveillance engine stopped"}


@router.get("/status")
async def get_surveillance_status():
    """Get current surveillance engine status"""
    from surveillance_engine import surveillance_engine
    return surveillance_engine.get_status()


@router.post("/refresh-embeddings")
async def refresh_embeddings():
    """Refresh user embeddings cache (call after new user registration)"""
    from surveillance_engine import surveillance_engine
    
    embeddings = await db.get_all_user_embeddings()
    if surveillance_engine.analyst:
        surveillance_engine.analyst.update_user_embeddings(embeddings)
        return {"status": "refreshed", "user_count": len(embeddings)}
    
    return {"status": "error", "message": "AI Analyst not running"}


# ==================== RECORDING CONTROL ====================

@router.post("/recording/duration")
async def set_recording_duration(request: RecordingDurationRequest):
    """Change recording chunk duration"""
    from surveillance_engine import surveillance_engine
    surveillance_engine.set_chunk_duration(request.duration_minutes)
    return {
        "status": "updated",
        "duration_minutes": request.duration_minutes
    }


@router.get("/recordings")
async def get_recordings(limit: int = 50):
    """Get local recording entries"""
    recordings = await db.get_local_recordings(limit=limit)
    return recordings


# ==================== LIVE FEED ====================

@router.get("/feed")
async def mjpeg_feed():
    """MJPEG live video stream from surveillance camera"""
    from surveillance_engine import surveillance_engine
    
    async def generate():
        while True:
            frame = surveillance_engine.get_mjpeg_frame()
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
