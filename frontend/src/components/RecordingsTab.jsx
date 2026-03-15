import { useState, useEffect, useRef } from 'react'
import { FolderOpen, Search, RefreshCcw, FileVideo, HardDrive, Clock, User, Image, Cloud, ChevronLeft, FolderSearch, MoreVertical, X, Trash2, Eye, Calendar } from 'lucide-react'
import { KioskSelect, KioskDateInput, KioskConfirm, KioskToast } from './KioskUI'
import api from '../lib/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const STORAGE_OPTIONS = [
    { value: 'local', label: '💾 Local System Only' },
    { value: 'both',  label: '☁️ Local + Cloud (Supabase)' },
]

/* ===== 3-Dot Menu ===== */
function ItemMenu({ onView, onDelete }) {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)
    useEffect(() => {
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])
    return (
        <div ref={ref} className="relative">
            <button onClick={(e) => { e.stopPropagation(); setOpen(!open) }} 
                style={{ backgroundColor: 'rgba(0,0,0,0.8)', color: '#ffffff' }}
                className="p-1.5 rounded-lg hover:bg-black text-white backdrop-blur transition">
                <MoreVertical className="w-4 h-4" />
            </button>
            {open && (
                <div style={{ backgroundColor: '#1a1a2e', borderColor: '#3a3a5e', minWidth: '120px' }}
                    className="absolute right-0 top-full mt-1 border rounded-lg shadow-2xl z-50 overflow-hidden">
                    <button onClick={(e) => { e.stopPropagation(); setOpen(false); onView() }} 
                        style={{ color: '#e2e8f0', backgroundColor: 'transparent' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a4e'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm transition font-medium">
                        <Eye className="w-4 h-4" style={{ color: '#94a3b8' }} /> View
                    </button>
                    <div style={{ height: '1px', backgroundColor: '#2a2a3e', width: '100%' }}></div>
                    <button onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete() }} 
                        style={{ color: '#f87171', backgroundColor: 'transparent' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        className="w-full flex items-center gap-2 px-3 py-2.5 text-sm transition font-medium">
                        <Trash2 className="w-4 h-4" style={{ color: '#f87171' }} /> Delete
                    </button>
                </div>
            )}
        </div>
    )
}

/* ===== Enlarge Modal ===== */
function EnlargeModal({ item, onClose }) {
    if (!item) return null
    return (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm" onClick={onClose}>
            <div className="relative bg-[#12121e] border border-[#2a2a3e] rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a3e]">
                    <div>
                        <p className="text-sm font-medium text-white">{item.filename}</p>
                        <p className="text-xs text-gray-500">{item.username ? `User: ${item.username}` : 'Surveillance Recording'}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#2a2a3e] text-gray-400 hover:text-white transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 flex items-center justify-center bg-black p-2 overflow-hidden">
                    {item.type === 'video' ? (
                        <video controls autoPlay className="max-w-full max-h-[65vh] rounded" src={`${API_URL}${item.url}`} />
                    ) : (
                        <img src={`${API_URL}${item.url}`} alt={item.filename} className="max-w-full max-h-[65vh] rounded object-contain" />
                    )}
                </div>
            </div>
        </div>
    )
}


export default function RecordingsTab({ defaultDate, defaultUser }) {
    const [subTab, setSubTab] = useState(defaultUser ? 'user-wise' : 'all')
    const [allItems, setAllItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [status, setStatus] = useState(null)
    const [search, setSearch] = useState("")
    const [dateFilter, setDateFilter] = useState(defaultDate || "")
    const [usersWithSnapshots, setUsersWithSnapshots] = useState([])
    const [selectedUser, setSelectedUser] = useState(defaultUser || null)
    const [userSnapshots, setUserSnapshots] = useState([])
    const [loadingSnapshots, setLoadingSnapshots] = useState(false)
    const [storageMode, setStorageMode] = useState("local")
    const [isBrowsing, setIsBrowsing] = useState(false)
    const [enlargedItem, setEnlargedItem] = useState(null)
    const [confirmDelete, setConfirmDelete] = useState(null)
    const [toast, setToast] = useState(null)

    useEffect(() => { fetchStatus(); fetchAllItems(); fetchStorageMode(); fetchUsersWithSnapshots() }, [])
    useEffect(() => { if (defaultDate && defaultDate !== dateFilter) setDateFilter(defaultDate) }, [defaultDate])
    useEffect(() => { if (defaultUser) { setSubTab('user-wise'); setSelectedUser(defaultUser) } }, [defaultUser])
    useEffect(() => { if (selectedUser?.id) fetchUserSnapshots(selectedUser.id) }, [selectedUser])

    const fetchStatus = async () => { try { const r = await api.get('/api/surveillance/status'); setStatus(r.data) } catch(e){} }
    const fetchStorageMode = async () => { try { const r = await api.get('/api/surveillance/storage-mode'); setStorageMode(r.data.mode) } catch(e){} }
    const updateStorageMode = async (m) => { try { await api.post(`/api/surveillance/storage-mode?mode=${m}`); setStorageMode(m); setToast({msg:'Storage mode updated', type:'success'}) } catch(e){} }
    const fetchAllItems = async () => { setLoading(true); try { const r = await api.get('/api/surveillance/all-recordings'); setAllItems(Array.isArray(r.data)?r.data:[]) } catch(e){ setAllItems([]) } finally { setLoading(false) } }
    const fetchUsersWithSnapshots = async () => { try { const r = await api.get('/api/surveillance/users-with-snapshots'); setUsersWithSnapshots(r.data) } catch(e){} }
    const fetchUserSnapshots = async (uid) => { setLoadingSnapshots(true); try { const r = await api.get(`/api/surveillance/user-snapshots/${uid}`); setUserSnapshots(r.data.snapshots||[]) } catch(e){ setUserSnapshots([]) } finally { setLoadingSnapshots(false) } }

    const handleBrowseFolder = async () => {
        setIsBrowsing(true)
        try {
            const r = await api.post('/api/surveillance/browse-folder')
            if (r.data.status === 'selected' && r.data.path) {
                await api.post(`/api/surveillance/set-path?path=${encodeURIComponent(r.data.path)}`)
                await fetchStatus()
                await fetchAllItems()
                setToast({msg:'Save location updated!', type:'success'})
            }
        } catch(e){} finally { setIsBrowsing(false) }
    }
    const handleOpenExplorer = async (path) => { if(!path) return; try { await api.post(`/api/surveillance/open-explorer?local_path=${encodeURIComponent(path)}`) } catch(e){} }

    const doDelete = async (item) => {
        try {
            if (item.type === 'video') await api.delete(`/api/surveillance/recordings/${encodeURIComponent(item.filename)}`)
            else await api.delete(`/api/surveillance/snapshot/${encodeURIComponent(item.username)}/${encodeURIComponent(item.filename)}`)
            setToast({msg:'Deleted successfully', type:'success'})
            fetchAllItems()
            if (selectedUser?.id) fetchUserSnapshots(selectedUser.id)
        } catch(e) { setToast({msg:'Delete failed', type:'error'}) }
    }

    const filteredItems = allItems.filter(item => {
        if (search && !item.filename?.toLowerCase().includes(search.toLowerCase())) return false
        if (dateFilter) { const d = new Date(item.created_at).toISOString().split('T')[0]; if (d !== dateFilter) return false }
        return true
    })

    const fmtSize = (b) => { if(!b) return '0 B'; const k=1024,s=['B','KB','MB','GB'],i=Math.floor(Math.log(b)/Math.log(k)); return parseFloat((b/Math.pow(k,i)).toFixed(1))+' '+s[i] }
    const fmtDate = (iso) => { if(!iso) return '—'; const d = new Date(iso); return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+' — '+d.toLocaleDateString() }

    return (
        <div className="space-y-5">
            <EnlargeModal item={enlargedItem} onClose={() => setEnlargedItem(null)} />
            <KioskConfirm open={!!confirmDelete} title="Delete File" message={`Delete "${confirmDelete?.filename}"? This cannot be undone.`}
                onConfirm={() => { doDelete(confirmDelete); setConfirmDelete(null) }} onCancel={() => setConfirmDelete(null)} />
            <KioskToast message={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />

            {/* Header */}
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2"><FileVideo className="w-5 h-5 text-red-500" /> Recordings & Snapshots</h2>
                <p className="text-sm text-gray-500 mt-1">Manage recordings, review login snapshots</p>
            </div>

            {/* Config Row */}
            <div className="bg-[#12121e] border border-[#1e1e30] rounded-xl p-5">
                <div className="flex flex-col lg:flex-row gap-5 items-end">
                    <div className="w-full lg:w-[220px]">
                        <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-2">Save Recordings In</label>
                        <KioskSelect value={storageMode} onChange={updateStorageMode} options={STORAGE_OPTIONS} />
                    </div>
                    <div className="flex-1 w-full">
                        <label className="text-xs text-gray-500 font-medium uppercase tracking-wider block mb-2">Local Directory</label>
                        <div className="flex gap-2">
                            <div className="flex-1 bg-[#0a0a14] border border-[#1e1e30] rounded-lg px-3 py-2.5 font-mono text-sm text-white truncate flex items-center gap-2">
                                <HardDrive className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                {status?.recordings_dir || '…'}
                            </div>
                            <button onClick={handleBrowseFolder} disabled={isBrowsing}
                                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg px-4 font-medium transition whitespace-nowrap flex items-center gap-2 text-sm">
                                <FolderSearch className="w-4 h-4" /> {isBrowsing ? 'Waiting…' : 'Browse…'}
                            </button>
                            <button onClick={() => handleOpenExplorer(status?.recordings_dir)} disabled={!status?.recordings_dir}
                                title="Open in Explorer" className="bg-[#1a1a2e] hover:bg-[#2a2a3e] border border-[#2a2a3e] text-white p-2.5 rounded-lg transition">
                                <FolderOpen className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub-Tab Switcher */}
            <div className="flex gap-1 bg-[#0a0a14] p-1 rounded-lg border border-[#1e1e30] w-fit">
                {[{id:'all', label:'All Recordings', icon: FileVideo}, {id:'user-wise', label:'User-wise', icon: User}].map(t => (
                    <button key={t.id} onClick={() => { setSubTab(t.id); if(t.id==='all') fetchAllItems(); else fetchUsersWithSnapshots() }}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-2 ${subTab===t.id ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-gray-500 hover:text-white border border-transparent'}`}>
                        <t.icon className="w-4 h-4" /> {t.label}
                    </button>
                ))}
            </div>

            {/* ==== ALL RECORDINGS ==== */}
            {subTab === 'all' && (<>
                <div className="flex flex-wrap gap-3 items-center justify-between bg-[#0a0a14] p-3 rounded-xl border border-[#1e1e30]">
                    <div className="relative flex-1 min-w-[180px] max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                            className="w-full bg-[#12121e] border border-[#1e1e30] text-white text-sm rounded-lg pl-9 pr-3 py-2 focus:outline-none focus:border-red-500" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <KioskDateInput value={dateFilter} onChange={setDateFilter} />
                        {(dateFilter || search) && <button onClick={() => { setDateFilter(''); setSearch('') }} className="text-xs text-red-400 hover:text-red-300 ml-1">Clear</button>}
                        <button onClick={fetchAllItems} className="text-gray-500 hover:text-white p-1.5 rounded bg-[#12121e] border border-[#1e1e30] ml-1">
                            <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>
                ) : filteredItems.length === 0 ? (
                    <div className="py-20 flex flex-col items-center text-gray-600 border border-dashed border-[#1e1e30] rounded-xl">
                        <FileVideo className="w-12 h-12 opacity-30 mb-3" /><p>No recordings or snapshots found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {filteredItems.map((item, i) => (
                            <div key={i} className="bg-[#12121e] border border-[#1e1e30] rounded-xl overflow-hidden group hover:border-[#3a3a5e] transition flex flex-col">
                                <div className="relative aspect-video bg-black">
                                    {item.type === 'video' ? (
                                        <video className="w-full h-full object-contain" preload="metadata" src={`${API_URL}${item.url}`} />
                                    ) : (
                                        <img src={`${API_URL}${item.url}`} alt="" className="w-full h-full object-cover" loading="lazy" />
                                    )}
                                    <span className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-medium backdrop-blur ${item.type==='video' ? 'bg-blue-500/70 text-white' : 'bg-amber-500/70 text-white'}`}>
                                        {item.type === 'video' ? '🎬 Video' : '📸 Snapshot'}
                                    </span>
                                    {item.username && <span className="absolute top-2 right-10 text-[10px] bg-purple-500/70 text-white px-2 py-0.5 rounded-full backdrop-blur">👤 {item.username}</span>}
                                    <div className="absolute top-2 right-2"><ItemMenu onView={() => setEnlargedItem(item)} onDelete={() => setConfirmDelete(item)} /></div>
                                </div>
                                <div className="p-3 cursor-pointer" onClick={() => setEnlargedItem(item)}>
                                    <h4 className="font-mono text-xs text-gray-300 truncate">{item.filename}</h4>
                                    <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1.5">
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtDate(item.created_at)}</span>
                                        <span>{fmtSize(item.size)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </>)}

            {/* ==== USER-WISE ==== */}
            {subTab === 'user-wise' && (<>
                {selectedUser ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <button onClick={() => { setSelectedUser(null); setUserSnapshots([]) }}
                                className="p-2 bg-[#12121e] border border-[#1e1e30] rounded-lg hover:bg-[#2a2a3e] text-gray-400 hover:text-white transition">
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div>
                                <h3 className="text-lg font-semibold text-white">{selectedUser.username}'s Snapshots</h3>
                                <p className="text-xs text-gray-500">{selectedUser.email}</p>
                            </div>
                            <button onClick={() => fetchUserSnapshots(selectedUser.id)} className="ml-auto text-gray-500 hover:text-white p-1.5 rounded bg-[#12121e] border border-[#1e1e30]">
                                <RefreshCcw className={`w-4 h-4 ${loadingSnapshots ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                        {loadingSnapshots ? (
                            <div className="py-16 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" /></div>
                        ) : userSnapshots.length === 0 ? (
                            <div className="py-16 flex flex-col items-center text-gray-600 border border-dashed border-[#1e1e30] rounded-xl">
                                <Image className="w-12 h-12 opacity-30 mb-3" /><p>No snapshots found.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                {userSnapshots.map((snap, i) => {
                                    const si = { type:'snapshot', filename:snap.filename, username:snap.username, url:`/api/surveillance/snapshot-file/${encodeURIComponent(snap.username)}/${encodeURIComponent(snap.filename)}`, size:snap.size, created_at:snap.created_at }
                                    return (
                                        <div key={i} className="bg-[#12121e] border border-[#1e1e30] rounded-xl overflow-hidden hover:border-[#3a3a5e] transition">
                                            <div className="aspect-square bg-black relative">
                                                <img src={`${API_URL}${si.url}`} alt="" className="w-full h-full object-cover cursor-pointer" loading="lazy" onClick={() => setEnlargedItem(si)} />
                                                {snap.cloud_url && <div className="absolute top-2 left-2 bg-green-500/80 text-white text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1 backdrop-blur"><Cloud className="w-3 h-3" /> Synced</div>}
                                                <div className="absolute top-2 right-2"><ItemMenu onView={() => setEnlargedItem(si)} onDelete={() => setConfirmDelete(si)} /></div>
                                            </div>
                                            <div className="p-2.5">
                                                <p className="text-[11px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtDate(snap.created_at)}</p>
                                                <p className="text-[10px] text-gray-600 mt-0.5">{fmtSize(snap.size)}</p>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">Select a user to view their login snapshots</p>
                            <button onClick={fetchUsersWithSnapshots} className="text-gray-500 hover:text-white p-1.5 rounded bg-[#12121e] border border-[#1e1e30]"><RefreshCcw className="w-4 h-4" /></button>
                        </div>
                        {usersWithSnapshots.length === 0 ? (
                            <div className="py-16 text-center text-gray-600">No users found.</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {usersWithSnapshots.map(u => (
                                    <button key={u.id} onClick={() => setSelectedUser(u)}
                                        className="bg-[#12121e] border border-[#1e1e30] rounded-xl p-5 hover:border-blue-500/40 hover:bg-[#16162a] transition-all text-left group">
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
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </>)}
        </div>
    )
}
