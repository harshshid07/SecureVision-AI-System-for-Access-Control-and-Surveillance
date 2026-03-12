# pyre-ignore-all-errors
"""
Surveillance Engine for SecureVision
=====================================
Dual-thread architecture:
  Thread 1 (Recorder): Continuous webcam recording to local .mp4 chunks
  Thread 2 (AI Analyst): Motion detection + face recognition every 500ms

Dependencies: opencv-python, numpy, FFmpeg (system-installed)
"""
import cv2  # type: ignore
import numpy as np  # type: ignore
import threading
import time
import os
import subprocess
import asyncio
import logging
import signal
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Callable, Union  # type: ignore
from collections import deque
from config import settings  # type: ignore

logger = logging.getLogger(__name__)


class FrameBuffer:
    """Thread-safe circular buffer for sharing frames between threads"""
    
    def __init__(self, maxlen: int = 900):  # ~30s at 30fps
        self._buffer = deque(maxlen=maxlen)
        self._lock = threading.Lock()
        self._latest_frame = None
    
    def push(self, frame: np.ndarray, timestamp: float):
        with self._lock:
            self._buffer.append((frame.copy(), timestamp))
            self._latest_frame = frame.copy()
    
    def get_latest(self) -> Optional[np.ndarray]:
        with self._lock:
            return self._latest_frame.copy() if self._latest_frame is not None else None
    
    def get_recent(self, seconds: float = 15.0) -> List[tuple]:
        """Get frames from the last N seconds"""
        with self._lock:
            now = time.time()
            return [(f, t) for f, t in self._buffer if now - t <= seconds]
    
    def clear(self):
        with self._lock:
            self._buffer.clear()
            self._latest_frame = None


class RecorderThread(threading.Thread):
    """
    Thread 1: The Recorder
    Continuously reads webcam and writes compressed .mp4 chunks.
    Handles crashes gracefully by flushing on every frame.
    """
    
    def __init__(
        self,
        camera_index: Union[int, str] = 0,
        fps: int = 30,
        chunk_minutes: int = 5,
        recordings_dir: str = "C:/SecureVision/Recordings",
        frame_buffer: Optional[FrameBuffer] = None,
        on_recording_start: Optional[Callable] = None,
        on_recording_end: Optional[Callable] = None,
    ):
        super().__init__(daemon=True, name="SV-Recorder")
        self.camera_index = camera_index
        self.fps = fps
        self.chunk_minutes = chunk_minutes
        self.recordings_dir = recordings_dir
        self.frame_buffer = frame_buffer or FrameBuffer()
        self.on_recording_start = on_recording_start
        self.on_recording_end = on_recording_end
        
        self._running = threading.Event()
        self._paused = threading.Event()
        self._paused.set()  # Start unpaused
        self._cap = None
        self._writer = None
        self._current_chunk_path = None
        self._current_chunk_start = None
        self._current_recording_id = None
        self._frame_count = 0
        
        # MJPEG streaming support
        self._jpeg_frame = None
        self._jpeg_lock = threading.Lock()
        
        os.makedirs(self.recordings_dir, exist_ok=True)
        logger.info(f"✓ Recorder initialized: {self.recordings_dir}, {self.chunk_minutes}min chunks")
    
    @property
    def is_recording(self) -> bool:
        return self._running.is_set()
    
    def get_jpeg_frame(self) -> Optional[bytes]:
        """Get latest frame as JPEG bytes for MJPEG streaming"""
        with self._jpeg_lock:
            return self._jpeg_frame
    
    def _open_camera(self) -> bool:
        """Open camera: handles integer paths (USB) and string paths (RTSP/HTTP network cameras)"""
        try:
            if isinstance(self.camera_index, str):
                logger.info(f"Connecting to Network Camera: {self.camera_index}")
                self._cap = cv2.VideoCapture(self.camera_index)
            else:
                self._cap = cv2.VideoCapture(self.camera_index, cv2.CAP_DSHOW)
                if not self._cap.isOpened():
                    self._cap = cv2.VideoCapture(self.camera_index)
            
            if self._cap.isOpened():
                self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
                self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
                self._cap.set(cv2.CAP_PROP_FPS, self.fps)
                w = int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))
                h = int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
                logger.info(f"✓ Camera opened: {w}x{h} @ {self.fps}fps")
                return True
            
            logger.error("❌ Failed to open camera")
            return False
        except Exception as e:
            logger.error(f"❌ Camera error: {e}")
            return False
    
    def _start_new_chunk(self) -> bool:
        """Start a new recording chunk"""
        try:
            # Close previous chunk
            self._close_current_chunk()
            
            now = datetime.now()
            date_dir = os.path.join(self.recordings_dir, now.strftime("%Y-%m-%d"))
            os.makedirs(date_dir, exist_ok=True)
            
            filename = f"chunk_{now.strftime('%H-%M-%S')}.mp4"
            self._current_chunk_path = os.path.join(date_dir, filename)
            self._current_chunk_start = now
            
            # Use H.264 codec (mp4v fallback)
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            w = int(self._cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            h = int(self._cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            
            self._writer = cv2.VideoWriter(
                self._current_chunk_path, fourcc, self.fps, (w, h)
            )
            
            if not self._writer.isOpened():
                logger.error(f"❌ Failed to create writer: {self._current_chunk_path}")
                return False
            
            self._frame_count = 0
            logger.info(f"🔴 Recording chunk: {self._current_chunk_path}")
            
            # Callback for database logging
            if self.on_recording_start:
                self._current_recording_id = self.on_recording_start(
                    self._current_chunk_start.isoformat(),
                    self._current_chunk_path
                )
            
            return True
        except Exception as e:
            logger.error(f"❌ Chunk start error: {e}")
            return False
    
    def _close_current_chunk(self):
        """Safely close current chunk writer"""
        if self._writer is not None:
            self._writer.release()
            self._writer = None
            
            if self._current_chunk_path and self._frame_count > 0:
                logger.info(f"✓ Chunk saved: {self._current_chunk_path} ({self._frame_count} frames)")
                
                if self.on_recording_end and self._current_recording_id:
                    self.on_recording_end(
                        self._current_recording_id,
                        datetime.now().isoformat()
                    )
            
            self._current_chunk_path = None
            self._current_chunk_start = None
            self._current_recording_id = None
    
    def run(self):
        """Main recorder loop"""
        self._running.set()
        
        if not self._open_camera():
            self._running.clear()
            return
        
        if not self._start_new_chunk():
            self._running.clear()
            return
        
        chunk_duration = timedelta(minutes=self.chunk_minutes)
        
        try:
            while self._running.is_set():
                self._paused.wait()  # Block if paused
                
                ret, frame = self._cap.read()
                if not ret:
                    logger.warning("⚠ Frame read failed, retrying...")
                    time.sleep(0.1)
                    continue
                
                now = time.time()
                
                # Push to shared buffer for AI thread
                self.frame_buffer.push(frame, now)
                
                # Encode JPEG for MJPEG streaming
                _, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                with self._jpeg_lock:
                    self._jpeg_frame = jpeg.tobytes()
                
                # Write to chunk file
                if self._writer is not None and self._writer.isOpened():
                    self._writer.write(frame)
                    self._frame_count += 1
                
                # Check if chunk duration exceeded
                if self._current_chunk_start:
                    elapsed = datetime.now() - self._current_chunk_start
                    if elapsed >= chunk_duration:
                        self._start_new_chunk()
                
                # Maintain target FPS
                time.sleep(max(0, 1.0 / self.fps - 0.005))
                
        except Exception as e:
            logger.error(f"❌ Recorder crashed: {e}")
        finally:
            self._close_current_chunk()
            if self._cap:
                self._cap.release()
            self._running.clear()
            logger.info("✓ Recorder stopped")
    
    def stop(self):
        """Gracefully stop recording"""
        self._running.clear()
        self._paused.set()  # Unpause so thread can exit
    
    def pause(self):
        self._paused.clear()
        logger.info("⏸ Recorder paused")
    
    def resume(self):
        self._paused.set()
        logger.info("▶ Recorder resumed")
    
    def set_chunk_duration(self, minutes: int):
        """Change chunk duration (takes effect on next chunk)"""
        self.chunk_minutes = minutes
        logger.info(f"✓ Chunk duration set to {minutes} minutes")


class AIAnalystThread(threading.Thread):
    """
    Thread 2: The AI Analyst
    Runs motion detection every 500ms on frames from the shared buffer.
    On motion → runs face recognition → logs attendance or raises alerts.
    """
    
    def __init__(
        self,
        frame_buffer: FrameBuffer,
        vision_engine,  # The existing VisionEngine instance
        motion_threshold: float = 25.0,
        analysis_interval_ms: int = 500,
        attendance_debounce_seconds: int = 300,
        on_authorized: Optional[Callable] = None,
        on_unauthorized: Optional[Callable] = None,
        on_spoof: Optional[Callable] = None,
        on_motion: Optional[Callable] = None,
    ):
        super().__init__(daemon=True, name="SV-AIAnalyst")
        self.frame_buffer = frame_buffer
        self.vision_engine = vision_engine
        self.motion_threshold = motion_threshold
        self.analysis_interval = analysis_interval_ms / 1000.0
        self.attendance_debounce = attendance_debounce_seconds
        
        # Callbacks for events
        self.on_authorized = on_authorized
        self.on_unauthorized = on_unauthorized
        self.on_spoof = on_spoof
        self.on_motion = on_motion
        
        self._running = threading.Event()
        self._prev_gray = None
        self._user_embeddings: List[Dict] = []
        self._embeddings_lock = threading.Lock()
        self._last_attendance: Dict[str, datetime] = {}  # user_id -> last logged time
        
        logger.info(f"✓ AI Analyst initialized: interval={analysis_interval_ms}ms, threshold={motion_threshold}")
    
    def update_user_embeddings(self, embeddings: List[Dict]):
        """Update cached user embeddings (called periodically from main thread)"""
        with self._embeddings_lock:
            self._user_embeddings = embeddings
            logger.info(f"✓ User embeddings refreshed: {len(embeddings)} users")
    
    def _detect_motion(self, frame: np.ndarray) -> bool:
        """Frame differencing motion detection"""
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (21, 21), 0)
        
        if self._prev_gray is None:
            self._prev_gray = gray
            return False
        
        delta = cv2.absdiff(self._prev_gray, gray)
        thresh = cv2.threshold(delta, 30, 255, cv2.THRESH_BINARY)[1]
        thresh = cv2.dilate(thresh, None, iterations=2)
        
        motion_score = np.mean(thresh)
        self._prev_gray = gray
        
        return motion_score > self.motion_threshold
    
    def _match_face_against_users(self, frame: np.ndarray) -> Optional[Dict]:
        """
        Try to match detected face against all registered users.
        Returns dict with user info if matched, None if unknown.
        """
        import base64
        
        # Encode frame to base64 for vision engine
        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        img_base64 = base64.b64encode(buffer).decode('utf-8')
        
        # Extract face embedding from live frame
        extraction = self.vision_engine.extract_single_face_embedding(img_base64)
        
        if not extraction["success"]:
            return None
        
        live_embedding = extraction["embedding"]
        is_real = extraction.get("is_real", True)
        
        # Check anti-spoofing
        if is_real is False:
            return {"match": "SPOOF", "is_real": False}
        
        # Compare against all registered users
        best_match = None
        best_similarity = 0.0
        
        with self._embeddings_lock:
            for user in self._user_embeddings:
                if not user.get("face_embedding"):
                    continue
                
                similarity = self.vision_engine._cosine_similarity(
                    live_embedding, user["face_embedding"]
                )
                distance = 1 - similarity
                
                if distance <= self.vision_engine.threshold and similarity > best_similarity:
                    best_similarity = similarity
                    best_match = {
                        "match": "AUTHORIZED",
                        "user_id": user["id"],
                        "username": user["username"],
                        "similarity": similarity,
                        "is_real": is_real,
                    }
        
        if best_match:
            return best_match
        
        return {
            "match": "UNAUTHORIZED",
            "similarity": best_similarity,
            "is_real": is_real,
        }
    
    def _check_debounce(self, user_id: str) -> bool:
        """Returns True if enough time has passed to log attendance again"""
        last = self._last_attendance.get(user_id)
        if last is None:
            return True
        elapsed = (datetime.now() - last).total_seconds()
        return elapsed >= self.attendance_debounce
    
    def _encode_frame_jpeg(self, frame: np.ndarray) -> bytes:
        """Encode frame as JPEG bytes"""
        _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        return buffer.tobytes()
    
    def run(self):
        """Main AI analysis loop"""
        self._running.set()
        logger.info("🧠 AI Analyst started")
        
        try:
            while self._running.is_set():
                frame = self.frame_buffer.get_latest()
                
                if frame is None:
                    time.sleep(self.analysis_interval)
                    continue
                
                # Step 1: Motion detection
                has_motion = self._detect_motion(frame)
                
                if not has_motion:
                    time.sleep(self.analysis_interval)
                    continue
                
                # Step 2: Motion detected → run face recognition
                try:
                    result = self._match_face_against_users(frame)
                    
                    if result is None:
                        # Motion but no face detected
                        if self.on_motion:
                            self.on_motion(self._encode_frame_jpeg(frame))
                        time.sleep(self.analysis_interval)
                        continue
                    
                    now = datetime.now()
                    
                    if result["match"] == "AUTHORIZED":
                        user_id = result["user_id"]
                        
                        # Debounce check
                        if self._check_debounce(user_id):
                            self._last_attendance[user_id] = now
                            if self.on_authorized:
                                self.on_authorized(result, self._encode_frame_jpeg(frame))
                    
                    elif result["match"] == "UNAUTHORIZED":
                        if self.on_unauthorized:
                            self.on_unauthorized(result, self._encode_frame_jpeg(frame))
                    
                    elif result["match"] == "SPOOF":
                        if self.on_spoof:
                            self.on_spoof(result, self._encode_frame_jpeg(frame))
                
                except Exception as e:
                    logger.error(f"⚠ AI analysis error: {e}")
                
                time.sleep(self.analysis_interval)
                
        except Exception as e:
            logger.error(f"❌ AI Analyst crashed: {e}")
        finally:
            self._running.clear()
            logger.info("✓ AI Analyst stopped")
    
    def stop(self):
        self._running.clear()


class SurveillanceEngine:
    """
    Main surveillance orchestrator.
    Manages the recorder thread, AI analyst thread, and event handling.
    """
    
    def __init__(self):
        self.frame_buffer = FrameBuffer()
        self.recorder: Optional[RecorderThread] = None
        self.analyst: Optional[AIAnalystThread] = None
        self._event_loop: Optional[asyncio.AbstractEventLoop] = None
        self._alert_callbacks: List[Callable] = []
        self._db_callbacks: Dict[str, Callable] = {}
        self._is_running = False
        
        logger.info("✓ Surveillance Engine initialized")
    
    def register_alert_callback(self, callback: Callable):
        """Register callback for WebSocket alerts"""
        self._alert_callbacks.append(callback)
    
    def register_db_callbacks(self, callbacks: Dict[str, Callable]):
        """Register async database callbacks"""
        self._db_callbacks = callbacks
    
    def set_event_loop(self, loop: asyncio.AbstractEventLoop):
        """Set the asyncio event loop for running async callbacks"""
        self._event_loop = loop
    
    def _run_async(self, coro):
        """Run an async coroutine from a sync thread"""
        if self._event_loop and self._event_loop.is_running():
            asyncio.run_coroutine_threadsafe(coro, self._event_loop)
    
    def _on_recording_start(self, start_time: str, local_path: str) -> Optional[str]:
        """Callback when a new recording chunk starts"""
        cb = self._db_callbacks.get("create_recording")
        if cb:
            future = asyncio.run_coroutine_threadsafe(
                cb(start_time, local_path, "CONTINUOUS"),
                self._event_loop
            )
            try:
                result = future.result(timeout=5)
                return result.get("id") if result else None
            except Exception:
                return None
        return None
    
    def _on_recording_end(self, recording_id: str, end_time: str):
        """Callback when a recording chunk ends"""
        cb = self._db_callbacks.get("update_recording_end")
        if cb:
            self._run_async(cb(recording_id, end_time))
    
    def _on_authorized(self, result: Dict, frame_jpeg: bytes):
        """Handle authorized face detection → log attendance"""
        now = datetime.now()
        
        # Log to attendance table
        cb = self._db_callbacks.get("create_attendance")
        if cb:
            self._run_async(cb(
                result["user_id"],
                now.isoformat(),
                now.strftime("%Y-%m-%d"),
                "PRESENT"
            ))
        
        # Log to surveillance_logs
        cb = self._db_callbacks.get("create_surveillance_log")
        if cb:
            self._run_async(cb(
                "AUTHORIZED",
                now.isoformat(),
                None, None,
                {"username": result["username"], "similarity": result["similarity"]}
            ))
        
        # Alert WebSocket
        self._send_alert({
            "event_type": "AUTHORIZED",
            "timestamp": now.isoformat(),
            "user_identity": result["username"],
            "similarity_score": result["similarity"],
        })
        
        logger.info(f"✅ Authorized: {result['username']} ({result['similarity']:.2%})")
    
    def _on_unauthorized(self, result: Dict, frame_jpeg: bytes):
        """Handle unauthorized face → alert + extract clip"""
        now = datetime.now()
        
        # Upload snapshot
        snapshot_url = None
        cb_upload = self._db_callbacks.get("upload_security_audit")
        if cb_upload:
            fname = f"unauthorized_{now.strftime('%Y%m%d_%H%M%S')}.jpg"
            future = asyncio.run_coroutine_threadsafe(
                cb_upload(frame_jpeg, fname),
                self._event_loop
            )
            try:
                snapshot_url = future.result(timeout=10)
            except Exception:
                pass
        
        # Log to surveillance_logs
        cb = self._db_callbacks.get("create_surveillance_log")
        if cb:
            self._run_async(cb(
                "UNAUTHORIZED",
                now.isoformat(),
                snapshot_url, None,
                {"similarity": result.get("similarity", 0)}
            ))
        
        # Extract 15s threat clip
        self._extract_threat_clip(now)
        
        # Alert WebSocket
        self._send_alert({
            "event_type": "UNAUTHORIZED",
            "timestamp": now.isoformat(),
            "snapshot_url": snapshot_url,
            "details": {"message": "Unknown person detected"}
        })
        
        logger.warning(f"🚨 UNAUTHORIZED face detected!")
    
    def _on_spoof(self, result: Dict, frame_jpeg: bytes):
        """Handle spoof attempt → alert + log"""
        now = datetime.now()
        
        snapshot_url = None
        cb_upload = self._db_callbacks.get("upload_security_audit")
        if cb_upload:
            fname = f"spoof_{now.strftime('%Y%m%d_%H%M%S')}.jpg"
            future = asyncio.run_coroutine_threadsafe(
                cb_upload(frame_jpeg, fname),
                self._event_loop
            )
            try:
                snapshot_url = future.result(timeout=10)
            except Exception:
                pass
        
        cb = self._db_callbacks.get("create_surveillance_log")
        if cb:
            self._run_async(cb("SPOOF", now.isoformat(), snapshot_url, None, {}))
        
        self._extract_threat_clip(now)
        
        self._send_alert({
            "event_type": "SPOOF",
            "timestamp": now.isoformat(),
            "snapshot_url": snapshot_url,
            "details": {"message": "Anti-spoofing triggered"}
        })
        
        logger.warning(f"🚨 SPOOF attempt detected!")
    
    def _on_motion(self, frame_jpeg: bytes):
        """Handle motion-only detection (no face)"""
        now = datetime.now()
        
        cb = self._db_callbacks.get("create_surveillance_log")
        if cb:
            self._run_async(cb("MOTION", now.isoformat(), None, None, {}))
        
        self._send_alert({
            "event_type": "MOTION",
            "timestamp": now.isoformat(),
            "details": {"message": "Motion detected, no face found"}
        })
    
    def _send_alert(self, alert_data: Dict):
        """Send alert to all registered WebSocket callbacks"""
        for callback in self._alert_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    self._run_async(callback(alert_data))
                else:
                    callback(alert_data)
            except Exception as e:
                logger.error(f"Alert callback error: {e}")
    
    def _extract_threat_clip(self, event_time: datetime):
        """Use FFmpeg to extract 15s clip around the event"""
        try:
            if not self.recorder or not self.recorder._current_chunk_path:
                return
            
            source_path = self.recorder._current_chunk_path
            clip_dir = os.path.join(self.recorder.recordings_dir, "threat_clips")
            os.makedirs(clip_dir, exist_ok=True)
            
            clip_name = f"threat_{event_time.strftime('%Y%m%d_%H%M%S')}.mp4"
            clip_path = os.path.join(clip_dir, clip_name)
            
            # Calculate start offset (15s before event, clamped to chunk start)
            chunk_start = self.recorder._current_chunk_start
            if chunk_start:
                elapsed = (event_time - chunk_start).total_seconds()
                start_offset = max(0, elapsed - 15)
            else:
                start_offset = 0
            
            cmd = [
                settings.FFMPEG_PATH,
                "-y",  # Overwrite
                "-i", source_path,
                "-ss", str(start_offset),
                "-t", "15",
                "-c:v", "libx264",
                "-preset", "ultrafast",
                "-crf", "28",
                clip_path
            ]
            
            # Run FFmpeg in background
            threading.Thread(
                target=self._run_ffmpeg_and_upload,
                args=(cmd, clip_path, clip_name),
                daemon=True
            ).start()
            
        except Exception as e:
            logger.error(f"Threat clip extraction error: {e}")
    
    def _run_ffmpeg_and_upload(self, cmd: list, clip_path: str, clip_name: str):
        """Run FFmpeg and upload the result"""
        try:
            subprocess.run(cmd, capture_output=True, timeout=30)
            
            if os.path.exists(clip_path):
                cb = self._db_callbacks.get("upload_threat_clip")
                if cb and self._event_loop:
                    asyncio.run_coroutine_threadsafe(
                        cb(clip_path, clip_name),
                        self._event_loop
                    )
                logger.info(f"✓ Threat clip saved: {clip_path}")
        except Exception as e:
            logger.error(f"FFmpeg/upload error: {e}")
    
    def start(self, camera_index: Union[int, str] = 0):
        """Start the surveillance engine (both threads)"""
        if self._is_running:
            logger.warning("Surveillance already running")
            return
        
        # Import here to avoid circular imports
        from vision_engine import vision_engine  # type: ignore
        
        # Thread 1: Recorder
        self.recorder = RecorderThread(
            camera_index=camera_index,
            fps=settings.SURVEILLANCE_FPS,
            chunk_minutes=settings.RECORDING_CHUNK_MINUTES,
            recordings_dir=settings.RECORDINGS_DIR,
            frame_buffer=self.frame_buffer,
            on_recording_start=self._on_recording_start,
            on_recording_end=self._on_recording_end,
        )
        
        # Thread 2: AI Analyst
        self.analyst = AIAnalystThread(
            frame_buffer=self.frame_buffer,
            vision_engine=vision_engine,
            motion_threshold=settings.MOTION_THRESHOLD,
            analysis_interval_ms=500,
            attendance_debounce_seconds=settings.ATTENDANCE_DEBOUNCE_SECONDS,
            on_authorized=self._on_authorized,
            on_unauthorized=self._on_unauthorized,
            on_spoof=self._on_spoof,
            on_motion=self._on_motion,
        )
        
        self.recorder.start()
        self.analyst.start()
        self._is_running = True
        
        logger.info("=" * 50)
        logger.info("🔴 SURVEILLANCE ENGINE STARTED")
        logger.info(f"   Camera: {camera_index}")
        logger.info(f"   FPS: {settings.SURVEILLANCE_FPS}")
        logger.info(f"   Chunks: {settings.RECORDING_CHUNK_MINUTES} min")
        logger.info(f"   Motion threshold: {settings.MOTION_THRESHOLD}")
        logger.info(f"   Debounce: {settings.ATTENDANCE_DEBOUNCE_SECONDS}s")
        logger.info(f"   Recordings: {settings.RECORDINGS_DIR}")
        logger.info("=" * 50)
    
    def stop(self):
        """Stop the surveillance engine"""
        if self.recorder:
            self.recorder.stop()
        if self.analyst:
            self.analyst.stop()
        self._is_running = False
        logger.info("✓ Surveillance Engine stopped")
    
    def get_status(self) -> Dict[str, Any]:
        """Get current surveillance status"""
        return {
            "is_running": self._is_running,
            "recorder_active": self.recorder.is_recording if self.recorder else False,
            "current_chunk": self.recorder._current_chunk_path if self.recorder else None,
            "chunk_duration_minutes": self.recorder.chunk_minutes if self.recorder else 0,
            "recordings_dir": settings.RECORDINGS_DIR,
        }
    def get_mjpeg_frame(self) -> Optional[bytes]:
        """Get latest JPEG frame for MJPEG streaming"""
        if self.recorder:
            return self.recorder.get_jpeg_frame()
        return None


class EngineManager:
    """Manages multiple SurveillanceEngine instances for multi-camera support"""
    def __init__(self):
        self.engines: Dict[str, SurveillanceEngine] = {}
        self._db_callbacks = {}
        self._loop = None
        
    def set_event_loop(self, loop):
        self._loop = loop
        
    def register_db_callbacks(self, callbacks: dict):
        self._db_callbacks = callbacks
        
    def get_engine(self, camera_id: str, create_if_missing: bool = False) -> Optional[SurveillanceEngine]:
        camera_id_str = str(camera_id)
        if camera_id_str not in self.engines and create_if_missing:
            engine = SurveillanceEngine()
            if self._loop:
                engine.set_event_loop(self._loop)
            if self._db_callbacks:
                engine.register_db_callbacks(self._db_callbacks)
            self.engines[camera_id_str] = engine
            
        return self.engines.get(camera_id_str)
        
    def start_engine(self, camera_id: str) -> bool:
        camera_id_str = str(camera_id)
        engine = self.get_engine(camera_id_str, create_if_missing=True)
        if not engine:
            return False
            
        if engine._is_running:
            return False  # Already running
            
        engine.start(camera_index=camera_id_str)
        return True
        
    def stop_engine(self, camera_id: str):
        camera_id_str = str(camera_id)
        engine = self.get_engine(camera_id_str)
        if engine:
            engine.stop()
            # Optionally remove it from the dict
            # del self.engines[camera_id_str]
            
    def get_status(self) -> Dict[str, Any]:
        """Get aggregate status across all engines"""
        active_cams = []
        for cam_id, engine in self.engines.items():
            if engine._is_running:
                status = engine.get_status()
                status["camera"] = cam_id
                active_cams.append(status)
                
        return {
            "is_running": len(active_cams) > 0,
            "active_cameras": len(active_cams),
            "cameras": active_cams
        }

# Create a global instance of the multi-camera manager
engine_manager = EngineManager()
