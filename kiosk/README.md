# SecureVision Safe Kiosk Mode

A secure, full-screen kiosk browser for SecureVision with focus-stealing and persistent sessions.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd kiosk
pip install -r requirements.txt
```

Or install directly:

```bash
pip install PyQt6==6.6.1 PyQt6-WebEngine==6.6.0
```

### 2. Run the Kiosk

```bash
python main.py
```

The kiosk will:
- Launch in full-screen mode
- Load `http://localhost:5173` (your SecureVision React app)
- Block all escape attempts (Alt+Tab, Alt+F4, etc.)
- Save browser sessions to `secure_profile/` directory

### 3. Exit the Kiosk

**Press `Ctrl+K`** - This is the ONLY way to exit!

---

## 🔒 Security Features

### Window Behavior
✅ **Full-Screen** - Launches immediately in full-screen mode  
✅ **Frameless** - No title bar, minimize, or close buttons  
✅ **Always On Top** - Cannot be covered by other windows  
✅ **Application-Level** - NO explorer.exe killing or registry modifications

### Blocking Mechanisms
✅ **Alt+F4 Blocked** - `closeEvent()` ignores all close requests  
✅ **Alt+Tab Blocked** - `focusOutEvent()` + timer steals focus back  
✅ **Windows Key Blocked** - Key press handler blocks meta keys  
✅ **Focus Monitoring** - Checks every 100ms and auto-raises window

### Exit Control
✅ **Ctrl+K Only** - Single authorized exit shortcut  
✅ **Safe Shutdown** - Properly closes browser and cleans up resources

### Browser Features
✅ **Persistent Sessions** - Cookies & login state saved to disk  
✅ **Local Storage** - Web app data persists across restarts  
✅ **Profile Storage** - Located in `secure_profile/` directory

---

## 📝 Configuration

### Change Start URL

Edit `main.py` line 207:

```python
START_URL = "http://localhost:5173"  # Your SecureVision app URL
```

Examples:
```python
START_URL = "http://localhost:5173/login"  # Direct to login page
START_URL = "https://yourdomain.com"       # Production URL
```

### Adjust Focus Monitoring Frequency

Edit `main.py` line 105:

```python
self.focus_timer.start(100)  # Check every 100ms
```

Lower values = more aggressive focus stealing (higher CPU usage)

---

## 🔌 Face ID Integration Points

The code includes **2 integration points** for your Face ID authentication:

### 1. Startup Authentication (Line 35-39)

```python
def __init__(self, start_url="http://localhost:5173"):
    super().__init__()
    
    # ===== FUTURE INTEGRATION POINT: Face ID Authentication =====
    # TODO: Call your Face ID authentication logic here
    # Example:
    # if not self.authenticate_face():
    #     sys.exit("Authentication failed")
    # =============================================================
```

**Purpose**: Require face authentication BEFORE loading the kiosk

**Implementation Example**:
```python
from your_face_module import verify_face

def __init__(self, start_url="http://localhost:5173"):
    super().__init__()
    
    # Require face authentication
    if not verify_face():
        QMessageBox.critical(None, "Access Denied", "Face authentication failed!")
        sys.exit(1)
    
    self.start_url = start_url
    # ... rest of initialization
```

### 2. Exit Re-authentication (Line 177-182)

```python
def safe_exit(self):
    """Safe exit method - only callable via Ctrl+K shortcut"""
    print("✓ Safe exit initiated via Ctrl+K")
    
    # ===== FUTURE INTEGRATION POINT: Face ID Re-authentication =====
    # TODO: Optionally require face re-authentication before exit
    # Example:
    # if not self.authenticate_face():
    #     print("⚠ Exit denied: Face authentication failed")
    #     return
    # ================================================================
```

**Purpose**: Require face re-authentication BEFORE allowing exit

**Implementation Example**:
```python
from your_face_module import verify_face

def safe_exit(self):
    print("✓ Safe exit initiated via Ctrl+K")
    
    # Require face re-authentication
    if not verify_face():
        QMessageBox.warning(self, "Exit Denied", "Face authentication required to exit")
        return
    
    # Proceed with exit
    self.focus_timer.stop()
    QApplication.quit()
```

---

## 🗂️ File Structure

```
kiosk/
├── main.py              # Main kiosk application
├── requirements.txt     # Python dependencies
├── README.md           # This file
└── secure_profile/     # Auto-created: Browser session storage
    ├── Cookies
    ├── Local Storage
    └── ...
```

---

## 🛠️ Troubleshooting

### Browser doesn't load

**Check if your SecureVision app is running:**
```bash
# In another terminal
cd ../frontend
npm run dev
```

The React dev server must be running on `http://localhost:5173`

### Focus stealing too aggressive

Increase timer interval in `main.py`:
```python
self.focus_timer.start(500)  # Check every 500ms instead of 100ms
```

### Sessions not persisting

Check that `secure_profile/` directory exists and has write permissions:
```bash
ls -la secure_profile/
```

### Can't exit with Ctrl+K

Make sure you're holding `Ctrl` and pressing `K` - not the other way around.

If stuck, you can force-close from Task Manager:
1. Press `Ctrl+Shift+Esc` (might be blocked)
2. Or restart your computer

---

## 🔐 Security Notes

### Safety Measures
- ✅ **NO** `explorer.exe` killing
- ✅ **NO** registry modifications
- ✅ **NO** system-level hooks
- ✅ Pure application-level security

### Limitations
⚠️ **Power users can escape:**
- Ctrl+Shift+Esc → Task Manager → End Task
- Physical restart
- Safe Mode boot

This is intentional! The kiosk provides **application-level security**, not **system-level lockdown**.

For production environments, combine with:
- Windows Kiosk Mode (assigned access)
- Group Policy restrictions
- Physical security measures

---

## 📚 Advanced Usage

### Running on System Startup

Create a Windows shortcut:
1. Right-click Desktop → New → Shortcut
2. Location: `C:\Python\python.exe "E:\SECURE VISION PROJECT\securevision\kiosk\main.py"`
3. Place in: `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp`

### Multiple Monitor Support

The kiosk uses the primary monitor. To specify a monitor:

```python
# In main.py, before kiosk.show()
screen = app.screens()[1]  # Second monitor
kiosk.setGeometry(screen.geometry())
kiosk.showFullScreen()
```

### Custom Exit Dialog

Add confirmation before exit:

```python
from PyQt6.QtWidgets import QMessageBox

def safe_exit(self):
    reply = QMessageBox.question(
        self,
        'Exit Kiosk',
        'Are you sure you want to exit?',
        QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
    )
    
    if reply == QMessageBox.StandardButton.Yes:
        self.focus_timer.stop()
        QApplication.quit()
```

---

## 🤝 Integration with SecureVision

### Use Case 1: Public Kiosk Terminal
1. User walks up to kiosk
2. Kiosk loads SecureVision login page
3. User logs in with face scan
4. Accesses their dashboard
5. Admin can remotely block user (Supabase real-time)
6. Kiosk automatically logs out blocked users

### Use Case 2: Secure Workstation
1. Employee arrives at work
2. Face scan required to load kiosk
3. Kiosk loads employee portal
4. Cannot Alt+Tab to other apps
5. End of shift: Ctrl+K + face re-authentication to exit

### Use Case 3: Exam/Testing Environment
1. Student face scan before exam
2. Kiosk loads exam platform
3. Cannot access other apps during exam
4. Proctor uses Ctrl+K to end exam

---

## 📄 License

Part of the SecureVision project.

---

## 🐛 Issues?

If you encounter issues, check:
1. PyQt6 and PyQt6-WebEngine versions match requirements
2. Python version is 3.8+
3. SecureVision frontend is running
4. `secure_profile/` has write permissions

For bugs, create an issue with:
- Error message
- Python version
- Operating system
- Steps to reproduce
