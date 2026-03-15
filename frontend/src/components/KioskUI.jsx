/**
 * KioskUI.jsx — Custom UI components for PyQt5 QtWebEngine kiosk.
 * 
 * Pure-DOM replacements for native OS popups (select, date, confirm, alert)
 * that conflict with kiosk's always-on-top/focus-stealing.
 */
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, AlertTriangle } from 'lucide-react'

/* ──────────────── CUSTOM DROPDOWN ──────────────── */
export function KioskSelect({ value, onChange, options, className = '' }) {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
        document.addEventListener('mousedown', close)
        return () => document.removeEventListener('mousedown', close)
    }, [])

    const selected = options.find(o => o.value === value)

    return (
        <div ref={ref} className={`relative ${className}`} style={{ position: 'relative' }}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                    background: '#1a1a2e', border: '1px solid #2e2e48', color: '#ffffff',
                    borderRadius: '8px', padding: '10px 12px', fontSize: '14px',
                    cursor: 'pointer', outline: 'none',
                }}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#ffffff' }}>
                    {selected?.label || 'Select…'}
                </span>
                <ChevronDown style={{ width: 16, height: 16, color: '#9ca3af', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }} />
            </button>
            {open && (
                <div style={{
                    position: 'absolute', zIndex: 9999, top: '100%', left: 0, right: 0, marginTop: '4px',
                    background: '#1e1e34', border: '1px solid #2e2e48', borderRadius: '8px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)', maxHeight: '200px', overflowY: 'auto',
                }}>
                    {options.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => { onChange(opt.value); setOpen(false) }}
                            style={{
                                width: '100%', textAlign: 'left', padding: '10px 12px',
                                fontSize: '14px', cursor: 'pointer', border: 'none',
                                background: opt.value === value ? 'rgba(59,130,246,0.15)' : 'transparent',
                                color: opt.value === value ? '#60a5fa' : '#e5e7eb',
                                display: 'block',
                            }}
                            onMouseEnter={(e) => { e.target.style.background = '#2a2a48' }}
                            onMouseLeave={(e) => { e.target.style.background = opt.value === value ? 'rgba(59,130,246,0.15)' : 'transparent' }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

/* ──────────────── CUSTOM DATE INPUT ──────────────── */
export function KioskDateInput({ value, onChange, min, max, className = '' }) {
    const [draft, setDraft] = useState(value || '')
    useEffect(() => { setDraft(value || '') }, [value])

    const commit = () => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(draft)) {
            const d = new Date(draft)
            if (!isNaN(d.getTime())) {
                if (min && draft < min) { onChange(min); return }
                if (max && draft > max) { onChange(max); return }
                onChange(draft); return
            }
        }
        setDraft(value || '')
    }

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }} className={className}>
            <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
                placeholder="YYYY-MM-DD"
                style={{
                    background: '#0c0c18', border: '1px solid #2e2e48', color: '#ffffff',
                    padding: '6px 10px', borderRadius: '6px', fontSize: '13px', width: '125px',
                    fontFamily: 'monospace', outline: 'none',
                }}
                onFocus={(e) => { e.target.style.borderColor = '#ef4444' }}
            />
            <button onClick={() => onChange(today)} style={{
                fontSize: '11px', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', border: '1px solid',
                background: value === today ? 'rgba(239,68,68,0.2)' : '#1a1a2e',
                color: value === today ? '#f87171' : '#9ca3af',
                borderColor: value === today ? 'rgba(239,68,68,0.3)' : '#2e2e48',
            }}>Today</button>
            <button onClick={() => onChange(yesterday)} style={{
                fontSize: '11px', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', border: '1px solid',
                background: value === yesterday ? 'rgba(239,68,68,0.2)' : '#1a1a2e',
                color: value === yesterday ? '#f87171' : '#9ca3af',
                borderColor: value === yesterday ? 'rgba(239,68,68,0.3)' : '#2e2e48',
            }}>Yesterday</button>
        </div>
    )
}

/* ──────────────── CUSTOM CONFIRM DIALOG ──────────────── */
export function KioskConfirm({ open, title, message, onConfirm, onCancel }) {
    if (!open) return null
    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px',
        }}>
            <div style={{
                background: '#1a1a30', border: '1px solid #2e2e48', borderRadius: '16px',
                maxWidth: '420px', width: '100%', padding: '24px', boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
            }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AlertTriangle style={{ width: 20, height: 20, color: '#f87171' }} />
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff', margin: 0 }}>{title || 'Confirm'}</h3>
                </div>
                <p style={{ fontSize: '14px', color: '#a0a0b8', marginBottom: '24px' }}>{message}</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button onClick={onCancel} style={{
                        padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
                        background: '#2a2a44', color: '#d0d0dd', border: 'none', cursor: 'pointer',
                    }}>Cancel</button>
                    <button onClick={onConfirm} style={{
                        padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
                        background: '#ef4444', color: '#ffffff', border: 'none', cursor: 'pointer',
                    }}>Delete</button>
                </div>
            </div>
        </div>
    )
}

/* ──────────────── CUSTOM TOAST ──────────────── */
export function KioskToast({ message, type = 'info', onClose }) {
    useEffect(() => {
        if (!message) return
        const t = setTimeout(onClose, 3000)
        return () => clearTimeout(t)
    }, [message])

    if (!message) return null

    const colors = { success: '#22c55e', error: '#ef4444', info: '#3b82f6' }
    return (
        <div style={{
            position: 'fixed', bottom: 24, right: 24, zIndex: 99999,
            padding: '12px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
            color: '#ffffff', background: colors[type] || colors.info,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', gap: '10px',
        }}>
            {message}
            <button onClick={onClose} style={{ opacity: 0.7, cursor: 'pointer', background: 'none', border: 'none', color: '#fff', padding: 0 }}>
                <X style={{ width: 14, height: 14 }} />
            </button>
        </div>
    )
}
