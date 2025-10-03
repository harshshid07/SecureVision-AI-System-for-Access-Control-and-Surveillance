// Login Page JavaScript

let faceImage = null;

document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const captureBtn = document.getElementById('captureBtn');
    const loginForm = document.getElementById('loginForm');

    // Initialize camera
    SecureVision.initCamera(video);

    // Capture face
    captureBtn.addEventListener('click', function() {
        faceImage = SecureVision.captureImage(video, canvas);
        if (faceImage) {
            SecureVision.showFaceStatus('Face captured successfully!', 'success');
            captureBtn.innerHTML = '<i class="bi bi-check-circle"></i> Face Captured';
            captureBtn.classList.remove('btn-primary');
            captureBtn.classList.add('btn-success');
        }
    });

    // Handle login form submission
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const submitBtn = document.getElementById('submitBtn');

        // Validate inputs
        if (!username || !password) {
            SecureVision.showAlert('Please enter username and password', 'danger');
            return;
        }

        if (!faceImage) {
            SecureVision.showAlert('Please capture your face for verification', 'danger');
            return;
        }

        // Submit login
        SecureVision.setLoading(submitBtn, true);

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password,
                    face_image: faceImage
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                SecureVision.showAlert(data.message, 'success');
                setTimeout(() => {
                    window.location.href = data.redirect || '/dashboard';
                }, 1500);
            } else {
                SecureVision.showAlert(data.message || 'Login failed', 'danger');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Login';

                // Reset face capture
                faceImage = null;
                captureBtn.innerHTML = '<i class="bi bi-camera"></i> Capture Face';
                captureBtn.classList.remove('btn-success');
                captureBtn.classList.add('btn-primary');
                SecureVision.showFaceStatus('Please capture your face again', 'warning');
            }
        } catch (error) {
            console.error('Login error:', error);
            SecureVision.showAlert('An error occurred. Please try again.', 'danger');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> Login';
        }
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', function() {
        SecureVision.stopCamera(video);
    });
});
