"""
SecureVision Safe Kiosk Mode - PyQt5 Version
=============================================

This is a PyQt5 fallback version in case PyQt6 has DLL issues on Windows.
Functionality is identical to the PyQt6 version.

Author: SecureVision Team
Tech Stack: Python 3.x, PyQt5, PyQtWebEngine
"""

import sys
import os
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout
)
from PyQt5.QtWebEngineWidgets import QWebEngineView, QWebEngineProfile, QWebEngineSettings
from PyQt5.QtCore import Qt, QTimer, QUrl
from PyQt5.QtWidgets import QShortcut
from PyQt5.QtGui import QKeySequence


class SecureKioskWindow(QMainWindow):
    """
    Safe Kiosk Window for SecureVision (PyQt5 Version)
    
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
            Qt.FramelessWindowHint |
            Qt.WindowStaysOnTopHint |
            Qt.WindowMaximizeButtonHint
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
        """Configure the embedded browser with persistent profile and camera permissions"""
        # Create persistent profile directory
        profile_path = os.path.join(os.getcwd(), "secure_profile")
        os.makedirs(profile_path, exist_ok=True)
        
        # Create persistent web engine profile
        self.profile = QWebEngineProfile("SecureKiosk", self)
        self.profile.setPersistentStoragePath(profile_path)
        
        # Enable persistent cookies
        self.profile.setPersistentCookiesPolicy(
            QWebEngineProfile.ForcePersistentCookies
        )
        
        # Create web view
        self.browser = QWebEngineView()
        
        # Create a page with our profile
        from PyQt5.QtWebEngineWidgets import QWebEnginePage
        page = QWebEnginePage(self.profile, self.browser)
        
        # Connect the permission signal - THIS IS THE KEY FIX
        # PyQt5 uses signals, not method overrides for permissions
        def handle_permission_request(url, feature):
            """Handle camera/microphone permission requests"""
            print(f"📷 Permission requested for {url.toString()}, feature: {feature}")
            # Grant all permissions
            page.setFeaturePermission(
                url, 
                feature, 
                QWebEnginePage.PermissionGrantedByUser
            )
            print(f"✓ Permission GRANTED for feature {feature}")
        
        # Connect the signal
        page.featurePermissionRequested.connect(handle_permission_request)
        
        self.browser.setPage(page)
        
        # Configure browser settings - ENABLE ALL MEDIA FEATURES
        settings = self.browser.settings()
        settings.setAttribute(QWebEngineSettings.LocalStorageEnabled, True)
        settings.setAttribute(QWebEngineSettings.JavascriptEnabled, True)
        settings.setAttribute(QWebEngineSettings.PluginsEnabled, True)
        settings.setAttribute(QWebEngineSettings.JavascriptCanOpenWindows, True)
        settings.setAttribute(QWebEngineSettings.AllowRunningInsecureContent, True)
        settings.setAttribute(QWebEngineSettings.LocalContentCanAccessRemoteUrls, True)
        settings.setAttribute(QWebEngineSettings.LocalContentCanAccessFileUrls, True)
        
        # Enable autoplay for media
        try:
            settings.setAttribute(QWebEngineSettings.PlaybackRequiresUserGesture, False)
        except:
            pass  # Not available in all PyQt5 versions
        
        # Allow insecure origins to treat as secure (for localhost camera)
        try:
            settings.setAttribute(QWebEngineSettings.AllowGeolocationOnInsecureOrigins, True)
        except:
            pass
        
        # Enable context menu (right-click) - by default it's enabled
        print("✓ Right-click context menu enabled")
        
        # Add browser to layout
        self.centralWidget().layout().addWidget(self.browser)
        
        # Load start URL
        self.browser.setUrl(QUrl(self.start_url))
        
        print(f"✓ Browser configured with persistent profile at: {profile_path}")
        print(f"✓ Camera/Microphone permission handler connected")
        print(f"✓ All media features enabled")
        print(f"✓ Loading URL: {self.start_url}")
        
    def setup_security(self):
        """Configure security mechanisms to prevent escape"""
        # Set focus policy to strongly accept focus
        self.setFocusPolicy(Qt.StrongFocus)
        self.browser.setFocusPolicy(Qt.StrongFocus)
        
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
        Override key press to block escape attempts but allow copy/paste and Win+PrintScreen
        """
        from PyQt5.QtCore import Qt
        
        # Allow Win+PrintScreen (saves screenshot to Pictures folder)
        if event.key() == Qt.Key_Print:
            super().keyPressEvent(event)
            return
        
        # Allow Ctrl+C (copy), Ctrl+V (paste), Ctrl+X (cut), Ctrl+A (select all)
        if event.modifiers() == Qt.ControlModifier:
            if event.key() in (Qt.Key_C, Qt.Key_V, Qt.Key_X, Qt.Key_A):
                super().keyPressEvent(event)
                return
        
        # Block Alt+F4 explicitly
        if event.key() == Qt.Key_F4 and event.modifiers() == Qt.AltModifier:
            event.ignore()
            return
            
        # Block Windows key alone
        if event.key() == Qt.Key_Meta and event.modifiers() == Qt.NoModifier:
            event.ignore()
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
    print("SecureVision Safe Kiosk Mode (PyQt5)")
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
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
