/**
 * Run Status Monitor: SSE / Poll Lifecycle, Wizard Launcher, Runs History & Telemetry
 */

let allRunsHistoryData = [];

async function autoSelectRecentRunForMonitoring() {
    try {
        const res = await fetch('/api/runs');
        const data = await res.json();
        if (data.status === 'success' && data.runs && data.runs.length > 0) {
            const mostRecentRunId = data.runs[0].run_id;
            monitorRunEvents(mostRecentRunId);
        } else {
            const monitor = document.getElementById('run-status-monitor');
            if (monitor) {
                monitor.events = [];
            }
        }
    } catch (err) {
        console.error("Failed to auto-select recent run: ", err);
    }
}

// Home screen list runs with pagination
async function loadRunsHistory(preservePage = false) {
    try {
        const res = await fetch('/api/runs');
        const data = await res.json();
        
        if (data.status === 'success') {
            allRunsHistoryData = data.runs || [];
            window.allRunsHistory = allRunsHistoryData;
            if (!preservePage) {
                currentRunsPage = 1;
            }
            renderRunsHistoryPage();
        } else {
            const tbody = document.getElementById('runs-history-body');
            if (!preservePage && tbody) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-sub);">Failed to load runs.</td></tr>';
            }
        }
    } catch (err) {
        console.error("Failed to load runs history: ", err);
        const tbody = document.getElementById('runs-history-body');
        if (!preservePage && tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-sub);">Failed to load runs.</td></tr>';
        }
    }
}

function renderRunsHistoryPage() {
    const tbody = document.getElementById('runs-history-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (allRunsHistoryData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-sub);">No matrix evaluation runs found yet.</td></tr>';
        const pag = document.getElementById('runs-pagination-controls');
        if (pag) pag.style.display = 'none';
        return;
    }
    
    const pag = document.getElementById('runs-pagination-controls');
    if (pag) pag.style.display = 'flex';
    
    const totalPages = Math.ceil(allRunsHistoryData.length / runsPerPage) || 1;
    currentRunsPage = Math.max(1, Math.min(currentRunsPage, totalPages));
    
    const startIdx = (currentRunsPage - 1) * runsPerPage;
    const endIdx = Math.min(startIdx + runsPerPage, allRunsHistoryData.length);
    const pageRuns = allRunsHistoryData.slice(startIdx, endIdx);
    
    pageRuns.forEach(r => {
        let statusClass = 'badge-pass';
        if (r.status === 'running') statusClass = 'badge-glean';
        if (r.status === 'failed' || r.status === 'cancelled') statusClass = 'badge-fail';
        
        const statusPill = `<span class="badge ${statusClass}" style="cursor: pointer;" onclick="monitorRunEvents('${r.run_id}')">${(r.status || 'COMPLETED').toUpperCase()}</span>`;
        const modelsStr = Array.isArray(r.models) ? r.models.join(', ') : (r.models || 'gemini-3.5-flash');
        const instructBadge = r.system_instruction_mode === 'Custom'
            ? '<span class="badge" style="background: var(--bg-card-secondary); color: var(--accent-primary); border: 1px solid var(--border-color); font-size: 0.75rem; padding: 0.15rem 0.5rem;">Custom</span>'
            : '<span class="badge" style="background: var(--bg-card-secondary); color: var(--text-sub); border: 1px solid var(--border-color); font-size: 0.75rem; padding: 0.15rem 0.5rem;">Default</span>';
        const samplesCount = r.scenarios_count || '--';

        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td><code style="color: var(--code-text); background: var(--code-bg); padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 600;">${escapeHtml(r.run_id)}</code></td>
                <td style="color: var(--text-main); font-size: 0.88rem;">${escapeHtml(r.timestamp)}</td>
                <td style="color: var(--text-sub); font-size: 0.85rem; font-family: monospace;">${escapeHtml(modelsStr)}</td>
                <td>${instructBadge}</td>
                <td style="font-weight: 600; color: var(--text-main); text-align: center;">${samplesCount}</td>
                <td>${statusPill}</td>
                <td style="white-space: nowrap;">
                    <div style="display: inline-flex; gap: 0.35rem; align-items: center; flex-wrap: nowrap; white-space: nowrap;">
                        ${r.status === 'running' ? `<button class="btn btn-outline btn-sm" style="padding: 0.25rem 0.6rem; font-size: 0.82rem; white-space: nowrap; color: var(--danger-color); border: 1px solid var(--danger-color); background: rgba(239, 68, 68, 0.08); font-weight: 700;" onclick="cancelRun('${r.run_id}')">🛑 Cancel</button>` : ''}
                        <button class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.6rem; font-size: 0.82rem; white-space: nowrap;" onclick="duplicateRun('${r.run_id}')">🔄 Edit & Re-run</button>
                        <button class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.6rem; font-size: 0.82rem; white-space: nowrap;" onclick="viewDatasetReadOnly('${r.run_id}', 'run', 'home')">📄 Dataset</button>
                        <button class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.6rem; font-size: 0.82rem; white-space: nowrap;" onclick="monitorRunEvents('${r.run_id}')">📜 Logs</button>
                        <button class="btn btn-secondary btn-sm" style="padding: 0.25rem 0.6rem; font-size: 0.82rem; white-space: nowrap;" onclick="viewHistoricalRunResults('${r.run_id}')">📊 Results</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    const pageInfo = document.getElementById('runs-page-info');
    if (pageInfo) pageInfo.textContent = `Page ${currentRunsPage} of ${totalPages}`;
    const prevBtn = document.getElementById('runs-prev-page-btn');
    if (prevBtn) prevBtn.disabled = (currentRunsPage === 1);
    const nextBtn = document.getElementById('runs-next-page-btn');
    if (nextBtn) nextBtn.disabled = (currentRunsPage === totalPages);
}

function changeRunsPerPage(value) {
    runsPerPage = parseInt(value, 10);
    currentRunsPage = 1;
    renderRunsHistoryPage();
}

function prevRunsPage() {
    if (currentRunsPage > 1) {
        currentRunsPage--;
        renderRunsHistoryPage();
    }
}

function nextRunsPage() {
    const totalPages = Math.ceil(allRunsHistoryData.length / runsPerPage) || 1;
    if (currentRunsPage < totalPages) {
        currentRunsPage++;
        renderRunsHistoryPage();
    }
}

// Wizard starting triggers
function startNewWizard(mode) {
    wizardScenarios = [];
    if (mode === 'scratch') {
        wizardScenarios = [];
        const editor = document.getElementById('dataset-editor');
        if (editor) {
            editor.scenarios = wizardScenarios;
            editor.connectors = activeConnectorsList;
        }
        switchScreen('dataset-editor');
    } else if (mode === 'duplicate') {
        duplicateActiveRun();
    }
}

function goToWizardStep2() {
    const editor = document.getElementById('dataset-editor');
    if (editor && editor.scenarios && editor.scenarios.length > 0) {
        wizardScenarios = editor.scenarios;
    }

    if (!wizardScenarios.length) {
        alert("Please add at least 1 scenario query first!");
        return;
    }

    const isValidSource = (str) => {
        if (!str || typeof str !== 'string') return false;
        const trimmed = str.trim();
        if (!trimmed) return false;

        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            try {
                const url = new URL(trimmed);
                return Boolean(url.hostname && url.hostname.includes('.'));
            } catch (_) {
                return false;
            }
        }

        if (/^[a-zA-Z0-9_\-\/\s\(\)\.]+\.(pdf|md|docx|doc|xlsx|xls|pptx|ppt|txt|csv|json|html|htm)$/i.test(trimmed)) {
            return true;
        }

        if (/^[a-zA-Z0-9_-]{20,60}$/.test(trimmed)) {
            return true;
        }

        if (trimmed.length >= 2 && !/[<>{}\\]/.test(trimmed)) {
            return true;
        }

        return false;
    };

    for (let i = 0; i < wizardScenarios.length; i++) {
        const s = wizardScenarios[i];
        let sources = [];
        if (Array.isArray(s.expected_source)) {
            sources = s.expected_source;
        } else if (typeof s.expected_source === 'string' && s.expected_source.trim()) {
            sources = [s.expected_source.trim()];
        }

        for (let j = 0; j < sources.length; j++) {
            const link = sources[j];
            if (link && !isValidSource(link)) {
                alert(`Cannot proceed: Scenario sample #${i + 1} has an invalid Expected Source: "${link}". Expected sources must be valid URLs (e.g. https://...), document filenames (e.g. file.md), or Drive IDs.`);
                return;
            }
        }
    }

    switchScreen('run-config');
}

async function duplicateRun(runId) {
    currentEditingDatasetId = null;
    const titleEl = document.getElementById('dataset-editor-title');
    if (titleEl) titleEl.textContent = `Clone & Re-run Snapshot: ${runId}`;
    const subEl = document.getElementById('dataset-editor-subtitle');
    if (subEl) subEl.textContent = 'Step 1 of 2: Refine query matrix parameters before launching execution';
    const nextBtn = document.getElementById('btn-dataset-editor-next');
    if (nextBtn) nextBtn.style.display = 'inline-block';
    const saveBtn = document.getElementById('btn-dataset-editor-save');
    if (saveBtn) saveBtn.style.display = 'none';
    const saveRepoBtn = document.getElementById('btn-dataset-editor-save-repo');
    if (saveRepoBtn) saveRepoBtn.style.display = 'inline-block';

    try {
        let scenarios = null;
        const res = await fetch(`/api/runs/${runId}`);
        const data = await res.json();
        if (data.status === 'success' && data.scenarios && data.scenarios.length > 0) {
            scenarios = data.scenarios;
        } else {
            const dsRes = await fetch(`/api/datasets/${runId}`);
            const dsData = await dsRes.json();
            if (dsData.status === 'success' && dsData.scenarios && dsData.scenarios.length > 0) {
                scenarios = dsData.scenarios;
            }
        }

        if (scenarios && scenarios.length > 0) {
            wizardScenarios = scenarios;
            const editor = document.getElementById('dataset-editor');
            if (editor) {
                editor.scenarios = [...wizardScenarios];
                editor.connectors = activeConnectorsList;
                if (typeof editor.requestUpdate === 'function') editor.requestUpdate();
            }
            switchScreen('dataset-editor');
        } else {
            alert('Could not load scenarios for: ' + runId + ' (No scenarios found in snapshot).');
        }
    } catch (err) {
        alert('Error loading run details: ' + err.message);
    }
}

async function duplicateActiveRun() {
    try {
        const res = await fetch('/api/runs');
        const data = await res.json();
        if (data.status === 'success' && data.runs.length > 0) {
            duplicateRun(data.runs[0].run_id);
        } else {
            alert('No previous runs found to duplicate.');
        }
    } catch (err) {
        alert('Error fetching runs: ' + err.message);
    }
}

async function launchWizardEvaluation() {
    const selectedModels = [];
    if (document.getElementById('config-model-flash')?.checked) selectedModels.push('gemini-3.5-flash');
    if (document.getElementById('config-model-pro')?.checked) selectedModels.push('gemini-3.1-pro');
    
    const selectedConnectors = activeConnectorsList.map(c => c.connector_id);

    const iterations = parseInt(document.getElementById('config-iterations-select').value, 10);
    const concurrency = parseInt(document.getElementById('config-concurrency-select').value, 10) || 25;
    const sysOverride = document.getElementById('config-instruction-override').value;
    const answerMode = document.getElementById('config-answer-mode-select')?.value || 'NORMAL';
    const assistSkipping = document.getElementById('config-assist-skipping-select')?.value || 'REQUEST_ASSIST';
    const searchResultMode = document.getElementById('config-search-mode-select')?.value || 'CHUNKS';
    const apiTimeout = parseInt(document.getElementById('config-api-timeout-select').value, 10) || 60;
    const scenarioTimeout = parseInt(document.getElementById('config-scenario-timeout-select').value, 10) || 120;
    const runTimeout = parseInt(document.getElementById('config-run-timeout-select').value, 10) || 600;

    const payload = {
        dataset_key: 'custom_uploaded',
        custom_scenarios: wizardScenarios.map(s => ({
            query: s.query,
            ground_truth: s.ground_truth,
            description: s.expected_source || 'Wizard Scenario',
            expected_source: s.expected_source || '',
            connector_id: s.connector_id || 'all',
            glean_response_text: s.glean_response_text || '',
            glean_source_urls: s.glean_source_urls || ''
        })),
        connectors: ["all"],
        active_connectors: selectedConnectors,
        models: selectedModels.length > 0 ? selectedModels : ["gemini-3.5-flash"],
        instruction_sets: ["Default"],
        custom_system_instruction: sysOverride,
        answer_generation_mode: answerMode,
        assist_skipping_mode: assistSkipping,
        search_result_mode: searchResultMode,
        iterations: iterations,
        max_concurrent_calls: concurrency,
        api_timeout_sec: apiTimeout,
        scenario_timeout_sec: scenarioTimeout,
        run_timeout_sec: runTimeout,
        use_fallback_judge: false,
        background: true
    };

    const runId = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
    monitorRunEvents(runId, payload);

    try {
        const res = await fetch(`/api/run_benchmark?run_id=${runId}&background=true`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === 'success' || data.status === 'running') {
            const btnResults = document.getElementById('btn-view-results-status');
            if (btnResults) btnResults.style.display = 'block';
        }
    } catch (err) {
        console.error("Benchmark launch failed: ", err);
    }
}

function viewResultsForMonitoredRun() {
    if (currentActiveMonitorRunId) {
        viewHistoricalRunResults(currentActiveMonitorRunId);
    } else {
        switchScreen('results');
    }
}

function monitorRunEvents(runId, initialConfig = null) {
    currentActiveMonitorRunId = runId;
    window.currentActiveMonitorRunId = currentActiveMonitorRunId;
    switchScreen('run-status');
    const subTitle = document.getElementById('status-subtitle-id');
    if (subTitle) subTitle.textContent = `Monitoring Run ID: ${runId}`;
    const btnResults = document.getElementById('btn-view-results-status');
    if (btnResults) btnResults.style.display = 'inline-flex';
    const monitor = document.getElementById('run-status-monitor');
    if (monitor) {
        monitor.runId = runId;
        monitor.events = [
            { step: 'Initialization', status: 'RUNNING', time: new Date().toTimeString().split(' ')[0], info: 'Initializing matrix evaluation pipeline...' }
        ];
        monitor.runConfig = initialConfig || null;
        monitor.latencySummary = null;
        monitor.requestUpdate();
    }
    pollActiveRunStatus();
}

async function onStatusRunSelected(selectedVal) {
    if (!selectedVal) return;
    currentActiveMonitorRunId = selectedVal;
    window.currentActiveMonitorRunId = currentActiveMonitorRunId;
    window.location.hash = `run-status?run_id=${encodeURIComponent(selectedVal)}`;
    await loadRunIntoStatusMonitor(selectedVal);
}

async function loadRunIntoStatusMonitor(runId) {
    if (!runId) {
        try {
            const res = await fetch('/api/runs');
            const data = await res.json();
            if (data.status === 'success' && data.runs && data.runs.length > 0) {
                runId = data.runs[0].run_id;
            }
        } catch (e) {
            console.error("Error finding latest run:", e);
        }
    }
    if (!runId) return;

    currentActiveMonitorRunId = runId;
    window.currentActiveMonitorRunId = currentActiveMonitorRunId;
    const statusSelector = document.getElementById('status-run-selector');
    if (statusSelector) statusSelector.value = runId;

    const subTitle = document.getElementById('status-subtitle-id');
    if (subTitle) subTitle.textContent = `Monitoring Run ID: ${runId}`;

    const btnResults = document.getElementById('btn-view-results-status');
    if (btnResults) btnResults.style.display = 'inline-flex';

    const monitor = document.getElementById('run-status-monitor');
    if (monitor) {
        monitor.runId = runId;
    }

    try {
        const res = await fetch(`/api/runs/${encodeURIComponent(runId)}/events`);
        if (res.ok) {
            const data = await res.json();
            if (data.status === 'success' && monitor) {
                monitor.runId = runId;
                monitor.events = data.events || [];
                if (data.run_config && typeof data.run_config === 'object' && Object.keys(data.run_config).length > 0) {
                    monitor.runConfig = { ...(monitor.runConfig || {}), ...data.run_config };
                }
                monitor.latencySummary = data.latency_summary || null;
                monitor.runStatus = data.run_status || 'running';
                monitor.requestUpdate();

                if (data.run_status === 'running') {
                    if (window._statusPollInterval) clearInterval(window._statusPollInterval);
                    window._statusPollInterval = setInterval(async () => {
                        if (currentActiveMonitorRunId !== runId) {
                            clearInterval(window._statusPollInterval);
                            return;
                        }
                        const pRes = await fetch(`/api/runs/${encodeURIComponent(runId)}/events`);
                        if (pRes.ok) {
                            const pData = await pRes.json();
                            if (pData.status === 'success' && monitor) {
                                monitor.events = pData.events || [];
                                if (pData.run_config && typeof pData.run_config === 'object' && Object.keys(pData.run_config).length > 0) {
                                    monitor.runConfig = { ...(monitor.runConfig || {}), ...pData.run_config };
                                }
                                monitor.latencySummary = pData.latency_summary || monitor.latencySummary;
                                monitor.runStatus = pData.run_status || 'running';
                                monitor.requestUpdate();
                                if (pData.run_status !== 'running') {
                                    clearInterval(window._statusPollInterval);
                                }
                            }
                        }
                    }, 1500);
                }
            }
        }
    } catch (err) {
        console.error("Failed to load run into status monitor:", err);
    }
}

async function pollActiveRunStatus() {
    if (!currentActiveMonitorRunId) return;
    try {
        const res = await fetch(`/api/runs/${currentActiveMonitorRunId}/events`);
        const data = await res.json();
        
        if (data.status === 'success') {
            const monitor = document.getElementById('run-status-monitor');
            if (monitor) {
                monitor.runId = currentActiveMonitorRunId;
                if (data.events && data.events.length > 0) {
                    monitor.events = data.events;
                }
                if (data.run_config && typeof data.run_config === 'object' && Object.keys(data.run_config).length > 0) {
                    monitor.runConfig = { ...(monitor.runConfig || {}), ...data.run_config };
                }
                if (data.latency_summary) {
                    monitor.latencySummary = data.latency_summary;
                }
            }
            if (data.run_config) {
                const isCustom = Boolean(data.run_config.custom_system_instruction || data.run_config.system_instruction_mode === 'Custom');
                const instructMode = isCustom ? 'Custom' : 'Default';
                const sub = document.getElementById('status-subtitle-id');
                if (sub) {
                    sub.replaceChildren();
                    sub.appendChild(document.createTextNode('Monitoring Run ID: '));
                    const codeEl = document.createElement('code');
                    codeEl.style.cssText = 'color: var(--code-text); background: var(--code-bg); padding: 0.1rem 0.35rem; border-radius: 4px;';
                    codeEl.textContent = currentActiveMonitorRunId;
                    sub.appendChild(codeEl);
                    sub.appendChild(document.createTextNode(' • Instructions: '));
                    const badgeEl = document.createElement('span');
                    badgeEl.className = `badge ${isCustom ? 'badge-pass' : 'badge-secondary'}`;
                    badgeEl.style.cssText = 'font-size: 0.72rem; padding: 0.1rem 0.45rem;';
                    badgeEl.textContent = instructMode;
                    sub.appendChild(badgeEl);
                }
            }
            const btnResults = document.getElementById('btn-view-results-status');
            if (btnResults) {
                btnResults.style.display = 'inline-flex';
            }
        }
    } catch (err) {
        console.error("Polling error: ", err);
    }
}

async function loadSettingsSysinfo() {
    try {
        const res = await fetch('/api/settings/sysinfo');
        const data = await res.json();
        if (data.status === 'success' && data.sysinfo) {
            const envs = data.sysinfo.env_variables || {};
            window.GCP_PROJECT_ID = envs.PROJECT_ID || '';
            window.GCP_PROJECT_NUM = envs.PROJECT_NUMBER || envs.PROJECT_ID || '';
            window.GCP_ENGINE_ID = envs.ENGINE_ID || '';
            window.GCP_CONNECTOR_ID = envs.CONNECTOR_ID || '';
            window.COMPANY_NAME = envs.COMPANY_NAME || 'Yahoo';
            window.SEARCH_MODE = envs.SEARCH_MODE || 'Vector';
            window.CURRENT_USER_EMAIL = (data.sysinfo.adc_status && data.sysinfo.adc_status.account && data.sysinfo.adc_status.account !== 'Not Authenticated') ? data.sysinfo.adc_status.account : '';

            const searchModeElem = document.getElementById('header-search-mode-label');
            if (searchModeElem) {
                const isVec = window.SEARCH_MODE.toLowerCase() === 'vector';
                searchModeElem.innerHTML = `Search Mode: <b style="color: ${isVec ? 'var(--accent-primary)' : '#f59e0b'};">${escapeHtml(isVec ? 'Vector' : 'streamAssist')}</b>`;
            }
            const gcpProjElem = document.getElementById('header-gcp-project-label');
            if (gcpProjElem) {
                gcpProjElem.innerHTML = `GCP: <b style="color: var(--text-main);">${escapeHtml(window.GCP_PROJECT_ID || 'Not Configured')}</b>`;
            }
            const engineElem = document.getElementById('header-engine-id-label');
            if (engineElem) {
                engineElem.innerHTML = `Engine: <b style="color: var(--text-main);">${escapeHtml(window.GCP_ENGINE_ID || 'Not Configured')}</b>`;
            }

            const bqInput = document.getElementById('export-bq-project-id');
            if (bqInput && !bqInput.value && window.GCP_PROJECT_ID) {
                bqInput.value = window.GCP_PROJECT_ID;
            }

            const consoleLink = document.getElementById('settings-console-link');
            if (consoleLink && window.GCP_PROJECT_ID) {
                consoleLink.href = `https://console.cloud.google.com/ai/search/engines?project=${encodeURIComponent(window.GCP_PROJECT_ID)}`;
            }

            const tbody = document.getElementById('settings-env-body');
            if (tbody) {
                tbody.innerHTML = '';
                for (const [k, v] of Object.entries(envs)) {
                    tbody.innerHTML += `
                        <tr>
                            <td><code>${escapeHtml(k)}</code></td>
                            <td style="color: var(--text-main);">${escapeHtml(String(v))}</td>
                            <td><span class="badge badge-ge" style="font-size: 0.75rem;">ENV Override</span></td>
                        </tr>
                    `;
                }
            }

            const adc = data.sysinfo.adc_status;
            const adcCard = document.getElementById('settings-adc-card');
            if (adcCard && adc) {
                if (adc.authenticated) {
                    adcCard.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                    adcCard.style.background = 'rgba(16, 185, 129, 0.05)';
                    adcCard.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 0.5rem; color: #6ee7b7; font-weight: 600;">
                            🟢 Authenticated
                        </div>
                        <div style="font-size: 0.85rem; margin-top: 0.25rem; color: var(--text-sub);">Account: <code>${escapeHtml(adc.account)}</code></div>
                    `;
                } else {
                    adcCard.style.borderColor = 'rgba(244, 63, 94, 0.4)';
                    adcCard.style.background = 'rgba(244, 63, 94, 0.05)';
                    adcCard.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 0.5rem; color: #fda4af; font-weight: 600;">
                            🔴 Not Authenticated
                        </div>
                        <div style="font-size: 0.85rem; margin-top: 0.25rem; color: var(--text-sub);">No active ADC credentials. Run glogin locally.</div>
                    `;
                }
            }
        }
    } catch (err) {
        console.error("Sysinfo error:", err);
    }
}

async function fetchActiveConnectors() {
    try {
        const res = await fetch('/api/discovery/inspect');
        const data = await res.json();
        activeConnectorsList = [];
        if (data.collections) {
            data.collections.forEach(c => {
                if (c.connectors) {
                    c.connectors.forEach(conn => {
                        activeConnectorsList.push({
                            connector_id: conn.connector_id,
                            display_name: conn.display_name
                        });
                    });
                }
            });
        }
        window.activeConnectorsList = activeConnectorsList;
        
        const editor = document.getElementById('dataset-editor');
        if (editor) {
            editor.connectors = activeConnectorsList;
        }
    } catch (err) {
        console.error("Failed to prefetch active connectors list: ", err);
    }
}

async function inspectCollections() {
    try {
        const res = await fetch('/api/discovery/inspect');
        const data = await res.json();
        if (data.status === 'success') {
            const cols = data.collections || [];
            const trace = data.sample_trace || {};
            let msg = `Discovered Discovery Engine Collection:\n`;
            cols.forEach(c => {
                msg += `• ${c.display_name} (${c.collection_id})\n\nActive App Connectors (${c.connectors?.length || 0}):\n`;
                if (c.connectors && c.connectors.length > 0) {
                    c.connectors.forEach(conn => {
                        msg += `  - ${conn.display_name} [${conn.connector_id}]\n`;
                    });
                }
            });
            msg += `\nW3C OpenTelemetry Grounding Trace:\n• Trace ID: ${trace.trace_id}\n• Span ID: ${trace.span_id}`;
            alert(msg);
        }
    } catch (err) {
        alert('Error inspecting collections: ' + err.message);
    }
}

async function recordUISession(system = 'Gemini_Enterprise') {
    try {
        const res = await fetch('/api/browser/record_session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ system: system, query: 'what is the wellness stipend?' })
        });
        const data = await res.json();
        if (data.status === 'success') {
            alert(`✅ Recorded ${system} Playwright UI session! Added to Master Comparison table.`);
            if (typeof window.loadMasterComparison === 'function') {
                window.loadMasterComparison();
            }
        }
    } catch (err) {
        alert('Error recording UI session: ' + err.message);
    }
}

// Initialization hooks on DOM loaded
window.addEventListener('DOMContentLoaded', () => {
    fetchActiveConnectors();
    loadRunsHistory();
    loadSettingsSysinfo();

    // Periodic live polling for active runs and status updates
    setInterval(() => {
        const activeScreen = document.querySelector('.screen-content.active')?.id?.replace('screen-', '');
        if (activeScreen === 'home') {
            loadRunsHistory(true);
        }
        if (currentActiveMonitorRunId && activeScreen === 'run-status') {
            pollActiveRunStatus();
        }
    }, 1000);

    const editor = document.getElementById('dataset-editor');
    if (editor) {
        editor.addEventListener('dataset-changed', (e) => {
            wizardScenarios = e.detail.scenarios;
            window.wizardScenarios = wizardScenarios;
        });
    }
});

async function cancelRun(runId) {
    if (!runId) return;
    const confirmCancel = confirm(`Are you sure you want to cancel active evaluation run '${runId}'?`);
    if (!confirmCancel) return false;

    try {
        if (typeof window.showToast === 'function') {
            window.showToast(`Cancelling run ${runId}...`, 'info');
        }
        const res = await fetch(`/api/runs/${encodeURIComponent(runId)}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (data.status === 'success') {
            if (typeof window.showToast === 'function') {
                window.showToast(`Run ${runId} successfully cancelled!`, 'success');
            }
            if (window._statusPollInterval) {
                clearInterval(window._statusPollInterval);
            }
            const monitor = document.getElementById('run-status-monitor');
            if (monitor) {
                monitor.runStatus = 'cancelled';
                monitor.isMonitoring = false;
                monitor.requestUpdate();
            }
            loadRunsHistory(true);
            if (currentActiveMonitorRunId === runId) {
                monitorRunEvents(runId);
            }
            return true;
        } else {
            if (typeof window.showToast === 'function') {
                window.showToast(data.message || 'Failed to cancel run', 'error');
            }
            return false;
        }
    } catch (err) {
        console.error('Error cancelling run:', err);
        if (typeof window.showToast === 'function') {
            window.showToast(`Error cancelling run: ${err.message}`, 'error');
        }
        return false;
    }
}

// Global exposure
window.cancelRun = cancelRun;
window.autoSelectRecentRunForMonitoring = autoSelectRecentRunForMonitoring;
window.loadRunsHistory = loadRunsHistory;
window.renderRunsHistoryPage = renderRunsHistoryPage;
window.changeRunsPerPage = changeRunsPerPage;
window.prevRunsPage = prevRunsPage;
window.nextRunsPage = nextRunsPage;
window.startNewWizard = startNewWizard;
window.goToWizardStep2 = goToWizardStep2;
window.duplicateRun = duplicateRun;
window.duplicateActiveRun = duplicateActiveRun;
window.launchWizardEvaluation = launchWizardEvaluation;
window.viewResultsForMonitoredRun = viewResultsForMonitoredRun;
window.monitorRunEvents = monitorRunEvents;
window.onStatusRunSelected = onStatusRunSelected;
window.loadRunIntoStatusMonitor = loadRunIntoStatusMonitor;
window.pollActiveRunStatus = pollActiveRunStatus;
window.loadSettingsSysinfo = loadSettingsSysinfo;
window.fetchActiveConnectors = fetchActiveConnectors;
window.inspectCollections = inspectCollections;
window.recordUISession = recordUISession;
