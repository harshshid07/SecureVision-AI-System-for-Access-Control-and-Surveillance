/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                // Old project color scheme
                'primary-blue': '#00d4ff',
                'secondary-blue': '#0099cc',

                // Dark mode colors (existing)
                'dark-bg': '#0a0e1a',
                'dark-card': '#141824',
                'dark-border': '#1e2436',
                'dark-text': '#e5e7eb',
                'dark-muted': '#9ca3af',

                // Primary palette (enhanced)
                primary: {
                    50: '#e6f7ff',
                    100: '#b3ebff',
                    200: '#80dfff',
                    300: '#4dd3ff',
                    400: '#1ac7ff',
                    500: '#00d4ff', // primary-blue
                    600: '#00a3cc',
                    700: '#007299',
                    800: '#004166',
                    900: '#001033',
                },
                secondary: {
                    500: '#0099cc', // secondary-blue
                },
                // Dark theme
                dark: {
                    bg: '#0a0e1a',
                    card: '#141824',
                    border: '#1e2436',
                    text: '#e5e7eb',
                    muted: '#9ca3af',
                }
            },
            animation: {
                'float': 'float 6s ease-in-out infinite',
                'shimmer': 'shimmer 3s linear infinite',
                'scan': 'scan 2s ease-in-out infinite',
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'gradient': 'gradient 3s ease infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
                    '50%': { transform: 'translateY(-20px) rotate(180deg)' },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                scan: {
                    '0%': { transform: 'translateY(0)' },
                    '100%': { transform: 'translateY(276px)' },
                },
                gradient: {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                }
            },
            boxShadow: {
                'primary-glow': '0 0 30px rgba(0, 212, 255, 0.3)',
                'glass': '0 20px 40px rgba(0, 0, 0, 0.3)',
            },
            backdropBlur: {
                'glass': '20px',
            },
        },
    },
    plugins: [],
}
