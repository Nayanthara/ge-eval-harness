/**
 * Global App State, Hash Routing, and Navigation
 */

// Global State
let currentResultsDataSource = 'run';
let currentResultsRunId = null;
let currentActiveMonitorRunId = null;
let activeConnectorsList = [];
let wizardScenarios = [];
let currentEditingDatasetId = null;
let allHistoricalDatasets = [];
let histDatasetsPerPage = 10;
let currentHistDatasetPage = 1;
let allRunsHistory = [];
let runsPerPage = 10;
let currentRunsPage = 1;
let allGroupedQueries = [];

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

function switchScreen(screenId, resetDataSource = false, updateHash = true) {
    if (updateHash) {
        if (screenId === 'results' && currentResultsDataSource === 'master') {
            window.location.hash = '#results?view=master';
        } else if (screenId === 'results' && currentResultsDataSource === 'run' && currentResultsRunId) {
            window.location.hash = `#results?run_id=${currentResultsRunId}`;
        } else if (screenId === 'run-status' && currentActiveMonitorRunId) {
            window.location.hash = `#run-status?run_id=${currentActiveMonitorRunId}`;
        } else if (screenId === 'dataset-editor' && currentEditingDatasetId) {
            window.location.hash = `#dataset-editor?id=${encodeURIComponent(currentEditingDatasetId)}`;
        } else if (screenId === 'dataset-viewer' && window.currentViewerDatasetId) {
            window.location.hash = `#dataset-viewer?id=${encodeURIComponent(window.currentViewerDatasetId)}&type=${window.currentViewerDatasetType || 'run'}`;
        } else {
            window.location.hash = `#${screenId}`;
        }
    }

    // Hide all screens
    document.querySelectorAll('.screen-content').forEach(s => s.classList.remove('active'));

    // Handle screen resolution
    let target = document.getElementById(`screen-${screenId}`);
    if (!target) {
        screenId = 'home';
        target = document.getElementById('screen-home');
    }

    if (target) {
        target.classList.add('active');
    }

    // Update sidebar navigation active state
    const sidebar = document.getElementById('sidebar');
    if (sidebar && typeof sidebar.setActiveNav === 'function') {
        sidebar.setActiveNav(screenId);
    } else if (sidebar && sidebar.shadowRoot) {
        sidebar.shadowRoot.querySelectorAll('.nav-item').forEach(el => {
            if (el.dataset.screen === screenId) el.classList.add('active');
            else el.classList.remove('active');
        });
    }

    // Screen specific hooks
    if (screenId === 'home') {
        if (typeof window.loadRunsHistory === 'function') window.loadRunsHistory();
    } else if (screenId === 'results') {
        if (resetDataSource) {
            currentResultsDataSource = 'run';
            currentResultsRunId = null;
        }
        if (typeof window.loadMasterComparison === 'function') window.loadMasterComparison();
    } else if (screenId === 'datasets') {
        if (typeof window.loadDatasets === 'function') window.loadDatasets();
    } else if (screenId === 'settings') {
        if (typeof window.loadSettingsSysinfo === 'function') window.loadSettingsSysinfo();
    } else if (screenId === 'run-status') {
        if (!currentActiveMonitorRunId && typeof window.autoSelectRecentRunForMonitoring === 'function') {
            window.autoSelectRecentRunForMonitoring();
        }
    }
}

function switchToTab(tabId) {
    if (tabId === 'results-glean-tab') {
        switchScreen('results', false, true);
    } else {
        switchScreen(tabId.replace('-tab', ''), false, true);
    }
}

// Hash routing mechanism to preserve view states on refresh
function parseHashAndSwitch() {
    let hash = window.location.hash || '#home';
    if (!hash || hash === '#' || hash === '#/' || hash.trim() === '') {
        hash = '#home';
    }
    const cleanHash = hash.replace(/^#\/?/, '');
    const parts = cleanHash.split('?');
    let screenId = parts[0] || 'home';
    const validScreens = ['home', 'dataset-editor', 'run-config', 'run-status', 'datasets', 'dataset-viewer', 'settings', 'results'];
    if (!validScreens.includes(screenId)) {
        screenId = 'home';
    }
    const params = {};
    if (parts[1]) {
        parts[1].split('&').forEach(pair => {
            const [k, v] = pair.split('=');
            if (k) {
                params[decodeURIComponent(k)] = decodeURIComponent(v || '');
            }
        });
    }

    if (screenId === 'run-status') {
        const targetMonRunId = params.run_id || params.run;
        if (typeof window.populateResultsRunSelector === 'function') {
            window.populateResultsRunSelector(null, false);
        }
        if (targetMonRunId && typeof window.loadRunIntoStatusMonitor === 'function') {
            window.loadRunIntoStatusMonitor(targetMonRunId);
        } else if (currentActiveMonitorRunId && typeof window.loadRunIntoStatusMonitor === 'function') {
            window.loadRunIntoStatusMonitor(currentActiveMonitorRunId);
        } else if (typeof window.loadRunIntoStatusMonitor === 'function') {
            window.loadRunIntoStatusMonitor(null);
        }
    } else if (screenId === 'dataset-editor' && (params.dataset_id || params.id)) {
        const targetDsId = params.dataset_id || params.id;
        currentActiveDatasetId = targetDsId;
        if (typeof window.editDataset === 'function') {
            window.editDataset(targetDsId);
            return;
        }
    } else if (screenId === 'dataset-viewer' && (params.id || params.dataset_id)) {
        if (typeof window.viewDatasetReadOnly === 'function') {
            window.viewDatasetReadOnly(params.id || params.dataset_id, params.type || 'run', params.from || 'datasets', false);
            return;
        }
    } else if (screenId === 'results') {
        const targetRunId = params.run_id || params.run;
        if (targetRunId) {
            currentResultsDataSource = 'run';
            currentResultsRunId = targetRunId;
            const sub = document.getElementById('results-view-subtitle');
            if (sub) sub.textContent = `Viewing Results for Run: ${targetRunId}`;
        } else if (params.view === 'master') {
            currentResultsDataSource = 'master';
            currentResultsRunId = null;
        } else {
            currentResultsDataSource = 'run';
            currentResultsRunId = null;
        }
    }

    switchScreen(screenId, false, false);
}

// Global exposure
window.currentResultsDataSource = currentResultsDataSource;
window.currentResultsRunId = currentResultsRunId;
window.currentActiveMonitorRunId = currentActiveMonitorRunId;
window.activeConnectorsList = activeConnectorsList;
window.wizardScenarios = wizardScenarios;
window.currentEditingDatasetId = currentEditingDatasetId;
window.allHistoricalDatasets = allHistoricalDatasets;
window.histDatasetsPerPage = histDatasetsPerPage;
window.currentHistDatasetPage = currentHistDatasetPage;
window.allRunsHistory = allRunsHistory;
window.runsPerPage = runsPerPage;
window.currentRunsPage = currentRunsPage;
window.allGroupedQueries = allGroupedQueries;

window.toggleSidebar = toggleSidebar;
window.switchScreen = switchScreen;
window.switchToTab = switchToTab;
window.parseHashAndSwitch = parseHashAndSwitch;

window.addEventListener('hashchange', parseHashAndSwitch);
