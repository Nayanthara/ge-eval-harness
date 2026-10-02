/**
 * Utility Functions & XSRF Fetch Interceptor
 */

// XSRF Token Fetch Interceptor
(function setupXsrfInterceptor() {
    const originalFetch = window.fetch;
    window.fetch = function(url, options = {}) {
        const method = (options.method || 'GET').toUpperCase();
        if (['POST', 'PUT', 'DELETE'].includes(method)) {
            const token = document.cookie
                .split('; ')
                .find(row => row.startsWith('XSRF-TOKEN='))
                ?.split('=')[1];
            if (token) {
                options.headers = options.headers || {};
                if (options.headers instanceof Headers) {
                    options.headers.set('X-XSRF-TOKEN', token);
                } else if (Array.isArray(options.headers)) {
                    options.headers.push(['X-XSRF-TOKEN', token]);
                } else {
                    options.headers['X-XSRF-TOKEN'] = token;
                }
            }
        }
        return originalFetch(url, options);
    };
})();

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function stripHtmlTags(rawHtml) {
    if (!rawHtml || typeof rawHtml !== 'string') return '';
    if (!rawHtml.includes('<')) return rawHtml;
    try {
        const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
        return doc.body.textContent || '';
    } catch (e) {
        return escapeHtml(rawHtml);
    }
}

function setTxt(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = (val !== null && val !== undefined) ? String(val) : '--';
}

function setHtml(id, val) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = (val !== null && val !== undefined) ? String(val) : '--';
}

function formatSourceUrls(rawUrls) {
    if (!rawUrls || rawUrls === 'None' || rawUrls === '[]' || rawUrls === 'null' || rawUrls === 'None provided') {
        return '<span style="color: var(--text-sub); font-style: italic;">None</span>';
    }
    
    // If already an array
    if (Array.isArray(rawUrls)) {
        if (rawUrls.length === 0) return '<span style="color: var(--text-sub); font-style: italic;">None</span>';
        return rawUrls.map(u => {
            const urlStr = String(u || '').trim();
            if (!urlStr) return '';
            let label = urlStr;
            if (label.length > 55) label = label.substring(0, 52) + '...';
            return `<div style="margin-bottom: 0.2rem;"><a href="${encodeURI(urlStr)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-primary); word-break: break-all;" title="${escapeHtml(urlStr)}">🔗 ${escapeHtml(label)}</a></div>`;
        }).filter(Boolean).join('');
    }

    const strVal = String(rawUrls).trim();
    if (!strVal || strVal === 'None' || strVal === '[]' || strVal === 'null') {
        return '<span style="color: var(--text-sub); font-style: italic;">None</span>';
    }

    // Check for standard URLs in string
    const matches = strVal.match(/https?:\/\/[^\s"',\]\)]+/g);
    if (matches && matches.length > 0) {
        const uniqueUrls = Array.from(new Set(matches));
        return uniqueUrls.map(u => {
            let label = u;
            if (label.length > 55) label = label.substring(0, 52) + '...';
            return `<div style="margin-bottom: 0.2rem;"><a href="${encodeURI(u)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-primary); word-break: break-all;" title="${escapeHtml(u)}">🔗 ${escapeHtml(label)}</a></div>`;
        }).join('');
    }

    // Pipe or newline separated strings
    const cleanStr = strVal.replace(/[\[\]']/g, '').trim();
    if (!cleanStr) return '<span style="color: var(--text-sub); font-style: italic;">None</span>';
    
    const splitItems = cleanStr.includes('|') ? cleanStr.split('|') : cleanStr.split('\n');
    return splitItems.map(u => {
        const item = u.trim();
        if (!item) return '';
        if (item.startsWith('http://') || item.startsWith('https://')) {
            let label = item;
            if (label.length > 55) label = label.substring(0, 52) + '...';
            return `<div style="margin-bottom: 0.2rem;"><a href="${encodeURI(item)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-primary); word-break: break-all;" title="${escapeHtml(item)}">🔗 ${escapeHtml(label)}</a></div>`;
        }
        if (item.startsWith('drive_doc://')) {
            const cleanTitle = item.replace('drive_doc://', '');
            return `<div style="margin-bottom: 0.2rem;"><span class="badge" style="background: var(--bg-card-secondary); border: 1px solid var(--border-color); color: var(--text-main); font-size: 0.78rem;">📄 ${escapeHtml(cleanTitle)}</span></div>`;
        }
        return `<div style="margin-bottom: 0.2rem;"><span class="badge" style="background: var(--bg-card-secondary); border: 1px solid var(--border-color); color: var(--text-main); font-size: 0.78rem;">📄 ${escapeHtml(item)}</span></div>`;
    }).filter(Boolean).join('');
}

async function copyToClipboard(text, successMsg = 'Copied to clipboard!') {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const successful = document.execCommand('copy');
            textArea.remove();
            if (!successful) throw new Error('execCommand returned false');
        }
        showToast(successMsg);
        return true;
    } catch (err) {
        console.warn('Clipboard write failed, fallback alert prompt:', err);
        prompt('Copy manually (Ctrl+C):', text);
        return false;
    }
}

function showToast(message) {
    let toast = document.getElementById('eval-global-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'eval-global-toast';
        toast.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #1f1f1f;
            color: #ffffff;
            padding: 0.7rem 1.2rem;
            border-radius: 8px;
            font-size: 0.85rem;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            z-index: 999999;
            transition: opacity 0.25s ease, transform 0.25s ease;
            opacity: 0;
            transform: translateY(10px);
            pointer-events: none;
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
    }, 2500);
}

function cleanMarkdown(raw) {
    if (!raw) return '<i>No response text available.</i>';
    let text = String(raw)
        .replace(/\\n/g, '\n')
        .replace(/\\\*/g, '*')
        .replace(/\s+---\s+/g, '\n\n---\n\n')
        .replace(/\s+(#{1,6}\s+)/g, '\n\n$1')
        .replace(/\s+(\*\s+)/g, '\n* ')
        .replace(/\s+(\d+\.\s+)/g, '\n$1');
    if (typeof marked !== 'undefined') {
        if (typeof marked.parse === 'function') {
            return marked.parse(text);
        }
        if (typeof marked === 'function') {
            return marked(text);
        }
    }
    return text.replace(/\n/g, '<br>');
}

function isGleanResponseProvided(row, qGroup) {
    if (!row && !qGroup) return false;
    const resp = (row && (row.response_text || row.glean_response_text)) || (qGroup && qGroup.glean_response_text) || '';
    if (!resp || typeof resp !== 'string') return false;
    const clean = resp.trim().toLowerCase();
    if (!clean) return false;
    if (clean.includes('pending') || clean.includes('not recorded') || clean.includes('not run') || clean.includes('not provided')) {
        return false;
    }
    return true;
}

// Expose globally
window.escapeHtml = escapeHtml;
window.setTxt = setTxt;
window.setHtml = setHtml;
window.formatSourceUrls = formatSourceUrls;
window.cleanMarkdown = cleanMarkdown;
window.isGleanResponseProvided = isGleanResponseProvided;
window.copyToClipboard = copyToClipboard;
window.showToast = showToast;
