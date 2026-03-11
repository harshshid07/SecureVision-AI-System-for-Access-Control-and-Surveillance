# SecureVision - Complete Facial Recognition Security System

A production-ready facial recognition authentication system with backend, frontend, and secure kiosk mode.

---

## 🚀 Quick Start

### **One-Command Launch**

From the project root:

```bash
START_SECUREVISION.bat
```

This starts:
- ✅ Backend (FastAPI) on http://localhost:8000
- ✅ Frontend (React) on http://localhost:5173  
- ✅ Kiosk (PyQt5) in full-screen

**Exit Kiosk**: Press `Ctrl+K`

---

## 📦 What's Included

### Backend
- FastAPI REST API
- Face recognition (DeepFace)
- Anti-spoofing detection
- Supabase/PostgreSQL database
- JWT authentication
- Real-time user blocking

### Frontend
- React + Vite
- Glassmorphism UI design
- Face scan login/registration
- User & admin dashboards
- Real-time updates

### Kiosk
- PyQt5 secure browser
- Full-screen, frameless
- Focus-stealing (blocks Alt+Tab)
- Ctrl+K exit only
- Persistent sessions

---

## 📚 Documentation

- **[SYSTEM_GUIDE.md](./SYSTEM_GUIDE.md)** - Complete setup & usage
- **[backend/INSTALL.md](./backend/INSTALL.md)** - Backend setup
- **[frontend/README.md](./frontend/README.md)** - Frontend setup
- **[kiosk/README.md](./kiosk/README.md)** - Kiosk documentation
- **[kiosk/QUICKSTART.md](./kiosk/QUICKSTART.md)** - Kiosk quick reference

---

## 🔧 First-Time Setup

### 1. Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Configure Supabase credentials
```

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env
```

### 3. Kiosk
```bash
cd kiosk
python -m venv venv
venv\Scripts\activate
pip install PyQt5==5.15.10 PyQtWebEngine==5.15.6
```

### 4. Launch
```bash
# From project root
START_SECUREVISION.bat
```

---

## 🎯 Features

### ✅ User Features
- Passwordless face authentication
- Real-time login history
- Session tracking
- Personal dashboard

### ✅ Admin Features
- User management (block/unblock)
- System statistics
- Login monitoring
- Real-time user control

### ✅ Security Features
- Multi-face detection
- Anti-spoofing (prevents photos/videos)
- Real-time session termination
- Secure kiosk lockdown
- JWT token authentication

---

## 🏗️ Architecture

```
┌─────────────────┐
│   Kiosk (PyQt5) │ ← Full-screen browser
│  localhost:5173 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Frontend (React)│ ← UI Layer
│    Port 5173    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│Backend (FastAPI)│ ← API + Face Recognition
│    Port 8000    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│     Supabase    │ ← Database + Real-time
│   (PostgreSQL)  │
└─────────────────┘
```

---

## 🔐 Default Credentials

**Admin Login**: http://localhost:5173/admin-login
- Email: `harshadmin1@gmail.com`
- Password: `Harsh@1234`

**User Registration**: http://localhost:5173/register
- Scan face + enter username/email

---

## 📁 Project Structure

```
securevision/
├── backend/              # FastAPI backend
├── frontend/             # React frontend  
├── kiosk/                # PyQt5 kiosk
├── START_SECUREVISION.bat  # System launcher
├── SYSTEM_GUIDE.md       # Complete guide
└── README.md             # This file
```

---

## 🛠️ Tech Stack

**Backend**: Python, FastAPI, DeepFace, OpenCV, Supabase, JWT

**Frontend**: React, Vite, TailwindCSS, Supabase Client

**Kiosk**: Python, PyQt5, PyQtWebEngine

**Database**: PostgreSQL (via Supabase)

---

## 🎨 Screenshots

The system features:
- Animated gradient backgrounds
- Glassmorphism effects
- Floating orb animations
- Real-time face detection
- Modern dashboard UI

---

## 🚀 Deployment

### Backend
Deploy to Render, Railway, or similar:
```bash
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker
```

### Frontend
Deploy to Vercel, Netlify:
```bash
npm run build
# Deploy dist/ folder
```

### Kiosk
- Windows Kiosk Mode
- Auto-start on boot
- Group Policy security

---

## 📝 License

MIT License

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

---

## 🐛 Troubleshooting

See [SYSTEM_GUIDE.md](./SYSTEM_GUIDE.md#troubleshooting) for common issues and solutions.

---

**Built with ❤️ for SecureVision**

Ready to launch? Run `START_SECUREVISION.bat`! 🎉
