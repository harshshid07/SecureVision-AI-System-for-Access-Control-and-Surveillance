"""
User-specific routes for SecureVision
Handles user profile, login history, and status checks
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from typing import List, Optional
from models import UserProfile, LoginLogEntry
from supabase_client import db
from auth import decode_access_token
from datetime import datetime

router = APIRouter(prefix="/api/user", tags=["user"])


def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    """Dependency to extract current user from JWT token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if payload.get("role") != "user":
        raise HTTPException(status_code=403, detail="User access required")
    
    return payload


@router.get("/profile", response_model=UserProfile)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Get current user's profile"""
    user = await db.get_user_by_username(current_user["username"])
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserProfile(
        id=user["id"],
        username=user["username"],
        email=user["email"],
        is_blocked=user["is_blocked"],
        last_login=user["last_login"],
        created_at=user["created_at"]
    )


@router.get("/status")
async def check_status(current_user: dict = Depends(get_current_user)):
    """Check if user account is active (not blocked)"""
    user = await db.get_user_by_username(current_user["username"])
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "is_blocked": user["is_blocked"],
        "status": "blocked" if user["is_blocked"] else "active"
    }


@router.get("/login-history", response_model=List[LoginLogEntry])
async def get_login_history(
    current_user: dict = Depends(get_current_user),
    limit: int = 50
):
    """Get login history for current user"""
    user = await db.get_user_by_username(current_user["username"])
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    logs = await db.get_user_login_history(user["id"], limit)
    
    return [
        LoginLogEntry(
            id=log["id"],
            timestamp=log["timestamp"],
            status=log["status"],
            similarity_score=log.get("similarity_score"),
            is_real=log.get("is_real"),
            face_count=log.get("face_count"),
            error_message=log.get("error_message")
        )
        for log in logs
    ]
