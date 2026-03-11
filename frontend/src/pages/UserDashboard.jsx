/**
 * User Dashboard - Redesigned with old project UI
 * Features: Animated background, stat cards, enhanced profile card, login history table
 * Real-time Supabase subscription for blocking detection
 * [2026-03-11] Added: Auto-lock after inactivity with face-unlock
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    User,
    Clock,
    LogOut,
    Shield,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Users as UsersIcon,
    Activity,
    Target,
    Zap
} from 'lucide-react'
import api from '../lib/api'
import { supabase } from '../lib/supabase'
import { AnimatedBackground } from '../components/AnimatedBackground'
import { GlassPanel } from '../components/GlassPanel'
import { StatCard } from '../components/StatCard'
import { StatusIndicator } from '../components/StatusIndicator'
import LockScreen from '../components/LockScreen'

// ==================== AUTO-LOCK CONFIG [2026-03-11] ====================
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000  // 5 minutes of inactivity → lock
// ======================================================================

export default function UserDashboard() {
    const navigate = useNavigate()
    const [user, setUser] = useState(null)
    const [loginHistory, setLoginHistory] = useState([])
    const [stats, setStats] = useState({
        totalLogins: 0,
        successRate: 0,
        lastLogin: null,
        avgSimilarity: 0
    })
    const [loading, setLoading] = useState(true)
    const userId = localStorage.getItem('user_id')
    const username = localStorage.getItem('username')

    // ==================== AUTO-LOCK STATE [2026-03-11] ====================
    const [isLocked, setIsLocked] = useState(false)
    const inactivityTimer = useRef(null)

    const resetInactivityTimer = useCallback(() => {
        if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
        inactivityTimer.current = setTimeout(() => {
            console.log('⏰ Inactivity timeout — locking session')
            setIsLocked(true)
        }, INACTIVITY_TIMEOUT_MS)
    }, [])

    // Attach activity listeners
    useEffect(() => {
        const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll']
        const handler = () => {
            if (!isLocked) resetInactivityTimer()
        }
        events.forEach(e => window.addEventListener(e, handler))
        resetInactivityTimer() // Start the timer

        return () => {
            events.forEach(e => window.removeEventListener(e, handler))
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
        }
    }, [isLocked, resetInactivityTimer])

    const handleUnlock = () => {
        setIsLocked(false)
        resetInactivityTimer()
    }
    // =====================================================================

    useEffect(() => {
        // Check authentication
        const token = localStorage.getItem('access_token')
        const role = localStorage.getItem('role')

        if (!token || role !== 'user') {
            navigate('/login')
            return
        }

        fetchUserData()
        setupRealtimeBlockListener()
    }, [])

    const fetchUserData = async () => {
        try {
            // Fetch user profile
            const profileRes = await api.get('/api/user/profile')
            setUser(profileRes.data)

            // Fetch login history
            const historyRes = await api.get('/api/user/login-history?limit=50')
            const history = historyRes.data
            setLoginHistory(history)

            // Calculate stats
            const totalLogins = history.length
            const successCount = history.filter(log => log.status === 'success').length
            const successRate = totalLogins > 0 ? ((successCount / totalLogins) * 100).toFixed(1) : 0

            const avgSimilarity = history
                .filter(log => log.similarity_score !== null)
                .reduce((acc, log) => acc + log.similarity_score, 0) /
                (history.filter(log => log.similarity_score !== null).length || 1)

            setStats({
                totalLogins,
                successRate,
                lastLogin: history[0]?.timestamp || null,
                avgSimilarity: (avgSimilarity * 100).toFixed(1)
            })
        } catch (error) {
            console.error('Error fetching user data:', error)
            if (error.response?.status === 401) {
                handleLogout()
            }
        } finally {
            setLoading(false)
        }
    }

    /**
     * CRITICAL: Real-time kill-switch using Supabase Realtime
     * Subscribes to the users table and listens for UPDATE events
     */
    const setupRealtimeBlockListener = () => {
        if (!userId) return

        // Subscribe to changes in the users table for this specific user
        const channel = supabase
            .channel(`user-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'users',
                    filter: `id=eq.${userId}`
                },
                (payload) => {
                    console.log('User update received:', payload)

                    // Check if is_blocked changed to true
                    if (payload.new.is_blocked === true) {
                        console.warn('User has been blocked! Terminating session...')
                        handleBlockedUser()
                    }
                }
            )
            .subscribe()

        // Cleanup on unmount
        return () => {
            supabase.removeChannel(channel)
        }
    }

    /**
     * Handle user being blocked by admin
     * Immediately clear session and redirect to access-denied page
     */
    const handleBlockedUser = () => {
        // Clear all session data
        localStorage.removeItem('access_token')
        localStorage.removeItem('user_id')
        localStorage.removeItem('username')
        localStorage.removeItem('role')

        // Redirect to access denied page
        navigate('/access-denied', { replace: true })
    }

    const handleLogout = () => {
        localStorage.clear()
        navigate('/login')
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="w-5 h-5 text-green-400" />
            case 'fail':
                return <XCircle className="w-5 h-5 text-red-400" />
            case 'spoofing_attempt':
                return <Shield className="w-5 h-5 text-red-500" />
            case 'multiple_faces':
                return <UsersIcon className="w-5 h-5 text-yellow-500" />
            default:
                return <AlertTriangle className="w-5 h-5 text-gray-400" />
        }
    }

    const getStatusBadge = (status) => {
        const classes = {
            success: 'bg-green-500/20 text-green-400 border-green-500/30',
            fail: 'bg-red-500/20 text-red-400 border-red-500/30',
            spoofing_attempt: 'bg-red-600/20 text-red-500 border-red-600/30',
            multiple_faces: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
        }

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium border ${classes[status] || classes.fail}`}>
                {status.replace('_', ' ').toUpperCase()}
            </span>
        )
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <AnimatedBackground />
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-blue"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen overflow-x-hidden">
            {/* Animated Background */}
            <AnimatedBackground />

            {/* Header */}
            <header className="fixed top-0 w-full bg-black/80 backdrop-blur-lg border-b border-white/10 z-50">
                <div className="max-w-7xl mx-auto px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-blue to-secondary-blue flex items-center justify-center">
                            <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold logo-text">SecureVision Dashboard</h1>
                            <p className="text-sm text-dark-muted">Welcome, {username}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-card hover:bg-dark-border transition-colors text-dark-muted hover:text-white border border-dark-border"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-8 py-24 mt-16">
                {/* Stat Cards Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        title="Total Logins"
                        value={stats.totalLogins}
                        icon={Activity}
                        color="primary-blue"
                    />
                    <StatCard
                        title="Success Rate"
                        value={`${stats.successRate}%`}
                        icon={Target}
                        color="green"
                    />
                    <StatCard
                        title="Avg Similarity"
                        value={`${stats.avgSimilarity}%`}
                        icon={Zap}
                        color="yellow"
                    />
                    <StatCard
                        title="Account Status"
                        value={
                            <div className="flex items-center gap-2">
                                <StatusIndicator active={true} />
                                <span className="text-2xl">Active</span>
                            </div>
                        }
                        icon={Shield}
                        color="green"
                    />
                </div>

                {/* Account Information */}
                <GlassPanel className="mb-8" withShimmer={true}>
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                        <Shield className="w-6 h-6 text-primary-blue" />
                        Account Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <p className="text-sm text-dark-muted mb-1">Username</p>
                            <p className="font-semibold text-white text-lg">{user?.username}</p>
                        </div>
                        <div>
                            <p className="text-sm text-dark-muted mb-1">Email</p>
                            <p className="font-semibold text-white text-lg">{user?.email}</p>
                        </div>
                        <div>
                            <p className="text-sm text-dark-muted mb-1">Last Login</p>
                            <p className="font-semibold text-white text-lg">
                                {stats.lastLogin ? new Date(stats.lastLogin).toLocaleString() : 'N/A'}
                            </p>
                        </div>
                    </div>
                </GlassPanel>

                {/* Login History */}
                <GlassPanel>
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                        <Clock className="w-6 h-6 text-primary-blue" />
                        Login History
                    </h2>

                    {loginHistory.length === 0 ? (
                        <p className="text-dark-muted text-center py-8">No login history available</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-dark-muted">Timestamp</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-dark-muted">Status</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-dark-muted">Similarity</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-dark-muted">Anti-Spoofing</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-dark-muted">Faces</th>
                                        <th className="text-left py-3 px-4 text-sm font-semibold text-dark-muted">Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loginHistory.map((log) => (
                                        <tr key={log.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                            <td className="py-3 px-4 text-sm text-white">
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    {getStatusIcon(log.status)}
                                                    {getStatusBadge(log.status)}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                {log.similarity_score !== null ? (
                                                    <span className={`font-semibold ${log.similarity_score >= 0.6 ? 'text-green-400' : 'text-red-400'}`}>
                                                        {(log.similarity_score * 100).toFixed(1)}%
                                                    </span>
                                                ) : (
                                                    <span className="text-dark-muted">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                {log.is_real !== null ? (
                                                    log.is_real ? (
                                                        <span className="text-green-400 font-semibold">✓ Real</span>
                                                    ) : (
                                                        <span className="text-red-400 font-semibold">✗ Spoofing</span>
                                                    )
                                                ) : (
                                                    <span className="text-dark-muted">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                {log.face_count !== null ? (
                                                    <span className={log.face_count === 1 ? 'text-green-400 font-semibold' : 'text-yellow-400 font-semibold'}>
                                                        {log.face_count}
                                                    </span>
                                                ) : (
                                                    <span className="text-dark-muted">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-dark-muted">
                                                {log.error_message || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </GlassPanel>

                {/* Real-time Status Indicator */}
                <div className="mt-6 glass-panel p-4 border-primary-blue/30">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-primary-blue rounded-full animate-pulse-slow"></div>
                        <p className="text-sm text-primary-blue font-semibold">
                            Real-time monitoring active - Your session is being protected
                        </p>
                    </div>
                </div>
            </main>

            {/* ==================== LOCK SCREEN OVERLAY [2026-03-11] ==================== */}
            {isLocked && (
                <LockScreen
                    onUnlock={handleUnlock}
                    lockedUsername={username}
                />
            )}
            {/* ========================================================================= */}
        </div>
    )
}
