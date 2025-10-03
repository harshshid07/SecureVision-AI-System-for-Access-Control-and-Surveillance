"""
Configuration module for SecureVision
Loads environment variables and provides configuration settings
"""

import os
import secrets
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Base configuration class"""

    # Flask Configuration
    SECRET_KEY = os.getenv('FLASK_SECRET', secrets.token_hex(16))
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    DEBUG = FLASK_ENV == 'development'

    # MongoDB Configuration
    MONGO_URI = os.getenv('MONGO_URI', '')
    DB_NAME = os.getenv('DB_NAME', 'securevision')
    USE_MONGODB = os.getenv('USE_MONGODB', 'True').lower() == 'true'

    # SQLite Fallback
    SQLITE_DB = 'securevision.db'

    # Face Recognition Settings
    FACE_DETECTION_BACKEND = os.getenv('FACE_DETECTION_BACKEND', 'retinaface')
    FACE_MODEL = os.getenv('FACE_MODEL', 'Facenet')
    SIMILARITY_THRESHOLD = float(os.getenv('SIMILARITY_THRESHOLD', '0.6'))
    MIN_FACE_SIZE = int(os.getenv('MIN_FACE_SIZE', '80'))

    # Upload Settings
    UPLOAD_FOLDER = os.path.join(os.getcwd(), os.getenv('UPLOAD_FOLDER', 'uploads'))
    MAX_CONTENT_LENGTH = int(os.getenv('MAX_CONTENT_LENGTH', '16777216'))  # 16MB
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

    # Session Settings
    SESSION_TYPE = os.getenv('SESSION_TYPE', 'filesystem')
    PERMANENT_SESSION_LIFETIME = int(os.getenv('PERMANENT_SESSION_LIFETIME', '3600'))

    # Logging Settings
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.path.join(os.getcwd(), os.getenv('LOG_FILE', 'logs/app.log'))

    # Directories
    MODELS_DIR = os.path.join(os.getcwd(), 'models')
    LOGS_DIR = os.path.join(os.getcwd(), 'logs')
    DATA_DIR = os.path.join(os.getcwd(), 'data')

    @staticmethod
    def init_app(app):
        """Initialize application with config"""
        # Create necessary directories
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)
        os.makedirs(Config.MODELS_DIR, exist_ok=True)
        os.makedirs(Config.LOGS_DIR, exist_ok=True)
        os.makedirs(Config.DATA_DIR, exist_ok=True)

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False

class TestingConfig(Config):
    """Testing configuration"""
    DEBUG = True
    TESTING = True
    USE_MONGODB = False

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
