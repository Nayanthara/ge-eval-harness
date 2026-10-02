/**
 * Discovery Engine Parallel streamAssist & Connector Test Bed Controller.
 */

let currentTestbedResult = null;

function openTestbedModal() {
    const modal = document.getElementById('modal-testbed');
    if (modal) {
        modal.style.display = 'flex';
        loadTestbedDataStores();
    }
}

function closeTestbedModal() {
    const modal = document.getElementById('modal-testbed');
    if (modal) {
        modal.style.display = 'none';
    }
}

function toggleTestbedEngineMode() {
    const mode = document.querySelector('input[name="testbed-engine-radio"]:checked')?.value || 'stream_assist';
    const scopeContainer = document.getElementById('testbed-datastore-scope-container');
    const searchModeSelect = document.getElementById('testbed-search-mode-select');

    if (scopeContainer) {
        scopeContainer.style.display = (mode === 'search') ? 'flex' : 'none';
    }
    if (searchModeSelect) {
        searchModeSelect.value = (mode === 'search') ? 'Vector' : 'Agentic';
    }
}

async function loadTestbedDataStores() {
    try {
        const resp = await fetch('/api/testbed/datastores');
        if (resp.ok) {
            const data = await resp.json();
            const selectEl = document.getElementById('testbed-connector-select');
            if (selectEl && data.datastores && data.datastores.length > 0) {
                const currentVal = selectEl.value;
                selectEl.innerHTML = `<option value="all">⚡ All Discovered Engine DataStores (${data.datastores.length} in Parallel)</option>` +
                    data.datastores.map(ds => `<option value="${escapeHtml(ds.id)}">${escapeHtml(ds.display_name)} (${escapeHtml(ds.id)})</option>`).join('');
                if (currentVal) selectEl.value = currentVal;
            }
        }
    } catch (err) {
        console.warn('Failed to pre-fetch testbed datastores:', err);
    }
}

function applyTestbedPreset(presetKey) {
    const targetsInput = document.getElementById('testbed-targets-input');
    const queryInput = document.getElementById('testbed-query-input');

    if (!targetsInput) return;

    if (presetKey === 'all_connectors_corpus') {
        targetsInput.value = [
            "https://drive.google.com/a/thomascummins.altostrat.com/open?id=1YYMik21vs4_gDZwRXV0rjZkRLoGRtSbO",
            "https://docs.google.com/document/d/1HuXh4xdln-MFlZRBWyeToSgDLDI0j524UsmL4yDlj_4/edit?usp=sharing",
            "https://drive.google.com/open?id=1V5c9f9PWY3RZQWhNjkJfbNlab_1Gp01e",
            "gs://tc-vertex-search-experiments/jira-ds/JIRA-102_vpn_access_denied.txt",
            "gs://tc-vertex-search-experiments/jira-ds/JIRA-101_broken_keyboard.txt",
            "gs://tc-vertex-search-experiments/jira-ds/JIRA-103_slack_workspace_access.txt",
            "gs://tc-vertex-search-experiments/confluence-ds/it_vpn_setup_guide.html",
            "gs://tc-vertex-search-experiments/confluence-ds/office_wifi_and_printing.html",
            "gs://tc-vertex-search-experiments/confluence-ds/laptop_replacement_policy.html",
            "gs://yahoo-lumapps-mock-bucket-tc/post-1.html",
            "gs://yahoo-lumapps-mock-bucket-tc/post-2.html"
        ].join("\n");
        if (queryInput) queryInput.value = "Read the document and summarize the key instructions, facts, and guidelines.";
    } else if (presetKey === 'google_docs') {
        targetsInput.value = [
            "https://drive.google.com/a/thomascummins.altostrat.com/open?id=1YYMik21vs4_gDZwRXV0rjZkRLoGRtSbO",
            "https://docs.google.com/document/d/1HuXh4xdln-MFlZRBWyeToSgDLDI0j524UsmL4yDlj_4/edit?usp=sharing",
            "https://drive.google.com/open?id=1V5c9f9PWY3RZQWhNjkJfbNlab_1Gp01e"
        ].join("\n");
        if (queryInput) queryInput.value = "how do I use python at Yahoo and what are the workspace tools?";
    } else if (presetKey === 'jira_tickets') {
        targetsInput.value = [
            "gs://tc-vertex-search-experiments/jira-ds/JIRA-102_vpn_access_denied.txt",
            "gs://tc-vertex-search-experiments/jira-ds/JIRA-101_broken_keyboard.txt",
            "gs://tc-vertex-search-experiments/jira-ds/JIRA-103_slack_workspace_access.txt"
        ].join("\n");
        if (queryInput) queryInput.value = "What are the details and resolution steps in these Jira tickets?";
    } else if (presetKey === 'confluence_guides') {
        targetsInput.value = [
            "gs://tc-vertex-search-experiments/confluence-ds/it_vpn_setup_guide.html",
            "gs://tc-vertex-search-experiments/confluence-ds/office_wifi_and_printing.html",
            "gs://tc-vertex-search-experiments/confluence-ds/laptop_replacement_policy.html"
        ].join("\n");
        if (queryInput) queryInput.value = "Explain IT VPN setup, office Wi-Fi printing, and laptop replacement policy.";
    } else if (presetKey === 'lumapps_posts') {
        targetsInput.value = [
            "gs://yahoo-lumapps-mock-bucket-tc/post-1.html",
            "gs://yahoo-lumapps-mock-bucket-tc/post-2.html"
        ].join("\n");
        if (queryInput) queryInput.value = "Summarize the LumApps company announcement posts.";
    } else if (presetKey === 'multi_connector_suite') {
        targetsInput.value = [
            "https://drive.google.com/a/thomascummins.altostrat.com/open?id=1YYMik21vs4_gDZwRXV0rjZkRLoGRtSbO",
            "gs://tc-vertex-search-experiments/jira-ds/JIRA-102_vpn_access_denied.txt",
            "gs://tc-vertex-search-experiments/confluence-ds/it_vpn_setup_guide.html",
            "gs://yahoo-lumapps-mock-bucket-tc/post-1.html"
        ].join("\n");
        if (queryInput) queryInput.value = "Read and summarize the key facts and instructions in this document.";
    }
}

function clearTestbedInputs() {
    const targetsInput = document.getElementById('testbed-targets-input');
    const queryInput = document.getElementById('testbed-query-input');
    const resContainer = document.getElementById('testbed-results-container');
    const statusEl = document.getElementById('testbed-status-indicator');

    if (targetsInput) targetsInput.value = '';
    if (queryInput) queryInput.value = '';
    if (resContainer) resContainer.style.display = 'none';
    if (statusEl) statusEl.innerHTML = '<span>Ready to execute parallel audit.</span>';
    currentTestbedResult = null;
}

async function runParallelTestbed() {
    const targetsInput = document.getElementById('testbed-targets-input');
    const queryInput = document.getElementById('testbed-query-input');
    const runBtn = document.getElementById('testbed-run-btn');
    const statusEl = document.getElementById('testbed-status-indicator');
    const resContainer = document.getElementById('testbed-results-container');
    const engineMode = document.querySelector('input[name="testbed-engine-radio"]:checked')?.value || 'stream_assist';

    const rawTargets = (targetsInput?.value || '').trim();
    const query = (queryInput?.value || '').trim();

    if (!rawTargets && !query) {
        alert('Please enter at least one target document link or a scenario query.');
        return;
    }

    if (runBtn) {
        runBtn.disabled = true;
        runBtn.innerHTML = '<span>⏳</span> <span>Executing streamAssist...</span>';
    }
    if (statusEl) {
        statusEl.innerHTML = `<span style="color: #8b5cf6;">⚡ Dispatching parallel ${engineMode === 'stream_assist' ? 'streamAssist API calls' : 'DataStore search probes'}...</span>`;
    }
    if (resContainer) {
        resContainer.style.display = 'none';
    }

    const t0 = performance.now();

    try {
        let endpoint = '/api/testbed/stream-assist';
        let payload = {
            targets: rawTargets,
            scenario_query: query,
            model_id: document.getElementById('testbed-model-select')?.value || 'gemini-3.5-flash',
            search_mode: document.getElementById('testbed-search-mode-select')?.value || 'Agentic',
            timeout_sec: 40.0,
        };

        if (engineMode === 'search') {
            endpoint = '/api/testbed/probe';
            payload = {
                targets: rawTargets,
                scenario_query: query,
                connector_ids: document.getElementById('testbed-connector-select')?.value || 'all',
                timeout_sec: 4.0,
            };
        }

        const resp = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const dt = Math.round(performance.now() - t0);

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`HTTP ${resp.status}: ${errText}`);
        }

        const data = await resp.json();
        currentTestbedResult = data;

        if (engineMode === 'stream_assist') {
            renderStreamAssistTestbedResults(data, dt);
        } else {
            renderSearchTestbedResults(data, dt);
        }

        if (statusEl) {
            const cnt = data.targets_count || (data.results || []).length;
            statusEl.innerHTML = `<span style="color: var(--success-color);">✅ Successfully executed ${cnt} parallel streamAssist document reads in ${data.total_latency_ms || dt}ms.</span>`;
        }
    } catch (err) {
        console.error('Testbed audit failed:', err);
        if (statusEl) {
            statusEl.innerHTML = `<span style="color: #ef4444;">❌ Audit Error: ${escapeHtml(err.message)}</span>`;
        }
    } finally {
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.innerHTML = '<span>🚀</span> <span>Run Parallel Audit</span>';
        }
    }
}

function renderStreamAssistTestbedResults(data, elapsedMs) {
    const resContainer = document.getElementById('testbed-results-container');
    const waterfallPanel = document.getElementById('testbed-waterfall-panel');
    if (!resContainer) return;
    resContainer.style.display = 'flex';
    if (waterfallPanel) waterfallPanel.style.display = 'none';

    const results = data.results || [];
    let totalGroundedDocs = 0;
    let totalTtlt = 0;

    results.forEach(r => {
        totalGroundedDocs += (r.retrieved_documents || []).length;
        totalTtlt += (r.ttlt_sec || 0);
    });

    const avgTtlt = results.length ? (totalTtlt / results.length).toFixed(2) : '0.00';

    // KPIs
    document.getElementById('testbed-kpi-targets').textContent = data.targets_count || results.length;
    document.getElementById('testbed-kpi-grounded').textContent = totalGroundedDocs;
    document.getElementById('testbed-kpi-avg-latency').textContent = `${avgTtlt}s`;
    document.getElementById('testbed-kpi-total-time').textContent = `${data.total_latency_ms || elapsedMs} ms`;

    // StreamAssist Target Cards
    const cardsEl = document.getElementById('testbed-target-cards');
    if (cardsEl) {
        cardsEl.innerHTML = results.map((res, i) => {
            const is200 = (res.status_code === 200);
            const docs = res.retrieved_documents || [];
            const tools = res.tool_calls || [];
            const isMatch = res.is_match;

            return `
                <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-left: 4px solid ${is200 ? (docs.length ? '#22c55e' : '#f59e0b') : '#ef4444'}; border-radius: 10px; padding: 1rem; display: flex; flex-direction: column; gap: 0.65rem;">
                    
                    <!-- Card Top Header -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem; flex-wrap: wrap;">
                        <div>
                            <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem;">
                                <span>📄 Target ${res.probe_index || (i + 1)}:</span>
                                <code style="font-family: monospace; font-size: 0.82rem; word-break: break-all;">${escapeHtml(res.target)}</code>
                            </div>
                            <div style="font-size: 0.74rem; color: var(--text-sub); margin-top: 0.2rem;">
                                <b>Dispatched Prompt:</b> <span style="font-style: italic;">"${escapeHtml(res.query_prompt || '')}"</span>
                            </div>
                        </div>

                        <!-- Status & Latency Badges -->
                        <div style="display: flex; gap: 0.35rem; align-items: center; flex-wrap: wrap;">
                            <span class="badge ${is200 ? 'badge-pass' : 'badge-fail'}" style="font-size: 0.68rem; padding: 0.15rem 0.5rem;">
                                ${is200 ? '🟢 HTTP 200' : `🔴 HTTP ${res.status_code}`}
                            </span>
                            <span class="badge" style="background: rgba(99, 102, 241, 0.15); color: #818cf8; font-size: 0.68rem; padding: 0.15rem 0.5rem;">
                                ⚡ TTFT: ${res.ttft_sec || 0}s | TTLT: ${res.ttlt_sec || 0}s
                            </span>
                            ${res.connectors_used ? `
                                <span class="badge" style="background: var(--bg-card-secondary); color: var(--text-main); border: 1px solid var(--border-color); font-size: 0.68rem; padding: 0.15rem 0.5rem;">
                                    🔌 ${escapeHtml(res.connectors_used)}
                                </span>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Tools Executed (if any) -->
                    ${tools.length > 0 ? `
                        <div style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.72rem;">
                            <b style="color: var(--text-sub);">Tools Executed (${tools.length}):</b>
                            <div style="display: flex; gap: 0.3rem; flex-wrap: wrap;">
                                ${tools.map(t => `<span style="background: rgba(139, 92, 246, 0.15); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 4px; padding: 1px 6px; font-family: monospace; font-size: 0.68rem;">🔧 ${escapeHtml(t.name || t.functionName || 'connector_tool')}</span>`).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Model Synthesized Stream Output -->
                    <div style="background: var(--bg-card-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem;">
                        <div style="font-size: 0.72rem; font-weight: 700; color: var(--accent-primary); text-transform: uppercase; margin-bottom: 0.35rem; display: flex; justify-content: space-between;">
                            <span>📖 Live StreamAssist Model Reading & Extraction</span>
                            <span style="font-size: 0.68rem; color: var(--text-sub);">${(res.response_text || '').split(/\s+/).length} words</span>
                        </div>
                        <div style="font-size: 0.8rem; color: var(--text-main); line-height: 1.5; white-space: pre-wrap; max-height: 160px; overflow-y: auto;">${escapeHtml(res.response_text || 'No response text returned.')}</div>
                    </div>

                    <!-- Grounding References Extracted from Chunks -->
                    ${docs.length > 0 ? `
                        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.5rem 0.75rem;">
                            <div style="font-size: 0.72rem; font-weight: 700; color: var(--text-sub); text-transform: uppercase; margin-bottom: 0.35rem;">
                                🛡️ Grounded Document Chunks (${docs.length}):
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 0.35rem;">
                                ${docs.map(doc => `
                                    <div style="background: var(--bg-card-secondary); border: 1px solid var(--border-color); border-radius: 4px; padding: 0.4rem 0.55rem; font-size: 0.72rem;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.2rem;">
                                            <b style="color: var(--text-main);">📄 ${escapeHtml(doc.title || doc.document_id || 'Document')}</b>
                                            <span style="font-family: monospace; font-size: 0.66rem; color: var(--text-sub);">${escapeHtml(doc.domain || doc.mime_type || '')}</span>
                                        </div>
                                        ${doc.uri ? `<div style="font-family: monospace; font-size: 0.68rem; color: #60a5fa; word-break: break-all; margin-bottom: 0.2rem;"><a href="${escapeHtml(doc.uri)}" target="_blank" rel="noopener" style="color: #60a5fa; text-decoration: none;">${escapeHtml(doc.uri)} ↗</a></div>` : ''}
                                        ${doc.snippets ? `<div style="font-family: monospace; font-size: 0.68rem; color: var(--text-sub); max-height: 60px; overflow-y: auto;">${escapeHtml(doc.snippets)}</div>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Trace Footer -->
                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.68rem; color: var(--text-sub); font-family: monospace;">
                        <span>Trace: ${escapeHtml(res.trace_id || 'N/A')}</span>
                        <span>Token: ${escapeHtml((res.assist_token || '').substring(0, 16))}...</span>
                    </div>

                </div>
            `;
        }).join('');
    }

    // Raw JSON Panel
    const rawPanel = document.getElementById('testbed-raw-json-panel');
    if (rawPanel) {
        rawPanel.textContent = JSON.stringify(data, null, 2);
    }
}

function renderSearchTestbedResults(data, elapsedMs) {
    const resContainer = document.getElementById('testbed-results-container');
    const waterfallPanel = document.getElementById('testbed-waterfall-panel');
    if (!resContainer) return;
    resContainer.style.display = 'flex';
    if (waterfallPanel) waterfallPanel.style.display = 'flex';

    document.getElementById('testbed-kpi-targets').textContent = (data.targets || []).length;
    document.getElementById('testbed-kpi-grounded').textContent = data.total_probes_dispatched || 0;
    document.getElementById('testbed-kpi-avg-latency').textContent = `${data.total_datastores_count || 0} DS`;
    document.getElementById('testbed-kpi-total-time').textContent = `${data.total_latency_ms || elapsedMs} ms`;

    // Cards
    const cardsEl = document.getElementById('testbed-target-cards');
    if (cardsEl) {
        cardsEl.innerHTML = (data.results || []).map((res, i) => `
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-left: 3px solid ${res.accessible ? '#22c55e' : '#ef4444'}; border-radius: 8px; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.4rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                    <div style="font-weight: 700; font-size: 0.84rem; color: var(--text-main);">
                        <span>🎯 Target ${i + 1}:</span>
                        <code style="font-family: monospace; font-size: 0.8rem; margin-left: 0.3rem;">${escapeHtml(res.target || '')}</code>
                    </div>
                    <div style="display: flex; gap: 0.35rem; align-items: center;">
                        <span class="badge ${res.accessible ? 'badge-pass' : 'badge-fail'}" style="font-size: 0.68rem;">
                            ${res.accessible ? '🟢 ACCESSIBLE' : `🔴 HTTP ${res.status_code || 404}`}
                        </span>
                        <span class="badge" style="background: rgba(99, 102, 241, 0.15); color: #818cf8; font-size: 0.68rem;">
                            🔌 ${escapeHtml(res.connector_used || 'Discovery Engine')}
                        </span>
                        <span class="badge" style="background: var(--bg-card-secondary); color: var(--text-sub); font-size: 0.68rem;">
                            ⚡ ${res.fetch_latency_ms || 0}ms
                        </span>
                    </div>
                </div>
                ${res.title ? `<div style="font-size: 0.76rem; color: var(--text-sub);"><b>Resolved Document:</b> ${escapeHtml(res.title)}</div>` : ''}
                ${res.content_preview ? `
                    <div style="background: var(--bg-card-secondary); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.5rem 0.65rem; font-family: monospace; font-size: 0.74rem; color: var(--text-main); max-height: 80px; overflow-y: auto; white-space: pre-wrap;">
                        ${escapeHtml(res.content_preview)}
                    </div>
                ` : (res.error ? `<div style="font-size: 0.74rem; color: #ef4444;">${escapeHtml(res.error)}</div>` : '')}
            </div>
        `).join('');
    }

    renderTestbedWaterfallRows(data.all_probe_logs || []);

    const rawPanel = document.getElementById('testbed-raw-json-panel');
    if (rawPanel) {
        rawPanel.textContent = JSON.stringify(data, null, 2);
    }
}

function renderTestbedWaterfallRows(probes) {
    const tbody = document.getElementById('testbed-waterfall-tbody');
    if (!tbody) return;

    if (probes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="padding: 0.75rem; text-align: center; color: var(--text-sub);">No probes recorded.</td></tr>`;
        return;
    }

    tbody.innerHTML = probes.map(p => {
        const isMatch = p.is_match;
        const resCount = p.results_count || 0;
        const status = p.response_status || 0;
        const is200 = (status === 200);

        let verdictColor = 'var(--text-sub)';
        let verdictBadge = p.match_verdict || 'No Match';
        if (isMatch) {
            verdictColor = 'var(--success-color)';
            verdictBadge = `✅ ${p.match_verdict}`;
        } else if (resCount > 0) {
            verdictColor = '#f59e0b';
        }

        return `
            <tr style="border-bottom: 1px solid var(--border-color); background: ${isMatch ? 'rgba(34, 197, 94, 0.08)' : 'transparent'};">
                <td style="padding: 0.35rem 0.5rem; font-family: monospace;">${p.probe_index || 1}</td>
                <td style="padding: 0.35rem 0.5rem;">
                    <b style="color: var(--text-main);">${escapeHtml(p.connector_name || 'Connector')}</b>
                    <div style="font-family: monospace; font-size: 0.65rem; color: var(--text-sub);">${escapeHtml(p.datastore_id || '')}</div>
                </td>
                <td style="padding: 0.35rem 0.5rem; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(p.query_used)}">
                    <code style="font-size: 0.68rem;">"${escapeHtml(p.query_used)}"</code>
                </td>
                <td style="padding: 0.35rem 0.5rem;">
                    <span class="badge ${is200 ? 'badge-pass' : 'badge-fail'}" style="font-size: 0.64rem;">HTTP ${status}</span>
                </td>
                <td style="padding: 0.35rem 0.5rem; font-size: 0.68rem; color: var(--text-sub);">${p.latency_ms || 0}ms</td>
                <td style="padding: 0.35rem 0.5rem; font-weight: 600; color: ${resCount > 0 ? 'var(--text-main)' : 'var(--text-sub)'};">${resCount} docs</td>
                <td style="padding: 0.35rem 0.5rem; font-weight: ${isMatch ? '700' : '400'}; color: ${verdictColor}; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(p.match_verdict || '')}">
                    ${escapeHtml(verdictBadge)}
                </td>
            </tr>
        `;
    }).join('');
}

function filterTestbedWaterfallTable() {
    const term = (document.getElementById('testbed-table-search')?.value || '').toLowerCase().trim();
    const allProbes = currentTestbedResult?.all_probe_logs || [];
    if (!term) {
        renderTestbedWaterfallRows(allProbes);
        return;
    }
    const filtered = allProbes.filter(p => 
        (p.connector_name || '').toLowerCase().includes(term) ||
        (p.datastore_id || '').toLowerCase().includes(term) ||
        (p.query_used || '').toLowerCase().includes(term) ||
        (p.match_verdict || '').toLowerCase().includes(term)
    );
    renderTestbedWaterfallRows(filtered);
}

function toggleTestbedRawJson() {
    const panel = document.getElementById('testbed-raw-json-panel');
    if (panel) {
        panel.style.display = (panel.style.display === 'none' ? 'block' : 'none');
    }
}

// Attach to window
window.openTestbedModal = openTestbedModal;
window.closeTestbedModal = closeTestbedModal;
window.toggleTestbedEngineMode = toggleTestbedEngineMode;
window.applyTestbedPreset = applyTestbedPreset;
window.clearTestbedInputs = clearTestbedInputs;
window.runParallelTestbed = runParallelTestbed;
window.filterTestbedWaterfallTable = filterTestbedWaterfallTable;
window.toggleTestbedRawJson = toggleTestbedRawJson;
