/**
 * Run Browser Modal: Search, Filter, and Select Historical Benchmark Runs
 */

let currentRunSelectorMode = 'results'; // 'results' or 'status'
let currentRunModalStatusFilter = 'all';
let currentRunModalDateFilter = 'all';

async function openRunSelectorModal(mode = 'results') {
    currentRunSelectorMode = mode;
    const modal = document.getElementById('modal-run-selector');
    const titleEl = document.getElementById('run-selector-modal-title');
    const subEl = document.getElementById('run-selector-modal-subtitle');
    
    if (titleEl) titleEl.textContent = mode === 'status' ? 'Browse & Inspect Run Execution Status' : 'Browse & Inspect Run Evaluation Results';
    if (subEl) subEl.textContent = mode === 'status' ? 'Search, filter, and select a run to view its live stepper, telemetry, and low-level logs' : 'Search, filter, and select a run to view its comparison scorecard, accuracy, and citations';
    
    if (modal) modal.style.display = 'flex';
    
    try {
        const res = await fetch('/api/runs');
        const data = await res.json();
        if (data.status === 'success' && data.runs) {
            window._allRunsList = data.runs;
        }
    } catch (err) {
        console.error('Failed to fetch runs for modal:', err);
    }
    
    const searchInput = document.getElementById('run-modal-search-input');
    if (searchInput) searchInput.value = '';
    
    renderRunsModalTable();
}

function closeRunSelectorModal() {
    const modal = document.getElementById('modal-run-selector');
    if (modal) modal.style.display = 'none';
}

function setRunModalStatusFilter(st, btn) {
    currentRunModalStatusFilter = st;
    const container = document.getElementById('run-modal-status-filters');
    if (container) {
        container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    }
    if (btn) btn.classList.add('active');
    renderRunsModalTable();
}

function setRunModalDateFilter(df, btn) {
    currentRunModalDateFilter = df;
    const container = document.getElementById('run-modal-date-filters');
    if (container) {
        container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    }
    if (btn) btn.classList.add('active');

    // Reset single date input when quick chips are clicked
    const dateInput = document.getElementById('run-modal-single-date');
    if (dateInput) dateInput.value = '';

    renderRunsModalTable();
}

function onRunModalSingleDateChange() {
    const singleDate = document.getElementById('run-modal-single-date')?.value;
    if (singleDate) {
        currentRunModalDateFilter = 'single_date';
        const container = document.getElementById('run-modal-date-filters');
        if (container) {
            container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        }
    } else {
        currentRunModalDateFilter = 'all';
        const container = document.getElementById('run-modal-date-filters');
        if (container) {
            container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            const allBtn = container.querySelector('button');
            if (allBtn) allBtn.classList.add('active');
        }
    }
    renderRunsModalTable();
}

function clearRunModalDateFilter() {
    const dateInput = document.getElementById('run-modal-single-date');
    if (dateInput) dateInput.value = '';

    currentRunModalDateFilter = 'all';
    const container = document.getElementById('run-modal-date-filters');
    if (container) {
        container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        const allBtn = container.querySelector('button');
        if (allBtn) allBtn.classList.add('active');
    }
    renderRunsModalTable();
}

function filterRunsModal() {
    renderRunsModalTable();
}

function renderRunsModalTable() {
    const tbody = document.getElementById('run-modal-table-body');
    const countLabel = document.getElementById('run-modal-count-label');
    if (!tbody) return;

    const allRuns = window._allRunsList || [];
    const searchVal = (document.getElementById('run-modal-search-input')?.value || '').toLowerCase().trim();
    const singleDateVal = document.getElementById('run-modal-single-date')?.value; // e.g. "2026-08-25"
    const now = new Date();

    let filtered = allRuns.filter(r => {
        // Status Filter
        const st = (r.status || 'completed').toLowerCase();
        if (currentRunModalStatusFilter === 'completed' && st !== 'completed') return false;
        if (currentRunModalStatusFilter === 'running' && st !== 'running') return false;
        if (currentRunModalStatusFilter === 'failed' && st !== 'failed' && st !== 'cancelled') return false;

        // Single Date Picker Filter
        if (currentRunModalDateFilter === 'single_date' && singleDateVal) {
            if (!r.timestamp || !r.timestamp.startsWith(singleDateVal)) return false;
        }

        // Quick Date Chips Filter
        if (r.timestamp) {
            const rDate = new Date(r.timestamp.replace(' ', 'T'));
            if (!isNaN(rDate.getTime())) {
                if (currentRunModalDateFilter === 'today') {
                    const diffHours = (now - rDate) / (1000 * 60 * 60);
                    if (diffHours > 24) return false;
                } else if (currentRunModalDateFilter === '7days') {
                    const diffHours = (now - rDate) / (1000 * 60 * 60);
                    if (diffHours > 24 * 7) return false;
                }
            }
        }

        // Text Search
        if (searchVal) {
            const haystack = `${r.run_id} ${r.timestamp || ''} ${r.dataset_key || ''} ${(r.models || []).join(' ')} ${r.status || ''} ${r.system_instruction_mode || ''}`.toLowerCase();
            if (!haystack.includes(searchVal)) return false;
        }

        return true;
    });

    if (countLabel) {
        countLabel.textContent = `Showing ${filtered.length} of ${allRuns.length} runs`;
    }

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-sub);">No evaluation runs found matching criteria.</td></tr>`;
        return;
    }

    let html = '';
    filtered.forEach(r => {
        const st = (r.status || 'completed').toLowerCase();
        let statusBadge = `<span class="badge badge-pass" style="font-size: 0.72rem; padding: 0.15rem 0.5rem;">COMPLETED</span>`;
        if (st === 'running') {
            statusBadge = `<span class="badge" style="background: rgba(59, 130, 246, 0.15); color: var(--accent-primary); border: 1px solid var(--accent-primary); font-size: 0.72rem; padding: 0.15rem 0.5rem; animation: pulse 1.5s infinite;">RUNNING</span>`;
        } else if (st === 'failed' || st === 'cancelled') {
            statusBadge = `<span class="badge badge-fail" style="font-size: 0.72rem; padding: 0.15rem 0.5rem;">${st.toUpperCase()}</span>`;
        }

        const dsKey = r.dataset_key || 'custom_uploaded';
        const isCanonical = dsKey !== 'custom_uploaded' && dsKey !== 'custom';
        const dsBadge = isCanonical ? `<span class="badge badge-pass" style="font-size: 0.68rem; padding: 0.1rem 0.4rem;">${escapeHtml(dsKey)}</span>` : `<span class="badge badge-secondary" style="font-size: 0.68rem; padding: 0.1rem 0.4rem;">Custom Run Manifest</span>`;

        const modelsStr = (r.models || ['gemini-3.5-flash']).map(m => m.replace('gemini-', '')).join(', ');
        const accuracyStr = r.accuracy_rate !== null && r.accuracy_rate !== undefined ? `${r.accuracy_rate}% Pass` : '--';
        const avgTtltStr = r.avg_ttlt ? `${r.avg_ttlt}s TTLT` : '';

        html += `
            <tr style="border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.15s;" onmouseover="this.style.background='var(--bg-card-secondary)'" onmouseout="this.style.background='transparent'">
                <td style="padding: 0.85rem 1.15rem; font-family: monospace; font-weight: 700; color: var(--accent-primary);" onclick="selectRunFromModal('${escapeHtml(r.run_id)}')">
                    🏃 ${escapeHtml(r.run_id)}
                </td>
                <td style="padding: 0.85rem 0.85rem; color: var(--text-sub); font-size: 0.82rem;" onclick="selectRunFromModal('${escapeHtml(r.run_id)}')">
                    ${escapeHtml(r.timestamp || 'N/A')}
                </td>
                <td style="padding: 0.85rem 0.85rem;" onclick="selectRunFromModal('${escapeHtml(r.run_id)}')">
                    <div style="margin-bottom: 0.25rem;">${dsBadge}</div>
                    <div style="font-size: 0.78rem; color: var(--text-sub);">${r.scenarios_count || 1} Queries × ${escapeHtml(modelsStr)}</div>
                </td>
                <td style="padding: 0.85rem 0.85rem;" onclick="selectRunFromModal('${escapeHtml(r.run_id)}')">
                    ${statusBadge}
                </td>
                <td style="padding: 0.85rem 0.85rem;" onclick="selectRunFromModal('${escapeHtml(r.run_id)}')">
                    <div style="font-weight: 700; color: ${r.accuracy_rate && r.accuracy_rate >= 80 ? 'var(--success-color)' : 'var(--text-main)'}; font-size: 0.88rem;">${accuracyStr}</div>
                    <div style="font-size: 0.76rem; color: var(--text-sub);">${avgTtltStr}</div>
                </td>
                <td style="padding: 0.85rem 1.15rem; text-align: right;">
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); selectRunForTarget('${escapeHtml(r.run_id)}', 'status')" style="padding: 0.25rem 0.6rem; font-size: 0.76rem;" title="View in Run Status Monitor">⏱️ Status</button>
                        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); selectRunForTarget('${escapeHtml(r.run_id)}', 'results')" style="padding: 0.25rem 0.6rem; font-size: 0.76rem;" title="View Evaluation Results">📊 Results</button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function selectRunFromModal(runId) {
    selectRunForTarget(runId, currentRunSelectorMode);
}

function selectRunForTarget(runId, target) {
    closeRunSelectorModal();
    if (target === 'status') {
        switchScreen('run-status', false, false);
        onStatusRunSelected(runId);
    } else {
        switchScreen('results', false, false);
        onResultsRunSelected(runId);
    }
}

// Global exposure
window.openRunSelectorModal = openRunSelectorModal;
window.closeRunSelectorModal = closeRunSelectorModal;
window.setRunModalStatusFilter = setRunModalStatusFilter;
window.setRunModalDateFilter = setRunModalDateFilter;
window.onRunModalSingleDateChange = onRunModalSingleDateChange;
window.clearRunModalDateFilter = clearRunModalDateFilter;
window.filterRunsModal = filterRunsModal;
window.renderRunsModalTable = renderRunsModalTable;
window.selectRunFromModal = selectRunFromModal;
window.selectRunForTarget = selectRunForTarget;
