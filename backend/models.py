"""
Pydantic models for request/response validation
"""
from pydantic import BaseModel, EmailStr, Field
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
