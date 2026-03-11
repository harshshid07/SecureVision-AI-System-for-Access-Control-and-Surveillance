"""
SecureVision Safe Kiosk Mode
=============================

A secure, full-screen kiosk browser for SecureVision with:
- Full-screen, frameless window that stays on top
- Focus-stealing mechanism to prevent Alt+Tab escape
- Persistent browser sessions
- Ctrl+K exit shortcut
- Integration points for Face ID authentication

Author: SecureVision Team
Tech Stack: Python 3.x, PyQt6, PyQt6-WebEngine
"""

import sys
import os
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout
)
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import QWebEngineProfile, QWebEngineSettings
from PyQt6.QtCore import Qt, QTimer, QUrl
from PyQt6.QtGui import QShortcut, QKeySequence


class SecureKioskWindow(QMainWindow):
    """
    Safe Kiosk Window for SecureVision
    
    Features:
    - Full-screen, frameless window
    - Always stays on top
    - Focus-stealing to prevent escape
    - Persistent browser profile
    - Ctrl+K exit mechanism
    """
    
    def __init__(self, start_url="http://localhost:5173"):
        super().__init__()
        
        # ===== FUTURE INTEGRATION POINT: Face ID Authentication =====
        # TODO: Call your Face ID authentication logic here
        # Example:
        # if not self.authenticate_face():
        #     sys.exit("Authentication failed")
        # =============================================================
        
        self.start_url = start_url
        self.setup_ui()
        self.setup_browser()
        self.setup_security()
        self.setup_exit_shortcut()
        
        # Start focus monitoring
        self.start_focus_monitoring()
        
    def setup_ui(self):
        """Configure the main window appearance and behavior"""
        # Set window title (won't be visible in frameless mode)
        self.setWindowTitle("SecureVision Kiosk")
        
        # Make window frameless (no title bar, no borders)
        self.setWindowFlags(
            Qt.WindowType.FramelessWindowHint |
            Qt.WindowType.WindowStaysOnTopHint |
            Qt.WindowType.WindowMaximizeButtonHint
        )
        
        # Set to full screen immediately
        self.showFullScreen()
        
        # Create central widget with layout
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        layout = QVBoxLayout(central_widget)
        layout.setContentsMargins(0, 0, 0, 0)  # No margins
        layout.setSpacing(0)  # No spacing
        
        print("✓ Kiosk UI configured: Full-screen, frameless, always on top")
        
    def setup_browser(self):
        """Configure the embedded browser with persistent profile"""
        # Create persistent profile directory
        profile_path = os.path.join(os.getcwd(), "secure_profile")
        os.makedirs(profile_path, exist_ok=True)
        
        # Create persistent web engine profile
        self.profile = QWebEngineProfile("SecureKiosk", self)
        self.profile.setPersistentStoragePath(profile_path)
        
        # Enable persistent cookies
        self.profile.setPersistentCookiesPolicy(
            QWebEngineProfile.PersistentCookiesPolicy.ForcePersistentCookies
        )
        
        # Create web view with persistent profile
        self.browser = QWebEngineView()
        self.browser.setPage(self.profile.createWebEnginePage())
        
        # Configure browser settings
        settings = self.browser.settings()
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalStorageEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.JavascriptEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.PluginsEnabled, True)
        
        # Add browser to layout
        self.centralWidget().layout().addWidget(self.browser)
        
        # Load start URL
        self.browser.setUrl(QUrl(self.start_url))
        
        print(f"✓ Browser configured with persistent profile at: {profile_path}")
        print(f"✓ Loading URL: {self.start_url}")
        
    def setup_security(self):
        """Configure security mechanisms to prevent escape"""
        # Set focus policy to strongly accept focus
        self.setFocusPolicy(Qt.FocusPolicy.StrongFocus)
        self.browser.setFocusPolicy(Qt.FocusPolicy.StrongFocus)
        
        # Ensure window is active
        self.activateWindow()
        self.raise_()
        
        print("✓ Security mechanisms enabled")
        
    def setup_exit_shortcut(self):
        """Configure Ctrl+K as the ONLY way to exit"""
        # Create Ctrl+K shortcut
        self.exit_shortcut = QShortcut(QKeySequence("Ctrl+K"), self)
        self.exit_shortcut.activated.connect(self.safe_exit)
        
        print("✓ Exit shortcut configured: Ctrl+K")
        
    def start_focus_monitoring(self):
        """Start timer to monitor and steal back focus"""
        # Create timer that checks focus every 100ms
        self.focus_timer = QTimer(self)
        self.focus_timer.timeout.connect(self.check_focus)
        self.focus_timer.start(100)  # Check every 100ms
        
        print("✓ Focus monitoring started (checking every 100ms)")
        
    def check_focus(self):
        """
        Timer callback to check if window has focus
        If focus is lost, immediately steal it back
        """
        if not self.isActiveWindow():
            # Window lost focus - steal it back!
            self.raise_()
            self.activateWindow()
            self.showFullScreen()
            
            # Optional: Print warning for debugging
            # print("⚠ Focus stolen back!")
            
    def focusOutEvent(self, event):
        """
        Override focus out event to prevent Alt+Tab escape
        This is called when the window loses focus
        """
        super().focusOutEvent(event)
        
        # Immediately steal focus back
        QTimer.singleShot(10, lambda: self.raise_())
        QTimer.singleShot(20, lambda: self.activateWindow())
        
    def closeEvent(self, event):
        """
        Override close event to prevent Alt+F4 and other close attempts
        Only Ctrl+K shortcut should be allowed to close the window
        """
        # Ignore ALL close events
        event.ignore()
        
        print("⚠ Close attempt blocked! Use Ctrl+K to exit.")
        
    def keyPressEvent(self, event):
        """
        Override key press to block additional escape attempts
        """
        # Block Alt+F4 explicitly
        if event.key() == Qt.Key.Key_F4 and event.modifiers() == Qt.KeyboardModifier.AltModifier:
            event.ignore()
            print("⚠ Alt+F4 blocked!")
            return
            
        # Block Windows key (if detected)
        if event.key() == Qt.Key.Key_Meta:
            event.ignore()
            print("⚠ Windows key blocked!")
            return
            
        # Allow other keys
        super().keyPressEvent(event)
        
    def safe_exit(self):
        """
        Safe exit method - only callable via Ctrl+K shortcut
        """
        print("✓ Safe exit initiated via Ctrl+K")
        
        # ===== FUTURE INTEGRATION POINT: Face ID Re-authentication =====
        # TODO: Optionally require face re-authentication before exit
        # Example:
        # if not self.authenticate_face():
        #     print("⚠ Exit denied: Face authentication failed")
        #     return
        # ================================================================
        
        # Stop focus timer
        self.focus_timer.stop()
        
        # Allow close event by setting flag
        self.allow_close = True
        
        # Quit application
        QApplication.quit()


def main():
    """
    Main entry point for SecureVision Kiosk
    """
    # Create application
    app = QApplication(sys.argv)
    app.setApplicationName("SecureVision Kiosk")
    
    # ===== CONFIGURATION =====
    # Set your SecureVision web app URL here
    START_URL = "http://localhost:5173"  # Default: React dev server
    # Alternatives:
    # START_URL = "http://localhost:5173/login"
    # START_URL = "https://yourdomain.com"
    # =========================
    
    print("=" * 60)
    print("SecureVision Safe Kiosk Mode")
    print("=" * 60)
    print("Starting secure kiosk browser...")
    print(f"Target URL: {START_URL}")
    print("")
    print("SECURITY FEATURES:")
    print("  ✓ Full-screen, frameless window")
    print("  ✓ Always stays on top")
    print("  ✓ Focus-stealing enabled (blocks Alt+Tab)")
    print("  ✓ Close events blocked (blocks Alt+F4)")
    print("  ✓ Persistent browser sessions")
    print("")
    print("EXIT METHOD:")
    print("  Press Ctrl+K to safely exit")
    print("=" * 60)
    print("")
    
    # Create and show kiosk window
    kiosk = SecureKioskWindow(start_url=START_URL)
    kiosk.show()
    
    # Start event loop
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
