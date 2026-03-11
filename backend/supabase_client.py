"""
Supabase client initialization and helper functions
Provides database access for the SecureVision backend
"""
from supabase import create_client, Client  # type: ignore
from config import settings  # type: ignore
from typing import Optional, Dict, Any, List
from datetime import datetime


class SupabaseClient:
    """Wrapper for Supabase client with helper methods"""
    
    def __init__(self):
        self.client: Client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_KEY  # Using service key for admin operations
        )
    
    # ==================== USER OPERATIONS ====================
    
    async def create_user(self, username: str, email: str, face_embedding: List[float]) -> Optional[Dict[str, Any]]:
        """Create a new user with face embedding"""
        try:
            response = self.client.table("users").insert({
                "username": username,
                "email": email,
                "face_embedding": face_embedding,  # List will be converted to JSONB
                "is_blocked": False,
                "last_login": None
            }).execute()
            
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error creating user: {e}")
            return None
    
    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Fetch user by username"""
        try:
            response = self.client.table("users").select("*").eq("username", username).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error fetching user: {e}")
            return None
    
    async def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Fetch user by email"""
        try:
            response = self.client.table("users").select("*").eq("email", email).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error fetching user: {e}")
            return None
    
    async def update_last_login(self, user_id: str) -> bool:
        """Update user's last login timestamp"""
        try:
            self.client.table("users").update({
                "last_login": datetime.utcnow().isoformat()
            }).eq("id", user_id).execute()
            return True
        except Exception as e:
            print(f"Error updating last login: {e}")
            return False
    
    async def get_all_users(self) -> List[Dict[str, Any]]:
        """Get all users (for admin dashboard)"""
        try:
            response = self.client.table("users").select(
                "id, username, email, is_blocked, last_login, created_at"
            ).execute()
            return response.data
        except Exception as e:
            print(f"Error fetching users: {e}")
            return []
    
    async def toggle_user_block(self, user_id: str, block_status: bool) -> bool:
        """Block or unblock a user"""
        try:
            self.client.table("users").update({
                "is_blocked": block_status
            }).eq("id", user_id).execute()
            return True
        except Exception as e:
            print(f"Error toggling user block: {e}")
            return False
    
    # ==================== ADMIN OPERATIONS ====================
    
    async def get_admin_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Fetch admin by email"""
        try:
            response = self.client.table("admins").select("*").eq("email", email).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error fetching admin: {e}")
            return None
    
    # ==================== LOGIN LOG OPERATIONS ====================
    
    async def create_login_log(
        self,
        user_id: str,
        status: str,
        similarity_score: Optional[float] = None,
        is_real: Optional[bool] = None,
        face_count: Optional[int] = None,
        ip_address: Optional[str] = None,
        error_message: Optional[str] = None
    ) -> bool:
        """Create a login log entry"""
        try:
            self.client.table("login_logs").insert({
                "user_id": user_id,
                "status": status,
                "similarity_score": similarity_score,
                "is_real": is_real,
                "face_count": face_count,
                "ip_address": ip_address,
                "error_message": error_message
            }).execute()
            return True
        except Exception as e:
            print(f"Error creating login log: {e}")
            return False
    
    async def get_user_login_history(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get login history for a user"""
        try:
            response = self.client.table("login_logs").select(
                "*"
            ).eq("user_id", user_id).order("timestamp", desc=True).limit(limit).execute()
            return response.data
        except Exception as e:
            print(f"Error fetching login history: {e}")
            return []
    
    # ==================== ATTENDANCE OPERATIONS ====================
    
    async def create_attendance(self, user_id: str, detected_time: str, date: str, status: str = "PRESENT") -> Optional[Dict[str, Any]]:
        """Create an attendance record"""
        try:
            response = self.client.table("attendance").insert({
                "user_id": user_id,
                "detected_time": detected_time,
                "date": date,
                "status": status
            }).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error creating attendance: {e}")
            return None
    
    async def get_attendance_by_date(self, date: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get attendance records for a specific date"""
        try:
            response = self.client.table("attendance").select(
                "*, users(username, email)"
            ).eq("date", date).order("detected_time", desc=True).limit(limit).execute()
            return response.data
        except Exception as e:
            print(f"Error fetching attendance: {e}")
            return []
    
    async def get_last_attendance(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get most recent attendance for a user (for debounce check)"""
        try:
            response = self.client.table("attendance").select(
                "*"
            ).eq("user_id", user_id).order("detected_time", desc=True).limit(1).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error fetching last attendance: {e}")
            return None
    
    # ==================== SURVEILLANCE LOG OPERATIONS ====================
    
    async def create_surveillance_log(
        self,
        event_type: str,
        timestamp: str,
        snapshot_url: Optional[str] = None,
        video_clip_url: Optional[str] = None,
        details: Optional[Dict] = None
    ) -> Optional[Dict[str, Any]]:
        """Create a surveillance log entry"""
        try:
            response = self.client.table("surveillance_logs").insert({
                "event_type": event_type,
                "timestamp": timestamp,
                "snapshot_url": snapshot_url,
                "video_clip_url": video_clip_url,
                "details": details or {}
            }).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error creating surveillance log: {e}")
            return None
    
    async def get_surveillance_logs(self, limit: int = 50, event_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get surveillance logs, optionally filtered by event type"""
        try:
            query = self.client.table("surveillance_logs").select("*")
            if event_type:
                query = query.eq("event_type", event_type)
            response = query.order("timestamp", desc=True).limit(limit).execute()
            return response.data
        except Exception as e:
            print(f"Error fetching surveillance logs: {e}")
            return []
    
    # ==================== LOCAL RECORDING OPERATIONS ====================
    
    async def create_local_recording(self, start_time: str, local_path: str, trigger_type: str = "CONTINUOUS") -> Optional[Dict[str, Any]]:
        """Register a new local recording"""
        try:
            response = self.client.table("local_recordings").insert({
                "start_time": start_time,
                "local_path": local_path,
                "trigger_type": trigger_type
            }).execute()
            return response.data[0] if response.data else None
        except Exception as e:
            print(f"Error creating local recording: {e}")
            return None
    
    async def update_recording_end_time(self, recording_id: str, end_time: str) -> bool:
        """Update end_time when a recording chunk finishes"""
        try:
            self.client.table("local_recordings").update({
                "end_time": end_time
            }).eq("id", recording_id).execute()
            return True
        except Exception as e:
            print(f"Error updating recording end time: {e}")
            return False
    
    async def get_local_recordings(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get local recording entries"""
        try:
            response = self.client.table("local_recordings").select(
                "*"
            ).order("start_time", desc=True).limit(limit).execute()
            return response.data
        except Exception as e:
            print(f"Error fetching local recordings: {e}")
            return []
    
    # ==================== STORAGE OPERATIONS ====================
    
    async def upload_threat_clip(self, file_path: str, file_name: str) -> Optional[str]:
        """Upload a threat clip to the threat-clips bucket, return public URL"""
        try:
            with open(file_path, "rb") as f:
                response = self.client.storage.from_("threat-clips").upload(
                    file_name, f.read(), {"content-type": "video/mp4"}
                )
            # Generate signed URL (valid 7 days)
            signed = self.client.storage.from_("threat-clips").create_signed_url(file_name, 604800)
            return signed.get("signedURL") if signed else None
        except Exception as e:
            print(f"Error uploading threat clip: {e}")
            return None
    
    async def upload_security_audit(self, image_bytes: bytes, file_name: str) -> Optional[str]:
        """Upload a failed unlock frame to security-audits bucket"""
        try:
            self.client.storage.from_("security-audits").upload(
                file_name, image_bytes, {"content-type": "image/jpeg"}
            )
            signed = self.client.storage.from_("security-audits").create_signed_url(file_name, 604800)
            return signed.get("signedURL") if signed else None
        except Exception as e:
            print(f"Error uploading security audit: {e}")
            return None
    
    # ==================== USER LOOKUP FOR SURVEILLANCE ====================
    
    async def get_all_user_embeddings(self) -> List[Dict[str, Any]]:
        """Get all user IDs, usernames, and face embeddings for surveillance matching"""
        try:
            response = self.client.table("users").select(
                "id, username, face_embedding, is_blocked"
            ).eq("is_blocked", False).execute()
            return response.data
        except Exception as e:
            print(f"Error fetching user embeddings: {e}")
            return []


# Singleton instance
db = SupabaseClient()
