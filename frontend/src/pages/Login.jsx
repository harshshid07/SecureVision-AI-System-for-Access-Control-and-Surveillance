/**
 * User Login Page - Redesigned with old project UI
 * Features: Animated background, glassmorphism, two-column layout, scanning animation
 */
import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { LogIn, AlertCircle, CheckCircle, Users, ShieldAlert, UserX, Camera } from 'lucide-react'
import WebcamCapture from '../components/WebcamCapture'
import { AnimatedBackground } from '../components/AnimatedBackground'
import { GlassPanel } from '../components/GlassPanel'
import api from '../lib/api'

export default function Login() {
    const navigate = useNavigate()
    const [username, setUsername] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [alert, setAlert] = useState(null)
    const webcamRef = useRef(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setAlert(null)
        setIsSubmitting(true)

        try {
            // Capture face from webcam component
            const faceImage = await webcamRef.current?.captureImage()

            if (!faceImage) {
                setAlert({ type: 'error', message: 'Failed to capture face. Please ensure camera is active.' })
                setIsSubmitting(false)
                return
            }

            const response = await api.post('/api/auth/login', {
                username,
                face_image: faceImage
            })

            if (response.data.success) {
                // Store token and user data
                localStorage.setItem('access_token', response.data.data.access_token)
                localStorage.setItem('user_id', response.data.data.user_id)
                localStorage.setItem('username', response.data.data.username)
                localStorage.setItem('role', response.data.data.role)

                // Success message
                setAlert({
                    type: 'success',
                    message: '✓ Login successful! Redirecting...',
                    icon: 'success'
                })

                // Redirect to dashboard
                setTimeout(() => navigate('/user'), 1500)
            } else {
                // Simple unified error message for any failure
                setAlert({
                    type: 'error',
                    message: 'Face Verification Failed. Retry Again.',
                    icon: 'error'
                })
            }
        } catch (error) {
            console.error('Login error:', error)

            // Parse error response
            const errorData = error.response?.data
            const errorMessage = errorData?.detail || errorData?.message || 'Login failed'

            // Check for specific error types in the response
            if (errorMessage.includes('Multiple faces')) {
                setAlert({
                    type: 'warning',
                    message: 'Multiple faces detected – Please ensure you are alone.',
                    icon: 'multi-face'
                })
            } else if (errorMessage.includes('Anti-spoofing') || errorMessage.includes('Live presence')) {
                setAlert({
                    type: 'error',
                    message: 'Anti-spoofing failed – Live presence required.',
                    icon: 'spoofing'
                })
            } else if (errorMessage.includes('blocked')) {
                setAlert({
                    type: 'error',
                    message: 'Your account has been blocked. Please contact administrator.',
                    icon: 'blocked'
                })
            } else {
                setAlert({
                    type: 'error',
                    message: errorMessage,
                    icon: 'error'
                })
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    const getAlertIcon = () => {
        if (!alert) return null

        switch (alert.icon) {
            case 'success':
                return <CheckCircle className="w-5 h-5 flex-shrink-0" />
            case 'multi-face':
                return <Users className="w-5 h-5 flex-shrink-0" />
            case 'spoofing':
                return <ShieldAlert className="w-5 h-5 flex-shrink-0" />
            case 'blocked':
                return <UserX className="w-5 h-5 flex-shrink-0" />
            default:
                return <AlertCircle className="w-5 h-5 flex-shrink-0" />
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
                                <button className="tab-button active">Login</button>
                                <Link to="/register" className="tab-button">Register</Link>
                            </div>

                            {/* Login Form */}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Alert */}
                                {alert && (
                                    <div className={`alert alert-${alert.type}`}>
                                        {getAlertIcon()}
                                        <p className="text-sm font-semibold">{alert.message}</p>
                                    </div>
                                )}

                                {/* Username Input */}
                                <div>
                                    <label className="block text-white font-semibold mb-2">Username</label>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="form-input"
                                        placeholder="Enter your username"
                                        required
                                        disabled={isSubmitting}
                                    />
                                </div>

                                {/* Camera Section */}
                                <div className="text-center">
                                    <div className="camera-container">
                                        <WebcamCapture ref={webcamRef} hideButton={true} />
                                    </div>
                                    <p className="text-dark-muted text-sm mt-3">Position your face in the camera frame</p>
                                </div>

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="btn-primary w-full flex items-center justify-center gap-2"
                                >
                                    <Camera className="w-5 h-5" />
                                    {isSubmitting ? 'Verifying...' : 'Capture Face and Verify'}
                                </button>

                                {/* Register Link */}
                                <div className="text-center text-sm text-dark-muted">
                                    New user? {' '}
                                    <Link to="/register" className="text-primary-blue hover:underline font-semibold">
                                        Register here
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
