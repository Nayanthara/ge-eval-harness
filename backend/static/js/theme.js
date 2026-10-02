/**
 * Theme Management (Light / Dark Mode)
 */

function initTheme() {
    const saved = localStorage.getItem('eval_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(saved);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('eval_theme', theme);
    const icon = document.getElementById('theme-toggle-icon');
    const label = document.getElementById('theme-toggle-label');
    if (icon && label) {
        if (theme === 'dark') {
            icon.textContent = '☀️';
            label.textContent = 'Light Mode';
        } else {
            icon.textContent = '🌙';
            label.textContent = 'Dark Mode';
        }
    }
    window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme } }));
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
}

// Global exposure
window.initTheme = initTheme;
window.setTheme = setTheme;
window.toggleTheme = toggleTheme;

// Auto-run theme initialization
initTheme();
