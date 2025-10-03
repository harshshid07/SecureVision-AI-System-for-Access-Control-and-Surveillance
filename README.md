# SecureVision - Face Recognition Authentication System

A secure web-based facial authentication system that uses deep learning for user login and signup. This project leverages DeepFace and FaceNet to provide seamless biometric authentication that can be integrated into web applications.

## 🔬 Technology Stack

- **Deep Learning Framework**: [DeepFace](https://github.com/serengil/deepface) - High-level face recognition library
- **Recognition Model**: [FaceNet](https://arxiv.org/abs/1503.03832) - 128-dimensional face embeddings
- **Face Detection**: [RetinaFace](https://github.com/serengil/retinaface) - State-of-the-art face detector
- **Web Framework**: [Flask](https://palletsprojects.com/p/flask/) - Lightweight Python web server
- **Deep Learning**: [TensorFlow](https://www.tensorflow.org/) & [Keras](https://keras.io/) - Neural network backend
- **Database**: [MongoDB](https://www.mongodb.com/) with SQLite fallback
- **Computer Vision**: [OpenCV](https://opencv.org/) - Image processing and enhancement

## ✨ Features

- **Face-based User Registration**: Secure signup with facial biometric data
- **Face Verification Login**: Multi-factor authentication (password + face)
- **Real-time Face Recognition**: Identify registered users in real-time
- **Image Enhancement**: Automatic image quality improvement for better recognition
- **User Dashboard**: Personalized interface with activity logs
- **Database Flexibility**: Automatic fallback from MongoDB to SQLite
- **Session Management**: Secure session-based authentication with Flask-Session
- **Activity Logging**: Track user authentication events and system activities
- **Error Handling**: Comprehensive error handling with custom error pages

## 📋 Prerequisites

- **Python**: 3.8 or higher
- **Webcam**: For face capture
- **MongoDB** (optional): MongoDB Atlas account or local installation
- **Operating System**: Windows, macOS, or Linux

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd securevision
```

### 2. Set Up Environment Variables
Create a `.env` file in the root directory (see `.env.example` for reference):
```env
# Flask Configuration
FLASK_SECRET=your-secret-key-here
FLASK_ENV=development

# MongoDB Configuration (Optional - SQLite fallback available)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=securevision
USE_MONGODB=True

# Face Recognition Settings
FACE_DETECTION_BACKEND=retinaface
FACE_MODEL=Facenet
SIMILARITY_THRESHOLD=0.6
MIN_FACE_SIZE=80
```

### 3. Install Dependencies

**Windows (Automated Setup):**
```bash
setup.bat
```

**Manual Setup (All Platforms):**
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Run the Application

**Windows:**
```bash
run.bat
```

**Manual Start:**
```bash
# Activate virtual environment first
python wsgi.py
# or
python app.py
```

The application will start at `http://localhost:5000`

### 5. Access the Application
- **Home Page**: http://localhost:5000
- **Signup**: http://localhost:5000/signup
- **Login**: http://localhost:5000/login
- **Dashboard**: http://localhost:5000/dashboard (after login)
- **Health Check**: http://localhost:5000/health

## 📁 Project Structure

```
securevision/
├── app.py                   # Main Flask application with routes
├── config.py                # Configuration management and environment variables
├── database.py              # Database handler (MongoDB + SQLite fallback)
├── face_recognition.py      # Face recognition module using DeepFace
├── wsgi.py                  # WSGI entry point for production
├── requirements.txt         # Python dependencies
├── .env                     # Environment variables (not in repo)
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── setup.bat                # Windows setup script
├── run.bat                  # Windows run script
│
├── securevision.db          # SQLite database file
├── templates/               # HTML Jinja2 templates
│   ├── base.html           # Base template
│   ├── index.html          # Home page
│   ├── signup.html         # Registration page
│   ├── login.html          # Login page
│   ├── dashboard.html      # User dashboard
│   ├── 404.html            # Not found error page
│   └── 500.html            # Server error page
│
├── static/                  # Static assets
│   ├── css/                # Stylesheets
│   ├── js/                 # JavaScript files
│   └── images/             # Image assets
│
├── uploads/                 # User face images (gitignored)
├── models/                  # Pre-trained models cache
├── logs/                    # Application logs
├── data/                    # Additional data files
├── flask_session/           # Flask session files
└── venv/                    # Virtual environment (gitignored)
```

## 🔧 Configuration

### Environment Variables

The application can be configured using the following environment variables in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `FLASK_SECRET` | Generated | Secret key for Flask sessions |
| `FLASK_ENV` | `development` | Environment mode |
| `MONGO_URI` | - | MongoDB connection string (optional) |
| `DB_NAME` | `securevision` | Database name |
| `USE_MONGODB` | `True` | Use MongoDB (falls back to SQLite if unavailable) |
| `FACE_DETECTION_BACKEND` | `retinaface` | Face detection model |
| `FACE_MODEL` | `Facenet` | Face recognition model |
| `SIMILARITY_THRESHOLD` | `0.6` | Face match threshold (0-1) |
| `MIN_FACE_SIZE` | `80` | Minimum face size in pixels |

### Database Setup

**Option 1: MongoDB (Recommended for Production)**
1. Create a MongoDB Atlas account at [mongodb.com](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster and database
3. Get your connection string
4. Add it to `.env` as `MONGO_URI`

**Option 2: SQLite (Default Fallback)**
- No setup required
- Automatically creates `securevision.db` on first run
- Perfect for development and testing

### Generate Flask Secret Key
```python
import secrets
print(secrets.token_hex(16))
```

## 📊 API Endpoints

### Authentication Routes
- `GET /` - Home page
- `GET /signup` - Registration page
- `POST /signup` - User registration with face data
- `GET /login` - Login page
- `POST /login` - Face verification login
- `GET /logout` - User logout

### Protected Routes
- `GET /dashboard` - User dashboard (requires authentication)

### API Routes
- `POST /verify-face` - Real-time face verification and user identification
- `GET /health` - Health check endpoint

### API Request/Response Examples

**Signup Request:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "securepassword",
  "face_image": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Login Request:**
```json
{
  "username": "johndoe",
  "password": "securepassword",
  "face_image": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

## 🔒 Security Features

- **Multi-Factor Authentication**: Combines password and facial biometrics
- **Password Hashing**: PBKDF2-SHA256 with salt using passlib
- **Face Encoding Storage**: Only mathematical embeddings stored, not images
- **Session Security**: Server-side session management with Flask-Session
- **Route Protection**: Login required decorators for protected endpoints
- **Environment Variables**: Sensitive data separated from codebase
- **Activity Logging**: All authentication attempts logged with timestamps
- **Input Validation**: Comprehensive validation of user inputs
- **Error Handling**: Secure error messages without exposing system details

## 🎯 How It Works

### Registration Flow
1. **User Input**: User provides username, email, password, and captures face image
2. **Image Processing**: System enhances image quality (contrast, sharpness, brightness)
3. **Face Detection**: RetinaFace detects and validates single face presence
4. **Encoding Generation**: FaceNet generates 128-dimensional embedding vector
5. **Secure Storage**: Password is hashed, face encoding and user data stored in database
6. **Confirmation**: User receives registration success and can proceed to login

### Login Flow
1. **Credentials**: User enters username and password
2. **Password Verification**: System validates hashed password
3. **Face Capture**: User captures face image for verification
4. **Face Matching**: System generates encoding and compares with stored data
5. **Similarity Check**: Cosine similarity calculated (threshold: 0.6)
6. **Authentication**: If both password and face match, session is created
7. **Dashboard Access**: User redirected to personalized dashboard with activity logs

### Face Recognition Technology
- **FaceNet Model**: Generates 128-dimensional face embeddings
- **RetinaFace Detector**: Highly accurate face detection
- **Cosine Similarity**: Measures face similarity (0 = different, 1 = identical)
- **Threshold**: Default 0.6 (configurable for security/usability balance)

## 📝 Dependencies

### Core Dependencies
```
Flask>=3.0.0              # Web framework
deepface                  # Face recognition library
tensorflow                # Deep learning backend
opencv-python             # Computer vision
pymongo                   # MongoDB driver
passlib                   # Password hashing
python-dotenv             # Environment variables
```

### Face Recognition Stack
```
retina-face               # Face detection
mtcnn                     # Alternative face detector
tf-keras                  # Keras for TensorFlow
opencv-contrib-python     # Additional CV functions
Pillow                    # Image processing
```

### Additional Tools
```
Flask-Session>=0.5.0      # Session management
gunicorn                  # Production WSGI server
waitress                  # Alternative production server
numpy                     # Numerical operations
pandas                    # Data manipulation
requests                  # HTTP library
bcrypt                    # Additional encryption
```

See `requirements.txt` for complete list with version specifications.

## 🐛 Troubleshooting

### Database Issues

**MongoDB Connection Failed**
```
✓ Solution: Application automatically falls back to SQLite
- Check MONGO_URI in .env file
- Verify MongoDB Atlas IP whitelist (add 0.0.0.0/0 for testing)
- Ensure correct username/password in connection string
- Check internet connectivity
```

**SQLite Database Locked**
```
✓ Solution: Close other processes accessing the database
- Restart the application
- Delete flask_session folder and restart
```

### Face Recognition Issues

**"No face detected"**
```
✓ Solutions:
- Ensure good lighting conditions
- Position face directly facing camera
- Move closer to camera (but not too close)
- Remove glasses or accessories blocking face
- Check camera permissions in browser
```

**"Multiple faces detected"**
```
✓ Solution: Ensure only one person is visible in the camera frame
```

**"Face verification failed"**
```
✓ Solutions:
- Adjust SIMILARITY_THRESHOLD in .env (lower = more strict)
- Ensure consistent lighting during registration and login
- Retake registration photo with better quality
- Check that face is clearly visible
```

### Installation Issues

**TensorFlow Installation Failed**
```
✓ Solutions:
- Ensure Python 3.8-3.11 (TensorFlow compatibility)
- Windows: Install Visual C++ Redistributable
- Use pip install --upgrade pip
- Try: pip install tensorflow-cpu (for CPU-only systems)
```

**OpenCV Import Error**
```
✓ Solution:
pip uninstall opencv-python opencv-contrib-python
pip install opencv-python opencv-contrib-python
```

### Browser/Camera Issues

**Camera Not Working**
```
✓ Solutions:
- Use HTTPS or localhost (required for camera access)
- Grant camera permissions in browser settings
- Close other applications using camera
- Try different browser (Chrome/Firefox recommended)
- Check camera drivers and hardware
```

### General Issues

**"Module not found" errors**
```bash
# Activate virtual environment
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux/Mac

# Reinstall dependencies
pip install -r requirements.txt
```

**Port 5000 already in use**
```bash
# Option 1: Change port in app.py (line 370)
app.run(debug=Config.DEBUG, host='0.0.0.0', port=8000)

# Option 2: Kill process using port 5000
# Windows: netstat -ano | findstr :5000
# Linux/Mac: lsof -ti:5000 | xargs kill
```

## 🚢 Deployment

### Production Deployment Checklist

1. **Environment Configuration**
```bash
# Set production environment
FLASK_ENV=production
DEBUG=False

# Use strong secret key
FLASK_SECRET=<generate-strong-secret-key>

# Configure production MongoDB
MONGO_URI=mongodb+srv://user:password@cluster.mongodb.net/securevision
USE_MONGODB=True
```

2. **WSGI Server Setup**
```bash
# Using Gunicorn (Linux/Mac)
gunicorn -w 4 -b 0.0.0.0:8000 wsgi:app

# Using Waitress (Windows)
waitress-serve --host=0.0.0.0 --port=8000 wsgi:app
```

3. **Security Hardening**
- Enable HTTPS/SSL (required for camera access)
- Configure firewall rules
- Set up proper CORS policies
- Use environment variables for all secrets
- Enable rate limiting for authentication endpoints
- Regular security audits

4. **Performance Optimization**
- Use CDN for static files
- Enable caching for model files
- Configure database connection pooling
- Monitor memory usage (face recognition is memory-intensive)

5. **Monitoring & Logging**
- Set up application monitoring
- Configure log rotation
- Enable error tracking (e.g., Sentry)
- Monitor database performance

### Cloud Deployment Options

**Heroku**
```bash
# Procfile
web: gunicorn wsgi:app
```

**Docker**
```dockerfile
FROM python:3.9
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "wsgi:app"]
```

**AWS/Azure/GCP**
- Use managed MongoDB service
- Deploy with load balancer
- Configure auto-scaling
- Set up CDN for static assets

## 🧪 Testing

### Manual Testing
1. **Registration**: Create account with face capture
2. **Login**: Verify multi-factor authentication works
3. **Dashboard**: Check user data and activity logs
4. **Face Verification**: Test `/verify-face` endpoint
5. **Error Handling**: Test invalid inputs and edge cases

### Automated Testing (Future Enhancement)
```bash
# Unit tests
pytest tests/test_face_recognition.py

# Integration tests
pytest tests/test_api_endpoints.py

# Load testing
locust -f tests/load_test.py
```

## 🔐 Privacy & Compliance

**Data Stored:**
- Username, email, hashed password
- Face embeddings (128-dimensional vectors, not actual images)
- Activity logs (login attempts, timestamps)

**Data NOT Stored:**
- Raw face images (only temporary during processing)
- Plain text passwords

**Compliance Considerations:**
- GDPR: Implement right to deletion, data export
- CCPA: Provide opt-out mechanisms
- Biometric data laws: Check local regulations
- User consent: Obtain explicit consent for biometric data

**Best Practices:**
- Inform users about biometric data collection
- Provide clear privacy policy
- Allow users to delete their biometric data
- Secure data transmission with HTTPS
- Regular security audits

## 📊 Performance Metrics

**System Requirements:**
- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 2GB for models + database
- **Network**: Stable internet for MongoDB (if used)

**Typical Performance:**
- Face detection: ~500ms
- Face encoding: ~1-2 seconds
- Face verification: ~1-2 seconds
- Total login time: ~3-5 seconds

## 📄 License

This project is intended for educational and research purposes.

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

**Areas for Contribution:**
- Additional face detection backends
- UI/UX improvements
- Performance optimizations
- Additional authentication methods
- Documentation improvements
- Bug fixes and testing

## 📧 Support

For issues and questions:
- **Issues**: Create an issue in the repository
- **Documentation**: Check the project wiki
- **Discussions**: Use GitHub Discussions

## 🙏 Acknowledgments

- **DeepFace**: Facebook Research's face recognition library
- **FaceNet**: Google's face recognition model
- **RetinaFace**: High-accuracy face detection
- **Flask**: Micro web framework
- **MongoDB**: NoSQL database

## 📚 Additional Resources

- [DeepFace Documentation](https://github.com/serengil/deepface)
- [FaceNet Paper](https://arxiv.org/abs/1503.03832)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)

---

**⚠️ Important Note**: This system uses facial recognition for authentication. Ensure compliance with local privacy laws and biometric data regulations when deploying in production. Always obtain explicit user consent for biometric data collection and storage.
