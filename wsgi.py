"""
WSGI entry point for SecureVision
Used for production deployment with Gunicorn or similar WSGI servers
"""

import os
import sys

# Add the current directory to Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import app

if __name__ == "__main__":
    app.run()
