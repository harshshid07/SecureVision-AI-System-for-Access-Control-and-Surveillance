import { useState, useEffect, useRef } from 'react'
import { Video, Play, Square, AlertTriangle, RefreshCw, Wifi, WifiOff, Maximize, Plus, Camera, Search, ChevronRight } from 'lucide-react'
import { KioskDateInput } from './KioskUI'
import api from '../lib/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function SurveillanceTab({ onGoToRecordings }) {
    const [status, setStatus] = useState({ is_running: false, active_cameras: 0, cameras: [] })
    const [availableCameras, setAvailableCameras] = useState([])
    const [activeViews, setActiveViews] = useState([]) // array of camera IDs (strings or ints)
    const [networkCamUrl, setNetworkCamUrl] = useState("")
    
    // Alerts History
    const [logs, setLogs] = useState([])
    const [alertsDate, setAlertsDate] = useState(() => new Date().toISOString().split('T')[0])
    const [loading, setLoading] = useState(false)
    const [wsConnected, setWsConnected] = useState(false)
    const wsRef = useRef(null)

    // Three months date restriction
    const minDate = new Date()
    minDate.setMonth(minDate.getMonth() - 3)
    const minDateStr = minDate.toISOString().split('T')[0]
    const maxDateStr = new Date().toISOString().split('T')[0]

    useEffect(() => {
        fetchCameras()
        fetchStatus()
        fetchLogs()
        connectWebSocket()

        const interval = setInterval(fetchStatus, 3000)

        return () => {
            clearInterval(interval)
            if (wsRef.current) wsRef.current.close()
        }
    }, [])

    useEffect(() => {
        fetchLogs()
    }, [alertsDate])

    const connectWebSocket = () => {
        try {
            const wsUrl = API_URL.replace('http', 'ws')
            const ws = new WebSocket(`${wsUrl}/api/surveillance/ws/alerts`)
            ws.onopen = () => setWsConnected(true)
            ws.onmessage = (event) => {
                const alert = JSON.parse(event.data)
                // Optionally add to top of logs if date matches today, but simple refresh works too
                if (alertsDate === maxDateStr) fetchLogs()
            }
            ws.onclose = () => { setWsConnected(false); setTimeout(connectWebSocket, 3000) }
            ws.onerror = () => setWsConnected(false)
            wsRef.current = ws
        } catch (e) { console.error('WS Error:', e) }
    }

    const fetchStatus = async () => {
        try {
            const res = await api.get('/api/surveillance/status')
            setStatus(res.data)
            
            // Auto-add active cameras to views if not present
            const runningCams = res.data.cameras.map(c => c.camera)
            if (runningCams.length > 0) {
                setActiveViews(prev => {
                    const newViews = [...prev]
                    let changed = false
                    runningCams.forEach(cam => {
                        if (!newViews.includes(cam)) { newViews.push(cam); changed = true }
                    })
                    return changed ? newViews : prev
                })
            }
        } catch (e) {
            console.error('Status fetch error:', e)
        }
    }

    const fetchCameras = async () => {
        try {
            const res = await api.get('/api/surveillance/cameras')
            setAvailableCameras(res.data.cameras || [])
        } catch (e) {
            console.error('Cameras fetch error:', e)
        }
    }

    const fetchLogs = async () => {
        try {
            // Note: Update backend `/logs` to support `date=` parameter
            const res = await api.get(`/api/surveillance/logs?limit=100&date=${alertsDate}`)
            setLogs(res.data)
        } catch (e) {
            console.error('Logs fetch error:', e)
        }
    }

    const toggleEngine = async (cameraId, isCurrentlyRunning) => {
        setLoading(true)
        try {
            if (isCurrentlyRunning) {
                await api.post(`/api/surveillance/stop?camera_id=${encodeURIComponent(cameraId)}`)
            } else {
                await api.post(`/api/surveillance/start?camera_id=${encodeURIComponent(cameraId)}`)
            }
            await fetchStatus()
        } catch (e) {
            console.error('Engine toggle error:', e)
        } finally {
            setLoading(false)
        }
    }

    const addView = (cameraId) => {
        if (!activeViews.includes(cameraId)) {
            setActiveViews(prev => [...prev, String(cameraId)])
        }
    }
    
    const removeView = (cameraId) => {
        setActiveViews(prev => prev.filter(c => c !== String(cameraId)))
    }

    const addNetworkCamera = () => {
        if (networkCamUrl && !activeViews.includes(networkCamUrl)) {
            addView(networkCamUrl)
            setNetworkCamUrl("")
        }
    }

    const getEventBadge = (type) => {
        const styles = { AUTHORIZED: 'text-green-400', UNAUTHORIZED: 'text-red-400 font-bold', SPOOF: 'text-orange-400', MOTION: 'text-blue-400' }
        return styles[type] || 'text-gray-400'
    }

    // Grid config depending on count
    const gridCols = activeViews.length <= 1 ? 'grid-cols-1' : (activeViews.length <= 4 ? 'grid-cols-2' : 'grid-cols-3')

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">Surveillance Monitor</h2>
                    {wsConnected
                        ? <Wifi className="w-4 h-4 text-green-400" title="WebSocket connected" />
                        : <WifiOff className="w-4 h-4 text-red-500" title="WebSocket disconnected" />
                    }
                </div>
            </div>

            {/* Layout: Grid Feed (Left) + Device Selector (Right) */}
            <div className="flex flex-col xl:flex-row gap-6">
                
                {/* Feeds Grid */}
                <div className="flex-1 min-h-[500px] bg-dark-bg border border-dark-border rounded-xl p-4">
                    {activeViews.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                            <Video className="w-16 h-16 opacity-30" />
                            <p>No devices selected</p>
                            <span className="text-sm">Select a device from the panel to start monitoring.</span>
                        </div>
                    ) : (
                        <div className={`grid ${gridCols} gap-4 h-full`}>
                            {activeViews.map(camId => {
                                const isRun = status.cameras?.find(c => String(c.camera) === String(camId))
                                return (
                                    <div key={camId} className="relative group bg-black rounded-lg overflow-hidden border border-gray-800 flex flex-col">
                                        
                                        {/* Camera Controls Overlay */}
                                        <div className="absolute top-0 left-0 right-0 p-3 bg-gradient-to-b from-black/80 to-transparent flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <span className="text-xs font-mono text-white bg-black/50 px-2 py-1 rounded backdrop-blur">
                                                {camId.length > 20 ? camId.substring(0, 20) + "..." : camId}
                                            </span>
                                            <div className="flex gap-2">
                                                <button onClick={() => toggleEngine(camId, !!isRun)} disabled={loading} className={`p-1.5 rounded transition ${isRun ? 'bg-red-500/80 hover:bg-red-500' : 'bg-green-500/80 hover:bg-green-500'} text-white shadow-lg`}>
                                                    {isRun ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                                </button>
                                                <button 
                                                    onClick={(e) => {
                                                        const el = e.currentTarget.closest('.group');
                                                        if (document.fullscreenElement) document.exitFullscreen();
                                                        else if (el) el.requestFullscreen().catch(err => console.log('Fullscreen failed:', err));
                                                    }} 
                                                    className="p-1.5 bg-gray-700/80 hover:bg-gray-600 rounded text-white shadow-lg ml-1"
                                                >
                                                    <Maximize className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => removeView(camId)} className="p-1.5 bg-red-700/80 hover:bg-red-600 rounded text-white shadow-lg ml-1" title="Remove from grid">
                                                    <span className="font-bold text-xs">X</span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Camera State Badge */}
                                        <div className="absolute bottom-3 left-3 z-10">
                                            {isRun ? (
                                                <span className="flex items-center gap-1.5 text-xs font-bold text-red-500 bg-black/50 px-2 py-1 rounded backdrop-blur">
                                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> REC
                                                </span>
                                            ) : (
                                                <span className="text-xs font-bold text-gray-400 bg-black/50 px-2 py-1 rounded backdrop-blur">STANDBY</span>
                                            )}
                                        </div>

                                        {/* MJPEG Stream */}
                                        <div className="flex-1 flex items-center justify-center min-h-[250px]">
                                            {isRun ? (
                                                <img 
                                                    src={`${API_URL}/api/surveillance/feed?camera_id=${encodeURIComponent(camId)}`} 
                                                    className="w-full h-full object-contain"
                                                    alt={`Camera ${camId}`} 
                                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block' }}
                                                />
                                            ) : null}
                                            <div className={`${isRun ? 'hidden' : 'block'} text-gray-600 text-xs`}>
                                                <Camera className="w-8 h-8 opacity-30 mx-auto mb-2" />
                                                Video Stopped
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Device Selector Sidebar */}
                <div className="w-full xl:w-80 flex flex-col gap-4">
                    <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                        <h3 className="font-semibold text-white mb-4 border-b border-dark-border pb-2">Available Devices</h3>
                        <div className="space-y-2">
                            {availableCameras.length === 0 && <p className="text-xs text-gray-500">Scanning local USB cameras...</p>}
                            {availableCameras.map(cam => (
                                <button
                                    key={cam.id}
                                    onClick={() => addView(cam.id)}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between ${activeViews.includes(String(cam.id)) ? 'bg-blue-500/20 border-blue-500/30' : 'bg-dark-bg hover:bg-gray-800 border-dark-border'} border`}
                                >
                                    <span className={activeViews.includes(String(cam.id)) ? 'text-blue-400' : 'text-gray-300'}>{cam.name}</span>
                                    {activeViews.includes(String(cam.id)) && <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-dark-card border border-dark-border rounded-xl p-4">
                        <h3 className="font-semibold text-white mb-3 text-sm">Add Network Camera</h3>
                        <p className="text-xs text-gray-500 mb-3">Enter RTSP/HTTP stream URL (e.g. Hikvision Setup)</p>
                        <div className="flex flex-col gap-2">
                            <input 
                                type="text" 
                                value={networkCamUrl} 
                                onChange={e => setNetworkCamUrl(e.target.value)}
                                placeholder="rtsp://admin:pass@192.168.1.64/live" 
                                className="bg-dark-bg border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                            />
                            <button onClick={addNetworkCamera} className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-medium transition flex justify-center items-center gap-2">
                                <Plus className="w-4 h-4" /> Add
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Alerts History Table */}
            <div className="bg-dark-card rounded-xl border border-dark-border mt-8">
                <div className="p-4 border-b border-dark-border flex flex-wrap gap-4 items-center justify-between">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400" /> Alerts History
                    </h3>
                    <div className="flex items-center gap-3">
                        <label className="text-sm font-medium text-gray-400">Date:</label>
                        <KioskDateInput 
                            value={alertsDate}
                            onChange={setAlertsDate}
                            min={minDateStr}
                            max={maxDateStr}
                        />
                        <button onClick={fetchLogs} className="text-gray-400 hover:text-white p-1.5 rounded bg-dark-bg border border-dark-border">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-dark-bg/50 text-gray-400 border-b border-dark-border">
                            <tr>
                                <th className="px-4 py-3 font-medium">Time</th>
                                <th className="px-4 py-3 font-medium">Event Type</th>
                                <th className="px-4 py-3 font-medium">Identity / Suspect</th>
                                <th className="px-4 py-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logs.map(log => (
                                <tr key={log.id} className="border-b border-dark-border/40 hover:bg-gray-800/30 transition-colors">
                                    <td className="px-4 py-3 text-gray-300 font-mono">
                                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`font-semibold ${getEventBadge(log.event_type)}`}>
                                            {log.event_type}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-gray-400">
                                        {log.user_identity ? (
                                            <span className="text-green-400">{log.user_identity}</span>
                                        ) : (
                                            <span className="text-red-400 line-clamp-1 max-w-[250px]">
                                                {log.details?.message || "Unknown Suspect Detected"}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button 
                                            onClick={() => onGoToRecordings && onGoToRecordings(alertsDate)} 
                                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors cursor-pointer"
                                        >
                                            View Recording <ChevronRight className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {logs.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <Search className="w-8 h-8 opacity-20" />
                                            No alerts recorded for this date.
                                        </div>
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
