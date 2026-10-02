/**
 * Dataset Manager: Canonical Datasets, Historical Snapshots, Viewer, Editor, Import & Export
 */

async function loadDatasets() {
    // 1. Fetch Canonical Datasets
    try {
        const res = await fetch('/api/datasets');
        const data = await res.json();
        const tbody = document.getElementById('canonical-datasets-table-body');
        if (tbody && data.status === 'success') {
            tbody.innerHTML = '';
            if (!data.datasets || data.datasets.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-sub); padding: 1.5rem 0.5rem;">No canonical datasets found. Create one to get started!</td></tr>';
            } else {
                data.datasets.forEach(d => {
                    const isGolden = d.dataset_id.includes('golden') || d.dataset_id.includes('multi_datasource');
                    const typeBadge = isGolden 
                        ? '<span class="badge badge-pass" style="font-size: 0.72rem; padding: 0.15rem 0.5rem;">Canonical Golden</span>' 
                        : '<span class="badge badge-secondary" style="font-size: 0.72rem; padding: 0.15rem 0.5rem;">Custom Set</span>';
                    tbody.innerHTML += `
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 0.4rem 0.65rem;">
                                <b style="color: var(--text-main); font-size: 0.9rem;">${escapeHtml(d.dataset_id)}</b>
                            </td>
                            <td style="padding: 0.4rem 0.65rem;">
                                ${typeBadge}
                            </td>
                            <td style="padding: 0.4rem 0.65rem;">
                                <code style="background: var(--code-bg); border: 1px solid var(--border-color); padding: 0.15rem 0.45rem; border-radius: 4px; color: var(--code-text); font-weight: 600; font-size: 0.82rem;">${d.scenarios_count}</code> <span style="font-size: 0.82rem; color: var(--text-sub);">scenarios</span>
                            </td>
                            <td style="padding: 0.4rem 0.65rem; text-align: right; white-space: nowrap;">
                                <div style="display: inline-flex; gap: 0.3rem; align-items: center; justify-content: flex-end; flex-wrap: nowrap;">
                                    <button class="btn btn-secondary btn-sm" onclick="viewDatasetReadOnly('${d.dataset_id}', 'canonical', 'datasets')" style="padding: 0.2rem 0.5rem; font-size: 0.76rem; background: var(--bg-card-secondary); color: var(--accent-primary); border: 1px solid var(--border-color); white-space: nowrap;">📄 View</button>
                                    <button class="btn btn-secondary btn-sm" onclick="editDataset('${d.dataset_id}')" style="padding: 0.2rem 0.5rem; font-size: 0.76rem; white-space: nowrap;">✏️ Edit</button>
                                    <button class="btn btn-primary btn-sm" onclick="runDataset('${d.dataset_id}')" style="padding: 0.2rem 0.55rem; font-size: 0.76rem; white-space: nowrap;">🚀 Run Eval</button>
                                    <button class="btn btn-secondary btn-sm" onclick="openDatasetExportModal('${d.dataset_id}', 'canonical')" style="padding: 0.2rem 0.5rem; font-size: 0.76rem; background: var(--bg-card-secondary); color: var(--text-main); border: 1px solid var(--border-color); white-space: nowrap;">📥 Export</button>
                                    <button class="btn btn-secondary btn-sm" onclick="deleteDataset('${d.dataset_id}')" style="color: var(--danger-color); padding: 0.2rem 0.5rem; font-size: 0.76rem; white-space: nowrap;">🗑️ Delete</button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
            }
        }
    } catch (err) {
        console.error("Error loading canonical datasets: ", err);
        const tbody = document.getElementById('canonical-datasets-table-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-sub); padding: 1.5rem 0.5rem;">Failed to load canonical datasets.</td></tr>';
    }

    // 2. Fetch Historical Datasets (from run manifests)
    try {
        const res = await fetch('/api/runs');
        const data = await res.json();
        if (data.status === 'success') {
            allHistoricalDatasets = data.runs || [];
            currentHistDatasetPage = 1;
            renderHistoricalDatasetsPage();
        }
    } catch (err) {
        console.error("Error loading historical datasets: ", err);
        const tbody = document.getElementById('historical-datasets-table-body');
        if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-sub); padding: 1.5rem 0.5rem;">Failed to load historical snapshots.</td></tr>';
    }
}

function renderHistoricalDatasetsPage() {
    const tbody = document.getElementById('historical-datasets-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (allHistoricalDatasets.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-sub); padding: 1.5rem 0.5rem;">No historical evaluation runs recorded yet.</td></tr>';
        const pag = document.getElementById('historical-datasets-pagination');
        if (pag) pag.style.display = 'none';
        return;
    }
    
    const pag = document.getElementById('historical-datasets-pagination');
    if (pag) pag.style.display = 'flex';
    
    const totalPages = Math.ceil(allHistoricalDatasets.length / histDatasetsPerPage) || 1;
    currentHistDatasetPage = Math.max(1, Math.min(currentHistDatasetPage, totalPages));
    
    const startIdx = (currentHistDatasetPage - 1) * histDatasetsPerPage;
    const endIdx = Math.min(startIdx + histDatasetsPerPage, allHistoricalDatasets.length);
    const pageRuns = allHistoricalDatasets.slice(startIdx, endIdx);
    
    pageRuns.forEach(r => {
        const count = r.scenarios_count || 0;
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.4rem 0.65rem;">
                    <code style="color: var(--code-text); background: var(--code-bg); padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 600; font-size: 0.85rem;">${escapeHtml(r.run_id)}</code>
                    <div style="font-size: 0.72rem; color: var(--text-sub); margin-top: 0.15rem; font-family: monospace;">manifest_${escapeHtml(r.run_id)}.json</div>
                </td>
                <td style="padding: 0.4rem 0.65rem; font-size: 0.82rem; color: var(--text-main);">
                    ${escapeHtml(r.timestamp)}
                </td>
                <td style="padding: 0.4rem 0.65rem;">
                    <code style="background: var(--code-bg); border: 1px solid var(--border-color); padding: 0.15rem 0.45rem; border-radius: 4px; color: var(--success-color); font-weight: 600; font-size: 0.82rem;">${count}</code> <span style="font-size: 0.82rem; color: var(--text-sub);">frozen scenario(s)</span>
                </td>
                <td style="padding: 0.4rem 0.65rem; text-align: right; white-space: nowrap;">
                    <div style="display: inline-flex; gap: 0.3rem; align-items: center; justify-content: flex-end; flex-wrap: nowrap;">
                        <button class="btn btn-secondary btn-sm" onclick="viewDatasetReadOnly('${r.run_id}', 'run', 'datasets')" style="padding: 0.2rem 0.5rem; font-size: 0.76rem; background: var(--bg-card-secondary); color: var(--accent-primary); border: 1px solid var(--border-color); white-space: nowrap;">📄 View</button>
                        <button class="btn btn-secondary btn-sm" onclick="openDatasetExportModal('${r.run_id}', 'run')" style="padding: 0.2rem 0.5rem; font-size: 0.76rem; background: var(--bg-card-secondary); color: var(--text-main); border: 1px solid var(--border-color); white-space: nowrap;">📥 Export</button>
                        <button class="btn btn-secondary btn-sm" onclick="duplicateRun('${r.run_id}')" style="padding: 0.2rem 0.5rem; font-size: 0.76rem; white-space: nowrap;">🔄 Edit & Re-run</button>
                        <button class="btn btn-secondary btn-sm" onclick="viewHistoricalRunResults('${r.run_id}')" style="padding: 0.2rem 0.5rem; font-size: 0.76rem; background: var(--bg-card-secondary); color: var(--success-color); border: 1px solid var(--border-color); white-space: nowrap;">📊 Results</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    const pageInfo = document.getElementById('hist-datasets-page-info');
    if (pageInfo) pageInfo.textContent = `Page ${currentHistDatasetPage} of ${totalPages}`;
    const prevBtn = document.getElementById('hist-datasets-prev-btn');
    if (prevBtn) prevBtn.disabled = (currentHistDatasetPage === 1);
    const nextBtn = document.getElementById('hist-datasets-next-btn');
    if (nextBtn) nextBtn.disabled = (currentHistDatasetPage === totalPages);
}

function changeHistoricalDatasetsPerPage(val) {
    histDatasetsPerPage = parseInt(val, 10);
    currentHistDatasetPage = 1;
    renderHistoricalDatasetsPage();
}

function prevHistoricalDatasetsPage() {
    if (currentHistDatasetPage > 1) {
        currentHistDatasetPage--;
        renderHistoricalDatasetsPage();
    }
}

function nextHistoricalDatasetsPage() {
    const totalPages = Math.ceil(allHistoricalDatasets.length / histDatasetsPerPage) || 1;
    if (currentHistDatasetPage < totalPages) {
        currentHistDatasetPage++;
        renderHistoricalDatasetsPage();
    }
}

function cancelDatasetEditor() {
    if (currentEditingDatasetId) {
        switchScreen('datasets');
    } else {
        switchScreen('home');
    }
}

async function saveDatasetEditor() {
    if (!currentEditingDatasetId) return;
    const editor = document.getElementById('dataset-editor');
    if (editor) {
        wizardScenarios = editor.scenarios || [];
    }
    try {
        const res = await fetch(`/api/datasets/${currentEditingDatasetId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenarios: wizardScenarios })
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            alert(`Dataset '${currentEditingDatasetId}' saved successfully.`);
            switchScreen('datasets');
        } else {
            const errMsg = data.detail || data.error || 'Failed to save dataset.';
            alert('Failed to save dataset:\n\n' + errMsg);
        }
    } catch (err) {
        alert('Error saving dataset: ' + err.message);
    }
}

async function editDataset(datasetId) {
    currentEditingDatasetId = datasetId;
    document.getElementById('dataset-editor-title').textContent = `Edit Dataset: ${datasetId}`;
    document.getElementById('dataset-editor-subtitle').textContent = 'Modify queries and expected answers for this persistent dataset';
    document.getElementById('btn-dataset-editor-next').style.display = 'none';
    document.getElementById('btn-dataset-editor-save').style.display = 'inline-block';
    const saveRepoBtn = document.getElementById('btn-dataset-editor-save-repo');
    if (saveRepoBtn) saveRepoBtn.style.display = 'inline-block';
    
    try {
        const res = await fetch(`/api/datasets/${datasetId}`);
        const data = await res.json();
        if (data.status === 'success') {
            wizardScenarios = data.scenarios || [];
            const editor = document.getElementById('dataset-editor');
            if (editor) {
                editor.scenarios = [...wizardScenarios];
                editor.connectors = activeConnectorsList;
                if (typeof editor.requestUpdate === 'function') editor.requestUpdate();
            }
            switchScreen('dataset-editor');
        } else {
            alert('Failed to load dataset: ' + data.error);
        }
    } catch (err) {
        alert('Error loading dataset: ' + err.message);
    }
}

async function runDataset(datasetId) {
    currentEditingDatasetId = null; // Wizard mode
    document.getElementById('dataset-editor-title').textContent = 'Dataset Scenario Editor';
    document.getElementById('dataset-editor-subtitle').textContent = 'Step 1 of 2: Design and Refine Matrix Evaluation Queries';
    document.getElementById('btn-dataset-editor-next').style.display = 'inline-block';
    document.getElementById('btn-dataset-editor-save').style.display = 'none';
    const saveRepoBtn = document.getElementById('btn-dataset-editor-save-repo');
    if (saveRepoBtn) saveRepoBtn.style.display = 'inline-block';
    
    try {
        const res = await fetch(`/api/datasets/${datasetId}`);
        const data = await res.json();
        if (data.status === 'success') {
            wizardScenarios = data.scenarios || [];
            const editor = document.getElementById('dataset-editor');
            if (editor) {
                editor.scenarios = [...wizardScenarios];
                editor.connectors = activeConnectorsList;
                if (typeof editor.requestUpdate === 'function') editor.requestUpdate();
            }
            switchScreen('run-config');
        } else {
            alert('Failed to load dataset: ' + data.error);
        }
    } catch (err) {
        alert('Error loading dataset: ' + err.message);
    }
}

function openCreateDatasetModal() {
    const datasetId = prompt("Enter a unique ID for the new dataset (alphanumeric, no spaces):");
    if (!datasetId) return;
    const cleanId = datasetId.trim().replace(/[^a-zA-Z0-9_-]/g, "");
    if (!cleanId) return;
    
    createDataset(cleanId);
}

async function createDataset(datasetId) {
    try {
        const res = await fetch(`/api/datasets/${datasetId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenarios: [] })
        });
        const data = await res.json();
        if (data.status === 'success') {
            editDataset(datasetId);
        } else {
            alert('Failed to create dataset: ' + data.error);
        }
    } catch (err) {
        alert('Error creating dataset: ' + err.message);
    }
}

async function deleteDataset(datasetId) {
    if (!confirm(`Are you sure you want to delete dataset '${datasetId}'?`)) return;
    try {
        const res = await fetch(`/api/datasets/${datasetId}`, {
            method: 'DELETE'
        });
        const data = await res.json();
        if (data.status === 'success') {
            loadDatasets();
        } else {
            alert('Failed to delete dataset: ' + data.error);
        }
    } catch (err) {
        alert('Error deleting dataset: ' + err.message);
    }
}

// IN-PLACE READ-ONLY DATASET VIEWER
let currentDatasetViewerReturnScreen = 'datasets';
let currentViewerDatasetId = null;
let currentViewerDatasetType = 'run';

function returnFromDatasetViewer() {
    switchScreen(currentDatasetViewerReturnScreen || 'datasets');
}

async function viewDatasetReadOnly(datasetId, type = 'run', returnScreen = 'datasets', updateHash = true) {
    currentViewerDatasetId = datasetId;
    currentViewerDatasetType = type;
    currentDatasetViewerReturnScreen = returnScreen;

    window.currentViewerDatasetId = currentViewerDatasetId;
    window.currentViewerDatasetType = currentViewerDatasetType;

    const titleEl = document.getElementById('viewer-dataset-title');
    const subEl = document.getElementById('viewer-dataset-subtitle');
    const badgeEl = document.getElementById('viewer-dataset-badge');
    const bodyEl = document.getElementById('viewer-dataset-body');
    const backBtn = document.getElementById('viewer-back-btn');

    if (backBtn) {
        backBtn.textContent = returnScreen === 'run-status' ? '⬅️ Back to Run Status' : '⬅️ Back to Datasets';
    }

    if (type === 'run') {
        if (titleEl) titleEl.textContent = `Dataset Snapshot: manifest_${datasetId}.json`;
        if (badgeEl) badgeEl.textContent = 'Read-Only Run Manifest';
        if (subEl) subEl.textContent = `Loading point-in-time scenario snapshot for Run ID ${datasetId}...`;
    } else {
        if (titleEl) titleEl.textContent = `Dataset: ${datasetId}`;
        if (badgeEl) badgeEl.textContent = 'Canonical Dataset';
        if (subEl) subEl.textContent = `Loading scenarios for canonical dataset ${datasetId}...`;
    }

    if (bodyEl) bodyEl.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-sub);">Loading scenarios...</div>`;
    
    switchScreen('dataset-viewer', false, updateHash);

    try {
        const url = type === 'run' ? `/api/runs/${datasetId}` : `/api/datasets/${datasetId}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'success' && data.scenarios) {
            const scenarios = data.scenarios;
            if (subEl) {
                subEl.textContent = `${scenarios.length} scenario(s) ${type === 'run' ? `frozen at execution time (Run ID: ${datasetId})` : `in active dataset suite (${datasetId})`}`;
            }

            if (scenarios.length === 0) {
                bodyEl.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--text-sub);">No scenarios found in this dataset.</div>`;
                return;
            }

            let rowsHtml = '';
            scenarios.forEach((sc, i) => {
                const conn = sc.connector_id || 'all';
                let descHtml = '';
                if (sc.description) {
                    descHtml = `<div style="font-size: 0.75rem; color: var(--text-sub); margin-bottom: 0.25rem;">${escapeHtml(sc.description)}</div>`;
                }
                let sourcesList = [];
                if (Array.isArray(sc.expected_source)) {
                    sourcesList = sc.expected_source;
                } else if (typeof sc.expected_source === 'string' && sc.expected_source.trim()) {
                    sourcesList = [sc.expected_source.trim()];
                }
                let sourcesHtml = '';
                if (sourcesList.length > 0) {
                    sourcesHtml = `<div style="display: flex; flex-direction: column; gap: 0.15rem; margin-top: 0.25rem;">` +
                        sourcesList.map(src => `<div style="font-size: 0.73rem; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 320px; color: var(--accent-primary);">🔗 <a href="${escapeHtml(src)}" target="_blank" style="color: var(--accent-primary); text-decoration: none;">${escapeHtml(src)}</a></div>`).join('') +
                        `</div>`;
                }
                const gt = sc.ground_truth || '';
                const glean = sc.glean_response_text || '';

                rowsHtml += `
                    <tr style="border-bottom: 1px solid var(--border-color); font-size: 0.84rem;">
                        <td style="padding: 0.45rem 0.65rem; vertical-align: top; font-weight: 700; color: var(--accent-primary); width: 5%;">#${i + 1}</td>
                        <td style="padding: 0.45rem 0.65rem; vertical-align: top; width: 35%;">
                            <div style="font-weight: 600; color: var(--text-main); line-height: 1.35; margin-bottom: 0.2rem;">${escapeHtml(sc.query || '')}</div>
                            ${descHtml}
                            ${sourcesHtml}
                        </td>
                        <td style="padding: 0.45rem 0.65rem; vertical-align: top; width: 18%;">
                            <span class="badge badge-pass" style="font-size: 0.76rem; font-family: monospace; word-break: break-all; text-transform: none; display: inline-block;">${escapeHtml(conn)}</span>
                        </td>
                        <td style="padding: 0.45rem 0.65rem; vertical-align: top; width: 42%;">
                            <div style="background: var(--bg-card-secondary); padding: 0.45rem 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); max-height: 100px; overflow-y: auto; line-height: 1.35; color: var(--text-main); font-size: 0.82rem;">
                                ${escapeHtml(gt)}
                            </div>
                            ${glean ? `
                                <div style="margin-top: 0.35rem; font-size: 0.75rem; color: var(--accent-secondary); background: var(--bg-card-secondary); border: 1px solid var(--border-color); padding: 0.3rem 0.55rem; border-radius: 4px;">
                                    <b>Glean Baseline:</b> ${escapeHtml(glean.substring(0, 120))}${glean.length > 120 ? '...' : ''}
                                </div>
                            ` : ''}
                        </td>
                    </tr>
                `;
            });

            bodyEl.innerHTML = `
                <div class="table-container">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr>
                                <th style="width: 5%; text-align: left;">#</th>
                                <th style="width: 35%; text-align: left;">Query & Description</th>
                                <th style="width: 18%; text-align: left;">Target Connector</th>
                                <th style="width: 42%; text-align: left;">Ground Truth Reference</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>
                </div>
            `;
        } else {
            bodyEl.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--danger-color);">Failed to load dataset: ${escapeHtml(data.error || 'Manifest not found.')}</div>`;
        }
    } catch (err) {
        bodyEl.innerHTML = `<div style="text-align: center; padding: 3rem; color: var(--danger-color);">Error loading dataset: ${escapeHtml(err.message)}</div>`;
    }
}

function viewDatasetForMonitoredRun() {
    if (currentActiveMonitorRunId) {
        viewDatasetReadOnly(currentActiveMonitorRunId, 'run', 'run-status');
    } else {
        alert('No active run selected to view dataset.');
    }
}

// DATASET EXPORT HANDLERS (CSV, JSON, BIGQUERY)
let currentExportDatasetId = null;
let currentExportDatasetType = 'canonical'; // 'canonical' or 'run'
let currentExportDatasetScenarios = [];

async function openDatasetExportModal(datasetId, type = 'canonical') {
    currentExportDatasetId = datasetId;
    currentExportDatasetType = type;
    currentExportDatasetScenarios = [];

    const modal = document.getElementById('modal-export-dataset');
    const titleEl = document.getElementById('modal-export-title');
    const subEl = document.getElementById('modal-export-sub');
    const bqTableInput = document.getElementById('export-bq-table-name');
    const bqFeedback = document.getElementById('export-bq-feedback');
    
    if (bqFeedback) bqFeedback.style.display = 'none';

    let cleanName = datasetId.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    if (!cleanName.startsWith('dataset_')) cleanName = 'dataset_' + cleanName;
    if (bqTableInput) bqTableInput.value = cleanName;

    if (titleEl) titleEl.textContent = `Export Dataset: ${datasetId}`;
    if (subEl) subEl.textContent = `Loading scenario data for ${type === 'run' ? 'Historical Run Snapshot' : 'Canonical Dataset'}...`;
    if (modal) modal.style.display = 'flex';

    try {
        let url = type === 'run' ? `/api/runs/${datasetId}` : `/api/datasets/${datasetId}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.status === 'success' && data.scenarios) {
            currentExportDatasetScenarios = data.scenarios;
            if (subEl) subEl.textContent = `Choose an export format for ${currentExportDatasetScenarios.length} scenario(s)`;
        } else {
            if (subEl) subEl.textContent = `Failed to load scenarios: ${data.error || 'Dataset empty'}`;
        }
    } catch (err) {
        if (subEl) subEl.textContent = `Error fetching scenarios: ${err.message}`;
    }
}

function closeDatasetExportModal() {
    const modal = document.getElementById('modal-export-dataset');
    if (modal) modal.style.display = 'none';
}

function downloadDatasetAsJson() {
    if (!currentExportDatasetScenarios || currentExportDatasetScenarios.length === 0) {
        alert('No scenario data available to download.');
        return;
    }
    const jsonStr = JSON.stringify(currentExportDatasetScenarios, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentExportDatasetId || 'dataset'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function downloadDatasetAsCsv() {
    if (!currentExportDatasetScenarios || currentExportDatasetScenarios.length === 0) {
        alert('No scenario data available to download.');
        return;
    }
    const headers = ['query', 'ground_truth', 'expected_source', 'connector_id', 'glean_response_text', 'glean_source_urls'];
    let csvContent = headers.join(',') + '\n';
    
    currentExportDatasetScenarios.forEach(s => {
        const row = headers.map(h => {
            let val = s[h] || '';
            if (Array.isArray(val)) val = val.join(' | ');
            val = String(val).replace(/"/g, '""');
            return `"${val}"`;
        });
        csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentExportDatasetId || 'dataset'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function exportDatasetToBigQueryFromModal() {
    const bqProject = document.getElementById('export-bq-project-id').value.trim() || window.GCP_PROJECT_ID || '';
    const bqDataset = document.getElementById('export-bq-dataset-id').value.trim() || `${(window.COMPANY_NAME || 'enterprise').toLowerCase()}_ge_benchmarks`;
    const bqTable = document.getElementById('export-bq-table-name').value.trim() || `dataset_${currentExportDatasetId}`;
    const bqFeedback = document.getElementById('export-bq-feedback');
    const bqBtn = document.getElementById('btn-export-bq-submit');

    if (bqFeedback) {
        bqFeedback.style.display = 'block';
        bqFeedback.style.color = '#0b57d0';
        bqFeedback.innerHTML = `⏳ Creating table <code>${escapeHtml(bqProject)}.${escapeHtml(bqDataset)}.${escapeHtml(bqTable)}</code> and streaming records...`;
    }
    if (bqBtn) bqBtn.disabled = true;

    try {
        const res = await fetch('/api/datasets/export/bigquery', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                dataset_id: currentExportDatasetId,
                dataset_type: currentExportDatasetType,
                project_id: bqProject,
                bq_dataset_id: bqDataset,
                table_id: bqTable,
                dry_run: false
            })
        });
        const data = await res.json();
        if (data.status === 'success') {
            if (bqFeedback) {
                bqFeedback.style.color = '#137333';
                bqFeedback.innerHTML = `✅ Successfully created and exported <b>${escapeHtml(String(data.records_exported || 0))}</b> scenario(s) to BigQuery table: <br><code style="color:#1e293b; background:#f1f5f9; padding:0.25rem 0.5rem; border-radius:4px; margin-top:0.4rem; display:inline-block; border: 1px solid #dbe0ea;">${escapeHtml(data.target_table || '')}</code>`;
            }
        } else {
            if (bqFeedback) {
                bqFeedback.style.color = '#b3261e';
                bqFeedback.innerHTML = `❌ BigQuery export failed: ${escapeHtml(JSON.stringify(data.errors || data.fallback_reason || data.detail || 'Unknown error'))}`;
            }
        }
    } catch (err) {
        if (bqFeedback) {
            bqFeedback.style.color = '#b3261e';
            bqFeedback.innerHTML = `❌ Network error: ${escapeHtml(err.message)}`;
        }
    } finally {
        if (bqBtn) bqBtn.disabled = false;
    }
}

function editOrRerunCurrentViewerDataset() {
    if (!currentViewerDatasetId) return;
    if (currentViewerDatasetType === 'canonical') {
        editDataset(currentViewerDatasetId);
    } else {
        if (typeof window.duplicateRun === 'function') {
            window.duplicateRun(currentViewerDatasetId);
        }
    }
}

function openSaveDatasetAsModal() {
    const editor = document.getElementById('dataset-editor');
    if (editor && editor.scenarios) {
        wizardScenarios = editor.scenarios;
    }
    if (!wizardScenarios || wizardScenarios.length === 0) {
        alert('Cannot save an empty dataset. Please add at least one query scenario first.');
        return;
    }
    const modal = document.getElementById('modal-save-dataset-as');
    const input = document.getElementById('save-dataset-name-input');
    if (input) {
        input.value = currentEditingDatasetId || `custom_dataset_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    }
    if (modal) modal.style.display = 'flex';
}

function closeSaveDatasetAsModal() {
    const modal = document.getElementById('modal-save-dataset-as');
    if (modal) modal.style.display = 'none';
}

async function confirmSaveDatasetAs() {
    const input = document.getElementById('save-dataset-name-input');
    let name = (input ? input.value : '').trim();
    if (!name) {
        alert('Please enter a dataset name/identifier.');
        return;
    }
    name = name.replace(/[^a-zA-Z0-9_\-\.]/g, '_');

    const editor = document.getElementById('dataset-editor');
    if (editor && editor.scenarios) {
        wizardScenarios = editor.scenarios;
    }

    try {
        const res = await fetch(`/api/datasets/${encodeURIComponent(name)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scenarios: wizardScenarios })
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            closeSaveDatasetAsModal();
            currentEditingDatasetId = name;
            alert(`Dataset '${name}' saved successfully to the repository.`);
            loadDatasets();
        } else {
            const errMsg = data.detail || data.error || 'Failed to save dataset.';
            alert('Failed to save dataset:\n\n' + errMsg);
        }
    } catch (err) {
        alert('Network error saving dataset: ' + err.message);
    }
}

async function handleWizardCSVUpload(files) {
    if (!files.length) return;
    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch('/api/upload/custom_dataset', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            wizardScenarios = data.scenarios;
            currentEditingDatasetId = null;
            const titleEl = document.getElementById('dataset-editor-title');
            if (titleEl) titleEl.textContent = `Imported Dataset: ${file.name}`;
            const subEl = document.getElementById('dataset-editor-subtitle');
            if (subEl) subEl.textContent = `${wizardScenarios.length} scenario(s) loaded. You can refine queries, save to the repository, or proceed to run.`;
            const nextBtn = document.getElementById('btn-dataset-editor-next');
            if (nextBtn) nextBtn.style.display = 'inline-block';
            const saveBtn = document.getElementById('btn-dataset-editor-save');
            if (saveBtn) saveBtn.style.display = 'none';
            const saveRepoBtn = document.getElementById('btn-dataset-editor-save-repo');
            if (saveRepoBtn) saveRepoBtn.style.display = 'inline-block';

            const editor = document.getElementById('dataset-editor');
            if (editor) {
                editor.scenarios = [...wizardScenarios];
                editor.connectors = activeConnectorsList;
                if (typeof editor.requestUpdate === 'function') editor.requestUpdate();
            }
            switchScreen('dataset-editor');
        } else {
            const errMsg = data.detail || data.error || 'Invalid CSV format or content.';
            alert('CSV Upload Failed:\n\n' + errMsg);
        }
    } catch (err) {
        alert('Upload error: ' + err.message);
    }
}

async function handleCustomDatasetUpload(files) {
    if (!files.length) return;
    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch('/api/upload/custom_dataset', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (res.ok && data.status === 'success') {
            wizardScenarios = data.scenarios;
            const opt = document.getElementById('opt-custom-uploaded');
            if (opt) {
                opt.style.display = 'block';
                opt.textContent = `Custom Dataset: ${file.name} (${data.scenarios.length} Scenarios)`;
            }
            const sel = document.getElementById('benchmark-dataset-select');
            if (sel) sel.value = 'custom_uploaded';
            alert(`Uploaded ${data.scenarios.length} custom query benchmark scenarios!`);
        } else {
            const errMsg = data.detail || data.error || 'Invalid CSV format or content.';
            alert('Dataset Upload Error:\n\n' + errMsg);
        }
    } catch (err) {
        alert('Upload error: ' + err.message);
    }
}

async function handleFileUpload(files) {
    if (!files.length) return;
    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    const uploadLoading = document.getElementById('upload-loading');
    if (uploadLoading) uploadLoading.style.display = 'block';
    const uploadResultsContainer = document.getElementById('upload-results-container');
    if (uploadResultsContainer) uploadResultsContainer.style.display = 'none';

    try {
        const res = await fetch('/api/evaluate/glean', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (uploadLoading) uploadLoading.style.display = 'none';

        if (data.status === 'success') {
            if (typeof window.renderGleanResults === 'function') {
                window.renderGleanResults(data.glean_rows);
            }
            window.lastGleanUploadedScenarios = (data.glean_rows || []).map(r => ({
                query: r.query,
                ground_truth: r.ground_truth,
                description: r.source_urls || 'Glean Upload Query',
                expected_source: r.source_urls || '',
            }));

            const opt = document.getElementById('opt-glean-queries');
            if (opt) {
                opt.style.display = 'block';
                opt.textContent = `Uploaded Glean Queries (${window.lastGleanUploadedScenarios.length} Head-to-Head Scenarios)`;
            }

            if (typeof window.loadMasterComparison === 'function') {
                window.loadMasterComparison();
            }
        } else {
            alert('Upload Error: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        if (uploadLoading) uploadLoading.style.display = 'none';
        alert('Network upload error: ' + err.message);
    }
}

async function handleMasterFileUpload(files) {
    if (!files.length) return;
    const file = files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch('/api/upload/master', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.status === 'success') {
            alert(`✅ Uploaded & processed ${data.total_rows} master query rows! Old master backed up automatically.`);
            if (typeof window.loadMasterComparison === 'function') {
                window.loadMasterComparison();
            }
        } else {
            alert('Master Upload Error: ' + (data.error || 'Unknown error'));
        }
    } catch (err) {
        alert('Upload error: ' + err.message);
    }
}

// Global exposure
window.loadDatasets = loadDatasets;
window.renderHistoricalDatasetsPage = renderHistoricalDatasetsPage;
window.changeHistoricalDatasetsPerPage = changeHistoricalDatasetsPerPage;
window.prevHistoricalDatasetsPage = prevHistoricalDatasetsPage;
window.nextHistoricalDatasetsPage = nextHistoricalDatasetsPage;
window.cancelDatasetEditor = cancelDatasetEditor;
window.saveDatasetEditor = saveDatasetEditor;
window.editDataset = editDataset;
window.runDataset = runDataset;
window.openCreateDatasetModal = openCreateDatasetModal;
window.createDataset = createDataset;
window.deleteDataset = deleteDataset;
window.viewDatasetReadOnly = viewDatasetReadOnly;
window.viewRunDataset = function(runId) {
    viewDatasetReadOnly(runId, 'run', 'datasets');
};
window.viewDatasetForMonitoredRun = viewDatasetForMonitoredRun;
window.returnFromDatasetViewer = returnFromDatasetViewer;
window.openDatasetExportModal = openDatasetExportModal;
window.closeDatasetExportModal = closeDatasetExportModal;
window.downloadDatasetAsJson = downloadDatasetAsJson;
window.downloadDatasetAsCsv = downloadDatasetAsCsv;
window.exportDatasetToBigQueryFromModal = exportDatasetToBigQueryFromModal;
window.editOrRerunCurrentViewerDataset = editOrRerunCurrentViewerDataset;
window.openSaveDatasetAsModal = openSaveDatasetAsModal;
window.closeSaveDatasetAsModal = closeSaveDatasetAsModal;
window.confirmSaveDatasetAs = confirmSaveDatasetAs;
window.handleWizardCSVUpload = handleWizardCSVUpload;
window.handleCustomDatasetUpload = handleCustomDatasetUpload;
window.handleFileUpload = handleFileUpload;
window.handleMasterFileUpload = handleMasterFileUpload;
