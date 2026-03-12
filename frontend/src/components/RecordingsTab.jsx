import { useState, useEffect } from 'react'
import { FolderOpen, Search, Calendar, RefreshCcw, FileVideo, HardDrive, Clock, User, Image, Cloud, HardDriveDownload, ChevronLeft, FolderSearch } from 'lucide-react'
import api from '../lib/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function RecordingsTab({ defaultDate, defaultUser }) {
    const [subTab, setSubTab] = useState(defaultUser ? 'user-wise' : 'all')
    
    // All Recordings state
    const [recordings, setRecordings] = useState([])
    const [loading, setLoading] = useState(true)
    const [status, setStatus] = useState(null)
    const [search, setSearch] = useState("")
    const [dateFilter, setDateFilter] = useState(defaultDate || "")
    
    // User-wise state
    const [usersWithSnapshots, setUsersWithSnapshots] = useState([])
    const [selectedUser, setSelectedUser] = useState(defaultUser || null)
    const [userSnapshots, setUserSnapshots] = useState([])
    const [loadingSnapshots, setLoadingSnapshots] = useState(false)
    
    // Storage config
    const [storageMode, setStorageMode] = useState("local")
    const [isBrowsing, setIsBrowsing] = useState(false)

    useEffect(() => {
        fetchStatus()
        fetchRecordings()
        fetchStorageMode()
        fetchUsersWithSnapshots()
    }, [])

    useEffect(() => {
        if (defaultDate && defaultDate !== dateFilter) setDateFilter(defaultDate)
    }, [defaultDate])

    useEffect(() => {
        if (defaultUser) {
            setSubTab('user-wise')
            setSelectedUser(defaultUser)
        }
    }, [defaultUser])

    useEffect(() => {
        if (selectedUser?.id) fetchUserSnapshots(selectedUser.id)
    }, [selectedUser])

    const fetchStatus = async () => {
        try {
            const res = await api.get('/api/surveillance/status')
            setStatus(res.data)
        } catch (e) { console.error('Status fetch error:', e) }
    }

    const fetchStorageMode = async () => {
        try {
            const res = await api.get('/api/surveillance/storage-mode')
            setStorageMode(res.data.mode)
        } catch (e) { console.error('Storage mode fetch error:', e) }
    }

    const updateStorageMode = async (mode) => {
        try {
            await api.post(`/api/surveillance/storage-mode?mode=${mode}`)
            setStorageMode(mode)
        } catch (e) { console.error('Storage mode update error:', e) }
    }

    const fetchRecordings = async () => {
        setLoading(true)
        try {
            const response = await api.get('/api/surveillance/recordings')
            let data = response.data.recordings || response.data || []
            if (Array.isArray(data)) {
                data.sort((a, b) => new Date(b.created_at || b.timestamp) - new Date(a.created_at || a.timestamp))
                setRecordings(data)
            }
        } catch (error) {
            setRecordings([])
        } finally { setLoading(false) }
    }

    const fetchUsersWithSnapshots = async () => {
        try {
            const res = await api.get('/api/surveillance/users-with-snapshots')
            setUsersWithSnapshots(res.data)
        } catch (e) { console.error('Users fetch error:', e) }
    }

    const fetchUserSnapshots = async (userId) => {
        setLoadingSnapshots(true)
        try {
            const res = await api.get(`/api/surveillance/user-snapshots/${userId}`)
            setUserSnapshots(res.data.snapshots || [])
        } catch (e) {
            setUserSnapshots([])
        } finally { setLoadingSnapshots(false) }
    }

    const handleBrowseFolder = async () => {
        setIsBrowsing(true)
        try {
            const res = await api.post('/api/surveillance/browse-folder')
            if (res.data.status === 'selected' && res.data.path) {
                // Update the path
                await api.post(`/api/surveillance/set-path?path=${encodeURIComponent(res.data.path)}`)
                await fetchStatus()
            }
        } catch (e) {
            console.error('Browse folder error:', e)
        } finally { setIsBrowsing(false) }
    }

    const handleOpenExplorer = async (path) => {
        if (!path) return
        try {
            await api.post(`/api/surveillance/open-explorer?local_path=${encodeURIComponent(path)}`)
        } catch (e) { console.error('Open explorer error:', e) }
    }

    const filteredRecordings = recordings.filter(rec => {
        const matchesSearch = rec.filename?.toLowerCase().includes(search.toLowerCase())
        if (!matchesSearch) return false
        if (dateFilter) {
            const recDateStr = new Date(rec.created_at || rec.timestamp).toISOString().split('T')[0]
            if (recDateStr !== dateFilter) return false
        }
        return true
    })

    const formatSize = (bytes) => {
        if (!bytes) return '0 B'
        const k = 1024, sizes = ['B', 'KB', 'MB', 'GB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const formatDate = (isoStr) => {
        if (!isoStr) return 'Unknown'
        const d = new Date(isoStr)
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' — ' + d.toLocaleDateString()
    }

    const modeOptions = [
        { value: 'local', label: 'Local Only', icon: HardDriveDownload, desc: 'Save recordings to disk only' },
        { value: 'both', label: 'Local + Cloud', icon: Cloud, desc: 'Save locally and sync to database' },
        { value: 'cloud', label: 'Cloud Only', icon: Cloud, desc: 'Upload to database only' },
    ]

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileVideo className="w-5 h-5 text-red-500" /> Recordings & Snapshots
                    </h2>
                    <p className="text-sm text-gray-400 mt-1">Manage recordings, review login snapshots</p>
                </div>
            </div>

            {/* Storage Mode Toggle + Directory Config */}
            <div className="bg-dark-card border border-dark-border rounded-xl p-5 space-y-4">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Storage Mode */}
                    <div className="flex-1">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">Save Recordings In</p>
                        <div className="flex gap-2">
                            {modeOptions.map(opt => {
                                const Icon = opt.icon
                                const active = storageMode === opt.value
                                return (
                                    <button
                                        key={opt.value}
                                        onClick={() => updateStorageMode(opt.value)}
                                        className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                                            active
                                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.15)]'
                                                : 'bg-dark-bg text-gray-400 border-dark-border hover:border-gray-600'
                                        }`}
                                        title={opt.desc}
                                    >
                                        <Icon className="w-4 h-4" />
                                        {opt.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Directory */}
                    <div className="flex-1">
                        <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">Local Directory</p>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-dark-bg border border-dark-border rounded-lg px-3 py-2.5 font-mono text-sm text-white truncate flex items-center gap-2">
                                <HardDrive className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                {status?.recordings_dir || 'Loading...'}
                            </div>
                            <button
                                onClick={handleBrowseFolder}
                                disabled={isBrowsing}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 font-medium transition whitespace-nowrap flex items-center gap-2"
                            >
                                <FolderSearch className="w-4 h-4" />
                                {isBrowsing ? 'Browsing...' : 'Browse…'}
                            </button>
                            <button
                                onClick={() => handleOpenExplorer(status?.recordings_dir)}
                                disabled={!status?.recordings_dir}
                                title="Open folder in Explorer"
                                className="bg-dark-bg hover:bg-gray-800 border border-dark-border text-white p-2.5 rounded-lg transition"
                            >
                                <FolderOpen className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub-Tab Switcher */}
            <div className="flex gap-1 bg-dark-bg/50 p-1 rounded-lg border border-dark-border w-fit">
                <button
                    onClick={() => setSubTab('all')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition ${subTab === 'all' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-400 hover:text-white border border-transparent'}`}
                >
                    <span className="flex items-center gap-2"><FileVideo className="w-4 h-4" /> All Recordings</span>
                </button>
                <button
                    onClick={() => { setSubTab('user-wise'); fetchUsersWithSnapshots() }}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition ${subTab === 'user-wise' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-400 hover:text-white border border-transparent'}`}
                >
                    <span className="flex items-center gap-2"><User className="w-4 h-4" /> User-wise Recordings</span>
                </button>
            </div>

            {/* ===== SUB-TAB: ALL RECORDINGS ===== */}
            {subTab === 'all' && (
                <>
                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 items-center justify-between bg-dark-bg/50 p-4 rounded-xl border border-dark-border">
                        <div className="relative flex-1 min-w-[200px] max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search filename..." className="w-full bg-black border border-dark-border text-white text-sm rounded-lg pl-9 pr-4 py-2 focus:border-red-500 focus:outline-none" />
                        </div>
                        <div className="flex gap-3 items-center">
                            <label className="text-sm font-medium text-gray-400 flex items-center gap-1"><Calendar className="w-4 h-4" /> Date:</label>
                            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
                                className="bg-black border border-dark-border text-white px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:border-red-500" />
                            {(dateFilter || search) && <button onClick={() => { setDateFilter(""); setSearch("") }} className="text-xs text-red-400 hover:text-red-300">Clear</button>}
                            <button onClick={fetchRecordings} className="text-gray-400 hover:text-white p-1.5 rounded bg-black border border-dark-border">
                                <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>

                    {/* Grid */}
                    {loading ? (
                        <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>
                    ) : filteredRecordings.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-gray-500 border border-dashed border-dark-border rounded-xl">
                            <FileVideo className="w-12 h-12 opacity-30 mb-3" /><p>No recordings found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredRecordings.map((rec, i) => (
                                <div key={i} className="bg-dark-card border border-dark-border rounded-xl overflow-hidden group hover:border-gray-600 transition flex flex-col">
                                    <div className="relative aspect-video bg-black">
                                        <video className="w-full h-full object-contain" controls preload="metadata"
                                            src={`${API_URL}/api/surveillance/recordings/${encodeURIComponent(rec.filename)}`}>
                                        </video>
                                    </div>
                                    <div className="p-4 flex flex-col gap-2">
                                        <h4 className="font-mono text-sm text-gray-200 truncate" title={rec.filename}>{rec.filename}</h4>
                                        <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(rec.created_at || rec.timestamp)}</span>
                                            <span>{formatSize(rec.size)}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ===== SUB-TAB: USER-WISE RECORDINGS ===== */}
            {subTab === 'user-wise' && (
                <>
                    {selectedUser ? (
                        /* User's snapshot gallery */
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <button onClick={() => { setSelectedUser(null); setUserSnapshots([]) }}
                                    className="p-2 bg-dark-bg border border-dark-border rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">{selectedUser.username}'s Login Snapshots</h3>
                                    <p className="text-xs text-gray-500">{selectedUser.email}</p>
                                </div>
                                <button onClick={() => fetchUserSnapshots(selectedUser.id)} className="ml-auto text-gray-400 hover:text-white p-1.5 rounded bg-dark-bg border border-dark-border">
                                    <RefreshCcw className={`w-4 h-4 ${loadingSnapshots ? 'animate-spin' : ''}`} />
                                </button>
                            </div>

                            {loadingSnapshots ? (
                                <div className="py-16 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>
                            ) : userSnapshots.length === 0 ? (
                                <div className="py-16 flex flex-col items-center text-gray-500 border border-dashed border-dark-border rounded-xl">
                                    <Image className="w-12 h-12 opacity-30 mb-3" /><p>No snapshots found for this user.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {userSnapshots.map((snap, i) => (
                                        <div key={i} className="bg-dark-card border border-dark-border rounded-xl overflow-hidden group hover:border-gray-600 transition">
                                            <div className="aspect-square bg-black relative">
                                                <img
                                                    src={`${API_URL}/api/surveillance/snapshot-file/${encodeURIComponent(snap.username)}/${encodeURIComponent(snap.filename)}`}
                                                    alt={snap.filename}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                                {snap.cloud_url && (
                                                    <div className="absolute top-2 right-2 bg-green-500/80 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 backdrop-blur">
                                                        <Cloud className="w-3 h-3" /> Synced
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3">
                                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> {formatDate(snap.created_at)}
                                                </p>
                                                <p className="text-[10px] text-gray-600 mt-1">{formatSize(snap.size)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* User list (folders) */
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-400">Select a user to view their login snapshots</p>
                                <button onClick={fetchUsersWithSnapshots} className="text-gray-400 hover:text-white p-1.5 rounded bg-dark-bg border border-dark-border">
                                    <RefreshCcw className="w-4 h-4" />
                                </button>
                            </div>
                            {usersWithSnapshots.length === 0 ? (
                                <div className="py-16 text-center text-gray-500">No users found.</div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {usersWithSnapshots.map(u => (
                                        <button
                                            key={u.id}
                                            onClick={() => setSelectedUser(u)}
                                            className="bg-dark-card border border-dark-border rounded-xl p-5 hover:border-blue-500/40 hover:bg-dark-bg/50 transition-all text-left group"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                                                    <User className="w-6 h-6 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-white group-hover:text-blue-400 transition truncate">{u.username}</h4>
                                                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                                                </div>
                                                <div className="text-right flex-shrink-0">
                                                    <p className="text-lg font-bold text-white">{u.snapshot_count}</p>
                                                    <p className="text-[10px] text-gray-500 uppercase">Snapshots</p>
                                                </div>
                                            </div>
                                            {u.last_login && (
                                                <p className="text-[10px] text-gray-600 mt-3 flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> Last login: {new Date(u.last_login).toLocaleString()}
                                                </p>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
