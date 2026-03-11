/**
 * Admin Login Page
 * Email and password authentication for administrators
 */
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, AlertCircle, ArrowLeft } from 'lucide-react'
import api from '../lib/api'

export default function AdminLogin() {
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    })
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState(null)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError(null)
        setIsSubmitting(true)

        try {
            const response = await api.post('/api/auth/admin-login', formData)

            // Store token and admin data
            localStorage.setItem('access_token', response.data.access_token)
            localStorage.setItem('user_id', response.data.user_id)
            localStorage.setItem('username', response.data.username)
            localStorage.setItem('role', response.data.role)

            // Redirect to admin dashboard
            navigate('/admin')
        } catch (err) {
            console.error('Admin login error:', err)
            const errorMessage = err.response?.data?.detail || 'Invalid credentials'
            setError(errorMessage)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-dark-bg via-dark-bg to-red-900/10">
            <div className="max-w-md w-full">
                {/* Back Button */}
                <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-dark-muted hover:text-primary-400 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to User Login
                </Link>

                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 mb-4">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                        Admin Access
                    </h1>
                    <p className="text-dark-muted">Authorized personnel only</p>
                </div>

                {/* Login Form */}
                <div className="card border-red-500/20">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Error Alert */}
                        {error && (
                            <div className="alert alert-error">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <p className="text-sm">{error}</p>
                            </div>
                        )}

                        {/* Email Input */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Admin Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                className="input-field w-full"
                                placeholder="admin@securevision.com"
                                required
                                disabled={isSubmitting}
                                autoComplete="email"
                            />
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Password</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                                className="input-field w-full"
                                placeholder="Enter your password"
                                required
                                disabled={isSubmitting}
                                autoComplete="current-password"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-medium px-6 py-3 rounded-lg transition-all duration-200 shadow-lg hover:shadow-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Verifying...' : 'Access Admin Panel'}
                        </button>
                    </form>
                </div>

                {/* Warning Notice */}
                <div className="mt-6 card bg-red-500/5 border-red-500/20">
                    <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-dark-muted">
                            <p className="font-medium text-red-400 mb-1">Security Notice</p>
                            <p className="text-xs">All admin access attempts are logged and monitored.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
