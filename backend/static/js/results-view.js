/**
 * Results View: Master Table & Split Screen Explorer, Comparison Scorecard, Full Scenario Analysis, BigQuery Export
 */

let allResultsData = [];

async function populateResultsRunSelector(activeRunId, isMaster) {
    const resultsSelector = document.getElementById('results-run-selector');
    const statusSelector = document.getElementById('status-run-selector');
    try {
        const res = await fetch('/api/runs');
        const data = await res.json();
        const runs = (data.status === 'success' && data.runs) ? data.runs : [];
        window._allRunsList = runs;
        
        let resultsHtml = '';
        let statusHtml = '';
        runs.forEach(r => {
            const isResultsSelected = (!isMaster && activeRunId === r.run_id);
            const isStatusSelected = (currentActiveMonitorRunId === r.run_id);
            const statusTag = r.status ? ` [${r.status.toUpperCase()}]` : '';
            const timeTag = r.timestamp ? ` - ${r.timestamp}` : '';
            const optText = `🏃 Run ${escapeHtml(r.run_id)}${escapeHtml(timeTag)}${escapeHtml(statusTag)}`;
            resultsHtml += `<option value="${escapeHtml(r.run_id)}" ${isResultsSelected ? 'selected' : ''}>${optText}</option>`;
            statusHtml += `<option value="${escapeHtml(r.run_id)}" ${isStatusSelected ? 'selected' : ''}>${optText}</option>`;
        });

        // Master comparison DB option
        resultsHtml += `<option value="master" ${isMaster ? 'selected' : ''}>📋 Master Database (Consolidated)</option>`;

        if (resultsSelector) {
            resultsSelector.innerHTML = resultsHtml;
            if (!isMaster && activeRunId) {
                resultsSelector.value = activeRunId;
            } else if (isMaster) {
                resultsSelector.value = 'master';
            }
        }

        if (statusSelector) {
            statusSelector.innerHTML = statusHtml || '<option value="" disabled>No runs available</option>';
            if (currentActiveMonitorRunId) {
                statusSelector.value = currentActiveMonitorRunId;
            }
        }
    } catch (err) {
        console.error("Failed to populate run selectors:", err);
    }
}

function onResultsRunSelected(selectedVal) {
    if (selectedVal === 'master') {
        loadMasterDatabaseView();
    } else {
        currentResultsDataSource = 'run';
        currentResultsRunId = selectedVal;
        window.location.hash = `results?run_id=${encodeURIComponent(selectedVal)}`;
        loadMasterComparison();
    }
}

function loadMasterDatabaseView() {
    currentResultsDataSource = 'master';
    currentResultsRunId = null;
    document.getElementById('results-view-subtitle').textContent = 'Consolidated Master Comparison Database';
    const errorBanner = document.getElementById('results-run-error-banner');
    if (errorBanner) errorBanner.style.display = 'none';
    window.location.hash = 'results?view=master';
    const selector = document.getElementById('results-run-selector');
    if (selector) selector.value = 'master';
    loadMasterComparison();
}

function viewHistoricalRunResults(runId) {
    currentResultsDataSource = 'run';
    currentResultsRunId = runId;
    window.location.hash = `results?run_id=${encodeURIComponent(runId)}`;
    switchScreen('results', false, false);
    loadMasterComparison();
}

function viewCurrentRunLogs() {
    if (currentResultsRunId) {
        if (typeof window.monitorRunEvents === 'function') {
            window.monitorRunEvents(currentResultsRunId);
        } else {
            switchScreen('run-status');
        }
    } else {
        switchScreen('run-status');
    }
}

function duplicateCurrentErrorRun() {
    if (currentResultsRunId) {
        if (typeof window.duplicateRun === 'function') {
            window.duplicateRun(currentResultsRunId);
        }
    }
}

async function loadMasterComparison() {
    try {
        if (currentResultsDataSource === 'run' && !currentResultsRunId) {
            try {
                const runsRes = await fetch('/api/runs');
                const runsData = await runsRes.json();
                if (runsData.status === 'success' && runsData.runs && runsData.runs.length > 0) {
                    currentResultsRunId = runsData.runs[0].run_id;
                }
            } catch (e) {
                console.warn("Could not fetch most recent run for results view:", e);
            }
        }

        if (currentResultsDataSource === 'run' && !currentResultsRunId) {
            currentResultsDataSource = 'master';
        }

        const fullDetail = document.getElementById('results-full-screen-detail');
        if (fullDetail) fullDetail.style.display = 'none';
        const splitLayout = document.querySelector('.split-layout');
        if (splitLayout) splitLayout.style.display = 'block';

        await populateResultsRunSelector(currentResultsRunId, currentResultsDataSource === 'master');

        const url = currentResultsDataSource === 'master' 
            ? '/api/master-comparison' 
            : `/api/runs/${currentResultsRunId}/results`;

        const res = await fetch(url);
        const data = await res.json();
        const tbody = document.getElementById('master-body');
        tbody.innerHTML = '';

        const errorBanner = document.getElementById('results-run-error-banner');
        const subtitleEl = document.getElementById('results-view-subtitle');

        if (currentResultsDataSource === 'master') {
            if (errorBanner) errorBanner.style.display = 'none';
            if (subtitleEl) subtitleEl.textContent = 'Consolidated Master Comparison Database';
        } else {
            if (subtitleEl) {
                subtitleEl.textContent = `Viewing Results for Run: ${currentResultsRunId}`;
            }

            const isFailed = data.run_status === 'failed' || Boolean(data.error_message);
            const isRunning = data.run_status === 'running';

            if (isFailed && errorBanner) {
                errorBanner.style.display = 'block';
                errorBanner.style.background = 'rgba(239, 68, 68, 0.12)';
                errorBanner.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                document.getElementById('results-error-icon').textContent = '🚨';
                document.getElementById('results-error-title').textContent = 'Evaluation Run Failed to Complete';
                document.getElementById('results-error-title').style.color = '#fca5a5';
                const badgeEl = document.getElementById('results-error-badge');
                badgeEl.className = 'badge badge-fail';
                badgeEl.style.background = '';
                badgeEl.style.color = '';
                badgeEl.textContent = 'FAILED';
                document.getElementById('results-error-desc').textContent = 
                    `Run ${currentResultsRunId} encountered an error${data.failed_step ? ' during step: ' + data.failed_step : ''}.`;
                document.getElementById('results-error-details-box').textContent = 
                    data.error_message || 'The run terminated unexpectedly before recording all query scenarios.';
            } else if (isRunning && errorBanner) {
                errorBanner.style.display = 'block';
                errorBanner.style.background = 'rgba(245, 158, 11, 0.12)';
                errorBanner.style.borderColor = 'rgba(245, 158, 11, 0.4)';
                document.getElementById('results-error-icon').textContent = '⏳';
                document.getElementById('results-error-title').textContent = 'Evaluation Run in Progress';
                document.getElementById('results-error-title').style.color = '#fcd34d';
                const badgeEl = document.getElementById('results-error-badge');
                badgeEl.className = 'badge';
                badgeEl.style.background = 'rgba(245, 158, 11, 0.2)';
                badgeEl.style.color = '#fcd34d';
                badgeEl.textContent = 'RUNNING';
                document.getElementById('results-error-desc').textContent = 
                    `Run ${currentResultsRunId} is actively executing benchmarks in the background.`;
                document.getElementById('results-error-details-box').textContent = 
                    'Active execution in progress. Click "View Run Logs" to observe live streaming events.';
            } else if (errorBanner) {
                errorBanner.style.display = 'none';
            }
        }

        allResultsData = data.rows || data.results || [];

        if (!allResultsData.length) {
            if (data.run_status === 'failed' || data.error_message) {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: #fca5a5; padding: 2.5rem;">⚠️ No query result records generated due to run failure. Review the error details in the banner above or inspect the execution logs.</td></tr>';
            } else {
                tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-sub); padding: 2.5rem;">No evaluation records found for this run.</td></tr>';
            }
            
            document.getElementById('kpi-total-scenarios').textContent = '0';
            document.getElementById('kpi-ge-accuracy').textContent = '--';
            const kpiEvEmpty = document.getElementById('kpi-ge-evidence-match');
            if (kpiEvEmpty) kpiEvEmpty.textContent = '--';
            const kpiSrcEmpty = document.getElementById('kpi-ge-source-match');
            if (kpiSrcEmpty) kpiSrcEmpty.textContent = '--';
            document.getElementById('kpi-glean-accuracy').textContent = '--';
            document.getElementById('kpi-avg-latency').textContent = '--';
            return;
        }

        const groupedQueriesMap = {};
        allResultsData.forEach(row => {
            const q = (row.query || '').trim();
            if (!groupedQueriesMap[q]) {
                groupedQueriesMap[q] = {
                    query: q,
                    ground_truth: row.ground_truth || '',
                    expected_source: row.expected_source || row.description || '',
                    results: []
                };
            }
            groupedQueriesMap[q].results.push(row);
        });

        const allGroupedQueries = Object.values(groupedQueriesMap);
        window.currentRunScenarioGroups = allGroupedQueries;

        const totalScenarios = allResultsData.length;
        document.getElementById('kpi-total-scenarios').textContent = allGroupedQueries.length;

        const geRows = allResultsData.filter(r => r.system !== 'Glean_Web');
        const gleanRows = allResultsData.filter(r => r.system === 'Glean_Web');

        if (geRows.length > 0) {
            const gePasses = geRows.filter(r => r.judge_pass === true || r.judge_pass === 'True' || r.accuracy_pass === 'True').length;
            const geRate = (gePasses / geRows.length) * 100;
            document.getElementById('kpi-ge-accuracy').textContent = `${geRate.toFixed(1)}%`;
            document.getElementById('kpi-ge-accuracy-detail').textContent = `${gePasses} of ${geRows.length} passed`;

            const geEvidencePasses = geRows.filter(r => r.evidence_match === true || r.evidence_match === 'True' || r.has_required_source === true || r.has_required_source === 'True').length;
            const geEvidenceRate = (geEvidencePasses / geRows.length) * 100;
            const kpiEv = document.getElementById('kpi-ge-evidence-match');
            if (kpiEv) kpiEv.textContent = `${geEvidenceRate.toFixed(1)}%`;
            const kpiEvDetail = document.getElementById('kpi-ge-evidence-detail');
            if (kpiEvDetail) kpiEvDetail.textContent = `${geEvidencePasses} of ${geRows.length} grounded`;

            const geSourcePasses = geRows.filter(r => r.has_required_source === true || r.has_required_source === 'True').length;
            const geSourceRate = (geSourcePasses / geRows.length) * 100;
            const kpiSrc = document.getElementById('kpi-ge-source-match');
            if (kpiSrc) kpiSrc.textContent = `${geSourceRate.toFixed(1)}%`;
            const kpiSrcDetail = document.getElementById('kpi-ge-source-detail');
            if (kpiSrcDetail) kpiSrcDetail.textContent = `${geSourcePasses} of ${geRows.length} matched`;
        } else {
            document.getElementById('kpi-ge-accuracy').textContent = 'N/A';
            document.getElementById('kpi-ge-accuracy-detail').textContent = 'No runs recorded';
            const kpiEv = document.getElementById('kpi-ge-evidence-match');
            if (kpiEv) kpiEv.textContent = 'N/A';
            const kpiSrc = document.getElementById('kpi-ge-source-match');
            if (kpiSrc) kpiSrc.textContent = 'N/A';
        }

        const gleanActiveRows = gleanRows.filter(r => isGleanResponseProvided(r, null));
        if (gleanActiveRows.length > 0) {
            const gPasses = gleanActiveRows.filter(r => r.judge_pass === true || r.judge_pass === 'True' || r.accuracy_pass === 'True').length;
            const gRate = (gPasses / gleanActiveRows.length) * 100;
            document.getElementById('kpi-glean-accuracy').textContent = `${gRate.toFixed(1)}%`;
            document.getElementById('kpi-glean-accuracy-detail').textContent = `${gPasses} of ${gleanActiveRows.length} passed`;
        } else {
            document.getElementById('kpi-glean-accuracy').textContent = 'N/A';
            document.getElementById('kpi-glean-accuracy-detail').textContent = 'Not run in this evaluation';
        }

        const totalLatency = allResultsData.reduce((acc, r) => acc + (parseFloat(r.ttlt_sec) || 0), 0);
        const avgLatency = totalLatency / totalScenarios;
        document.getElementById('kpi-avg-latency').textContent = `${avgLatency.toFixed(2)}s`;

        allGroupedQueries.forEach((qGroup, idx) => {
            const summaries = [];
            qGroup.results.forEach(r => {
                const isGlean = r.system === 'Glean_Web';
                const sysPrefix = isGlean ? 'GLEAN ' : '';

                if (isGlean && !isGleanResponseProvided(r, qGroup)) {
                    summaries.push(`<span class="badge badge-secondary" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">GLEAN: NOT RUN</span>`);
                    return;
                }

                const isJudgePass = (r.judge_pass === true || r.judge_pass === 'True' || r.accuracy_pass === 'True' || r.accuracy_pass === true);
                const isSourcePass = (r.has_required_source === true || r.has_required_source === 'True');
                const isEvidencePass = (r.evidence_match === true || r.evidence_match === 'True' || isSourcePass);

                const evidenceBadgeHtml = isEvidencePass 
                    ? `<span class="badge badge-pass" style="font-size: 0.72rem; padding: 0.15rem 0.45rem; margin-right: 0.25rem;"><span>${sysPrefix}EVIDENCE MATCH: <b>✅ PASS</b></span></span>`
                    : `<span class="badge badge-fail" style="font-size: 0.72rem; padding: 0.15rem 0.45rem; margin-right: 0.25rem;"><span>${sysPrefix}EVIDENCE MATCH: <b>❌ FAIL</b></span></span>`;

                summaries.push(`
                    <span class="badge ${isJudgePass ? 'badge-pass' : 'badge-fail'}" style="font-size: 0.72rem; padding: 0.15rem 0.45rem; margin-right: 0.25rem;">
                        <span>${sysPrefix}LLM JUDGE: <b>${isJudgePass ? '✅ PASS' : '❌ FAIL'}</b></span>
                    </span>
                    ${evidenceBadgeHtml}
                    <span class="badge ${isSourcePass ? 'badge-pass' : 'badge-fail'}" style="font-size: 0.72rem; padding: 0.15rem 0.45rem;">
                        <span>${sysPrefix}SOURCE MATCH: <b>${isSourcePass ? '✅ PASS' : '❌ FAIL'}</b></span>
                    </span>
                `);
            });
            const summariesHtml = summaries.join(' ');

            const rowHtml = `
                <tr id="result-row-${idx}" style="cursor: pointer;" onclick="viewScenarioDetail(${idx})">
                    <td style="font-weight: 600; color: var(--text-main); max-width: 450px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${qGroup.query}</td>
                    <td style="color: var(--text-sub); max-width: 350px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${qGroup.ground_truth || 'N/A'}</td>
                    <td>${summariesHtml}</td>
                </tr>
            `;
            tbody.innerHTML += rowHtml;
        });
    } catch (err) {
        console.error("Failed to load master results scoreboard: ", err);
    }
}

function viewScenarioDetail(idx) {
    const qGroup = window.currentRunScenarioGroups?.[idx];
    if (!qGroup) return;

    // Highlight row
    document.querySelectorAll('#master-table tbody tr').forEach(r => r.style.outline = 'none');
    const selectedRow = document.getElementById(`result-row-${idx}`);
    if (selectedRow) selectedRow.style.outline = '2px solid var(--accent-primary)';

    const fullDetail = document.getElementById('results-full-screen-detail') || document.getElementById('selected-scenario-detail');
    const queryEl = document.getElementById('detail-query-text') || document.getElementById('detail-user-query');
    if (queryEl) queryEl.textContent = qGroup.query;

    const gtEl = document.getElementById('detail-gt-text') || document.getElementById('detail-gt-answer');
    if (gtEl) gtEl.textContent = qGroup.ground_truth || 'None specified';
    
    const gtSourcesContainer = document.getElementById('detail-gt-sources');
    if (gtSourcesContainer) {
        gtSourcesContainer.innerHTML = formatSourceUrls(qGroup.expected_source || 'None');
    }

    const compBody = document.getElementById('detail-comparison-body');
    if (compBody) compBody.innerHTML = '';

    const expandedContainer = document.getElementById('detail-systems-expanded') || document.getElementById('detail-expanded-responses');
    if (expandedContainer) expandedContainer.innerHTML = '';

    const geResults = qGroup.results.filter(r => r.system !== 'Glean_Web');
    const gleanResults = qGroup.results.filter(r => r.system === 'Glean_Web');

function getModelTheme(modelId) {
    const m = String(modelId || '').toLowerCase();
    if (m.includes('flash')) {
        return {
            name: 'Gemini 3.5 Flash',
            shortName: 'Flash',
            icon: '⚡',
            color: '#38bdf8',
            borderColor: 'rgba(56, 189, 248, 0.45)',
            topBorder: '#38bdf8',
            bgGradient: 'linear-gradient(135deg, rgba(56, 189, 248, 0.14) 0%, rgba(56, 189, 248, 0.02) 100%)',
            badgeBg: 'rgba(56, 189, 248, 0.16)',
            badgeBorder: '1px solid rgba(56, 189, 248, 0.4)',
            pillBg: 'rgba(56, 189, 248, 0.22)',
            tag: 'FAST STREAMING'
        };
    }
    if (m.includes('pro')) {
        return {
            name: 'Gemini 3.1 Pro',
            shortName: 'Pro',
            icon: '🧠',
            color: '#c084fc',
            borderColor: 'rgba(192, 132, 252, 0.45)',
            topBorder: '#a855f7',
            bgGradient: 'linear-gradient(135deg, rgba(168, 85, 247, 0.14) 0%, rgba(168, 85, 247, 0.02) 100%)',
            badgeBg: 'rgba(168, 85, 247, 0.16)',
            badgeBorder: '1px solid rgba(168, 85, 247, 0.4)',
            pillBg: 'rgba(168, 85, 247, 0.22)',
            tag: 'DEEP REASONING'
        };
    }
    if (m.includes('glean')) {
        return {
            name: 'Glean Web Default',
            shortName: 'Glean',
            icon: '🌐',
            color: '#34d399',
            borderColor: 'rgba(52, 211, 153, 0.45)',
            topBorder: '#10b981',
            bgGradient: 'linear-gradient(135deg, rgba(52, 211, 153, 0.14) 0%, rgba(52, 211, 153, 0.02) 100%)',
            badgeBg: 'rgba(52, 211, 153, 0.16)',
            badgeBorder: '1px solid rgba(52, 211, 153, 0.4)',
            pillBg: 'rgba(52, 211, 153, 0.22)',
            tag: 'WEB BASELINE'
        };
    }
    return {
        name: modelId || 'Enterprise Model',
        shortName: modelId || 'Model',
        icon: '🤖',
        color: '#60a5fa',
        borderColor: 'rgba(96, 165, 250, 0.45)',
        topBorder: '#3b82f6',
        bgGradient: 'linear-gradient(135deg, rgba(96, 165, 250, 0.1) 0%, rgba(96, 165, 250, 0.02) 100%)',
        badgeBg: 'rgba(96, 165, 250, 0.15)',
        badgeBorder: '1px solid rgba(96, 165, 250, 0.4)',
        pillBg: 'rgba(96, 165, 250, 0.2)',
        tag: 'AGENT'
    };
}

// 1. Stacked Row 1: Gemini Enterprise
    geResults.forEach((r, geIdx) => {
        const theme = getModelTheme(r.model_id);
        const isJudgePass = (r.judge_pass === true || r.judge_pass === 'True' || r.accuracy_pass === 'True' || r.accuracy_pass === true);
        const isSourcePass = (r.has_required_source === true || r.has_required_source === 'True');
        const isEvidencePass = (r.evidence_match === true || r.evidence_match === 'True' || isSourcePass);

        const sysBadge = '<span class="badge badge-ge">Gemini Enterprise</span>';
        const judgeBadge = isJudgePass ? '<span class="badge badge-pass">✅ PASS</span>' : '<span class="badge badge-fail">❌ FAIL</span>';
        const evidenceBadge = isEvidencePass ? '<span class="badge badge-pass">✅ PASS</span>' : '<span class="badge badge-fail">❌ FAIL</span>';
        const sourceBadge = isSourcePass ? '<span class="badge badge-pass">✅ PASS</span>' : '<span class="badge badge-fail">❌ FAIL</span>';

        let verdictBadge = '';
        if (isJudgePass && isSourcePass) {
            verdictBadge = `<span style="color: var(--success-color); font-weight: 600;">✅ Full Match</span>`;
        } else if (isJudgePass && isEvidencePass) {
            verdictBadge = `<span style="color: #60a5fa; font-weight: 600;">💡 Alt Source (${r.total_sources_count || 1} cited)</span>`;
        } else if (isJudgePass && !isEvidencePass) {
            verdictBadge = `<span style="color: var(--danger-color); font-weight: 600;">❌ Ungrounded</span>`;
        } else {
            verdictBadge = `<span style="color: var(--danger-color); font-weight: 600;">❌ Inaccurate</span>`;
        }

        const rowHtml = `
            <tr>
                <td>${sysBadge}</td>
                <td>
                    <span class="badge" style="background: ${theme.badgeBg}; color: ${theme.color}; border: ${theme.badgeBorder}; font-size: 0.82rem; font-weight: 700; padding: 0.2rem 0.55rem; display: inline-flex; align-items: center; gap: 0.35rem;">
                        <span>${theme.icon}</span> <span>${r.model_id || 'gemini-3.5-flash'}</span>
                    </span>
                </td>
                <td>${judgeBadge}</td>
                <td>${evidenceBadge}</td>
                <td>${sourceBadge}</td>
                <td>${parseFloat(r.ttft_sec || 0).toFixed(3)}s</td>
                <td>${parseFloat(r.ttlt_sec || 0).toFixed(3)}s</td>
                <td>${verdictBadge}</td>
            </tr>
        `;
        if (compBody) compBody.innerHTML += rowHtml;

        const renderedMd = cleanMarkdown(r.response_text);
        const sourcesFormatted = formatSourceUrls(r.source_urls);
        
        let connVal = r.connectors_used || r.connector_id || '';
        if (connVal === 'none') {
            connVal = 'None (RAG Disabled)';
        } else if (connVal === 'all' || !connVal || connVal === 'Default Data Store') {
            connVal = 'All Connectors (Dynamic RAG)';
        }

        // Compute 3 structured reasoning sections
        const judgeReasoningText = r.judge_reasoning || (isJudgePass 
            ? 'The candidate response accurately captures all critical facts required by the ground truth specification.' 
            : 'The candidate response contains inaccuracies or omitted critical facts required by the ground truth.');

        let evidenceReasoningText = '';
        if (isSourcePass) {
            evidenceReasoningText = 'Passed because the cited reference is an authoritative golden benchmark document that directly substantiates the response.';
        } else if (isEvidencePass) {
            evidenceReasoningText = `Passed (Alternative Grounded Source): ${r.evidence_reasoning || 'The cited document content and subject matter were verified to support the response claims.'} ${r.evidence_quote ? `Supporting Quote: "${r.evidence_quote}"` : ''}`;
        } else {
            evidenceReasoningText = r.evidence_reasoning || 'Failed because the cited document content does not contain the required factual policies or claims made in the response, or no valid sources were cited.';
        }

        let sourceReasoningText = '';
        if (isSourcePass) {
            sourceReasoningText = `Passed because the cited reference ID/URL (${r.matched_sources_count || 1} matched) matches the expected golden reference.`;
        } else if (isEvidencePass && !isSourcePass) {
            const firstCited = (r.source_urls && r.source_urls.length > 0) ? r.source_urls[0] : 'Cited document';
            sourceReasoningText = `Failed (Alternative Document Cited): Although the model cited a relevant, grounded document (<code style="font-size: 0.76rem; word-break: break-all;">${firstCited}</code>), it is not yet listed in the golden dataset. You can add it directly using the <b>Action Panel</b> below.`;
        } else {
            if (!r.source_urls || r.source_urls.length === 0 || (r.total_sources_count === 0)) {
                sourceReasoningText = 'Failed because the model response did not cite any source URLs or document references.';
            } else {
                const firstCited = r.source_urls[0];
                const expectedDoc = (Array.isArray(r.expected_source) ? r.expected_source[0] : r.expected_source) || (qGroup.expected_source || 'Golden Reference');
                sourceReasoningText = `Failed because cited reference (<code style="font-size: 0.76rem; word-break: break-all;">${firstCited}</code>) does not match the expected golden reference (<code style="font-size: 0.76rem; word-break: break-all;">${expectedDoc}</code>) and could not be verified as a grounded alternative.`;
            }
        }

        const detailedCardHtml = `
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-top: 4px solid ${theme.topBorder}; border-radius: 10px; padding: 1.1rem 1.25rem; margin-top: 0.85rem; box-shadow: 0 4px 14px rgba(0,0,0,0.08);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.65rem; flex-wrap: wrap; gap: 0.6rem; background: ${theme.bgGradient}; padding: 0.6rem 0.85rem; border-radius: 8px; margin-left: -0.35rem; margin-right: -0.35rem; margin-top: -0.35rem;">
                    <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 0.45rem;">
                            <span style="font-size: 1.25rem;">${theme.icon}</span>
                            <span style="font-size: 1.12rem; font-weight: 800; color: ${theme.color}; letter-spacing: -0.2px;">${theme.name}</span>
                            <code style="font-size: 0.76rem; color: var(--text-sub); background: var(--bg-card); padding: 0.15rem 0.4rem; border-radius: 4px; border: 1px solid var(--border-color);">${r.model_id || 'gemini-3.5-flash'}</code>
                        </div>
                        ${sysBadge}
                        <span class="badge ${isJudgePass ? 'badge-pass' : 'badge-fail'}" style="font-size: 0.74rem;">${isJudgePass ? '✅ LLM JUDGE PASS' : '❌ LLM JUDGE FAIL'}</span>
                        <span class="badge ${isEvidencePass ? 'badge-pass' : 'badge-fail'}" style="font-size: 0.74rem;">${isEvidencePass ? '✅ EVIDENCE MATCH' : '❌ EVIDENCE UNGROUNDED'}</span>
                        <span class="badge ${isSourcePass ? 'badge-pass' : 'badge-fail'}" style="font-size: 0.74rem;">${isSourcePass ? '✅ SOURCE MATCH' : '❌ SOURCE UNMATCHED'}</span>
                    </div>
                    ${r.trace_id ? `<div style="font-family: monospace; font-size: 0.75rem; color: var(--accent-primary); background: var(--bg-card); padding: 0.2rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-color);">Trace ID: ${String(r.trace_id)}</div>` : ''}
                </div>

                <div style="display: grid; grid-template-columns: 1.1fr 1fr; gap: 1.25rem; align-items: start;">
                    
                    <!-- Left Column: Answer text, Cited Sources -->
                    <div style="display: flex; flex-direction: column; gap: 0.85rem;">
                        <div>
                            <div style="font-size: 0.74rem; font-weight: 700; color: var(--accent-primary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.4rem;">📖 Candidate Response (Parsed Markdown)</div>
                            <div class="response-preview-box" style="font-size: 0.86rem; line-height: 1.5; color: var(--text-main); max-height: 340px; overflow-y: auto; background: var(--bg-card-secondary); padding: 0.85rem; border-radius: 8px; margin-bottom: 0; border: 1px solid var(--border-color);">
                                ${renderedMd}
                            </div>
                        </div>

                        <div class="detail-box" style="margin: 0; padding: 0.75rem 0.85rem; background: var(--bg-card-secondary); border-radius: 8px; border: 1px solid var(--border-color);">
                            <b style="color: var(--accent-primary); font-size: 0.74rem; display: block; margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.5px;">📎 Cited Retrieved Sources</b>
                            <div style="max-height: 90px; overflow-y: auto; font-size: 0.78rem; line-height: 1.4;">${sourcesFormatted}</div>
                        </div>
                    </div>

                    <!-- Right Column: Spacious 3-Section Evaluation Reasoning & Action Panel Below -->
                    <div style="display: flex; flex-direction: column; gap: 0.85rem;">
                        <div style="background: var(--bg-card-secondary); border-radius: 8px; border: 1px solid var(--border-color); padding: 1.1rem; display: flex; flex-direction: column; gap: 0.9rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">
                                <b style="color: var(--accent-primary); font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.6px; display: flex; align-items: center; gap: 0.4rem;">
                                    <span>🧠</span> <span>Evaluation Reasoning</span>
                                </b>
                                <span style="font-size: 0.72rem; color: var(--text-sub);">Verdict Breakdown</span>
                            </div>
                            
                            <!-- 1. LLM Judge Reasoning -->
                            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-left: 3px solid #38bdf8; border-radius: 6px; padding: 0.8rem 0.95rem;">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
                                    <b style="color: #38bdf8; font-size: 0.76rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; display: flex; align-items: center; gap: 0.35rem;">
                                        <span>🤖</span> <span>LLM Judge</span>
                                    </b>
                                    <span class="badge ${isJudgePass ? 'badge-pass' : 'badge-fail'}" style="font-size: 0.68rem; padding: 0.1rem 0.45rem;">${isJudgePass ? '✅ PASS' : '❌ FAIL'}</span>
                                </div>
                                <div style="color: var(--text-sub); font-size: 0.83rem; line-height: 1.55; margin-top: 0.3rem;">${judgeReasoningText}</div>
                            </div>

                            <!-- 2. Evidence Match Reasoning -->
                            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-left: 3px solid #34d399; border-radius: 6px; padding: 0.8rem 0.95rem;">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
                                    <b style="color: #34d399; font-size: 0.76rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; display: flex; align-items: center; gap: 0.35rem;">
                                        <span>📄</span> <span>Evidence Match</span>
                                    </b>
                                    <span class="badge ${isEvidencePass ? 'badge-pass' : 'badge-fail'}" style="font-size: 0.68rem; padding: 0.1rem 0.45rem;">
                                        ${isEvidencePass ? '✅ PASS' : '❌ FAIL'}
                                    </span>
                                </div>
                                <div style="color: var(--text-sub); font-size: 0.83rem; line-height: 1.55; margin-top: 0.3rem;">${evidenceReasoningText}</div>
                            </div>

                            <!-- 3. Source Match Reasoning -->
                            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-left: 3px solid ${isSourcePass ? '#34d399' : '#f87171'}; border-radius: 6px; padding: 0.8rem 0.95rem;">
                                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
                                    <b style="color: #a78bfa; font-size: 0.76rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.8px; display: flex; align-items: center; gap: 0.35rem;">
                                        <span>📎</span> <span>Source Match</span>
                                    </b>
                                    <span class="badge ${isSourcePass ? 'badge-pass' : 'badge-fail'}" style="font-size: 0.68rem; padding: 0.1rem 0.45rem;">${isSourcePass ? '✅ PASS' : '❌ FAIL'}</span>
                                </div>
                                <div style="color: var(--text-sub); font-size: 0.83rem; line-height: 1.55; margin-top: 0.3rem;">${sourceReasoningText}</div>
                            </div>
                        </div>

                        <!-- Action Panel Positioned Directly Below Evaluation Reasoning -->
                        ${typeof renderActionPanelHtml === 'function' ? renderActionPanelHtml(r, idx, geIdx) : ''}
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.78rem; border-top: 1px solid var(--border-color); padding-top: 0.65rem; margin-top: 0.85rem;">
                    <div>
                        <span style="color: var(--text-sub); display: inline-block; margin-right: 0.5rem;">Agent / Config:</span>
                        <code style="color: var(--text-main); font-size: 0.75rem;">${r.agent_id || 'core_assistant'}</code>
                    </div>
                    <div>
                        <span style="color: var(--text-sub); display: inline-block; margin-right: 0.5rem;">Connector ID:</span>
                        <code style="color: var(--code-text); font-size: 0.72rem; word-break: break-all;">${connVal}</code>
                    </div>
                </div>
            </div>
        `;
        if (expandedContainer) expandedContainer.innerHTML += detailedCardHtml;
    });

    // 2. Stacked Row 2: Glean Web Comparison
    const hasGleanRun = gleanResults.length > 0 && isGleanResponseProvided(gleanResults[0], qGroup);
    const gleanItem = gleanResults[0];

    let gleanJudgePass = false;
    let gleanSourcePass = false;
    let gleanJudgeBadge = '';
    let gleanSourceBadge = '';
    let gleanJudgeReasoning = '';

    if (hasGleanRun) {
        gleanJudgePass = gleanItem && (gleanItem.judge_pass === true || gleanItem.judge_pass === 'True' || gleanItem.accuracy_pass === 'True' || gleanItem.accuracy_pass === true);
        gleanJudgeBadge = gleanJudgePass ? 
            '<span class="badge badge-pass">✅ PASS</span>' : 
            '<span class="badge badge-fail">❌ FAIL</span>';
        
        gleanSourcePass = gleanItem && (gleanItem.has_required_source === true || gleanItem.has_required_source === 'True');
        gleanSourceBadge = gleanSourcePass ? 
            '<span class="badge badge-pass">✅ PASS</span>' : 
            '<span class="badge badge-fail">❌ FAIL</span>';

        gleanJudgeReasoning = (gleanItem && gleanItem.judge_reasoning) ? gleanItem.judge_reasoning : 'Glean baseline response evaluated.';
    } else {
        gleanJudgeBadge = '<span class="badge badge-not-run">NOT RUN</span>';
        gleanSourceBadge = '<span class="badge badge-not-run">NOT RUN</span>';
        gleanEvidenceBadge = '<span class="badge badge-not-run">NOT RUN</span>';
        gleanJudgeReasoning = 'Glean was not run for this query. No response was recorded or provided in the benchmark dataset.';
    }

    const gleanTheme = getModelTheme('glean');
    const gleanSources = (gleanItem && gleanItem.source_urls) || qGroup.glean_source_urls || '';
    let gleanVerdictBadge = '';
    if (!hasGleanRun) {
        gleanVerdictBadge = `<span class="badge badge-not-run">NOT RUN</span>`;
    } else if (gleanJudgePass && gleanSourcePass) {
        gleanVerdictBadge = `<span style="color: var(--success-color); font-weight: 600;">✅ Full Match</span>`;
    } else if (gleanJudgePass && !gleanSourcePass) {
        gleanVerdictBadge = `<span style="color: #60a5fa; font-weight: 600;">💡 Alt Source</span>`;
    } else {
        gleanVerdictBadge = `<span style="color: var(--danger-color); font-weight: 600;">❌ Inaccurate</span>`;
    }

    const gleanRowHtml = hasGleanRun ? `
        <tr style="background: var(--bg-card-secondary);">
            <td><span class="badge badge-glean">Glean Web</span></td>
            <td>
                <span class="badge" style="background: ${gleanTheme.badgeBg}; color: ${gleanTheme.color}; border: ${gleanTheme.badgeBorder}; font-size: 0.82rem; font-weight: 700; padding: 0.2rem 0.55rem; display: inline-flex; align-items: center; gap: 0.35rem;">
                    <span>${gleanTheme.icon}</span> <span>glean-default</span>
                </span>
            </td>
            <td>${gleanJudgeBadge}</td>
            <td>${gleanEvidenceBadge}</td>
            <td>${gleanSourceBadge}</td>
            <td><span style="color: var(--text-sub);">N/A</span></td>
            <td><span style="color: var(--text-sub);">N/A</span></td>
            <td>${gleanVerdictBadge}</td>
        </tr>
    ` : `
        <tr style="background: var(--bg-card-secondary); opacity: 0.65;">
            <td><span class="badge badge-glean">Glean Web</span></td>
            <td>
                <span class="badge" style="background: ${gleanTheme.badgeBg}; color: ${gleanTheme.color}; border: ${gleanTheme.badgeBorder}; font-size: 0.82rem; font-weight: 700; padding: 0.2rem 0.55rem; display: inline-flex; align-items: center; gap: 0.35rem;">
                    <span>${gleanTheme.icon}</span> <span>glean-default</span>
                </span>
            </td>
            <td><span class="badge badge-not-run">NOT RUN</span></td>
            <td><span class="badge badge-not-run">NOT RUN</span></td>
            <td><span class="badge badge-not-run">NOT RUN</span></td>
            <td><span class="badge badge-not-run">NOT RUN</span></td>
            <td><span class="badge badge-not-run">NOT RUN</span></td>
            <td><span class="badge badge-not-run">NOT RUN</span></td>
        </tr>
    `;
    if (compBody) compBody.innerHTML += gleanRowHtml;

    const gleanRenderedMd = hasGleanRun ? 
        cleanMarkdown(gleanItem?.response_text || qGroup.glean_response_text) : 
        '<span style="color: var(--text-sub); font-style: italic;">No Glean response was executed or recorded for this scenario.</span>';
    const gleanSourcesFormatted = formatSourceUrls(gleanSources);

    const gleanDetailedCardHtml = `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-top: 4px solid ${gleanTheme.topBorder}; border-radius: 10px; padding: 1.1rem 1.25rem; margin-top: 0.85rem; box-shadow: 0 4px 14px rgba(0,0,0,0.08);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.65rem; flex-wrap: wrap; gap: 0.6rem; background: ${gleanTheme.bgGradient}; padding: 0.6rem 0.85rem; border-radius: 8px; margin-left: -0.35rem; margin-right: -0.35rem; margin-top: -0.35rem;">
                <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 0.45rem;">
                        <span style="font-size: 1.25rem;">🌐</span>
                        <span style="font-size: 1.12rem; font-weight: 800; color: ${gleanTheme.color}; letter-spacing: -0.2px;">Glean Web Default</span>
                        <code style="font-size: 0.76rem; color: var(--text-sub); background: var(--bg-card); padding: 0.15rem 0.4rem; border-radius: 4px; border: 1px solid var(--border-color);">glean-default</code>
                    </div>
                    <span class="badge badge-glean" style="font-size: 0.72rem;">Glean Web</span>
                    ${hasGleanRun ? `<span class="badge ${gleanJudgePass ? 'badge-pass' : 'badge-fail'}" style="font-size: 0.74rem;">${gleanJudgePass ? '✅ LLM JUDGE PASS' : '❌ LLM JUDGE FAIL'}</span>` : '<span class="badge badge-not-run" style="font-size: 0.74rem;">NOT RUN</span>'}
                    ${hasGleanRun ? `<span class="badge ${gleanJudgePass ? 'badge-pass' : 'badge-fail'}" style="font-size: 0.74rem;">${gleanJudgePass ? '✅ EVIDENCE MATCH' : '❌ EVIDENCE UNGROUNDED'}</span>` : ''}
                    ${hasGleanRun ? `<span class="badge ${gleanSourcePass ? 'badge-pass' : 'badge-fail'}" style="font-size: 0.74rem;">${gleanSourcePass ? '✅ SOURCE MATCH' : '❌ SOURCE UNMATCHED'}</span>` : ''}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                <div>
                    <div style="font-size: 0.74rem; font-weight: 700; color: var(--accent-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.4rem;">📖 Glean Response Text</div>
                    <div class="response-preview-box" style="font-size: 0.86rem; line-height: 1.5; color: var(--text-main); max-height: 240px; overflow-y: auto; background: var(--bg-card-secondary); padding: 0.85rem; border-radius: 8px; margin-bottom: 0; border: 1px solid var(--border-color);">
                        ${gleanRenderedMd}
                    </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <div class="detail-box" style="margin: 0; padding: 0.75rem 0.85rem; background: var(--bg-card-secondary); border-radius: 8px; border: 1px solid var(--border-color);">
                        <b style="color: var(--success-color); font-size: 0.74rem; display: block; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">🤖 Judge Reasoning</b>
                        <span style="color: var(--text-sub); line-height: 1.4; display: block; max-height: 90px; overflow-y: auto; font-size: 0.8rem;">${escapeHtml(gleanJudgeReasoning)}</span>
                    </div>

                    <div class="detail-box" style="margin: 0; padding: 0.75rem 0.85rem; background: var(--bg-card-secondary); border-radius: 8px; border: 1px solid var(--border-color);">
                        <b style="color: var(--accent-secondary); font-size: 0.74rem; display: block; margin-bottom: 0.25rem; text-transform: uppercase; letter-spacing: 0.5px;">📎 Glean Cited Sources</b>
                        <div style="max-height: 90px; overflow-y: auto; font-size: 0.78rem; line-height: 1.4;">${gleanSourcesFormatted}</div>
                    </div>
                </div>
            </div>
        </div>
    `;
    if (expandedContainer) expandedContainer.innerHTML += gleanDetailedCardHtml;

    // 3. Stacked Row 3: Ground Truth Golden Benchmark
    const firstGe = geResults[0];
    const gtQuality = (firstGe?.gt_source_quality || 'STRONG').toUpperCase();
    const gtReasoning = (firstGe?.gt_quality_reasoning || '').toLowerCase();
    const isInaccessible = (gtQuality === 'INACCESSIBLE' || gtQuality === 'TIMEOUT' || gtQuality === 'FETCH_FAILED' || gtReasoning.includes('timeout') || gtReasoning.includes('inaccessible') || gtReasoning.includes('access denied'));
    const isDomainMismatch = (gtQuality === 'DOMAIN_MISMATCH');
    const isGtWeak = (!isInaccessible && !isDomainMismatch && (gtQuality === 'WEAK' || !qGroup.expected_source || qGroup.expected_source === 'None' || qGroup.expected_source === '[]'));
    
    let gtVerdictBadge = '';
    if (isInaccessible) {
        gtVerdictBadge = `<span class="badge badge-fail" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); font-size: 0.74rem;" title="${escapeHtml(firstGe?.gt_quality_reasoning || 'Golden source is inaccessible or timed out under current credentials')}">🚫 INACCESSIBLE REF</span>`;
    } else if (isDomainMismatch) {
        gtVerdictBadge = `<span class="badge badge-fail" style="background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); font-size: 0.74rem;" title="${escapeHtml(firstGe?.gt_quality_reasoning || 'Golden source domain is inaccessible under current credentials')}">🚫 DOMAIN MISMATCH</span>`;
    } else if (isGtWeak) {
        gtVerdictBadge = `<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.4); font-size: 0.74rem;" title="${escapeHtml(firstGe?.gt_quality_reasoning || 'Reference is weak or unspecific')}">⚠️ WEAK REFERENCE</span>`;
    } else {
        gtVerdictBadge = `<span class="badge badge-pass" style="font-size: 0.74rem;" title="${escapeHtml(firstGe?.gt_quality_reasoning || 'Authoritative golden reference')}">🛡️ STRONG GOLDEN</span>`;
    }

    const gtSourcesFormatted = formatSourceUrls(qGroup.expected_source || 'None');
    const gtRowHtml = `
        <tr style="background: var(--bg-card-secondary);">
            <td><span class="badge" style="background: var(--bg-card); color: var(--success-color); border: 1px solid var(--border-color);">🎯 Ground Truth</span></td>
            <td>
                <span class="badge" style="background: rgba(34, 197, 94, 0.12); color: var(--success-color); border: 1px solid rgba(34, 197, 94, 0.3); font-size: 0.82rem; font-weight: 700; padding: 0.2rem 0.55rem; display: inline-flex; align-items: center; gap: 0.35rem;">
                    <span>🎯</span> <span>Golden Benchmark</span>
                </span>
            </td>
            <td><span style="color: var(--text-sub);">--</span></td>
            <td><span style="color: var(--text-sub);">--</span></td>
            <td><span style="color: var(--text-sub);">--</span></td>
            <td><span style="color: var(--text-sub);">--</span></td>
            <td><span style="color: var(--text-sub);">--</span></td>
            <td>${gtVerdictBadge}</td>
        </tr>
    `;
    compBody.innerHTML += gtRowHtml;

    const gtRenderedMd = cleanMarkdown(qGroup.ground_truth);
    const gtDetailedCardHtml = `
        <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-top: 4px solid var(--success-color); border-radius: 10px; padding: 1.1rem 1.25rem; margin-top: 0.85rem; box-shadow: 0 4px 14px rgba(0,0,0,0.08);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.65rem; flex-wrap: wrap; gap: 0.6rem; background: linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.02) 100%); padding: 0.6rem 0.85rem; border-radius: 8px; margin-left: -0.35rem; margin-right: -0.35rem; margin-top: -0.35rem;">
                <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 0.45rem;">
                        <span style="font-size: 1.25rem;">🎯</span>
                        <span style="font-size: 1.12rem; font-weight: 800; color: var(--success-color); letter-spacing: -0.2px;">Ground Truth Target</span>
                    </div>
                    ${gtVerdictBadge}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1rem;">
                <div>
                    <div style="font-size: 0.74rem; font-weight: 700; color: var(--success-color); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.4rem;">🎯 Ground Truth Reference Text (Parsed Markdown)</div>
                    <div class="response-preview-box" style="font-size: 0.86rem; line-height: 1.5; color: var(--text-main); max-height: 240px; overflow-y: auto; background: var(--bg-card-secondary); padding: 0.85rem; border-radius: 8px; margin-bottom: 0; border: 1px solid var(--border-color);">
                        ${gtRenderedMd}
                    </div>
                </div>

                <div>
                    <div class="detail-box" style="margin: 0; padding: 0.75rem 0.85rem; background: var(--bg-card-secondary); border-radius: 8px; border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.45rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <b style="color: var(--success-color); font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.5px;">📎 Authoritative Sources</b>
                        </div>
                        <div style="max-height: 100px; overflow-y: auto; font-size: 0.78rem; line-height: 1.4;">${gtSourcesFormatted}</div>
                        ${firstGe?.gt_quality_reasoning ? `<div style="font-size: 0.74rem; color: var(--text-sub); line-height: 1.35; font-style: italic; border-top: 1px solid var(--border-color); padding-top: 0.4rem;">${escapeHtml(firstGe.gt_quality_reasoning)}</div>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;
    if (expandedContainer) {
        expandedContainer.innerHTML += gtDetailedCardHtml;
    }

    const splitLayout = document.querySelector('.split-layout');
    if (splitLayout) splitLayout.style.display = 'none';

    if (fullDetail) {
        fullDetail.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function closeFullScreenDetail() {
    const fullDetail = document.getElementById('results-full-screen-detail');
    if (fullDetail) fullDetail.style.display = 'none';
    const splitLayout = document.querySelector('.split-layout');
    if (splitLayout) splitLayout.style.display = 'flex';
    document.querySelectorAll('#master-table tbody tr').forEach(tr => tr.style.outline = 'none');
}

function closeDetailsPanel() {
    document.querySelectorAll('#master-table tbody tr').forEach(tr => tr.classList.remove('selected-row'));
    document.getElementById('results-details-panel').style.display = 'none';
}

async function exportToBigQuery() {
    try {
        const res = await fetch('/api/export/bigquery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataset_id: 'yahoo_ge_benchmarks', table_id: 'master_comparison_records', dry_run: false })
        });
        const data = await res.json();
        if (data.status === 'success') {
            alert(`✅ BigQuery Export Complete! Exported ${data.records_exported} comparison records to ${data.target_table || 'BigQuery dataset'}.`);
        } else {
            alert('BigQuery Export Error: ' + JSON.stringify(data.errors || data.fallback_reason || 'Unknown error'));
        }
    } catch (err) {
        alert('Network error exporting to BigQuery: ' + err.message);
    }
}

// Global exposure
window.populateResultsRunSelector = populateResultsRunSelector;
window.onResultsRunSelected = onResultsRunSelected;
window.loadMasterDatabaseView = loadMasterDatabaseView;
window.viewHistoricalRunResults = viewHistoricalRunResults;
window.viewCurrentRunLogs = viewCurrentRunLogs;
window.duplicateCurrentErrorRun = duplicateCurrentErrorRun;
window.loadMasterComparison = loadMasterComparison;
window.viewScenarioDetail = viewScenarioDetail;
window.closeFullScreenDetail = closeFullScreenDetail;
window.closeDetailsPanel = closeDetailsPanel;
window.exportToBigQuery = exportToBigQuery;
