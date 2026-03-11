/**
 * LockScreen - Face-unlock overlay for kiosk inactivity auto-lock
 * [2026-03-11] Phase 4: Auto-Lock & Session Resume
 * 
 * This component is rendered as a full-screen overlay when the kiosk
 * detects inactivity. The user must verify their face to resume.
 * Failed attempts are uploaded to the security-audits bucket.
 */
import { useState, useRef, useCallback, useEffect } from 'react'
import { Lock, Camera, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react'
import api from '../lib/api'

export default function LockScreen({ onUnlock, lockedUsername }) {
    const [status, setStatus] = useState('locked') // locked | verifying | failed | success
    const [errorMsg, setErrorMsg] = useState('')
    const [failCount, setFailCount] = useState(0)
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const streamRef = useRef(null)

    // Start camera on mount
    useEffect(() => {
        startCamera()
        return () => stopCamera()
    }, [])

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480, facingMode: 'user' }
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
            }
        } catch (e) {
            console.error('Camera error:', e)
            setErrorMsg('Camera access denied. Please allow camera permissions.')
        }
    }

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop())
            streamRef.current = null
        }
    }

    const captureFrame = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return null
        const video = videoRef.current
        const canvas = canvasRef.current

        // Validate video is actually playing
        if (video.videoWidth === 0 || video.videoHeight === 0) return null

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(video, 0, 0)

        // Return as JPEG base64
        return canvas.toDataURL('image/jpeg', 0.85)
    }, [])

    const attemptUnlock = async () => {
        setStatus('verifying')
        setErrorMsg('')

        const frame = captureFrame()
        if (!frame) {
            setStatus('failed')
            setErrorMsg('Could not capture face. Ensure camera is working.')
            return
        }

        try {
            const response = await api.post('/api/auth/verify-unlock', {
                username: lockedUsername,
                face_image: frame,
            })

            if (response.data.success) {
                setStatus('success')
                stopCamera()
                // Brief success animation then unlock
                setTimeout(() => {
                    onUnlock()
                }, 1200)
            } else {
                setStatus('failed')
                setFailCount(prev => prev + 1)
                setErrorMsg(response.data.message || 'Face verification failed.')
            }
        } catch (error) {
            setStatus('failed')
            setFailCount(prev => prev + 1)
            const msg = error.response?.data?.detail || error.response?.data?.message || 'Verification error.'
            setErrorMsg(msg)
        }
    }

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const currentDate = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl">
            {/* Subtle animated gradient */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Lock Screen Content */}
            <div className="relative z-10 flex flex-col items-center gap-6 max-w-md w-full px-8">
                {/* Clock */}
                <div className="text-center mb-4">
                    <p className="text-6xl font-thin text-white tracking-tight">{currentTime}</p>
                    <p className="text-lg text-gray-400 mt-2">{currentDate}</p>
                </div>

                {/* Lock Icon / Status */}
                <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 ${
                    status === 'locked' ? 'bg-red-500/20 border-2 border-red-500/50' :
                    status === 'verifying' ? 'bg-blue-500/20 border-2 border-blue-500/50 animate-pulse' :
                    status === 'failed' ? 'bg-red-500/30 border-2 border-red-500/70' :
                    'bg-green-500/20 border-2 border-green-500/50'
                }`}>
                    {status === 'locked' && <Lock className="w-8 h-8 text-red-400" />}
                    {status === 'verifying' && <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />}
                    {status === 'failed' && <AlertTriangle className="w-8 h-8 text-red-400" />}
                    {status === 'success' && <ShieldCheck className="w-8 h-8 text-green-400" />}
                </div>

                {/* Status Text */}
                <div className="text-center">
                    <p className="text-white text-lg font-medium">
                        {status === 'locked' && 'Session Locked'}
                        {status === 'verifying' && 'Verifying face...'}
                        {status === 'failed' && 'Unlock Failed'}
                        {status === 'success' && 'Welcome back!'}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                        {status === 'locked' && `Locked due to inactivity • ${lockedUsername}`}
                        {status === 'verifying' && 'Hold still while we verify your identity'}
                        {status === 'failed' && errorMsg}
                        {status === 'success' && 'Resuming your session...'}
                    </p>
                </div>

                {/* Camera Preview */}
                <div className="relative w-64 h-48 rounded-2xl overflow-hidden border-2 border-gray-700 bg-gray-900">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover mirror"
                        style={{ transform: 'scaleX(-1)' }}
                    />
                    {/* Scanning overlay */}
                    {status === 'verifying' && (
                        <div className="absolute inset-0 border-2 border-blue-400/50 rounded-2xl">
                            <div className="absolute inset-x-0 h-0.5 bg-blue-400 animate-scan" />
                        </div>
                    )}
                    {status === 'success' && (
                        <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                            <ShieldCheck className="w-16 h-16 text-green-400" />
                        </div>
                    )}
                </div>
                <canvas ref={canvasRef} className="hidden" />

                {/* Unlock Button */}
                {(status === 'locked' || status === 'failed') && (
                    <button
                        onClick={attemptUnlock}
                        className="flex items-center gap-3 px-8 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                    >
                        <Camera className="w-5 h-5" />
                        Unlock with Face
                    </button>
                )}

                {/* Fail Counter */}
                {failCount > 0 && status !== 'success' && (
                    <p className="text-xs text-red-400/70">
                        {failCount} failed attempt{failCount > 1 ? 's' : ''} — snapshots uploaded to security audit
                    </p>
                )}
            </div>

            {/* Bottom branding */}
            <div className="absolute bottom-8 flex items-center gap-2 text-gray-600 text-xs">
                <Lock className="w-3 h-3" />
                SecureVision Kiosk • Auto-Lock Protection
            </div>

            {/* Scanning animation CSS */}
            <style>{`
                @keyframes scan {
                    0% { top: 0; }
                    50% { top: 100%; }
                    100% { top: 0; }
                }
                .animate-scan {
                    animation: scan 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    )
}
