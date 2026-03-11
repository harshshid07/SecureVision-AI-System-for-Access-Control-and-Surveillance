/**
 * StatusIndicator Component
 * Animated pulsing status dot
 */

export function StatusIndicator({ status = 'active', label }) {
    const getStatusColor = () => {
        switch (status) {
            case 'active':
                return 'bg-green-500'
            case 'blocked':
                return 'bg-red-500'
            case 'pending':
                return 'bg-yellow-500'
            default:
                return 'bg-gray-500'
        }
    }

    return (
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`}></div>
            {label && <span className="text-sm text-dark-muted">{label}</span>}
        </div>
    )
}
