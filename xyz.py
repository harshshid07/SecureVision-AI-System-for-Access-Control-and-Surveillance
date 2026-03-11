import sys
from PyQt6.QtWidgets import QApplication, QMainWindow, QVBoxLayout, QWidget
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtCore import QUrl

class MySocialBrowser(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Social Hub Desktop")
        self.resize(1024, 768)

        # Create the browser widget
        self.browser = QWebEngineView()
        self.browser.setUrl(QUrl("https://x.com"))

        # Layout
        layout = QVBoxLayout()
        layout.addWidget(self.browser)

        container = QWidget()
        container.setLayout(layout)
        self.setCentralWidget(container)

app = QApplication(sys.argv)
window = MySocialBrowser()
window.show()
sys.exit(app.exec())