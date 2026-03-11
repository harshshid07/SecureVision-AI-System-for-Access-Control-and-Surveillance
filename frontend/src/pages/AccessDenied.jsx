/**
 * Access Denied Page
 * Shown when user is blocked by admin via real-time Supabase update
 */
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldX, AlertTriangle, Home } from 'lucide-react'

export default function AccessDenied() {
    const navigate = useNavigate()

    useEffect(() => {
        // Ensure all session data is cleared
        localStorage.clear()
    }, [])

    return (
        <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-red-900/10 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                {/* Icon */}
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/20 border-2 border-red-500/50 mb-6 animate-pulse-slow">
                    <ShieldX className="w-12 h-12 text-red-500" />
                </div>

                {/* Title */}
                <h1 className="text-4xl font-bold mb-4 text-white">
                    Access Revoked
                </h1>

                {/* Message */}
                <p className="text-lg text-dark-muted mb-8">
                    Your account has been blocked by an administrator.
                </p>

                {/* Warning Card */}
                <div className="card bg-red-500/5 border-red-500/30 mb-8">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                        <div className="text-left">
                            <p className="font-medium text-red-400 mb-2">Security Notice</p>
                            <ul className="text-sm text-dark-muted space-y-1">
                                <li>• Your session has been terminated</li>
                                <li>• All access to the system has been revoked</li>
                                <li>• Please contact your system administrator</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Return Button */}
                <button
                    onClick={() => navigate('/login')}
                    className="btn-secondary flex items-center justify-center gap-2 mx-auto"
                >
                    <Home className="w-4 h-4" />
                    Return to Login
                </button>

                {/* Footer */}
                <p className="mt-8 text-sm text-dark-muted">
                    SecureVision Enterprise Security System
                </p>
            </div>
        </div>
    )
}
