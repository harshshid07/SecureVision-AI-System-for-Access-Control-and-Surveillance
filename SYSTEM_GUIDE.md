# SecureVision - Complete System Guide

**A complete facial recognition security system with kiosk mode**

---

## 🚀 Quick Start - Full System

### One-Click Launch (Recommended)

Double-click: **`START_SECUREVISION.bat`** at the root directory

This will automatically:
1. ✅ Start FastAPI backend on `http://localhost:8000`
2. ✅ Start React frontend on `http://localhost:5173`
3. ✅ Launch secure kiosk in full-screen mode

**To Exit Kiosk**: Press `Ctrl+K`

---

## 📋 System Components

### 1. Backend (FastAPI + Supabase)
- **Location**: `backend/`
- **Tech**: Python, FastAPI, Supabase, PostgreSQL
- **URL**: http://localhost:8000
- **Features**:
  - Face recognition authentication
  - User & admin management
  - Real-time session monitoring
  - Anti-spoofing detection
  - Login history tracking

### 2. Frontend (React + Vite)
- **Location**: `frontend/`
- **Tech**: React, TailwindCSS, Vite
- **URL**: http://localhost:5173
- **Features**:
  - Beautiful glassmorphism UI
  - Login/Register with face scan
  - User dashboard with stats
  - Admin dashboard for user management
  - Real-time blocking (kill-switch)

### 3. Kiosk (PyQt5)
- **Location**: `kiosk/`
- **Tech**: Python, PyQt5, PyQtWebEngine
- **Features**:
  - Full-screen, frameless browser
  - Focus-stealing (blocks Alt+Tab)
  - Close prevention (blocks Alt+F4)
  - Ctrl+K exit only
  - Persistent browser sessions
  - Face ID integration ready

---

## 🔧 Manual Setup (First Time)

### Prerequisites
- Python 3.8+ installed
- Node.js 16+ installed
- Git installed

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate venv
.\venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your Supabase credentials
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env if needed
```

### 3. Kiosk Setup

```bash
cd kiosk

# Create virtual environment
python -m venv venv

# Activate venv
.\venv\Scripts\activate

# Install PyQt5
pip install PyQt5==5.15.10 PyQtWebEngine==5.15.6
```

---

## 🎮 Running the System

### Option 1: Complete System (All-in-One) ⭐

```bash
# From project root
START_SECUREVISION.bat
```

### Option 2: Individual Components

**Backend:**
```bash
cd backend
venv\Scripts\python.exe main.py
```

**Frontend:**
```bash
cd frontend
npm run dev
```

**Kiosk:**
```bash
cd kiosk
venv\Scripts\python.exe main_pyqt5.py
```

---

## 🔐 Default Credentials

### Admin Account
After running `create_admin.py`:
- **Email**: `harshadmin1@gmail.com`
- **Password**: `Harsh@1234`
- **Login URL**: http://localhost:5173/admin-login

### User Account
Create via registration:
- **URL**: http://localhost:5173/register
- Scan your face and enter username/email

---

## 🎯 Usage Flow

### Standard User Flow
1. Launch kiosk → Opens login page
2. Enter username + scan face
3. System verifies face → Login success
4. User dashboard displays
5. User can view login history
6. Ctrl+K to exit (or admin blocks user)

### Admin Flow
1. Open http://localhost:5173/admin-login
2. Login with admin credentials
3. View all users and statistics
4. Block/unblock users
5. Blocked users are instantly kicked out (real-time)

### Kiosk Deployment Flow
1. Set up kiosk computer
2. Run `START_SECUREVISION.bat` on startup
3. Kiosk auto-launches in full-screen
4. Users authenticate with face
5. Admin monitors remotely
6. Admin can block users in real-time

---

## 🗂️ Project Structure

```
securevision/
├── backend/              # FastAPI backend
│   ├── venv/            # Virtual environment
│   ├── main.py          # Main server
│   ├── auth.py          # JWT & password hashing
│   ├── database.py      # Database operations
│   ├── routes/          # API routes
│   ├── .env             # Environment config
│   └── requirements.txt # Python dependencies
│
├── frontend/            # React frontend
│   ├── src/
│   │   ├── pages/      # Login, Dashboard, etc.
│   │   ├── components/ # Reusable components
│   │   └── lib/        # API, Supabase client
│   ├── package.json    # Node dependencies
│   └── .env            # Frontend config
│
├── kiosk/               # PyQt5 kiosk
│   ├── venv/           # Virtual environment
│   ├── main_pyqt5.py   # Kiosk application
│   ├── secure_profile/ # Browser session storage
│   └── launch_kiosk.bat # Launcher script
│
└── START_SECUREVISION.bat  # Complete system launcher
```

---

## 🔌 Kiosk Face ID Integration

Two integration points in `kiosk/main_pyqt5.py`:

### 1. Startup Authentication (Line 35-39)
Require face scan BEFORE loading kiosk:

```python
def __init__(self, start_url="http://localhost:5173"):
    super().__init__()
    
    # Add your face authentication here
    if not authenticate_user_face():
        sys.exit("Face authentication failed")
    
    # Continue loading kiosk...
```

### 2. Exit Re-authentication (Line 177-182)
Require face scan BEFORE allowing exit:

```python
def safe_exit(self):
    # Require face re-authentication
    if not authenticate_user_face():
        print("Exit denied - Face authentication required")
        return
    
    # Allow exit
    QApplication.quit()
```

---

## 📊 Features Checklist

### Backend ✅
- [x] Face recognition with DeepFace
- [x] Anti-spoofing detection
- [x] JWT authentication
- [x] Supabase integration
- [x] User CRUD operations
- [x] Admin CRUD operations
- [x] Login history tracking
- [x] Real-time user blocking

### Frontend ✅
- [x] Glassmorphism design
- [x] Animated backgrounds
- [x] Login with face scan
- [x] Register with face scan
- [x] User dashboard with stats
- [x] Admin dashboard
- [x] Real-time Supabase subscription
- [x] Responsive design

### Kiosk ✅
- [x] Full-screen mode
- [x] Frameless window
- [x] Always on top
- [x] Focus stealing
- [x] Close prevention
- [x] Ctrl+K exit
- [x] Persistent sessions
- [x] Face ID integration points

---

## 🛠️ Troubleshooting

### Backend won't start
```bash
cd backend
venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Frontend won't start
```bash
cd frontend
npm install
npm run dev
```

### Kiosk won't launch
```bash
cd kiosk
venv\Scripts\python.exe main_pyqt5.py
```

### Face recognition not working
- Check camera permissions
- Verify Supabase connection
- Check backend logs

### Can't exit kiosk
- Press `Ctrl+K` (not Ctrl+C)
- If stuck, use Task Manager (Ctrl+Shift+Esc)

---

## 🎨 Customization

### Change kiosk start page
Edit `kiosk/main_pyqt5.py` line 207:
```python
START_URL = "http://localhost:5173/login"  # Direct to login
```

### Change theme colors
Edit `frontend/src/index.css` variables:
```css
--primary-blue: #00d4ff;
--secondary-blue: #0099cc;
```

### Adjust focus stealing frequency
Edit `kiosk/main_pyqt5.py` line 105:
```python
self.focus_timer.start(100)  # milliseconds
```

---

## 📝 Environment Variables

### Backend `.env`
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
JWT_SECRET=your_secret_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend `.env`
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:8000
```

---

## 🚀 Production Deployment

### Backend (Render/Railway)
```bash
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker
```

### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy 'dist' folder
```

### Kiosk (Windows Kiosk Mode)
1. Use Windows Assigned Access
2. Set to run `START_SECUREVISION.bat` on startup
3. Combined with Windows Group Policy for security

---

## 📄 License

MIT License - Part of SecureVision Project

---

## 🤝 Support

For issues or questions:
1. Check `TROUBLESHOOTING.md` files
2. Review backend/frontend logs
3. Test components individually
4. Check Supabase console for database issues

---

**Ready to launch? Run `START_SECUREVISION.bat` and enjoy! 🎉**
