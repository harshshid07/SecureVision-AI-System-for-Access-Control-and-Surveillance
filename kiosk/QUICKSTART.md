# SecureVision Kiosk - Quick Reference

## ✅ Virtual Environment Setup (One-time)

```powershell
# Navigate to kiosk directory
cd "E:\SECURE VISION PROJECT\securevision\kiosk"

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install PyQt5==5.15.10 PyQtWebEngine==5.15.6
```

---

## 🚀 Running the Kiosk

### Option 1: Using Batch Script (Easiest)

Simply double-click: **`launch_kiosk.bat`**

### Option 2: Manual Command

```powershell
# Activate venv
.\venv\Scripts\Activate.ps1

# Run kiosk
python main_pyqt5.py
```

### Option 3: One-liner

```powershell
.\venv\Scripts\python.exe main_pyqt5.py
```

---

## ⌨️ Controls

- **Exit Kiosk**: Press `Ctrl+K`
- All other close attempts (Alt+F4, Alt+Tab) are blocked

---

## 🔧 Configuration

Edit `main_pyqt5.py` line 207 to change the URL:

```python
START_URL = "http://localhost:5173"  # Your SecureVision app
```

---

## 📁 Files

- `main_pyqt5.py` - Main kiosk application (PyQt5)
- `main.py` - PyQt6 version (has DLL issues on Windows)
- `launch_kiosk.bat` - Easy launcher script
- `venv/` - Virtual environment (isolated Python packages)
- `secure_profile/` - Browser session storage

---

## 🔌 Face ID Integration

Two integration points in `main_pyqt5.py`:

1. **Startup (Line 35-39)** - Authenticate before loading kiosk
2. **Exit (Line 177-182)** - Re-authenticate before allowing exit

---

## 🛠️ Troubleshooting

### Kiosk won't start

```powershell
# Reinstall PyQt5 in venv
.\venv\Scripts\Activate.ps1
pip uninstall PyQt5 PyQtWebEngine -y
pip install PyQt5==5.15.10 PyQtWebEngine==5.15.6
```

### Can't activate venv (PowerShell execution policy)

```powershell
# Allow scripts for current user
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Browser not loading

Make sure your SecureVision frontend is running:
```powershell
cd ../frontend
npm run dev
```

---

## ✅ Success!

The kiosk is now set up in an **isolated virtual environment**. 

This keeps PyQt5 separate from your global Python packages and prevents conflicts!
