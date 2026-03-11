/**
 * AnimatedBackground Component
 * Displays floating orbs with gradient background
 */

export function AnimatedBackground() {
    return (
        <div className="fixed inset-0 -z-10 overflow-hidden bg-gradient-to-br from-dark-bg via-dark-card to-dark-bg">
            {/* Animated gradient orbs */}
            <div className="absolute top-0 -left-4 w-96 h-96 bg-primary-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-float opacity-70"></div>
            <div className="absolute top-0 -right-4 w-96 h-96 bg-secondary-500/20 rounded-full mix-blend-multiply filter blur-3xl animate-float animation-delay-2000 opacity-70"></div>
            <div className="absolute -bottom-8 left-20 w-96 h-96 bg-primary-400/20 rounded-full mix-blend-multiply filter blur-3xl animate-float animation-delay-4000 opacity-70"></div>

            {/* Grid pattern overlay */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20"></div>
        </div>
    )
}
