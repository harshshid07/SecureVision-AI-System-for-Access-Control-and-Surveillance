/**
 * Attendance Tab - Data grid of face-detected attendance records
 * Part of the Admin Dashboard sidebar layout
 */
import { useState, useEffect } from 'react'
import { CalendarDays, Clock, User, RefreshCw, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import api from '../lib/api'

export default function AttendanceTab() {
    const [attendance, setAttendance] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchAttendance()
    }, [selectedDate])

    const fetchAttendance = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/api/surveillance/attendance?date=${selectedDate}`)
            setAttendance(res.data)
        } catch (e) {
            console.error('Attendance fetch error:', e)
        } finally {
            setLoading(false)
        }
    }

    const changeDate = (offset) => {
        const d = new Date(selectedDate)
        d.setDate(d.getDate() + offset)
        setSelectedDate(d.toISOString().split('T')[0])
    }

    const isToday = selectedDate === new Date().toISOString().split('T')[0]

    const filtered = attendance.filter(record => {
        if (!searchTerm) return true
        const username = record.users?.username || ''
        const email = record.users?.email || ''
        return username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            email.toLowerCase().includes(searchTerm.toLowerCase())
    })

    // Group by user for summary
    const userSummary = {}
    attendance.forEach(record => {
        const uid = record.user_id
        if (!userSummary[uid]) {
            userSummary[uid] = {
                username: record.users?.username || 'Unknown',
                email: record.users?.email || '',
                first_seen: record.detected_time,
                last_seen: record.detected_time,
                count: 0,
            }
        }
        userSummary[uid].count++
        if (record.detected_time < userSummary[uid].first_seen) {
            userSummary[uid].first_seen = record.detected_time
        }
        if (record.detected_time > userSummary[uid].last_seen) {
            userSummary[uid].last_seen = record.detected_time
        }
    })

    const uniqueUsers = Object.values(userSummary)

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-xl font-bold text-white">Attendance</h2>

                <div className="flex items-center gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search user..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-dark-card border border-dark-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 w-48"
                        />
                    </div>

                    {/* Date Picker */}
                    <div className="flex items-center gap-2 bg-dark-card border border-dark-border rounded-lg px-1">
                        <button onClick={() => changeDate(-1)} className="p-2 hover:bg-dark-bg rounded-lg transition-colors">
                            <ChevronLeft className="w-4 h-4 text-gray-400" />
                        </button>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-transparent text-sm text-white px-2 py-1.5 focus:outline-none"
                        />
                        <button
                            onClick={() => changeDate(1)}
                            disabled={isToday}
                            className="p-2 hover:bg-dark-bg rounded-lg transition-colors disabled:opacity-30"
                        >
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                        </button>
                    </div>

                    <button onClick={fetchAttendance} className="p-2 hover:bg-dark-card rounded-lg transition-colors">
                        <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-dark-card rounded-xl border border-dark-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{uniqueUsers.length}</p>
                            <p className="text-xs text-gray-500">Unique Users</p>
                        </div>
                    </div>
                </div>
                <div className="bg-dark-card rounded-xl border border-dark-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                            <CalendarDays className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">{attendance.length}</p>
                            <p className="text-xs text-gray-500">Total Detections</p>
                        </div>
                    </div>
                </div>
                <div className="bg-dark-card rounded-xl border border-dark-border p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-white">
                                {isToday ? 'Today' : new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </p>
                            <p className="text-xs text-gray-500">{selectedDate}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* User Summary */}
            {uniqueUsers.length > 0 && (
                <div className="bg-dark-card rounded-xl border border-dark-border">
                    <div className="p-4 border-b border-dark-border">
                        <h3 className="font-semibold text-white">User Summary</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                        {uniqueUsers.map((user, idx) => (
                            <div key={idx} className="bg-dark-bg/50 rounded-lg p-3 border border-dark-border/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                                        <User className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-medium text-white text-sm truncate">{user.username}</p>
                                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                    </div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-500 mt-2 pt-2 border-t border-dark-border/50">
                                    <span>First: {new Date(user.first_seen).toLocaleTimeString()}</span>
                                    <span>{user.count}x detected</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Detailed Attendance Log */}
            <div className="bg-dark-card rounded-xl border border-dark-border">
                <div className="p-4 border-b border-dark-border">
                    <h3 className="font-semibold text-white">Detailed Log</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-dark-border">
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">User</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Email</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Detected At</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((record) => (
                                <tr key={record.id} className="border-b border-dark-border/30 hover:bg-dark-bg/50">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                                                <User className="w-3.5 h-3.5 text-white" />
                                            </div>
                                            <span className="text-sm font-medium text-white">{record.users?.username || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-400">
                                        {record.users?.email || '—'}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-400">
                                        {new Date(record.detected_time).toLocaleTimeString()}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                                            {record.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-gray-500 text-sm">
                                        {loading ? 'Loading...' : `No attendance records for ${selectedDate}`}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
