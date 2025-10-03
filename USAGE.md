# SecureVision - Usage Guide

## Quick Start

### 1. Initial Setup

```bash
# Run the setup script (Windows)
setup.bat

# Or manually:
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configuration

Copy the `.env.example` file to `.env` and configure your settings:

```bash
copy .env.example .env
```

Edit `.env` with your settings:
- **FLASK_SECRET**: Generate a secure key (use `python -c "import secrets; print(secrets.token_hex(16))"`)
- **MONGO_URI**: Your MongoDB connection string (optional, will use SQLite if not configured)
- **Other settings**: Adjust as needed

### 3. Run the Application

```bash
# Using the run script (Windows)
run.bat

# Or manually:
venv\Scripts\activate
python app.py
```

Visit `http://localhost:5000` in your browser.

## Features

### 1. User Registration (Sign Up)

1. Navigate to `/signup`
2. Enter username, email, and password
3. Allow camera access when prompted
4. Position your face in the camera frame
5. Click "Capture Face"
6. Click "Sign Up"

**Important Notes:**
- Ensure good lighting for best results
- Face the camera directly
- Only one face should be visible
- Image quality must meet minimum requirements

### 2. User Login

1. Navigate to `/login`
2. Enter your username and password
3. Allow camera access when prompted
4. Position your face in the camera frame
5. Click "Capture Face"
6. Click "Login"

**Security:**
- Password verification
- Face recognition verification (dual authentication)
- Session management

### 3. Dashboard

After successful login, you'll be redirected to your dashboard where you can:
- View your user information
- See system information
- Check recent activity logs
- Logout

## Database Options

### MongoDB (Recommended for Production)

1. Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Get your connection string
4. Add it to `.env` as `MONGO_URI`
5. Set `USE_MONGODB=True` in `.env`

### SQLite (Automatic Fallback)

If MongoDB is not configured or unavailable:
- The system automatically uses SQLite
- Database file: `securevision.db`
- No additional configuration needed

## Face Recognition Settings

Adjust in `.env`:

```env
# Face detection backend (retinaface, mtcnn, opencv, ssd, dlib)
FACE_DETECTION_BACKEND=retinaface

# Face recognition model (Facenet, VGG-Face, OpenFace, DeepFace, DeepID, ArcFace)
FACE_MODEL=Facenet

# Similarity threshold (lower = stricter, 0.0-1.0)
SIMILARITY_THRESHOLD=0.6

# Minimum face size in pixels
MIN_FACE_SIZE=80
```

## API Endpoints

### Public Endpoints

- `GET /` - Home page
- `GET /signup` - Sign up page
- `POST /signup` - Create new user
- `GET /login` - Login page
- `POST /login` - Authenticate user
- `POST /verify-face` - Real-time face verification

### Protected Endpoints (Login Required)

- `GET /dashboard` - User dashboard
- `GET /logout` - Logout user

### Health Check

- `GET /health` - System health status

## Troubleshooting

### Camera Access Issues

**Problem:** Camera not working
**Solution:**
- Ensure browser has camera permissions
- Check if another application is using the camera
- Try refreshing the page
- Use HTTPS (required by some browsers)

### Face Detection Issues

**Problem:** "No face detected"
**Solution:**
- Ensure good lighting
- Face the camera directly
- Move closer to the camera
- Remove glasses or hats if they interfere

**Problem:** "Face too small"
**Solution:**
- Move closer to the camera
- Ensure minimum 80x80 pixel face size

**Problem:** "Multiple faces detected"
**Solution:**
- Ensure only one person is in the frame
- Remove background people or mirrors

### Database Issues

**Problem:** MongoDB connection failed
**Solution:**
- Check your `MONGO_URI` in `.env`
- Verify MongoDB Atlas cluster is running
- Check IP whitelist in MongoDB Atlas
- System will automatically fallback to SQLite

### Installation Issues

**Problem:** Package installation fails
**Solution:**
```bash
# Upgrade pip
python -m pip install --upgrade pip

# Install dependencies one by one
pip install Flask
pip install deepface
# ... etc
```

## Production Deployment

### Using Gunicorn (Linux/Mac)

```bash
gunicorn -w 4 -b 0.0.0.0:5000 wsgi:app
```

### Using Waitress (Windows)

```bash
waitress-serve --host=0.0.0.0 --port=5000 wsgi:app
```

### Important Production Settings

1. Set `FLASK_ENV=production` in `.env`
2. Use a strong `FLASK_SECRET`
3. Use MongoDB for database
4. Enable HTTPS
5. Set up proper firewall rules
6. Configure logging

## Security Best Practices

1. **Always use HTTPS in production**
2. **Keep your SECRET_KEY secure**
3. **Regularly update dependencies**
4. **Use strong passwords**
5. **Whitelist trusted IPs in MongoDB**
6. **Regular security audits**
7. **Backup your database regularly**

## Performance Optimization

1. **First Run:** DeepFace will download models (200-300MB)
2. **Subsequent Runs:** Models are cached for faster loading
3. **Hardware:** GPU support for faster processing (optional)
4. **Database:** Use MongoDB for better scalability

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review the logs in `logs/app.log`
3. Check the README.md for additional information
4. Create an issue in the repository

## License

This project is for educational and research purposes.
