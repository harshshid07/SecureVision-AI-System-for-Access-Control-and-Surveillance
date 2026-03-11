"""
Authentication routes for SecureVision
Handles user registration, login, and admin authentication
"""
from fastapi import APIRouter, HTTPException, Request
from models import (
    UserRegisterRequest,
    UserLoginRequest,
    AdminLoginRequest,
    TokenResponse,
    VerificationResponse
)
from supabase_client import db
from vision_engine import vision_engine
from auth import create_access_token, verify_password
from datetime import timedelta
from config import settings

router = APIRouter(prefix="/api/auth", tags=["authentication"])


@router.post("/register", response_model=VerificationResponse)
async def register_user(request: UserRegisterRequest, req: Request):
    """
    Register a new user with facial scan
    Validates: single face, anti-spoofing, generates embedding
    """
    # Check if username or email already exists
    existing_user = await db.get_user_by_username(request.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    existing_email = await db.get_user_by_email(request.email)
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    # Extract face embedding with validations
    extraction_result = vision_engine.extract_single_face_embedding(request.face_image)
    
    if not extraction_result["success"]:
        return VerificationResponse(
            success=False,
            message=extraction_result["error"],
            data={
                "face_count": extraction_result["face_count"],
                "is_real": extraction_result["is_real"]
            }
        )
    
    # Create user in database
    user = await db.create_user(
        username=request.username,
        email=request.email,
        face_embedding=extraction_result["embedding"]
    )
    
    if not user:
        raise HTTPException(status_code=500, detail="Failed to create user")
    
    # Generate access token
    access_token = create_access_token(
        data={
            "sub": user["id"],
            "username": user["username"],
            "role": "user"
        }
    )
    
    return VerificationResponse(
        success=True,
        message="Registration successful! Welcome to SecureVision.",
        data={
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user["id"],
            "username": user["username"],
            "role": "user"
        }
    )


@router.post("/login", response_model=VerificationResponse)
async def login_user(request: UserLoginRequest, req: Request):
    """
    User login with facial verification
    Multi-layer validation:
    1. Single face enforcement
    2. Anti-spoofing check
    3. Face matching with stored embedding
    4. Block status check
    """
    # Get user from database
    user = await db.get_user_by_username(request.username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if user is blocked
    if user["is_blocked"]:
        # Log failed attempt
        await db.create_login_log(
            user_id=user["id"],
            status="fail",
            ip_address=req.client.host,
            error_message="Account is blocked"
        )
        
        raise HTTPException(status_code=403, detail="Account is blocked. Contact administrator.")
    
    # Verify face with all validations
    verification_result = vision_engine.verify_access(
        live_image_base64=request.face_image,
        stored_embedding=user["face_embedding"]
    )
    
    # Log the attempt
    log_status = "success" if verification_result["verified"] else "fail"
    
    # Determine specific failure reason
    if not verification_result["is_real"] and verification_result["is_real"] is not None:
        log_status = "spoofing_attempt"
    elif verification_result["face_count"] > 1:
        log_status = "multiple_faces"
    
    await db.create_login_log(
        user_id=user["id"],
        status=log_status,
        similarity_score=verification_result["similarity_score"],
        is_real=verification_result["is_real"],
        face_count=verification_result["face_count"],
        ip_address=req.client.host,
        error_message=verification_result["error"]
    )
    
    # Check verification result
    if not verification_result["verified"]:
        return VerificationResponse(
            success=False,
            message=verification_result["error"],
            data={
                "similarity_score": verification_result["similarity_score"],
                "is_real": verification_result["is_real"],
                "face_count": verification_result["face_count"]
            }
        )
    
    # Update last login
    await db.update_last_login(user["id"])
    
    # Generate access token
    access_token = create_access_token(
        data={
            "sub": user["id"],
            "username": user["username"],
            "role": "user"
        }
    )
    
    return VerificationResponse(
        success=True,
        message="Verification success – Entering secure workspace.",
        data={
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user["id"],
            "username": user["username"],
            "role": "user",
            "similarity_score": verification_result["similarity_score"]
        }
    )


@router.post("/admin-login", response_model=TokenResponse)
async def admin_login(request: AdminLoginRequest):
    """
    Admin login with email and password
    """
    # Get admin from database
    admin = await db.get_admin_by_email(request.email)
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(request.password, admin["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate access token
    access_token = create_access_token(
        data={
            "sub": admin["id"],
            "email": admin["email"],
            "role": "admin"
        }
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user_id=admin["id"],
        username=admin["email"],
        role="admin"
    )


@router.post("/verify-unlock", response_model=VerificationResponse)
async def verify_unlock(request: UserLoginRequest, req: Request):
    """
    Verify face for kiosk unlock (session resume).
    On failure: uploads snapshot to security-audits bucket + logs to surveillance_logs.
    On success: extends the existing session (no new token needed).
    """
    import base64
    from datetime import datetime

    # Get user from database
    user = await db.get_user_by_username(request.username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check block status
    if user["is_blocked"]:
        raise HTTPException(status_code=403, detail="Account is blocked. Contact administrator.")

    # Verify face
    verification_result = vision_engine.verify_access(
        live_image_base64=request.face_image,
        stored_embedding=user["face_embedding"]
    )

    now = datetime.now()

    if not verification_result["verified"]:
        # ===== FAILED UNLOCK: Upload snapshot to security-audits =====
        try:
            # Decode the face image to raw bytes for upload
            img_data = request.face_image
            if "," in img_data and "data:image" in img_data:
                img_data = img_data.split(",", 1)[1]
            image_bytes = base64.b64decode(img_data)

            filename = f"failed_unlock_{user['username']}_{now.strftime('%Y%m%d_%H%M%S')}.jpg"
            snapshot_url = await db.upload_security_audit(image_bytes, filename)
        except Exception as e:
            print(f"⚠ Failed to upload security audit: {e}")
            snapshot_url = None

        # Log to surveillance_logs
        await db.create_surveillance_log(
            event_type="UNAUTHORIZED",
            timestamp=now.isoformat(),
            snapshot_url=snapshot_url,
            details={
                "action": "FAILED_UNLOCK",
                "username": user["username"],
                "similarity_score": verification_result["similarity_score"],
                "is_real": verification_result["is_real"],
                "ip_address": req.client.host,
            }
        )

        return VerificationResponse(
            success=False,
            message=verification_result["error"] or "Face verification failed for unlock.",
            data={
                "similarity_score": verification_result["similarity_score"],
                "is_real": verification_result["is_real"],
                "face_count": verification_result["face_count"],
                "snapshot_uploaded": snapshot_url is not None,
            }
        )

    # ===== SUCCESS: Session resumed =====
    await db.update_last_login(user["id"])

    return VerificationResponse(
        success=True,
        message="Unlock successful — session resumed.",
        data={
            "user_id": user["id"],
            "username": user["username"],
            "similarity_score": verification_result["similarity_score"],
        }
    )

