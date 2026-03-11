"""
Pydantic models for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field  # type: ignore
from typing import Optional, List
from datetime import datetime


# ==================== AUTH MODELS ====================

class UserRegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    face_image: str  # Base64 encoded image


class UserLoginRequest(BaseModel):
    username: str
    face_image: str  # Base64 encoded image


class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    username: str
    role: str  # "user" or "admin"


# ==================== USER MODELS ====================

class UserProfile(BaseModel):
    id: str
    username: str
    email: str
    is_blocked: bool
    last_login: Optional[datetime]
    created_at: datetime


class LoginLogEntry(BaseModel):
    id: str
    timestamp: datetime
    status: str
    similarity_score: Optional[float]
    is_real: Optional[bool]
    face_count: Optional[int]
    error_message: Optional[str]


# ==================== ADMIN MODELS ====================

class BlockUserRequest(BaseModel):
    user_id: str
    block_status: bool  # True to block, False to unblock


class UserListItem(BaseModel):
    id: str
    username: str
    email: str
    is_blocked: bool
    last_login: Optional[datetime]
    created_at: datetime


# ==================== RESPONSE MODELS ====================

class VerificationResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None


class ErrorResponse(BaseModel):
    error: str
    details: Optional[str] = None


# ==================== SURVEILLANCE MODELS ====================

class AttendanceEntry(BaseModel):
    id: Optional[str] = None
    user_id: str
    detected_time: datetime
    date: str  # YYYY-MM-DD
    status: str = "PRESENT"


class SurveillanceLogEntry(BaseModel):
    id: Optional[str] = None
    event_type: str  # AUTHORIZED, UNAUTHORIZED, SPOOF, MOTION
    timestamp: datetime
    snapshot_url: Optional[str] = None
    video_clip_url: Optional[str] = None
    details: Optional[dict] = None


class LocalRecordingEntry(BaseModel):
    id: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    local_path: str
    trigger_type: str = "CONTINUOUS"  # CONTINUOUS or MOTION_ONLY


class SurveillanceAlert(BaseModel):
    """Model for WebSocket push alerts to frontend"""
    event_type: str
    timestamp: str
    snapshot_url: Optional[str] = None
    user_identity: Optional[str] = None  # username if recognized
    similarity_score: Optional[float] = None
    details: Optional[dict] = None


class RecordingDurationRequest(BaseModel):
    """Request to change recording chunk duration"""
    duration_minutes: int = Field(..., ge=1, le=1440)  # 1 min to 24 hrs


class VerifyUnlockRequest(BaseModel):
    """Request for face-based session unlock"""
    face_image: str  # Base64 encoded image
    user_id: str     # Currently logged-in user's ID
