# SecureVision - Setup Instructions

## 📋 Overview

SecureVision is an enterprise-grade facial recognition authentication system with:
- **Single-face enforcement** - Only one person allowed per authentication
- **Passive anti-spoofing** - Detects photo/video spoofing attempts
- **Real-time blocking** - Admin blocks immediately terminate user sessions via Supabase Realtime
- **Comprehensive logging** - Track all authentication attempts with detailed metrics

---

## 🗂️ Project Structure

```
securevision/
├── backend/              # FastAPI server
│   ├── main.py          # Application entry point
│   ├── config.py        # Configuration management
│   ├── vision_engine.py # DeepFace integration
│   ├── supabase_client.py # Database client
│   ├── auth.py          # JWT authentication
│   ├── models.py        # Pydantic schemas
│   ├── routes/          # API endpoints
│   │   ├── auth.py      # Registration & login
│   │   ├── user.py      # User operations
│   │   └── admin.py     # Admin operations
│   ├── requirements.txt
│   └── .env             # Environment variables
├── frontend/            # React application
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── lib/         # Utilities (API, Supabase)
│   │   ├── App.jsx      # Main app
│   │   └── main.jsx     # Entry point
│   ├── package.json
│   └── .env             # Environment variables
└── database/
    └── schema.sql       # Supabase database schema
```

---

## 🚀 Step 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your **Project URL** and **API keys**

### 1.2 Run Database Schema
1. In Supabase Dashboard, go to **SQL Editor**
2. Copy the contents of `database/schema.sql`
3. Execute the SQL script
4. Verify tables created: `users`, `admins`, `login_logs`

### 1.3 Enable Realtime
1. Go to **Database > Replication**
2. Enable replication for the `users` table
3. This is **CRITICAL** for real-time blocking functionality

### 1.4 Create Admin User
Run this in SQL Editor (replace password with bcrypt hash):
```sql
-- Generate bcrypt hash for your password using an online tool
INSERT INTO admins (email, password_hash) 
VALUES ('admin@securevision.com', '$2b$12$YOUR_HASHED_PASSWORD_HERE');
```

**To generate a bcrypt hash:**
- Use [bcrypt-generator.com](https://bcrypt-generator.com/)
- Or run: `python -c "from passlib.hash import bcrypt; print(bcrypt.hash('YourPassword123'))"`

---

## 🔧 Step 2: Backend Setup

### 2.1 Install Dependencies
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### 2.2 Configure Environment
1. Copy `.env.example` to `.env`
2. Update with your values:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

JWT_SECRET=your-secret-key-minimum-32-characters
FRONTEND_URL=http://localhost:5173
```

### 2.3 Run Backend
```bash
python main.py
```
Server will start on `http://localhost:8000`

### 2.4 Test API
Visit `http://localhost:8000/health` - should return `{"status": "healthy"}`

---

## 🎨 Step 3: Frontend Setup

### 3.1 Install Dependencies
```bash
cd frontend
npm install
```

### 3.2 Configure Environment
1. Copy `.env.example` to `.env`
2. Update with your values:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_URL=http://localhost:8000
```

### 3.3 Run Frontend
```bash
npm run dev
```
Frontend will start on `http://localhost:5173`

---

## ✅ Step 4: Verification

### 4.1 User Registration Flow
1. Navigate to `http://localhost:5173/register`
2. Fill in username and email
3. Click "Capture Face" (allow camera permissions)
4. Position your face clearly in the frame
5. Click "Create Account"
6. You should be redirected to the user dashboard

### 4.2 Test Single-Face Enforcement
1. Try registering with **multiple people** in frame
2. Expected result: Error message "Multiple faces detected. Only one person allowed."

### 4.3 Test Facial Login
1. Navigate to `/login`
2. Enter your username
3. Capture your face
4. Click "Sign In"
5. Expected result: "Verification success – Entering secure workspace."

### 4.4 Test Admin Dashboard
1. Navigate to `/admin-login`
2. Enter admin email and password
3. You should see all registered users
4. Each user shows their status (Active/Inactive/Blocked)

### 4.5 Test Real-time Blocking 🎯
**This is the CRITICAL feature:**

1. **Setup:**
   - Open **User Dashboard** in one browser window (logged in as user)
   - Open **Admin Dashboard** in another window

2. **Action:**
   - In Admin Dashboard, click "Block" on the user

3. **Expected Result:**
   - User's dashboard should **immediately** redirect to "Access Denied" page
   - Session cleared automatically
   - User cannot access system until unblocked

---

## 🔍 Step 5: Understanding the Vision Engine

### Single-Face Validation
```python
# In vision_engine.py
faces = DeepFace.extract_faces(
    img_path=img,
    detector_backend="retinaface",
    anti_spoofing=True
)

if len(faces) > 1:
    return error("Multiple faces detected. Only one person allowed.")
```

### Anti-Spoofing Check
```python
is_real = face_data.get("is_real", False)

if not is_real:
    return error("Anti-spoofing failed. Live presence required.")
```

### Face Matching
```python
similarity = cosine_similarity(live_embedding, stored_embedding)

if similarity >= 0.6:  # Configurable threshold
    return "Verification success"
```

---

## 🔐 Security Features

### Backend Security
- ✅ JWT token authentication
- ✅ Password hashing with bcrypt
- ✅ Rate limiting (recommended to add)
- ✅ CORS protection
- ✅ SQL injection protection (Supabase RLS)

### Facial Recognition Security
- ✅ Single-face enforcement
- ✅ Passive anti-spoofing (DeepFace built-in)
- ✅ Liveness detection indicators
- ✅ Embedding-only storage (no raw images)
- ✅ Similarity threshold validation

### Real-time Security
- ✅ Instant session termination on block
- ✅ Supabase Realtime subscriptions
- ✅ Client-side session validation
- ✅ Automatic logout on block event

---

## 📊 Login Log Statuses

| Status | Meaning |
|--------|---------|
| `success` | Face verification passed all checks |
| `fail` | Face verification failed (low similarity) |
| `spoofing_attempt` | Anti-spoofing check failed |
| `multiple_faces` | More than one face detected |

---

## 🐛 Troubleshooting

### Backend Issues

**DeepFace model download fails:**
```bash
# Ensure internet connection and sufficient disk space
# Models will download automatically on first use
# Required: ~200MB for FaceNet + RetinaFace
```

**ImportError: No module named 'cv2':**
```bash
pip install opencv-python
```

**Supabase connection error:**
- Verify `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `.env`
- Check if Supabase project is active

### Frontend Issues

**Camera not working:**
- Ensure HTTPS or localhost (required for getUserMedia)
- Check browser permissions for camera access
- Try different browser (Chrome/Edge recommended)

**Real-time blocking not working:**
1. Verify Supabase Realtime is enabled
2. Check browser console for WebSocket errors
3. Ensure `users` table has replication enabled
4. Verify user_id matches in localStorage and database

**API connection error:**
- Ensure backend is running on port 8000
- Check `VITE_API_URL` in frontend `.env`
- Verify CORS settings in backend

---

## 🎯 Production Deployment

### Backend
1. Use production-grade ASGI server:
   ```bash
   pip install gunicorn
   gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```
2. Set strong `JWT_SECRET`
3. Use environment variables (not `.env` file)
4. Enable HTTPS
5. Add rate limiting
6. Set up monitoring

### Frontend
```bash
npm run build
# Serve the 'dist' folder with nginx or similar
```

### Supabase
1. Use Row Level Security (RLS) - already configured
2. Enable email verification for admins
3. Set up database backups
4. Monitor API usage

---

## 📧 Support

For issues or questions:
1. Check the troubleshooting section
2. Review API logs in backend console
3. Check browser console for frontend errors
4. Verify Supabase dashboard for database issues

---

## 🎉 Success Indicators

- ✅ Users can register with face scan
- ✅ Login rejects multiple faces
- ✅ Anti-spoofing blocks fake faces
- ✅ Admin can view all users
- ✅ Blocking a user immediately terminates their session
- ✅ Login history shows detailed metrics
- ✅ Real-time updates work instantly

**Your SecureVision system is now operational!** 🚀
