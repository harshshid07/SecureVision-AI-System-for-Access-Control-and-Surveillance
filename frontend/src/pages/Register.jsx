import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { UserPlus, AlertCircle, CheckCircle, Users, Camera } from 'lucide-react'
import WebcamCapture from '../components/WebcamCapture'
import { AnimatedBackground } from '../components/AnimatedBackground'
import { GlassPanel } from '../components/GlassPanel'
import api from '../lib/api'

export default function Register() {
    const navigate = useNavigate()
    const webcamRef = useRef(null)
    const [formData, setFormData] = useState({
        username: '',
        email: ''
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [alert, setAlert] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setAlert(null)
        setIsSubmitting(true)

        try {
            // Capture face from webcam
            const faceImage = await webcamRef.current?.captureImage()

            if (!faceImage) {
                setAlert({ type: 'error', message: 'Failed to capture face. Please ensure camera is active.' })
                setIsSubmitting(false)
                return
            }

            const response = await api.post('/api/auth/register', {
                username: formData.username,
                email: formData.email,
                face_image: faceImage
            })

            if (response.data.success) {
                // Store token and user data
                localStorage.setItem('access_token', response.data.data.access_token)
                localStorage.setItem('user_id', response.data.data.user_id)
                localStorage.setItem('username', response.data.data.username)
                localStorage.setItem('role', response.data.data.role)

                setAlert({ type: 'success', message: '✓ Registration successful! Redirecting...' })

                // Redirect to user dashboard
                setTimeout(() => navigate('/user'), 1500)
            } else {
                setAlert({ type: 'error', message: response.data.message })
            }
        } catch (error) {
            console.error('Registration error:', error)
            const errorMessage = error.response?.data?.detail ||
                error.response?.data?.message ||
                'Registration failed. Please try again.'
            setAlert({ type: 'error', message: errorMessage })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center overflow-x-hidden">
            {/* Animated Background */}
            <AnimatedBackground />

            {/* Header */}
            <header className="fixed top-0 w-full bg-black/80 backdrop-blur-lg border-b border-white/10 z-50">
                <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
                    <div className="logo-text text-2xl">SecureVision AI</div>
                    <div className="text-dark-muted text-sm">Advanced Facial Recognition System</div>
                </div>
            </header>

            {/* Main Content */}
            <div className="max-w-7xl w-full mx-auto px-8 py-24 mt-16">
                <div className="flex items-center justify-between gap-16 flex-col lg:flex-row">
                    {/* Left Section - Info */}
                    <div className="flex-1 space-y-8">
                        <h1 className="text-7xl font-extrabold gradient-text leading-tight tracking-tight">
                            SECUREVISION
                        </h1>

                        <div className="space-y-4 text-2xl text-dark-text font-light">
                            <p className="flex items-center gap-3">
                                <span className="text-primary-blue">→</span>
                                Passwordless Auth...
                            </p>
                            <p className="flex items-center gap-3">
                                <span className="text-primary-blue">→</span>
                                Highly Secured
                            </p>
                            <p className="flex items-center gap-3">
                                <span className="text-primary-blue">→</span>
                                Private Workspace
                            </p>
                        </div>
                    </div>

                    {/* Right Section - Auth Panel */}
                    <div className="flex-1 max-w-[500px] w-full">
                        <GlassPanel withShimmer={true} padding="p-8">
                            {/* Tabs */}
                            <div className="panel-tabs">
                                <Link to="/login" className="tab-button">Login</Link>
                                <button className="tab-button active">Register</button>
                            </div>

                            {/* Registration Form */}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Alert */}
                                {alert && (
                                    <div className={`alert alert-${alert.type}`}>
                                        {alert.type === 'error' ? (
                                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                        ) : (
                                            <CheckCircle className="w-5 h-5 flex-shrink-0" />
                                        )}
                                        <p className="text-sm font-semibold">{alert.message}</p>
                                    </div>
                                )}

                                {/* Username Input */}
                                <div>
                                    <label className="block text-white font-semibold mb-2">Username</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                                        className="form-input"
                                        placeholder="Enter your username"
                                        required
                                        minLength={3}
                                        disabled={isSubmitting}
                                    />
                                </div>

                                {/* Email Input */}
                                <div>
                                    <label className="block text-white font-semibold mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        className="form-input"
                                        placeholder="Enter your email"
                                        required
                                        disabled={isSubmitting}
                                    />
                                </div>

                                {/* Camera Section */}
                                <div className="text-center">
                                    <div className="camera-container">
                                        <WebcamCapture ref={webcamRef} hideButton={true} isCapturing={isSubmitting} />
                                    </div>
                                    <p className="text-dark-muted text-sm mt-3">Position your face in the camera</p>
                                </div>

                                {/* Submit Button - Single button for Capture and Register */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="btn-primary w-full flex items-center justify-center gap-2"
                                >
                                    <Camera className="w-5 h-5" />
                                    {isSubmitting ? 'Registering...' : 'Capture and Register'}
                                </button>

                                {/* Login Link */}
                                <div className="text-center text-sm text-dark-muted">
                                    Already have an account? {' '}
                                    <Link to="/login" className="text-primary-blue hover:underline font-semibold">
                                        Sign in
                                    </Link>
                                </div>

                                {/* Admin Link */}
                                <div className="text-center">
                                    <Link
                                        to="/admin-login"
                                        className="text-dark-muted hover:text-primary-blue text-sm inline-flex items-center gap-2 transition-colors"
                                    >
                                        <Users className="w-4 h-4" />
                                        Admin Login
                                    </Link>
                                </div>
                            </form>
                        </GlassPanel>
                    </div>
                </div>
            </div>
        </div>
    )
}
