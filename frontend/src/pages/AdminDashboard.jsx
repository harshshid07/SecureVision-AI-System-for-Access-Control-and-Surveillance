/**
 * Admin Dashboard
 * User management with real-time status and block/unblock functionality
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, LogOut, Users, Lock, Unlock, Clock, Mail, User } from 'lucide-react'
import api from '../lib/api'

export default function AdminDashboard() {
    const navigate = useNavigate()
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const adminEmail = localStorage.getItem('username')

    useEffect(() => {
        // Check authentication
        const token = localStorage.getItem('access_token')
        const role = localStorage.getItem('role')

        if (!token || role !== 'admin') {
            navigate('/admin-login')
            return
        }

        fetchUsers()

        // Refresh user list every 10 seconds
        const interval = setInterval(fetchUsers, 10000)
        return () => clearInterval(interval)
    }, [])

    const fetchUsers = async () => {
        try {
            const response = await api.get('/api/admin/users')
            setUsers(response.data)
        } catch (error) {
            console.error('Error fetching users:', error)
            if (error.response?.status === 401) {
                handleLogout()
            }
        } finally {
            setLoading(false)
        }
    }

    const [blockingUserId, setBlockingUserId] = useState(null)
    const [toast, setToast] = useState(null)

    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    const toggleBlockUser = async (userId, currentBlockStatus) => {
        const newBlockStatus = !currentBlockStatus
        const action = newBlockStatus ? 'block' : 'unblock'

        // Set loading state for this specific user
        setBlockingUserId(userId)

        try {
            await api.post('/api/admin/block-user', {
                user_id: userId,
                block_status: newBlockStatus
            })

            // Optimistically update local state immediately (no refetch)
            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user.id === userId
                        ? { ...user, is_blocked: newBlockStatus }
                        : user
                )
            )

            showToast(`User successfully ${action}ed`, 'success')
        } catch (error) {
            console.error('Error toggling user block:', error)
            showToast(`Failed to ${action} user`, 'error')
        } finally {
            setBlockingUserId(null)
        }
    }

    const handleLogout = () => {
        localStorage.clear()
        navigate('/admin-login')
    }

    const getUserStatus = (lastLogin, isBlocked) => {
        if (isBlocked) {
            return { text: 'Blocked', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' }
        }

        if (!lastLogin) {
            return { text: 'Never Logged In', color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30' }
        }

        const lastLoginDate = new Date(lastLogin)
        const now = new Date()
        const diffMinutes = (now - lastLoginDate) / (1000 * 60)

        if (diffMinutes < 30) {
            return { text: 'Active', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' }
        }

        return { text: 'Inactive', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-bg flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-dark-bg">
            {/* Header */}
            <header className="bg-dark-card border-b border-dark-border">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
                            <p className="text-sm text-dark-muted">{adminEmail}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-bg hover:bg-dark-border transition-colors text-dark-muted hover:text-white"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="card">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-primary-500/20 flex items-center justify-center">
                                <Users className="w-6 h-6 text-primary-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{users.length}</p>
                                <p className="text-sm text-dark-muted">Total Users</p>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                                <Unlock className="w-6 h-6 text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-green-400">
                                    {users.filter(u => !u.is_blocked).length}
                                </p>
                                <p className="text-sm text-dark-muted">Active Users</p>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                                <Lock className="w-6 h-6 text-red-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-red-400">
                                    {users.filter(u => u.is_blocked).length}
                                </p>
                                <p className="text-sm text-dark-muted">Blocked Users</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                <div className="card">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Users className="w-5 h-5 text-primary-500" />
                            User Management
                        </h2>
                        <button
                            onClick={fetchUsers}
                            className="btn-secondary text-sm py-2"
                        >
                            Refresh
                        </button>
                    </div>

                    {users.length === 0 ? (
                        <p className="text-dark-muted text-center py-8">No users found</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-dark-border">
                                        <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">User</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Email</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Status</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Last Login</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium text-dark-muted">Joined</th>
                                        <th className="text-right py-3 px-4 text-sm font-medium text-dark-muted">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => {
                                        const status = getUserStatus(user.last_login, user.is_blocked)

                                        return (
                                            <tr key={user.id} className="border-b border-dark-border/50 hover:bg-dark-bg/50 transition-colors">
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0">
                                                            <User className="w-4 h-4 text-white" />
                                                        </div>
                                                        <span className="font-medium">{user.username}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2 text-sm text-dark-muted">
                                                        <Mail className="w-4 h-4" />
                                                        {user.email}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${status.bg} ${status.color} ${status.border}`}>
                                                        {status.text}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-sm">
                                                    {user.last_login ? (
                                                        <div className="flex items-center gap-2 text-dark-muted">
                                                            <Clock className="w-4 h-4" />
                                                            {new Date(user.last_login).toLocaleString()}
                                                        </div>
                                                    ) : (
                                                        <span className="text-dark-muted">Never</span>
                                                    )}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-dark-muted">
                                                    {new Date(user.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        onClick={() => toggleBlockUser(user.id, user.is_blocked)}
                                                        disabled={blockingUserId === user.id}
                                                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-wait ${user.is_blocked
                                                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30'
                                                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                                                            }`}
                                                    >
                                                        {blockingUserId === user.id ? (
                                                            <span className="flex items-center gap-2">
                                                                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                                                Processing...
                                                            </span>
                                                        ) : user.is_blocked ? (
                                                            <span className="flex items-center gap-2">
                                                                <Unlock className="w-4 h-4" />
                                                                Unblock
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-2">
                                                                <Lock className="w-4 h-4" />
                                                                Block
                                                            </span>
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Real-time Notice */}
                <div className="mt-6 card bg-primary-500/5 border-primary-500/20">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
                        <p className="text-sm text-primary-400 font-medium">
                            Real-time updates enabled - User sessions are terminated instantly when blocked
                        </p>
                    </div>
                </div>
            </main>

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-xl transition-all duration-300 transform ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    <p className="font-medium">{toast.message}</p>
                </div>
            )}
        </div>
    )
}
