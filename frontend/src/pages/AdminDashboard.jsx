/**
 * Admin Dashboard - Sidebar Layout Wrapper
 * Tabs: Surveillance, Attendance, User Management
 * [2026-03-11] Redesigned from single-page to tabbed sidebar layout
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Shield, LogOut, Users, Lock, Unlock, Clock, Mail, User,
    Video, CalendarDays, UserCog, ChevronLeft, ChevronRight, Menu, FileVideo, ScrollText
} from 'lucide-react'
import api from '../lib/api'
import SurveillanceTab from '../components/SurveillanceTab'
import AttendanceTab from '../components/AttendanceTab'
import RecordingsTab from '../components/RecordingsTab'

const TABS = [
    { id: 'surveillance', label: 'Surveillance', icon: Video },
    { id: 'recordings', label: 'Recordings', icon: FileVideo },
    { id: 'attendance', label: 'Attendance', icon: CalendarDays },
    { id: 'users', label: 'User Management', icon: UserCog },
]

export default function AdminDashboard() {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('surveillance')
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [recordingsDateFilter, setRecordingsDateFilter] = useState(null)
    const [recordingsUser, setRecordingsUser] = useState(null)
    const adminEmail = localStorage.getItem('username')

    // User Management State (preserved from original)
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [blockingUserId, setBlockingUserId] = useState(null)
    const [toast, setToast] = useState(null)

    useEffect(() => {
        const token = localStorage.getItem('access_token')
        const role = localStorage.getItem('role')
        if (!token || role !== 'admin') {
            navigate('/admin-login')
            return
        }
        fetchUsers()
        const interval = setInterval(fetchUsers, 10000)
        return () => clearInterval(interval)
    }, [])

    const fetchUsers = async () => {
        try {
            const response = await api.get('/api/admin/users')
            setUsers(response.data)
        } catch (error) {
            if (error.response?.status === 401) handleLogout()
        } finally {
            setLoading(false)
        }
    }

    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    const toggleBlockUser = async (userId, currentBlockStatus) => {
        const newBlockStatus = !currentBlockStatus
        const action = newBlockStatus ? 'block' : 'unblock'
        setBlockingUserId(userId)
        try {
            await api.post('/api/admin/block-user', { user_id: userId, block_status: newBlockStatus })
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_blocked: newBlockStatus } : u))
            showToast(`User successfully ${action}ed`, 'success')
        } catch (error) {
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
        if (isBlocked) return { text: 'Blocked', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' }
        if (!lastLogin) return { text: 'Never Logged In', color: 'text-gray-400', bg: 'bg-gray-500/20', border: 'border-gray-500/30' }
        const diffMinutes = (new Date() - new Date(lastLogin)) / (1000 * 60)
        if (diffMinutes < 30) return { text: 'Active', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' }
        return { text: 'Inactive', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-dark-bg flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-dark-bg flex">
            {/* ========== SIDEBAR ========== */}
            <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-dark-card border-r border-dark-border flex flex-col transition-all duration-300 flex-shrink-0`}>
                {/* Admin Profile */}
                <div className="p-4 border-b border-dark-border">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center flex-shrink-0">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        {!sidebarCollapsed && (
                            <div className="min-w-0">
                                <h1 className="text-sm font-bold text-white truncate">SecureVision</h1>
                                <p className="text-xs text-gray-500 truncate">{adminEmail}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-2 space-y-1">
                    {TABS.map((tab) => {
                        const Icon = tab.icon
                        const isActive = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : 'text-gray-400 hover:bg-dark-bg hover:text-white border border-transparent'
                                }`}
                                title={sidebarCollapsed ? tab.label : undefined}
                            >
                                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-red-400' : ''}`} />
                                {!sidebarCollapsed && <span>{tab.label}</span>}
                            </button>
                        )
                    })}
                </nav>

                {/* Bottom Controls */}
                <div className="p-2 border-t border-dark-border space-y-1">
                    <button
                        onClick={() => setSidebarCollapsed(prev => !prev)}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-white hover:bg-dark-bg transition-colors"
                    >
                        {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                        {!sidebarCollapsed && <span>Collapse</span>}
                    </button>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut className="w-4 h-4 flex-shrink-0" />
                        {!sidebarCollapsed && <span>Logout</span>}
                    </button>
                </div>
            </aside>

            {/* ========== MAIN CONTENT ========== */}
            <main className="flex-1 overflow-y-auto">
                <div className="max-w-[1400px] mx-auto p-6">
                    {/* Tab Content */}
                    {activeTab === 'surveillance' && (
                        <SurveillanceTab 
                            onGoToRecordings={(date) => {
                                setRecordingsDateFilter(date)
                                setActiveTab('recordings')
                            }} 
                        />
                    )}
                    {activeTab === 'recordings' && <RecordingsTab defaultDate={recordingsDateFilter} defaultUser={recordingsUser} />}
                    {activeTab === 'attendance' && <AttendanceTab />}
                    {activeTab === 'users' && (
                        <UserManagementTab
                            users={users}
                            fetchUsers={fetchUsers}
                            toggleBlockUser={toggleBlockUser}
                            blockingUserId={blockingUserId}
                            getUserStatus={getUserStatus}
                            onViewUserLogs={(user) => {
                                setRecordingsUser(user)
                                setActiveTab('recordings')
                            }}
                        />
                    )}
                </div>
            </main>

            {/* Toast Notification */}
            {toast && (
                <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-lg shadow-xl z-50 transition-all duration-300 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                    <p className="font-medium">{toast.message}</p>
                </div>
            )}
        </div>
    )
}


/**
 * User Management Tab (extracted from original AdminDashboard)
 */
function UserManagementTab({ users, fetchUsers, toggleBlockUser, blockingUserId, getUserStatus, onViewUserLogs }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">User Management</h2>
                <button
                    onClick={fetchUsers}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-card border border-dark-border text-sm text-gray-400 hover:text-white transition-colors"
                >
                    <Users className="w-4 h-4" /> Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-dark-card rounded-xl border border-dark-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{users.length}</p>
                            <p className="text-xs text-gray-500">Total Users</p>
                        </div>
                    </div>
                </div>
                <div className="bg-dark-card rounded-xl border border-dark-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <Unlock className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-green-400">{users.filter(u => !u.is_blocked).length}</p>
                            <p className="text-xs text-gray-500">Active</p>
                        </div>
                    </div>
                </div>
                <div className="bg-dark-card rounded-xl border border-dark-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-red-400">{users.filter(u => u.is_blocked).length}</p>
                            <p className="text-xs text-gray-500">Blocked</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-dark-card rounded-xl border border-dark-border">
                {users.length === 0 ? (
                    <p className="text-gray-500 text-center py-12">No users found</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-dark-border">
                                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">User</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Email</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Last Login</th>
                                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Joined</th>
                                    <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => {
                                    const status = getUserStatus(user.last_login, user.is_blocked)
                                    return (
                                        <tr key={user.id} className="border-b border-dark-border/30 hover:bg-dark-bg/50 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                                                        <User className="w-4 h-4 text-white" />
                                                    </div>
                                                    <span className="font-medium text-white">{user.username}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                                    <Mail className="w-3.5 h-3.5" />
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
                                                    <div className="flex items-center gap-1.5 text-gray-400">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {new Date(user.last_login).toLocaleString()}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-600">Never</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-500">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => onViewUserLogs && onViewUserLogs(user)}
                                                        className="px-3 py-2 rounded-lg font-medium text-sm transition-all bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 flex items-center gap-1.5"
                                                    >
                                                        <ScrollText className="w-4 h-4" /> Logs
                                                    </button>
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
                                                            <Unlock className="w-4 h-4" /> Unblock
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-2">
                                                            <Lock className="w-4 h-4" /> Block
                                                        </span>
                                                    )}
                                                </button>
                                                </div>
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
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <p className="text-sm text-blue-400 font-medium">
                        Real-time updates enabled — Auto-refreshing every 10 seconds
                    </p>
                </div>
            </div>
        </div>
    )
}
