"""
Admin routes for SecureVision
Handles user management, blocking, and admin dashboard data
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from typing import List, Optional
from models import BlockUserRequest, UserListItem
from supabase_client import db
from auth import decode_access_token

router = APIRouter(prefix="/api/admin", tags=["admin"])


def get_current_admin(authorization: Optional[str] = Header(None)) -> dict:
    """Dependency to extract current admin from JWT token"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return payload


@router.get("/users", response_model=List[UserListItem])
async def get_all_users(current_admin: dict = Depends(get_current_admin)):
    """Get all users for admin dashboard"""
    users = await db.get_all_users()
    
    return [
        UserListItem(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            is_blocked=user["is_blocked"],
            last_login=user.get("last_login"),
            created_at=user["created_at"]
        )
        for user in users
    ]


@router.post("/block-user")
async def block_user(
    request: BlockUserRequest,
    current_admin: dict = Depends(get_current_admin)
):
    """Block or unblock a user"""
    success = await db.toggle_user_block(request.user_id, request.block_status)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update user status")
    
    action = "blocked" if request.block_status else "unblocked"
    
    return {
        "success": True,
        "message": f"User successfully {action}",
        "user_id": request.user_id,
        "is_blocked": request.block_status
    }
