# SecureVision - Complete Project Documentation

> **Last Updated:** [2026-03-11]  
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

**SecureVision** is an enterprise-grade facial recognition authentication and **real-time surveillance** system designed for secure kiosk environments. It uses AI-powered face detection and matching to authenticate users, track attendance, and detect unauthorized access.

### Key Features
- 🔐 Facial recognition login (no passwords for users)
- 🎭 Anti-spoofing protection (optional, requires PyTorch)
- 👤 Single face enforcement
- 📊 Admin dashboard for user management
- 🖥️ Locked kiosk mode for public terminals
- 📸 Image enhancement for better webcam accuracy
- 📹 Real-time surveillance with motion detection [2026-03-11]
- 📋 Automated attendance tracking [2026-03-11]
- 🚨 Threat clip recording & cloud upload [2026-03-11]

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
│   Tables: users, admins, login_logs,                            │
│           attendance, surveillance_logs, local_recordings        │
│   Storage: Face embeddings (JSONB), threat-clips, security-audits│
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
├── main.py                  # FastAPI app entry point (v2.0.0)
├── config.py                # Settings (env variables)
├── auth.py                  # JWT & password utilities
├── vision_engine.py         # Face recognition engine
├── surveillance_engine.py   # [2026-03-11] Dual-thread surveillance
├── supabase_client.py       # Database client
├── models.py                # Pydantic models
├── migrations/
│   └── 001_surveillance_schema.sql
└── routes/
    ├── auth.py              # /api/auth/*
    ├── user.py              # /api/user/*
    ├── admin.py             # /api/admin/*
    └── surveillance.py      # [2026-03-11] /api/surveillance/*
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
# DeepFace
DEEPFACE_MODEL = "Facenet"           # 128-d embeddings
DEEPFACE_DETECTOR = "retinaface"     # Best accuracy
FACE_MATCH_THRESHOLD = 0.4           # Stricter (was 0.6)
MIN_FACE_SIZE = 80                   # Minimum pixels

# Surveillance [2026-03-11]
RECORDINGS_DIR = "C:/SecureVision/Recordings"
SURVEILLANCE_FPS = 30
MOTION_THRESHOLD = 25.0
ATTENDANCE_DEBOUNCE_SECONDS = 300    # 5 min per user
RECORDING_CHUNK_MINUTES = 5
FFMPEG_PATH = "ffmpeg"
```

---

## Frontend Details

### File Structure
```
frontend/src/
├── main.jsx             # App entry point
├── App.jsx              # Router setup
├── index.css            # Global styles (Tailwind)
├── lib/
│   ├── api.js           # Axios instance
│   └── supabase.js      # Supabase client (if needed)
├── components/
│   ├── WebcamCapture.jsx       # Camera component
│   ├── AnimatedBackground.jsx
│   ├── StatCard.jsx
│   ├── SurveillanceTab.jsx     # [2026-03-11] Live feed + alerts + recordings
│   └── AttendanceTab.jsx       # [2026-03-11] Date picker + attendance grid
└── pages/
    ├── Home.jsx
    ├── Login.jsx            # Face login
    ├── Register.jsx         # Face registration
    ├── Dashboard.jsx        # User dashboard
    ├── AdminLogin.jsx       # Admin password login
    └── AdminDashboard.jsx   # [2026-03-11] Sidebar layout + 3 tabs
```

### Key Components

**WebcamCapture.jsx** [2026-02-01]
- Uses `getUserMedia` API
- Validates video dimensions before capture
- Outputs JPEG format (no alpha channel)
- Exposed via `forwardRef` for parent control

**AdminDashboard.jsx** [2026-03-11] — Redesigned
- Sidebar layout with collapsible navigation
- **Surveillance tab**: MJPEG live feed, WebSocket alerts panel, recording duration slider (1min–24hr), event logs table, local recordings table with Open Location
- **Attendance tab**: Date picker, user search, summary cards (unique users, total detections), user summary grid, detailed log table
- **User Management tab**: Original block/unblock functionality preserved with optimistic updates, toast notifications, stat cards

**LockScreen.jsx** [2026-03-11]
- Full-screen overlay with live camera preview
- Face-unlock button with scanning animation
- Status transitions: locked → verifying → success/failed
- Failed attempt counter (snapshots uploaded to security-audits)
- Auto-invoked by UserDashboard after 5 min inactivity

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

### File Explorer Bridge [2026-03-11]
- Kiosk polls `GET /api/surveillance/explorer-commands` every 2s
- Opens Windows File Explorer when admin clicks "Open Location" on recordings

### Auto-Lock Integration [2026-03-11]
- Inactivity detection handled in `UserDashboard.jsx` (frontend, 5 min timer)
- `LockScreen.jsx` rendered as z-9999 overlay
- Unlock calls `POST /api/auth/verify-unlock`

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

### Table: `attendance` [2026-03-11]
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | FK → users |
| detected_time | TIMESTAMPTZ | When face was detected |
| date | DATE | Date (for grouping) |
| status | TEXT | Default 'PRESENT' |

### Table: `surveillance_logs` [2026-03-11]
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| event_type | TEXT | AUTHORIZED/UNAUTHORIZED/SPOOF/MOTION |
| timestamp | TIMESTAMPTZ | Event time |
| snapshot_url | TEXT | Snapshot image URL |
| video_clip_url | TEXT | Threat clip URL |
| details | JSONB | Additional data |

### Table: `local_recordings` [2026-03-11]
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| start_time | TIMESTAMPTZ | Recording start |
| end_time | TIMESTAMPTZ | Recording end |
| local_path | TEXT | Windows file path |
| trigger_type | TEXT | CONTINUOUS/MOTION_ONLY |

### Storage Buckets [2026-03-11]
| Bucket | Purpose | Access |
|--------|---------|--------|
| `threat-clips` | 15s video clips of threats | Private (service role) |
| `security-audits` | Failed unlock frames | Private (service role) |

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
| POST | `/api/auth/verify-unlock` | Face-unlock for session resume [2026-03-11] |

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

### Surveillance [2026-03-11]
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/surveillance/start` | Start surveillance engine |
| POST | `/api/surveillance/stop` | Stop surveillance engine |
| GET | `/api/surveillance/status` | Engine status |
| GET | `/api/surveillance/feed` | MJPEG live video stream |
| WS | `/api/surveillance/ws/alerts` | WebSocket real-time alerts |
| POST | `/api/surveillance/recording/duration` | Set chunk duration |
| GET | `/api/surveillance/recordings` | List local recording files |
| GET | `/api/surveillance/logs` | Get surveillance event logs |
| GET | `/api/surveillance/attendance` | Get attendance records |
| POST | `/api/surveillance/refresh-embeddings` | Refresh face cache |
| POST | `/api/surveillance/open-explorer` | Queue file explorer open |
| GET | `/api/surveillance/explorer-commands` | Kiosk polls for commands |

---

## Running the Project

### Prerequisites
- Python 3.9+
- Node.js 18+
- FFmpeg (system-installed, in PATH) [2026-03-11]
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

### [2026-03-11] — Phase 4: Auto-Lock & Session Resume
- ✅ Added `/api/auth/verify-unlock` endpoint (face verification for session resume)
- ✅ Created `LockScreen.jsx` (camera preview, scanning animation, face-unlock, fail counter)
- ✅ Added inactivity auto-lock to `UserDashboard.jsx` (5 min timer, mouse/keyboard/touch tracking)
- ✅ Failed unlock → snapshot uploaded to `security-audits` bucket + logged to `surveillance_logs`
- ✅ Added file explorer bridge to `main_pyqt5.py` (polls backend for open commands)

### [2026-03-11] — Phase 3: Admin Dashboard Redesign
- ✅ Rewrote `AdminDashboard.jsx` as sidebar layout with 3 tabs
- ✅ Created `SurveillanceTab.jsx` — live MJPEG feed, WebSocket alerts, recording slider, event logs, recordings table with Open Location
- ✅ Created `AttendanceTab.jsx` — date picker, search, user summary cards, detailed attendance grid
- ✅ Preserved all existing user management (block/unblock, optimistic updates, toast)
- ✅ Collapsible sidebar with admin profile + logout

### [2026-03-11] — Phase 2: Dual-Thread Surveillance Engine
- ✅ Created `surveillance_engine.py` with dual-thread architecture
  - Thread 1 (Recorder): Continuous .mp4 chunks to `C:/SecureVision/Recordings/`
  - Thread 2 (AI Analyst): Motion detection + face matching every 500ms
  - MJPEG streaming for live feed
  - FFmpeg 15-second threat clip extraction
  - Thread-safe FrameBuffer for frame sharing
- ✅ Created `routes/surveillance.py` (12 endpoints + WebSocket)
- ✅ Updated `main.py` to v2.0.0 with surveillance routes
- ✅ Verified compatibility with existing `vision_engine.py` methods

### [2026-03-11] — Phase 1: Surveillance Database Schema
- ✅ Created SQL migration `001_surveillance_schema.sql`
- ✅ Added 3 new tables: `attendance`, `surveillance_logs`, `local_recordings`
- ✅ Added 2 storage buckets: `threat-clips`, `security-audits` (private)
- ✅ Added RLS policies for service-role access
- ✅ Updated `config.py` with surveillance settings
- ✅ Updated `models.py` with 6 new Pydantic models
- ✅ Updated `supabase_client.py` with CRUD for all new tables + storage upload
- ✅ Added `get_all_user_embeddings()` for surveillance face matching

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