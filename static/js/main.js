// SecureVision Main JavaScript

// Utility Functions
function showAlert(message, type = 'info') {
    const alertDiv = document.getElementById('alertMessage');
    if (!alertDiv) return;

    alertDiv.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;

    // Auto dismiss after 5 seconds
    setTimeout(() => {
        const alert = alertDiv.querySelector('.alert');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

function showFaceStatus(message, type = 'info') {
    const statusDiv = document.getElementById('faceStatus');
    if (!statusDiv) return;

    const iconMap = {
        'success': 'check-circle-fill',
        'danger': 'x-circle-fill',
        'warning': 'exclamation-triangle-fill',
        'info': 'info-circle-fill'
    };

    statusDiv.innerHTML = `
        <div class="alert alert-${type} py-2 mb-0" role="alert">
            <i class="bi bi-${iconMap[type]}"></i> ${message}
        </div>
    `;
}

function setLoading(button, isLoading) {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = `
            <span class="spinner-border spinner-border-sm me-2"></span>
            Processing...
        `;
    } else {
        button.disabled = false;
    }
}

// Camera Functions
async function initCamera(videoElement) {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            }
        });
        videoElement.srcObject = stream;
        return true;
    } catch (error) {
        console.error('Camera error:', error);
        showAlert('Unable to access camera. Please check permissions.', 'danger');
        return false;
    }
}

function captureImage(videoElement, canvasElement) {
    const context = canvasElement.getContext('2d');
    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;
    context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);
    return canvasElement.toDataURL('image/jpeg', 0.95);
}

function stopCamera(videoElement) {
    const stream = videoElement.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        videoElement.srcObject = null;
    }
}

// Form Validation
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

function validateUsername(username) {
    const re = /^[a-zA-Z0-9_]{3,20}$/;
    return re.test(username);
}

// Export functions
window.SecureVision = {
    showAlert,
    showFaceStatus,
    setLoading,
    initCamera,
    captureImage,
    stopCamera,
    validateEmail,
    validatePassword,
    validateUsername
};

// Page Load
document.addEventListener('DOMContentLoaded', function() {
    console.log('SecureVision initialized');

    // Auto-dismiss alerts
    const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
    alerts.forEach(alert => {
        setTimeout(() => {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }, 5000);
    });
});
