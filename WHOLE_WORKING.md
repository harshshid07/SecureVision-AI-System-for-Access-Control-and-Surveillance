# SecureVision - Complete Project Documentation

> **Last Updated:** [2026-02-03]  
> This document is actively maintained and updated with every major change.

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Component Integration](#component-integration)
5. [Backend Details](#backend-details)
6. [Frontend Details](#frontend-details)
7. [Kiosk Mode](#kiosk-mode)
8. [Database Schema](#database-schema)
9. [Authentication Flow](#authentication-flow)
10. [API Endpoints](#api-endpoints)
11. [Running the Project](#running-the-project)
12. [Changelog](#changelog)

---

## Project Overview

**SecureVision** is an enterprise-grade facial recognition authentication system designed for secure kiosk environments. It uses AI-powered face detection and matching to authenticate users without passwords.

### Key Features
- 🔐 Facial recognition login (no passwords for users)
- 🎭 Anti-spoofing protection (optional, requires PyTorch)
- 👤 Single face enforcement
- 📊 Admin dashboard for user management
- 🖥️ Locked kiosk mode for public terminals
- 📸 Image enhancement for better webcam accuracy

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        KIOSK (PyQt5)                            │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Embedded WebView (loads Frontend)                      │   │
│   │  - Fullscreen, frameless                                │   │
│   │  - Blocks Alt+Tab, Alt+F4                               │   │
│   │  - Camera permissions auto-granted                      │   │
│   │  - Win+PrintScreen allowed for screenshots              │   │
│   │  - Exit: Ctrl+K only                                    │   │
│   └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React + Vite)                    │
│   Port: 5173                                                    │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  Pages:                                                  │  │
│   │  - / (Home)                                              │  │
│   │  - /login (Face Login)                                   │  │
│   │  - /register (Face Registration)                         │  │
│   │  - /dashboard (User Dashboard)                           │  │
│   │  - /admin-login (Admin Password Login)                   │  │
│   │  - /admin-dashboard (User Management)                    │  │
│   └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP/REST API
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (FastAPI + Python)                 │
│   Port: 8000                                                    │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  Components:                                             │  │
│   │  - vision_engine.py (DeepFace + Image Enhancement)       │  │
│   │  - auth.py (JWT tokens, bcrypt)                          │  │
│   │  - supabase_client.py (Database operations)              │  │
│   │  - routes/ (API endpoints)                               │  │
│   └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE (Supabase/PostgreSQL)             │
│   Tables: users, admins, login_logs                             │
│   Storage: Face embeddings as JSONB (128-d vectors)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Kiosk** | Python 3.x, PyQt5, PyQtWebEngine |
| **Frontend** | React 18, Vite, React Router, Axios |
| **Backend** | Python 3.x, FastAPI, Uvicorn |
| **AI/Vision** | DeepFace, FaceNet model, RetinaFace detector, OpenCV |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | JWT (python-jose), bcrypt |

---

## Component Integration

### How Components Connect

1. **Kiosk → Frontend**
   - Kiosk embeds Frontend via `QWebEngineView`
   - Loads `http://localhost:5173`
   - Auto-grants camera permissions
   - Persists cookies/localStorage

2. **Frontend → Backend**
   - Axios instance configured in `frontend/src/lib/api.js`
   - Base URL: `http://localhost:8000`
   - JWT token stored in `localStorage`
   - Token attached via Authorization header

3. **Backend → Database**
   - Supabase client in `backend/supabase_client.py`
   - Uses service key for admin operations
   - Face embeddings stored as JSONB arrays

4. **Backend → AI Engine**
   - `vision_engine.py` handles all face operations
   - Uses DeepFace with FaceNet model
   - Image enhancement pipeline before processing

---

## Backend Details

### File Structure
```
backend/
├── main.py              # FastAPI app entry point
├── config.py            # Settings (env variables)
├── auth.py              # JWT & password utilities
├── vision_engine.py     # Face recognition engine
├── supabase_client.py   # Database client
├── models.py            # Pydantic models
└── routes/
    ├── auth.py          # /api/auth/* endpoints
    ├── user.py          # /api/user/* endpoints
    └── admin.py         # /api/admin/* endpoints
```

### Vision Engine Features [2026-02-03]
- **Image Enhancement Pipeline:**
  - CLAHE (Contrast Limited Adaptive Histogram Equalization)
  - Sharpening kernel
  - Brightness adjustment (auto over/underexposure fix)
  - Bilateral filtering (noise reduction)
- **Face Matching:**
  - Threshold: 0.4 (stricter for security)
  - Min face size: 80x80 pixels
  - Cosine similarity for matching
- **Security:**
  - Single face enforcement
  - Anti-spoofing (optional, requires PyTorch)

### Config Settings
```python
DEEPFACE_MODEL = "Facenet"           # 128-d embeddings
DEEPFACE_DETECTOR = "retinaface"     # Best accuracy
FACE_MATCH_THRESHOLD = 0.4           # Stricter (was 0.6)
MIN_FACE_SIZE = 80                   # Minimum pixels
```

---

## Frontend Details

### File Structure
```
frontend/src/
├── main.jsx             # App entry point
├── App.jsx              # Router setup
├── index.css            # Global styles
├── lib/
│   ├── api.js           # Axios instance
│   └── supabase.js      # Supabase client (if needed)
├── components/
│   ├── WebcamCapture.jsx    # Camera component
│   ├── AnimatedBackground.jsx
│   └── StatCard.jsx
└── pages/
    ├── Home.jsx
    ├── Login.jsx            # Face login
    ├── Register.jsx         # Face registration
    ├── Dashboard.jsx        # User dashboard
    ├── AdminLogin.jsx       # Admin password login
    └── AdminDashboard.jsx   # User management
```

### Key Components

**WebcamCapture.jsx** [2026-02-01]
- Uses `getUserMedia` API
- Validates video dimensions before capture
- Outputs JPEG format (no alpha channel)
- Exposed via `forwardRef` for parent control

**AdminDashboard.jsx** [2026-02-03]
- Optimistic updates for block/unblock
- Toast notifications (no blocking alerts)
- Loading spinner on buttons
- Real-time refresh every 10 seconds

---

## Kiosk Mode

### File: `kiosk/main_pyqt5.py`

### Security Features
- ✅ Fullscreen, frameless window
- ✅ Always stays on top
- ✅ Focus-stealing (blocks Alt+Tab)
- ✅ Alt+F4 blocked
- ✅ Windows key blocked (alone)
- ✅ Exit only via Ctrl+K

### Allowed Actions
- ✅ Ctrl+C/V/X/A (copy/paste/cut/select)
- ✅ Win+PrintScreen (screenshot to Pictures folder) [2026-02-03]

### Camera Permissions
- Auto-granted via `featurePermissionRequested` signal
- Profile persisted in `kiosk/secure_profile/`

---

## Database Schema

### Table: `users`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| username | TEXT | Unique username |
| email | TEXT | Unique email |
| face_embedding | JSONB | 128-d vector array |
| is_blocked | BOOLEAN | Block status |
| last_login | TIMESTAMP | Last login time |
| created_at | TIMESTAMP | Registration date |

### Table: `admins`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | TEXT | Admin email |
| password_hash | TEXT | bcrypt hash |

### Table: `login_logs`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to users |
| status | TEXT | success/fail/spoofing_attempt/multiple_faces |
| similarity_score | FLOAT | Match score |
| is_real | BOOLEAN | Anti-spoofing result |
| face_count | INT | Faces detected |
| ip_address | TEXT | Client IP |
| error_message | TEXT | Failure reason |
| timestamp | TIMESTAMP | Log time |

---

## Authentication Flow

### User Registration
```
1. User enters username + email
2. Camera captures face image
3. Frontend sends to POST /api/auth/register
4. Backend:
   - Validates no duplicate username/email
   - Extracts face embedding (with enhancement)
   - Checks single face + quality
   - Stores embedding in database
   - Returns JWT token
5. User logged in
```

### User Login
```
1. User enters username
2. Camera captures live face
3. Frontend sends to POST /api/auth/login
4. Backend:
   - Fetches stored embedding for username
   - Extracts live face embedding
   - Compares using cosine similarity
   - Checks threshold (0.4 distance)
   - Returns JWT token if match
5. User logged in
```

### Admin Login
```
1. Admin enters email + password
2. Frontend sends to POST /api/auth/admin-login
3. Backend verifies password with bcrypt
4. Returns JWT token with role="admin"
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register with face |
| POST | `/api/auth/login` | Login with face |
| POST | `/api/auth/admin-login` | Admin password login |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/me` | Get current user info |
| GET | `/api/user/login-history` | Get login history |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users |
| POST | `/api/admin/block-user` | Block/unblock user |

---

## Running the Project

### Prerequisites
- Python 3.9+
- Node.js 18+
- Supabase account with database setup

### Step 1: Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
python main.py
# Runs on http://localhost:8000
```

### Step 2: Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### Step 3: Kiosk (Optional)
```bash
cd kiosk
python -m venv venv
venv\Scripts\activate
pip install PyQt5 PyQtWebEngine
python main_pyqt5.py
# Loads frontend in locked kiosk mode
```

---

## Changelog

### [2026-02-03]
- ✅ Integrated old project's image enhancement (CLAHE, sharpening, brightness, bilateral filter)
- ✅ Updated face match threshold to 0.4 (was 0.6)
- ✅ Added MIN_FACE_SIZE = 80 config
- ✅ Fixed admin block/unblock stuttering (optimistic updates + toast notifications)
- ✅ Added Win+PrintScreen screenshot support in kiosk
- ✅ Removed Snipping Tool shortcut from kiosk

### [2026-02-01]
- ✅ Fixed PyQt5 camera permissions (signal connection)
- ✅ Updated WebcamCapture to validate video dimensions
- ✅ Changed capture format to JPEG (no alpha channel issues)
- ✅ Added RGBA to RGB conversion in backend

### [2026-01-30]
- ✅ Initial project setup
- ✅ Backend with FastAPI + DeepFace
- ✅ Frontend with React + Vite
- ✅ Kiosk with PyQt5

---

> **Note:** This document will be updated with every major change to the project.

Major changes needed:
1. @xyz.py analyze this file and i need the implementations of using various sites like this. After a user logins, It will load their Profile basically we call it Home, in the top centre, and have 2 options dashboard and access my apps. the dashboard we already have, we need access my apps page to have this xyz.py implementation where firstly we have 