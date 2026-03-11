# SecureVision Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### 1. Supabase Setup
```sql
-- Copy and run database/schema.sql in Supabase SQL Editor
-- Enable Realtime for 'users' table in Database > Replication
-- Create admin user (replace with your bcrypt hash):
INSERT INTO admins (email, password_hash) 
VALUES ('admin@test.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY3vJVzZ1ZUn5Xm');
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Create .env file:
cp .env.example .env
# Edit .env with your Supabase credentials

python main.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install

# Create .env file:
cp .env.example .env
# Edit .env with your Supabase credentials

npm run dev
```

### 4. Test the System
1. Visit `http://localhost:5173`
2. Register a new user with face scan
3. Login with facial recognition
4. Test admin panel at `/admin-login`
5. Block a user and watch real-time session kill! 🎯

---

## 🔑 Key Features

- ✅ Single-face enforcement (no multi-person login)
- ✅ Passive anti-spoofing (detects fake faces)
- ✅ Real-time blocking (instant session termination)
- ✅ Detailed security logs

---

## 📚 Documentation

- Full setup: [README.md](file:///e:/SECURE%20VISION%20PROJECT/securevision/README.md)
- Architecture walkthrough: [walkthrough.md](file:///C:/Users/HARSH%20SHID/.gemini/antigravity/brain/7fb6f61d-9e5f-4285-93bb-6190f4c3440b/walkthrough.md)

---

## 🆘 Common Issues

**Camera not working?**
- Allow camera permissions in browser
- Use Chrome/Edge (best compatibility)

**Real-time blocking not working?**
- Enable Realtime in Supabase: Database > Replication > users table

**Backend errors?**
- First run downloads DeepFace models (~200MB)
- Check .env configuration
- Ensure Supabase credentials are correct

---

## 🎉 Success Checklist

- [ ] User can register with face scan
- [ ] Login rejects multiple faces
- [ ] Anti-spoofing blocks photo/video
- [ ] Admin can view all users
- [ ] Blocking user terminates session instantly
- [ ] Login history shows detailed metrics

**All checked? Your SecureVision is ready! 🚀**
