/**
 * Dark Mode Toggle Functionality
 * SecureVision - Face Recognition Authentication System
 */

class DarkModeManager {
    constructor() {
        this.STORAGE_KEY = 'securevision-theme';
        this.DARK_THEME = 'dark';
        this.LIGHT_THEME = 'light';
        this.toggleButton = null;

        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        // Load saved theme or detect system preference
        const savedTheme = this.getSavedTheme();
        const systemPreference = this.getSystemPreference();
        const theme = savedTheme || systemPreference;

        // Apply theme immediately to prevent flash
        this.applyTheme(theme);

        // Create toggle button
        this.createToggleButton();

        // Listen for system theme changes
        this.watchSystemPreference();
    }

    getSavedTheme() {
        return localStorage.getItem(this.STORAGE_KEY);
    }

    getSystemPreference() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return this.DARK_THEME;
        }
        return this.LIGHT_THEME;
    }

    getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || this.LIGHT_THEME;
    }

    applyTheme(theme) {
        if (theme === this.DARK_THEME) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }

        // Update toggle button icon
        this.updateToggleButton(theme);

        // Save to localStorage
        localStorage.setItem(this.STORAGE_KEY, theme);

        // Dispatch custom event for other scripts to listen to
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
    }

    toggleTheme() {
        const currentTheme = this.getCurrentTheme();
        const newTheme = currentTheme === this.DARK_THEME ? this.LIGHT_THEME : this.DARK_THEME;
        this.applyTheme(newTheme);

        // Add animation class
        document.body.classList.add('theme-transitioning');
        setTimeout(() => {
            document.body.classList.remove('theme-transitioning');
        }, 300);
    }

    createToggleButton() {
        // Check if button already exists
        if (document.getElementById('darkModeToggle')) {
            this.toggleButton = document.getElementById('darkModeToggle');
            this.toggleButton.addEventListener('click', () => this.toggleTheme());
            return;
        }

        // Create new button
        this.toggleButton = document.createElement('button');
        this.toggleButton.id = 'darkModeToggle';
        this.toggleButton.setAttribute('aria-label', 'Toggle dark mode');
        this.toggleButton.setAttribute('title', 'Toggle dark mode');

        // Add click handler
        this.toggleButton.addEventListener('click', () => this.toggleTheme());

        // Update icon based on current theme
        const currentTheme = this.getCurrentTheme();
        this.updateToggleButton(currentTheme);

        // Add to body
        document.body.appendChild(this.toggleButton);
    }

    updateToggleButton(theme) {
        if (!this.toggleButton) return;

        if (theme === this.DARK_THEME) {
            this.toggleButton.innerHTML = '<i class="bi bi-sun-fill"></i>';
            this.toggleButton.setAttribute('title', 'Switch to light mode');
        } else {
            this.toggleButton.innerHTML = '<i class="bi bi-moon-stars-fill"></i>';
            this.toggleButton.setAttribute('title', 'Switch to dark mode');
        }
    }

    watchSystemPreference() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

            // Use addEventListener if available, otherwise use addListener
            if (mediaQuery.addEventListener) {
                mediaQuery.addEventListener('change', (e) => {
                    // Only auto-switch if user hasn't manually set a preference
                    if (!this.getSavedTheme()) {
                        const newTheme = e.matches ? this.DARK_THEME : this.LIGHT_THEME;
                        this.applyTheme(newTheme);
                    }
                });
            } else if (mediaQuery.addListener) {
                // Fallback for older browsers
                mediaQuery.addListener((e) => {
                    if (!this.getSavedTheme()) {
                        const newTheme = e.matches ? this.DARK_THEME : this.LIGHT_THEME;
                        this.applyTheme(newTheme);
                    }
                });
            }
        }
    }

    // Public API
    setTheme(theme) {
        if (theme !== this.DARK_THEME && theme !== this.LIGHT_THEME) {
            console.error('Invalid theme. Use "dark" or "light".');
            return;
        }
        this.applyTheme(theme);
    }

    resetTheme() {
        localStorage.removeItem(this.STORAGE_KEY);
        const systemPreference = this.getSystemPreference();
        this.applyTheme(systemPreference);
    }
}

// Initialize dark mode manager
const darkMode = new DarkModeManager();

// Expose to global scope for console access
window.darkMode = darkMode;

// Add keyboard shortcut (Ctrl/Cmd + Shift + D)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        darkMode.toggleTheme();
    }
});

console.log('🌓 Dark Mode initialized. Press Ctrl+Shift+D to toggle or click the button.');
