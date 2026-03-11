"""
Supabase client initialization and helper functions
Provides database access for the SecureVision backend
"""
from supabase import create_client, Client
from config import settings
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


# Singleton instance
db = SupabaseClient()
