// Signup Page JavaScript

let faceImage = null;

document.addEventListener('DOMContentLoaded', function() {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const captureBtn = document.getElementById('captureBtn');
    const signupForm = document.getElementById('signupForm');

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

    // Handle signup form submission
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const username = document.getElementById('username').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const submitBtn = document.getElementById('submitBtn');

        // Validate inputs
        if (!SecureVision.validateUsername(username)) {
            SecureVision.showAlert('Username must be 3-20 characters and contain only letters, numbers, and underscores', 'danger');
            return;
        }

        if (!SecureVision.validateEmail(email)) {
            SecureVision.showAlert('Please enter a valid email address', 'danger');
            return;
        }

        if (!SecureVision.validatePassword(password)) {
            SecureVision.showAlert('Password must be at least 6 characters long', 'danger');
            return;
        }

        if (password !== confirmPassword) {
            SecureVision.showAlert('Passwords do not match', 'danger');
            return;
        }

        if (!faceImage) {
            SecureVision.showAlert('Please capture your face before signing up', 'danger');
            return;
        }

        // Submit signup
        SecureVision.setLoading(submitBtn, true);

        try {
            const response = await fetch('/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password,
                    face_image: faceImage
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                SecureVision.showAlert(data.message, 'success');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                SecureVision.showAlert(data.message || 'Signup failed', 'danger');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="bi bi-person-check"></i> Sign Up';
            }
        } catch (error) {
            console.error('Signup error:', error);
            SecureVision.showAlert('An error occurred. Please try again.', 'danger');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-person-check"></i> Sign Up';
        }
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', function() {
        SecureVision.stopCamera(video);
    });
});
