# Windows PyQt6 DLL Error Fix

The PyQt6 DLL error on Windows is usually caused by missing Visual C++ redistributables or version conflicts.

## 🔧 Quick Fix (Recommended)

**Use PyQt5 instead** - It's more stable on Windows:

```bash
# Uninstall PyQt6
pip uninstall PyQt6 PyQt6-WebEngine -y

# Install PyQt5
pip install PyQt5==5.15.10 PyQtWebEngine==5.15.6

# Run the PyQt5 version
python main_pyqt5.py
```

## Alternative: Fix PyQt6 (Advanced)

### Option 1: Install Visual C++ Redistributables

Download and install:
- [Microsoft Visual C++ Redistributable (x64)](https://aka.ms/vs/17/release/vc_redist.x64.exe)

Then reinstall PyQt6:
```bash
pip uninstall PyQt6 PyQt6-WebEngine -y
pip install --upgrade --force-reinstall PyQt6 PyQt6-WebEngine
python main.py
```

### Option 2: Try Different PyQt6 Version

```bash
pip uninstall PyQt6 PyQt6-WebEngine -y
pip install PyQt6==6.5.0 PyQt6-WebEngine==6.5.0
python main.py
```

### Option 3: Use Conda (if you have it)

```bash
conda install -c conda-forge pyqt
conda install -c conda-forge pyqt-webengine
python main.py
```

## 📁 Files Available

- `main.py` - PyQt6 version (original)
- `main_pyqt5.py` - PyQt5 version (fallback) ✅ **Use this one**

Both have **identical functionality**!

## ✅ Recommended Solution

Use `main_pyqt5.py` with PyQt5 - it's the most reliable on Windows.

```bash
python main_pyqt5.py
```

Press **Ctrl+K** to exit the kiosk!
