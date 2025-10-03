"""
Database module with MongoDB primary and SQLite fallback
Provides seamless database operations with automatic fallback
"""

import os
import json
import sqlite3
import logging
from datetime import datetime
from typing import Optional, Dict, List, Any
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from config import Config

# Setup logging
logging.basicConfig(level=getattr(logging, Config.LOG_LEVEL))
logger = logging.getLogger(__name__)


class Database:
    """Database handler with MongoDB and SQLite fallback"""

    def __init__(self):
        self.mongo_client = None
        self.mongo_db = None
        self.use_mongodb = False
        self.sqlite_conn = None
        self._initialize_database()

    def _initialize_database(self):
        """Initialize database connection (MongoDB or SQLite)"""
        # Try MongoDB first if configured
        if Config.USE_MONGODB and Config.MONGO_URI:
            try:
                self.mongo_client = MongoClient(
                    Config.MONGO_URI,
                    serverSelectionTimeoutMS=5000
                )
                # Test connection
                self.mongo_client.admin.command('ping')
                self.mongo_db = self.mongo_client[Config.DB_NAME]
                self.use_mongodb = True
                logger.info("✓ Connected to MongoDB successfully")
                return
            except (ConnectionFailure, ServerSelectionTimeoutError) as e:
                logger.warning(f"MongoDB connection failed: {e}")
                logger.info("Falling back to SQLite database...")

        # Fallback to SQLite
        self._initialize_sqlite()

    def _initialize_sqlite(self):
        """Initialize SQLite database"""
        try:
            self.sqlite_conn = sqlite3.connect(
                Config.SQLITE_DB,
                check_same_thread=False
            )
            self.sqlite_conn.row_factory = sqlite3.Row
            self._create_sqlite_tables()
            self.use_mongodb = False
            logger.info("✓ Connected to SQLite successfully")
        except Exception as e:
            logger.error(f"SQLite initialization failed: {e}")
            raise

    def _create_sqlite_tables(self):
        """Create SQLite tables if they don't exist"""
        cursor = self.sqlite_conn.cursor()

        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                face_encoding TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_login TEXT
            )
        ''')

        # Sessions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_id TEXT UNIQUE NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')

        # Logs table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                details TEXT,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')

        self.sqlite_conn.commit()
        logger.info("✓ SQLite tables created successfully")

    # User Operations
    def create_user(self, user_data: Dict[str, Any]) -> bool:
        """Create a new user"""
        try:
            user_data['created_at'] = datetime.utcnow().isoformat()
            user_data['last_login'] = None

            if self.use_mongodb:
                result = self.mongo_db.users.insert_one(user_data)
                return result.inserted_id is not None
            else:
                cursor = self.sqlite_conn.cursor()
                cursor.execute('''
                    INSERT INTO users (username, email, password, face_encoding, created_at, last_login)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    user_data['username'],
                    user_data['email'],
                    user_data['password'],
                    json.dumps(user_data['face_encoding']),
                    user_data['created_at'],
                    user_data['last_login']
                ))
                self.sqlite_conn.commit()
                return cursor.lastrowid is not None
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            return False

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        try:
            if self.use_mongodb:
                user = self.mongo_db.users.find_one({'username': username})
                if user:
                    user['_id'] = str(user['_id'])
                return user
            else:
                cursor = self.sqlite_conn.cursor()
                cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
                row = cursor.fetchone()
                if row:
                    user = dict(row)
                    user['face_encoding'] = json.loads(user['face_encoding'])
                    return user
                return None
        except Exception as e:
            logger.error(f"Error getting user: {e}")
            return None

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Get user by email"""
        try:
            if self.use_mongodb:
                user = self.mongo_db.users.find_one({'email': email})
                if user:
                    user['_id'] = str(user['_id'])
                return user
            else:
                cursor = self.sqlite_conn.cursor()
                cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
                row = cursor.fetchone()
                if row:
                    user = dict(row)
                    user['face_encoding'] = json.loads(user['face_encoding'])
                    return user
                return None
        except Exception as e:
            logger.error(f"Error getting user: {e}")
            return None

    def get_all_users(self) -> List[Dict[str, Any]]:
        """Get all users"""
        try:
            if self.use_mongodb:
                users = list(self.mongo_db.users.find())
                for user in users:
                    user['_id'] = str(user['_id'])
                return users
            else:
                cursor = self.sqlite_conn.cursor()
                cursor.execute('SELECT * FROM users')
                rows = cursor.fetchall()
                users = []
                for row in rows:
                    user = dict(row)
                    user['face_encoding'] = json.loads(user['face_encoding'])
                    users.append(user)
                return users
        except Exception as e:
            logger.error(f"Error getting all users: {e}")
            return []

    def update_user_login(self, username: str) -> bool:
        """Update user's last login time"""
        try:
            last_login = datetime.utcnow().isoformat()
            if self.use_mongodb:
                result = self.mongo_db.users.update_one(
                    {'username': username},
                    {'$set': {'last_login': last_login}}
                )
                return result.modified_count > 0
            else:
                cursor = self.sqlite_conn.cursor()
                cursor.execute(
                    'UPDATE users SET last_login = ? WHERE username = ?',
                    (last_login, username)
                )
                self.sqlite_conn.commit()
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Error updating user login: {e}")
            return False

    def delete_user(self, username: str) -> bool:
        """Delete a user"""
        try:
            if self.use_mongodb:
                result = self.mongo_db.users.delete_one({'username': username})
                return result.deleted_count > 0
            else:
                cursor = self.sqlite_conn.cursor()
                cursor.execute('DELETE FROM users WHERE username = ?', (username,))
                self.sqlite_conn.commit()
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            return False

    # Logging Operations
    def create_log(self, user_id: Optional[int], action: str, details: str = None) -> bool:
        """Create a log entry"""
        try:
            log_data = {
                'user_id': user_id,
                'action': action,
                'details': details,
                'timestamp': datetime.utcnow().isoformat()
            }

            if self.use_mongodb:
                result = self.mongo_db.logs.insert_one(log_data)
                return result.inserted_id is not None
            else:
                cursor = self.sqlite_conn.cursor()
                cursor.execute('''
                    INSERT INTO logs (user_id, action, details, timestamp)
                    VALUES (?, ?, ?, ?)
                ''', (user_id, action, details, log_data['timestamp']))
                self.sqlite_conn.commit()
                return cursor.lastrowid is not None
        except Exception as e:
            logger.error(f"Error creating log: {e}")
            return False

    def get_user_logs(self, user_id: int, limit: int = 50) -> List[Dict[str, Any]]:
        """Get logs for a specific user"""
        try:
            if self.use_mongodb:
                logs = list(self.mongo_db.logs.find(
                    {'user_id': user_id}
                ).sort('timestamp', -1).limit(limit))
                for log in logs:
                    log['_id'] = str(log['_id'])
                return logs
            else:
                cursor = self.sqlite_conn.cursor()
                cursor.execute('''
                    SELECT * FROM logs WHERE user_id = ?
                    ORDER BY timestamp DESC LIMIT ?
                ''', (user_id, limit))
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error getting user logs: {e}")
            return []

    def close(self):
        """Close database connections"""
        if self.mongo_client:
            self.mongo_client.close()
            logger.info("MongoDB connection closed")
        if self.sqlite_conn:
            self.sqlite_conn.close()
            logger.info("SQLite connection closed")


# Global database instance
db = Database()
