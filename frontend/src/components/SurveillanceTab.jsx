/**
 * Surveillance Tab - Live feed, recording controls, and local recordings table
 * Part of the Admin Dashboard sidebar layout
 */
import { useState, useEffect, useRef } from 'react'
import { Video, Play, Square, Clock, FolderOpen, AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import api from '../lib/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function SurveillanceTab() {
    const [status, setStatus] = useState(null)
    const [recordings, setRecordings] = useState([])
    const [logs, setLogs] = useState([])
    const [chunkMinutes, setChunkMinutes] = useState(5)
    const [loading, setLoading] = useState(false)
    const [alerts, setAlerts] = useState([])
    const wsRef = useRef(null)
    const [wsConnected, setWsConnected] = useState(false)

    useEffect(() => {
        fetchStatus()
        fetchRecordings()
        fetchLogs()
        connectWebSocket()

        const interval = setInterval(() => {
            fetchStatus()
            fetchRecordings()
            fetchLogs()
        }, 5000)

        return () => {
            clearInterval(interval)
            if (wsRef.current) wsRef.current.close()
        }
    }, [])

    const connectWebSocket = () => {
        try {
            const wsUrl = API_URL.replace('http', 'ws')
            const ws = new WebSocket(`${wsUrl}/api/surveillance/ws/alerts`)

            ws.onopen = () => {
                setWsConnected(true)
                console.log('✓ WebSocket connected')
            }

            ws.onmessage = (event) => {
                const alert = JSON.parse(event.data)
                setAlerts(prev => [alert, ...prev].slice(0, 50))
            }

            ws.onclose = () => {
                setWsConnected(false)
                // Reconnect after 3 seconds
                setTimeout(connectWebSocket, 3000)
            }

            ws.onerror = () => setWsConnected(false)
            wsRef.current = ws
        } catch (e) {
            console.error('WebSocket error:', e)
        }
    }

    const fetchStatus = async () => {
        try {
            const res = await api.get('/api/surveillance/status')
            setStatus(res.data)
        } catch (e) {
            console.error('Status fetch error:', e)
        }
    }

    const fetchRecordings = async () => {
        try {
            const res = await api.get('/api/surveillance/recordings')
            setRecordings(res.data)
        } catch (e) {
            console.error('Recordings fetch error:', e)
        }
    }

    const fetchLogs = async () => {
        try {
            const res = await api.get('/api/surveillance/logs?limit=20')
            setLogs(res.data)
        } catch (e) {
            console.error('Logs fetch error:', e)
        }
    }

    const startSurveillance = async () => {
        setLoading(true)
        try {
            await api.post('/api/surveillance/start')
            await fetchStatus()
        } catch (e) {
            console.error('Start error:', e)
        } finally {
            setLoading(false)
        }
    }

    const stopSurveillance = async () => {
        setLoading(true)
        try {
            await api.post('/api/surveillance/stop')
            await fetchStatus()
        } catch (e) {
            console.error('Stop error:', e)
        } finally {
            setLoading(false)
        }
    }

    const updateDuration = async (minutes) => {
        setChunkMinutes(minutes)
        try {
            await api.post('/api/surveillance/recording/duration', { duration_minutes: minutes })
        } catch (e) {
            console.error('Duration update error:', e)
        }
    }

    const openExplorer = async (localPath) => {
        try {
            await api.post(`/api/surveillance/open-explorer?local_path=${encodeURIComponent(localPath)}`)
        } catch (e) {
            console.error('Open explorer error:', e)
        }
    }

    const getEventBadge = (type) => {
        const styles = {
            AUTHORIZED: 'bg-green-500/20 text-green-400 border-green-500/30',
            UNAUTHORIZED: 'bg-red-500/20 text-red-400 border-red-500/30',
            SPOOF: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
            MOTION: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        }
        return styles[type] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }

    const isRunning = status?.is_running

    return (
        <div className="space-y-6">
            {/* Header + Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">Surveillance</h2>
                    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${isRunning
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                    }`}>
                        <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                        {isRunning ? 'LIVE' : 'OFFLINE'}
                    </span>
                    {wsConnected
                        ? <Wifi className="w-4 h-4 text-green-400" title="WebSocket connected" />
                        : <WifiOff className="w-4 h-4 text-gray-500" title="WebSocket disconnected" />
                    }
                </div>
                <div className="flex items-center gap-3">
                    {isRunning ? (
                        <button
                            onClick={stopSurveillance}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            <Square className="w-4 h-4" /> Stop
                        </button>
                    ) : (
                        <button
                            onClick={startSurveillance}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30 text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            <Play className="w-4 h-4" /> Start
                        </button>
                    )}
                </div>
            </div>

            {/* Live Feed + Alerts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Live Feed */}
                <div className="lg:col-span-2 bg-dark-card rounded-xl border border-dark-border overflow-hidden">
                    <div className="p-4 border-b border-dark-border flex items-center justify-between">
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <Video className="w-4 h-4 text-red-400" /> Live Camera Feed
                        </h3>
                        {isRunning && (
                            <span className="flex items-center gap-1.5 text-xs text-red-400">
                                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                REC
                            </span>
                        )}
                    </div>
                    <div className="aspect-video bg-black flex items-center justify-center">
                        {isRunning ? (
                            <img
                                src={`${API_URL}/api/surveillance/feed`}
                                alt="Live surveillance feed"
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                    e.target.style.display = 'none'
                                    e.target.nextSibling.style.display = 'flex'
                                }}
                            />
                        ) : null}
                        <div className={`${isRunning ? 'hidden' : 'flex'} flex-col items-center gap-3 text-gray-500`}>
                            <Video className="w-16 h-16 opacity-30" />
                            <p className="text-sm">Surveillance is offline</p>
                            <p className="text-xs text-gray-600">Click Start to begin monitoring</p>
                        </div>
                    </div>
                </div>

                {/* Real-time Alerts */}
                <div className="bg-dark-card rounded-xl border border-dark-border flex flex-col max-h-[500px]">
                    <div className="p-4 border-b border-dark-border flex items-center justify-between">
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-400" /> Live Alerts
                        </h3>
                        <span className="text-xs text-gray-500">{alerts.length} events</span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {alerts.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-8">No alerts yet</p>
                        ) : (
                            alerts.map((alert, idx) => (
                                <div key={idx} className="bg-dark-bg/50 rounded-lg p-3 border border-dark-border/50">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getEventBadge(alert.event_type)}`}>
                                            {alert.event_type}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {new Date(alert.timestamp).toLocaleTimeString()}
                                        </span>
                                    </div>
                                    {alert.user_identity && (
                                        <p className="text-xs text-green-400 mt-1">👤 {alert.user_identity}</p>
                                    )}
                                    {alert.details?.message && (
                                        <p className="text-xs text-gray-400 mt-1">{alert.details.message}</p>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Recording Duration Slider */}
            <div className="bg-dark-card rounded-xl border border-dark-border p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-400" /> Recording Duration
                    </h3>
                    <span className="text-sm text-blue-400 font-mono font-bold">
                        {chunkMinutes >= 60 ? `${(chunkMinutes / 60).toFixed(1)}hr` : `${chunkMinutes}min`}
                    </span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="1440"
                    value={chunkMinutes}
                    onChange={(e) => updateDuration(parseInt(e.target.value))}
                    className="w-full h-2 bg-dark-border rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>1 min</span>
                    <span>5 min</span>
                    <span>1 hr</span>
                    <span>12 hr</span>
                    <span>24 hr</span>
                </div>
            </div>

            {/* Surveillance Logs Table */}
            <div className="bg-dark-card rounded-xl border border-dark-border">
                <div className="p-4 border-b border-dark-border flex items-center justify-between">
                    <h3 className="font-semibold text-white">Recent Events</h3>
                    <button onClick={fetchLogs} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Refresh
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-dark-border">
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map((log) => (
                                <tr key={log.id} className="border-b border-dark-border/30 hover:bg-dark-bg/50">
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getEventBadge(log.event_type)}`}>
                                            {log.event_type}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-400">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-500 max-w-xs truncate">
                                        {log.details ? JSON.stringify(log.details) : '—'}
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr><td colSpan={3} className="py-8 text-center text-gray-500 text-sm">No events logged yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Local Recordings Table */}
            <div className="bg-dark-card rounded-xl border border-dark-border">
                <div className="p-4 border-b border-dark-border flex items-center justify-between">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <Video className="w-4 h-4 text-purple-400" /> Local Recordings
                    </h3>
                    <button onClick={fetchRecordings} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Refresh
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-dark-border">
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Start</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">End</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Type</th>
                                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Path</th>
                                <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recordings.map((rec) => (
                                <tr key={rec.id} className="border-b border-dark-border/30 hover:bg-dark-bg/50">
                                    <td className="py-3 px-4 text-sm text-gray-400">
                                        {new Date(rec.start_time).toLocaleString()}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-400">
                                        {rec.end_time ? new Date(rec.end_time).toLocaleString() : '⏳ Recording...'}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                            {rec.trigger_type}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-xs text-gray-500 font-mono max-w-[200px] truncate" title={rec.local_path}>
                                        {rec.local_path}
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <button
                                            onClick={() => openExplorer(rec.local_path)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30 text-xs font-medium transition-colors ml-auto"
                                        >
                                            <FolderOpen className="w-3 h-3" /> Open Location
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {recordings.length === 0 && (
                                <tr><td colSpan={5} className="py-8 text-center text-gray-500 text-sm">No recordings yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
