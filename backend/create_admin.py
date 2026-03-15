"""
Create Admin User for SecureVision
Run this script to create an admin account in Supabase
"""
import bcrypt  # type: ignore
from supabase import create_client  # type: ignore
import os
from dotenv import load_dotenv  # type: ignore

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("")
SUPABASE_SERVICE_KEY = os.getenv("")

def create_admin(email: str, password: str):
    """Create an admin user with hashed password"""
    
    # Hash the password using bcrypt directly
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    password_hash = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
    
    print(f"Password hash: {password_hash}")
    
    # Connect to Supabase
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    # Insert admin user
    try:
        response = supabase.table("admins").insert({
            "email": email,
            "password_hash": password_hash
        }).execute()
        
        print(f"\n✅ Admin user created successfully!")
        print(f"Email: {email}")
        print(f"Password: {password}")
        print("\nYou can now login at: http://localhost:5173/admin-login")
        
    except Exception as e:
        print(f"\n❌ Error creating admin: {e}")
        print("The user might already exist. Try a different email or update existing one.")


if __name__ == "__main__":
    print("=== SecureVision Admin Creation ===\n")
    
    # Get admin credentials
    email = input("Enter admin email: ").strip()
    password = input("Enter admin password: ").strip()
    
    if len(password) < 8:
        print("❌ Password must be at least 8 characters")
        exit(1)
    
    # Confirm
    confirm = input(f"\nCreate admin with email '{email}'? (yes/no): ")
    if confirm.lower() != 'yes':
        print("Cancelled.")
        exit(0)
    
    # Create admin
    create_admin(email, password)
