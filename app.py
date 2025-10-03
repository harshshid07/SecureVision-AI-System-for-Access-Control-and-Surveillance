"""
SecureVision - Face Recognition Authentication System
Main Flask Application
"""

import os
import logging
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_session import Session
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from functools import wraps
from passlib.hash import pbkdf2_sha256
from datetime import datetime, timedelta
from config import Config
from database import db
from face_recognition import face_recognition

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize Flask-Session
Session(app)

# Initialize Rate Limiter
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://",
)

# Setup logging
logging.basicConfig(
    level=getattr(logging, Config.LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(Config.LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Initialize app with config
Config.init_app(app)


# Decorators
def login_required(f):
    """Decorator to require login for routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function


# Error handlers
@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors"""
    return render_template('404.html'), 404


@app.errorhandler(500)
def server_error(e):
    """Handle 500 errors"""
    logger.error(f"Server error: {e}")
    return render_template('500.html'), 500


# Routes
@app.route('/')
def index():
    """Home page"""
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('index.html')


@app.route('/signup', methods=['GET', 'POST'])
@limiter.limit("5 per hour")  # Limit signup attempts to prevent spam
def signup():
    """User signup with face registration"""
    if request.method == 'GET':
        return render_template('signup.html')

    try:
        data = request.get_json()

        # Validate input
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        face_image = data.get('face_image', '')

        if not all([username, email, password, face_image]):
            return jsonify({
                'success': False,
                'message': 'All fields are required'
            }), 400

        # Check if user exists
        if db.get_user_by_username(username):
            return jsonify({
                'success': False,
                'message': 'Username already exists'
            }), 400

        if db.get_user_by_email(email):
            return jsonify({
                'success': False,
                'message': 'Email already exists'
            }), 400

        # Save face image
        success, image_path, message = face_recognition.save_face_image(face_image, username)
        if not success:
            return jsonify({
                'success': False,
                'message': f'Image error: {message}'
            }), 400

        # Validate image quality
        is_valid, quality_message = face_recognition.validate_image_quality(image_path)
        if not is_valid:
            os.remove(image_path)
            return jsonify({
                'success': False,
                'message': quality_message
            }), 400

        # Generate face encoding
        success, encoding, encoding_message = face_recognition.generate_face_encoding(image_path)
        if not success:
            os.remove(image_path)
            return jsonify({
                'success': False,
                'message': encoding_message
            }), 400

        # Hash password
        hashed_password = pbkdf2_sha256.hash(password)

        # Create user
        user_data = {
            'username': username,
            'email': email,
            'password': hashed_password,
            'face_encoding': encoding
        }

        if db.create_user(user_data):
            db.create_log(None, 'USER_SIGNUP', f'New user registered: {username}')
            logger.info(f"✓ New user registered: {username}")
            return jsonify({
                'success': True,
                'message': 'Registration successful! You can now login.'
            })
        else:
            os.remove(image_path)
            return jsonify({
                'success': False,
                'message': 'Failed to create user. Please try again.'
            }), 500

    except Exception as e:
        logger.error(f"Signup error: {e}")
        return jsonify({
            'success': False,
            'message': 'An error occurred during registration'
        }), 500


@app.route('/login', methods=['GET', 'POST'])
@limiter.limit("10 per hour")  # Limit login attempts to prevent brute-force
def login():
    """User login with face verification"""
    if request.method == 'GET':
        return render_template('login.html')

    try:
        data = request.get_json()

        # Validate input
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        face_image = data.get('face_image', '')

        if not all([username, password, face_image]):
            return jsonify({
                'success': False,
                'message': 'All fields are required'
            }), 400

        # Get user from database
        user = db.get_user_by_username(username)
        if not user:
            return jsonify({
                'success': False,
                'message': 'Invalid username or password'
            }), 401

        # Verify password
        if not pbkdf2_sha256.verify(password, user['password']):
            db.create_log(user.get('id'), 'LOGIN_FAILED', 'Invalid password')
            return jsonify({
                'success': False,
                'message': 'Invalid username or password'
            }), 401

        # Save temporary face image for verification
        temp_path = os.path.join(Config.UPLOAD_FOLDER, f'temp_{username}_verify.jpg')
        success, temp_image_path, message = face_recognition.save_face_image(face_image, f'temp_{username}_verify')

        if not success:
            return jsonify({
                'success': False,
                'message': f'Image error: {message}'
            }), 400

        # Verify face
        is_match, similarity, verify_message = face_recognition.verify_face(
            temp_image_path,
            user['face_encoding']
        )

        # Clean up temp file
        if os.path.exists(temp_image_path):
            os.remove(temp_image_path)

        if not is_match:
            db.create_log(user.get('id'), 'LOGIN_FAILED', f'Face verification failed: {verify_message}')
            return jsonify({
                'success': False,
                'message': 'Face verification failed. Please try again.'
            }), 401

        # Login successful
        session['user_id'] = user.get('id') or user.get('_id')
        session['username'] = user['username']
        session['email'] = user['email']
        session.permanent = True

        # Update last login
        db.update_user_login(username)
        db.create_log(user.get('id'), 'LOGIN_SUCCESS', f'Successful login with similarity: {similarity:.2%}')

        logger.info(f"✓ User logged in: {username} (similarity: {similarity:.2%})")

        return jsonify({
            'success': True,
            'message': 'Login successful!',
            'redirect': url_for('dashboard')
        })

    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({
            'success': False,
            'message': 'An error occurred during login'
        }), 500


@app.route('/verify-face', methods=['POST'])
@limiter.limit("20 per hour")  # Limit face verification attempts
def verify_face():
    """Real-time face verification endpoint"""
    try:
        data = request.get_json()
        face_image = data.get('face_image', '')

        if not face_image:
            return jsonify({
                'success': False,
                'message': 'No image provided'
            }), 400

        # Get all users with face encodings
        all_users = db.get_all_users()
        user_encodings = {
            user['username']: user['face_encoding']
            for user in all_users
            if user.get('face_encoding')
        }

        if not user_encodings:
            return jsonify({
                'success': False,
                'message': 'No registered users found'
            }), 404

        # Save temporary image
        temp_path = os.path.join(Config.UPLOAD_FOLDER, 'temp_verify.jpg')
        success, temp_image_path, message = face_recognition.save_face_image(face_image, 'temp_verify')

        if not success:
            return jsonify({
                'success': False,
                'message': f'Image error: {message}'
            }), 400

        # Find matching user
        username, similarity, match_message = face_recognition.find_matching_user(
            temp_image_path,
            user_encodings
        )

        # Clean up temp file
        if os.path.exists(temp_image_path):
            os.remove(temp_image_path)

        if username:
            return jsonify({
                'success': True,
                'username': username,
                'similarity': f'{similarity:.2%}',
                'message': match_message
            })
        else:
            return jsonify({
                'success': False,
                'message': 'No matching user found'
            }), 404

    except Exception as e:
        logger.error(f"Face verification error: {e}")
        return jsonify({
            'success': False,
            'message': 'An error occurred during verification'
        }), 500


@app.route('/dashboard')
@login_required
def dashboard():
    """User dashboard"""
    user = db.get_user_by_username(session.get('username'))
    if not user:
        session.clear()
        return redirect(url_for('login'))

    # Get user logs
    user_id = user.get('id') or user.get('_id')
    logs = db.get_user_logs(user_id, limit=10)

    return render_template('dashboard.html', user=user, logs=logs)


@app.route('/logout')
def logout():
    """User logout"""
    username = session.get('username')
    if username:
        user = db.get_user_by_username(username)
        if user:
            db.create_log(user.get('id'), 'LOGOUT', f'User logged out: {username}')
        logger.info(f"User logged out: {username}")

    session.clear()
    return redirect(url_for('index'))


@app.route('/health')
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'database': 'MongoDB' if db.use_mongodb else 'SQLite',
        'timestamp': datetime.utcnow().isoformat()
    })


if __name__ == '__main__':
    logger.info("=" * 60)
    logger.info("SecureVision Face Recognition System")
    logger.info(f"Database: {'MongoDB' if db.use_mongodb else 'SQLite'}")
    logger.info(f"Face Model: {Config.FACE_MODEL}")
    logger.info(f"Detector: {Config.FACE_DETECTION_BACKEND}")
    logger.info("=" * 60)
    app.run(debug=Config.DEBUG, host='0.0.0.0', port=5000)
