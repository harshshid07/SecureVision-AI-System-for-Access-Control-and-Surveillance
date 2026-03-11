/**
 * WebcamCapture Component
 * Captures user's face using getUserMedia API
 * Returns base64 encoded image
 */
import { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react'
import { Camera, CameraOff } from 'lucide-react'

const WebcamCapture = forwardRef(({ onCapture, isCapturing = false, hideButton = false }, ref) => {
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const [stream, setStream] = useState(null)
    const [error, setError] = useState(null)
    const [isCameraActive, setIsCameraActive] = useState(false)

    useEffect(() => {
        startCamera()
        return () => stopCamera()
    }, [])

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            })

            setStream(mediaStream)
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream
            }
            setIsCameraActive(true)
            setError(null)
        } catch (err) {
            console.error('Camera access error:', err)
            setError('Camera access denied. Please allow camera permissions.')
        }
    }

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
            setStream(null)
            setIsCameraActive(false)
        }
    }

    const captureImage = () => {
        return new Promise((resolve, reject) => {
            if (!videoRef.current || !canvasRef.current) {
                reject(new Error('Video or canvas not available'))
                return
            }

            const video = videoRef.current
            const canvas = canvasRef.current
            const context = canvas.getContext('2d')

            // Check if video is ready and has dimensions
            if (video.videoWidth === 0 || video.videoHeight === 0) {
                console.error('Video not ready - dimensions:', video.videoWidth, 'x', video.videoHeight)
                reject(new Error('Camera not ready. Please wait for the video feed to start.'))
                return
            }

            // Set canvas dimensions to match video
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight

            console.log('Capturing image:', video.videoWidth, 'x', video.videoHeight)

            // Draw current video frame to canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height)

            // Convert to base64 with JPEG (no alpha channel) for DeepFace compatibility
            const imageData = canvas.toDataURL('image/jpeg', 0.9)

            // Validate the captured image
            if (!imageData || imageData === 'data:,') {
                reject(new Error('Failed to capture image from canvas'))
                return
            }

            console.log('Captured image length:', imageData.length)

            if (onCapture) {
                onCapture(imageData)
            }

            resolve(imageData)
        })
    }

    // Expose captureImage method to parent via ref
    useImperativeHandle(ref, () => ({
        captureImage
    }))

    const handleCapture = () => {
        captureImage().catch(err => {
            console.error('Capture failed:', err)
        })
    }

    return (
        <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden bg-dark-card border border-dark-border">
                {error ? (
                    <div className="aspect-video flex items-center justify-center p-8 text-center">
                        <div>
                            <CameraOff className="w-16 h-16 mx-auto mb-4 text-red-400" />
                            <p className="text-red-400">{error}</p>
                            <button onClick={startCamera} className="btn-secondary mt-4">
                                Retry Camera Access
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full aspect-video object-cover"
                        />
                        {isCameraActive && (
                            <div className="absolute top-4 right-4">
                                <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/50 text-green-400 px-3 py-1 rounded-full text-sm">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    Live
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            {!hideButton && (
                <button
                    onClick={handleCapture}
                    disabled={!isCameraActive || isCapturing}
                    className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Camera className="w-5 h-5" />
                    {isCapturing ? 'Processing...' : 'Capture Face'}
                </button>
            )}

            <div className="alert alert-info">
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm">
                    <p className="font-medium">Tips for best results:</p>
                    <ul className="mt-1 space-y-1 text-xs">
                        <li>• Ensure good lighting on your face</li>
                        <li>• Position your face in the center</li>
                        <li>• Only one person should be visible</li>
                        <li>• Look directly at the camera</li>
                    </ul>
                </div>
            </div>
        </div>
    )
})

WebcamCapture.displayName = 'WebcamCapture'

export default WebcamCapture
