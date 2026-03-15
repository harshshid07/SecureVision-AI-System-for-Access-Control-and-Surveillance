"""
Configuration management for SecureVision backend
Loads environment variables and provides app-wide settings
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_KEY: str
    
    # JWT Configuration
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    FRONTEND_URL: str = "http://localhost:5173"
    
    # DeepFace Configuration
    DEEPFACE_MODEL: str = "Facenet"
    DEEPFACE_DETECTOR: str = "retinaface"
    FACE_MATCH_THRESHOLD: float = 0.4  # Stricter threshold for better security (was 0.6)
    MIN_FACE_SIZE: int = 80  # Minimum face size in pixels
    
    # Surveillance Configuration
    RECORDINGS_DIR: str = "C:/SecureVision/Recordings"
    SURVEILLANCE_FPS: int = 30
    MOTION_THRESHOLD: float = 25.0          # Frame-diff sensitivity
    ATTENDANCE_DEBOUNCE_SECONDS: int = 300   # 5 min debounce per user
    RECORDING_CHUNK_MINUTES: int = 5         # Default chunk duration
    FFMPEG_PATH: str = "ffmpeg"              # FFmpeg binary path
    SNAPSHOTS_DIR: str = "C:/SecureVision/Recordings/snapshots"
    STORAGE_MODE: str = "local"               # "local", "cloud", or "both"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Singleton instance
settings = Settings()

import os
import json

_SETTINGS_FILE = os.path.join(os.path.dirname(__file__), 'storage_settings.json')
if os.path.exists(_SETTINGS_FILE):
    try:
        with open(_SETTINGS_FILE, 'r') as f:
            _data = json.load(f)
            if 'mode' in _data:
                settings.STORAGE_MODE = _data['mode']
            if 'recordings_dir' in _data:
                settings.RECORDINGS_DIR = _data['recordings_dir']
            if 'snapshots_dir' in _data:
                settings.SNAPSHOTS_DIR = _data['snapshots_dir']
    except Exception as e:
        print(f"Failed to load storage settings: {e}")
