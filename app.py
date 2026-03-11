"""
SecureVision - Face Recognition Authentication System
Main Flask Application
"""

import os
import logging
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_session import Session
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
            db.create_log(None, 'USER_SIGNUP', f'New user registered: {username}', username=username, ip_address=request.remote_addr)
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


@app.route('/welcome')
def welcome():
    """Welcome page after successful login"""
    if 'user_id' not in session:
        return redirect(url_for('login'))

    username = session.get('username')
    return render_template('welcome.html', username=username)


@app.route('/apps')
@login_required
def apps():
    """Apps page - user's accessible applications"""
    return render_template('apps.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    """User login with password and face verification"""
    if request.method == 'GET':
        return render_template('login.html')

    try:
        data = request.get_json()

        # Validate input
        username = data.get('username', '').strip()
        face_image = data.get('face_image', '')

        if not all([username, face_image]):
            return jsonify({
                'success': False,
                'message': 'Username and face image are required'
            }), 400

        # Get user from database
        user = db.get_user_by_username(username)
        if not user:
            db.create_log(None, 'LOGIN_FAILED', f'Invalid username attempt: {username}', username=username, ip_address=request.remote_addr, success=False)
            return jsonify({
                'success': False,
                'message': 'Invalid username'
            }), 401

        # Save temporary face image for verification
        success, temp_image_path, message = face_recognition.save_face_image(face_image, f'temp_{username}_verify')

        if not success:
            db.create_log(user.get('id'), 'LOGIN_FAILED', f'Image error: {message}', username=username, ip_address=request.remote_addr, success=False)
            return jsonify({
                'success': False,
                'message': f'Image error: {message}'
            }), 400

        # Verify face against stored encoding
        is_match, similarity, verify_message = face_recognition.verify_face(
            temp_image_path,
            user['face_encoding']
        )

        # Clean up temp file
        if os.path.exists(temp_image_path):
            os.remove(temp_image_path)

        # Log the verification attempt with details
        logger.info(f"Login attempt for {username}: Password OK, Face match={is_match}, Similarity={similarity:.2%}")

        if not is_match:
            db.create_log(user.get('id'), 'LOGIN_FAILED', f'Face verification failed (similarity: {similarity:.2%})', username=username, ip_address=request.remote_addr, success=False)
            return jsonify({
                'success': False,
                'message': f'Face verification failed. Your face does not match the registered profile.'
            }), 401

        # Login successful - both password and face verified
        session['user_id'] = user.get('id') or user.get('_id')
        session['username'] = user['username']
        session['email'] = user['email']
        session.permanent = True

        # Update last login
        db.update_user_login(username)
        db.create_log(user.get('id'), 'LOGIN_SUCCESS', f'Successful login (similarity: {similarity:.2%})', username=username, ip_address=request.remote_addr)

        logger.info(f"✓ User logged in: {username} (similarity: {similarity:.2%})")

        return jsonify({
            'success': True,
            'message': 'Login successful!',
            'redirect': url_for('welcome')
        })

    except Exception as e:
        logger.error(f"Login error: {e}")
        return jsonify({
            'success': False,
            'message': 'An error occurred during login'
        }), 500


@app.route('/verify-face', methods=['POST'])
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
            db.create_log(user.get('id'), 'LOGOUT', f'User logged out: {username}', username=username, ip_address=request.remote_addr)
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


# API Endpoints for Dashboard Analytics
@app.route('/api/users', methods=['GET'])
@login_required
def api_get_users():
    """Get all registered users"""
    try:
        users = db.get_all_users()
        # Remove sensitive data
        users_data = []
        for user in users:
            users_data.append({
                'id': str(user.get('id') or user.get('_id')),
                'username': user.get('username'),
                'email': user.get('email'),
                'created_at': user.get('created_at'),
                'last_login': user.get('last_login'),
                'access_count': user.get('access_count', 0),
                'status': user.get('status', 'active')
            })
        return jsonify({
            'success': True,
            'users': users_data,
            'total': len(users_data)
        })
    except Exception as e:
        logger.error(f"Error fetching users: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch users'
        }), 500


@app.route('/api/users/<user_id>', methods=['DELETE'])
@login_required
def api_delete_user(user_id):
    """Delete a specific user"""
    try:
        # Get current user to prevent self-deletion
        current_user_id = str(session.get('user_id'))
        if current_user_id == user_id:
            return jsonify({
                'success': False,
                'message': 'Cannot delete your own account'
            }), 400

        # Get user by ID to find username
        users = db.get_all_users()
        user_to_delete = None
        for user in users:
            if str(user.get('id') or user.get('_id')) == user_id:
                user_to_delete = user
                break

        if not user_to_delete:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

        # Delete user
        if db.delete_user(user_to_delete['username']):
            db.create_log(session.get('user_id'), 'USER_DELETED', f'Deleted user: {user_to_delete["username"]}', username=session.get('username'), ip_address=request.remote_addr)
            logger.info(f"User deleted: {user_to_delete['username']}")
            return jsonify({
                'success': True,
                'message': 'User deleted successfully'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Failed to delete user'
            }), 500

    except Exception as e:
        logger.error(f"Error deleting user: {e}")
        return jsonify({
            'success': False,
            'message': 'An error occurred'
        }), 500


@app.route('/api/stats', methods=['GET'])
@login_required
def api_get_stats():
    """Get system statistics"""
    try:
        users = db.get_all_users()
        all_logs = []

        # Collect all logs
        for user in users:
            user_id = user.get('id') or user.get('_id')
            logs = db.get_user_logs(user_id, limit=1000)
            all_logs.extend(logs)

        # Calculate statistics
        total_users = len(users)
        total_access_attempts = len([log for log in all_logs if log.get('action') in ['LOGIN_SUCCESS', 'LOGIN_FAILED']])
        successful_logins = len([log for log in all_logs if log.get('action') == 'LOGIN_SUCCESS'])
        failed_logins = len([log for log in all_logs if log.get('action') == 'LOGIN_FAILED'])

        # Calculate accuracy
        accuracy = (successful_logins / total_access_attempts * 100) if total_access_attempts > 0 else 0

        # Recent activity (last 24 hours)
        recent_logs = sorted(all_logs, key=lambda x: x.get('timestamp', ''), reverse=True)[:10]

        return jsonify({
            'success': True,
            'stats': {
                'total_users': total_users,
                'total_access_attempts': total_access_attempts,
                'successful_logins': successful_logins,
                'failed_logins': failed_logins,
                'recognition_accuracy': round(accuracy, 2),
                'average_response_time': 2.5,  # Placeholder
                'system_uptime': '99.9%'
            },
            'recent_activity': recent_logs
        })
    except Exception as e:
        logger.error(f"Error fetching stats: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch statistics'
        }), 500


@app.route('/api/access-logs', methods=['GET'])
@login_required
def api_get_access_logs():
    """Get access logs"""
    try:
        limit = request.args.get('limit', 50, type=int)
        users = db.get_all_users()
        all_logs = []

        # Collect logs from all users
        for user in users:
            user_id = user.get('id') or user.get('_id')
            logs = db.get_user_logs(user_id, limit=limit)
            for log in logs:
                log['username'] = user.get('username')
            all_logs.extend(logs)

        # Sort by timestamp
        all_logs = sorted(all_logs, key=lambda x: x.get('timestamp', ''), reverse=True)[:limit]

        return jsonify({
            'success': True,
            'logs': all_logs,
            'total': len(all_logs)
        })
    except Exception as e:
        logger.error(f"Error fetching logs: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch access logs'
        }), 500


# App Credentials Routes
@app.route('/api/app-credentials/<app_name>', methods=['GET', 'POST', 'DELETE'])
@login_required
def manage_app_credentials(app_name):
    """Manage app credentials for the logged-in user"""
    user_id = session.get('user_id')

    try:
        if request.method == 'GET':
            # Get credentials for specific app
            creds = db.get_app_credentials(user_id, app_name)
            if creds:
                return jsonify({
                    'success': True,
                    'app_name': app_name,
                    'username': creds.get('app_username'),
                    'password': creds.get('app_password')
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'No credentials found for this app'
                }), 404

        elif request.method == 'POST':
            # Save/update credentials
            data = request.get_json()
            app_username = data.get('username', '').strip()
            app_password = data.get('password', '').strip()

            if not app_username or not app_password:
                return jsonify({
                    'success': False,
                    'message': 'Username and password are required'
                }), 400

            success = db.save_app_credentials(user_id, app_name, app_username, app_password)
            if success:
                db.create_log(user_id, 'APP_CREDS_SAVED', f'Saved credentials for {app_name}',
                             username=session.get('username'), ip_address=request.remote_addr)
                return jsonify({
                    'success': True,
                    'message': 'Credentials saved successfully'
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Failed to save credentials'
                }), 500

        elif request.method == 'DELETE':
            # Delete credentials
            success = db.delete_app_credentials(user_id, app_name)
            if success:
                db.create_log(user_id, 'APP_CREDS_DELETED', f'Deleted credentials for {app_name}',
                             username=session.get('username'), ip_address=request.remote_addr)
                return jsonify({
                    'success': True,
                    'message': 'Credentials deleted successfully'
                })
            else:
                return jsonify({
                    'success': False,
                    'message': 'Failed to delete credentials'
                }), 500

    except Exception as e:
        logger.error(f"Error managing app credentials: {e}")
        return jsonify({
            'success': False,
            'message': 'An error occurred'
        }), 500


@app.route('/api/app-credentials', methods=['GET'])
@login_required
def get_all_app_credentials():
    """Get all app credentials for the logged-in user"""
    try:
        user_id = session.get('user_id')
        creds = db.get_all_user_app_credentials(user_id)

        # Format credentials for response
        formatted_creds = {}
        for cred in creds:
            formatted_creds[cred['app_name']] = {
                'username': cred['app_username'],
                'password': cred['app_password']
            }

        return jsonify({
            'success': True,
            'credentials': formatted_creds
        })
    except Exception as e:
        logger.error(f"Error fetching all app credentials: {e}")
        return jsonify({
            'success': False,
            'message': 'Failed to fetch credentials'
        }), 500


if __name__ == '__main__':
    logger.info("=" * 60)
    logger.info("SecureVision Face Recognition System")
    logger.info(f"Database: {'MongoDB' if db.use_mongodb else 'SQLite'}")
    logger.info(f"Face Model: {Config.FACE_MODEL}")
    logger.info(f"Detector: {Config.FACE_DETECTION_BACKEND}")
    logger.info("=" * 60)
    app.run(debug=Config.DEBUG, host='0.0.0.0', port=5000)
