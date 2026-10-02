/**
 * Contextual Help & [i] Info Modal System
 */

const HELP_TOPICS = {
    pipeline: {
        icon: "🔄",
        title: "4-Phase Evaluation Pipeline",
        content: `
            <p>The Yahoo Gemini Enterprise evaluation harness automates end-to-end benchmark execution across 4 distinct phases:</p>
            <ol style="margin: 0.5rem 0 0 1.25rem; padding: 0; display: flex; flex-direction: column; gap: 0.5rem;">
                <li><b>1. Preflight Auth & Connector Check:</b> Validates Google Cloud Application Default Credentials (ADC), IAM permissions, project quotas, and data store accessibility.</li>
                <li><b>2. REST API streamAssist Benchmarks:</b> Concurrently streams queries to Discovery Engine streamAssist measuring Time-to-First-Token (TTFT), Time-to-Last-Token (TTLT), and Tokens-per-Second (TPS) with resilient retry recovery.</li>
                <li><b>3. Vertex AI LLM Judge Evaluation:</b> Evaluates output factuality, grounding correctness, and authoritative citation attribution against target answers using Gemini 3.1 Pro.</li>
                <li><b>4. Results Consolidation & Persistence:</b> Saves immutable point-in-time snapshots, W3C OpenTelemetry traces, and prepares BigQuery export datasets.</li>
            </ol>
        `
    },
    matrix: {
        icon: "🧮",
        title: "Batch Matrix Calculation Formula",
        content: `
            <p>Total dispatched API requests are calculated using Cartesian product matrix expansion:</p>
            <div style="background: var(--bg-card-secondary); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border-color); font-family: monospace; font-size: 0.95rem; margin: 0.5rem 0; color: var(--accent-primary); font-weight: 700;">
                Total Calls = Queries × Models × Instructions × Iterations
            </div>
            <ul style="margin: 0.5rem 0 0 1.25rem; padding: 0; display: flex; flex-direction: column; gap: 0.4rem;">
                <li><b>Concurrency Pool:</b> Dispatches requests concurrently over an asynchronous HTTP pool with dynamic socket reuse.</li>
                <li><b>Session Isolation:</b> Every concurrent request is provisioned with a fresh pseudo session to prevent connector competition.</li>
            </ul>
        `
    },
    steps: {
        icon: "📋",
        title: "Phase Execution Logs & Provenance",
        content: `
            <p>Tracks real-time progression through each stage of the benchmark run:</p>
            <ul style="margin: 0.5rem 0 0 1.25rem; padding: 0; display: flex; flex-direction: column; gap: 0.4rem;">
                <li><b>PENDING:</b> Waiting in queue for preceding steps or auth validation to complete.</li>
                <li><b>RUNNING:</b> Actively streaming requests or evaluating responses.</li>
                <li><b>COMPLETED:</b> Successfully finished without unhandled errors.</li>
                <li><b>FAILED:</b> Encountered a network or authentication error. Detailed error logs are preserved for root-cause diagnosis.</li>
            </ul>
        `
    },
    latency: {
        icon: "⏱️",
        title: "Latency Benchmarks (TTFT & TTLT)",
        content: `
            <p>Measures statistical percentiles across Discovery Engine streamAssist and LLM Judge evaluations:</p>
            <ul style="margin: 0.5rem 0 0 1.25rem; padding: 0; display: flex; flex-direction: column; gap: 0.4rem;">
                <li><b>TTFT (Time-to-First-Token):</b> Time elapsed from request dispatch until the first token chunk arrives. Reflects streaming responsiveness.</li>
                <li><b>TTLT (Time-to-Last-Token):</b> Total full-stream duration until generation completes.</li>
                <li><b>p50 (Median):</b> Baseline expected latency for 50% of typical queries.</li>
                <li><b>p95:</b> Tail latency capturing complex multi-connector reasoning or heavy cloud loads.</li>
                <li><b>Max:</b> The slowest individual request in the batch.</li>
            </ul>
        `
    },
    http: {
        icon: "📡",
        title: "HTTP Dispatch Telemetry & Resilient Retries",
        content: `
            <p>Monitors HTTPS response status codes and automatic error recovery across all streamAssist calls:</p>
            <ul style="margin: 0.5rem 0 0 1.25rem; padding: 0; display: flex; flex-direction: column; gap: 0.4rem;">
                <li><b>HTTP 200 OK:</b> Clean, successful streaming response and complete token delivery.</li>
                <li><b>HTTP 429 Rate Limit:</b> Discovery Engine quota throttle. Automatically recovered via exponential backoff and randomized jitter.</li>
                <li><b>HTTP 503 / 408:</b> Backend gateway delay or timeout. The harness reprovisions a fresh session and retries.</li>
                <li><b>HTTP 400 / 403:</b> Schema or permission error. Fails fast without exhausting timeout budgets.</li>
            </ul>
        `
    },
    logs: {
        icon: "📜",
        title: "Low-Level Diagnostic Output & ADC Auth",
        content: `
            <p>Displays raw execution stream logs, chunk receipts, connector tool calls, and authentication events.</p>
            <p>If Google Cloud Application Default Credentials expire, a remediation banner appears with a one-click copyable <code>gcloud auth application-default login</code> command.</p>
        `
    },
    config: {
        icon: "⚙️",
        title: "Run Configuration Parameters",
        content: `
            <p>Records the immutable parameter snapshot configured for this run (dataset key, models, connector scope, concurrency, and custom instructions). This guarantees 100% reproducibility and auditability.</p>
        `
    },
    kpi: {
        icon: "📊",
        title: "Key Performance Indicators (KPIs)",
        content: `
            <p>The top KPI banner provides a consolidated overview across all evaluated matrix combinations (Queries × Models × Iterations):</p>
            <ul style="margin: 0.5rem 0 0 1.25rem; padding: 0; display: flex; flex-direction: column; gap: 0.5rem;">
                <li><b>Total Scenarios:</b> Total distinct queries in the benchmark. The sub-badge indicates total matrix combinations executed (e.g. 7 queries × 2 models = 14 runs).</li>
                <li><b>GE LLM Judge (Factuality Accuracy):</b> The overall pass rate graded by Vertex AI (Gemini 3.1 Pro) comparing candidate responses against authoritative golden ground truth answers. Computed as the percentage of all candidate model executions that passed (e.g. 14 of 14 passed = 100.0%).</li>
                <li><b>GE Evidence Match (Grounded Evidence):</b> Evaluates whether the specific enterprise documents cited by the model actually contain the required facts and guidelines. If a model cites an authoritative alternative document not yet listed in the dataset, this is marked <code>PASS (Alternative Grounded Source)</code>.</li>
                <li><b>GE Source Match (Strict Golden Attribution):</b> Percentage of executions where cited URLs or IDs strictly match the dataset's golden reference targets.</li>
                <li><b>Glean Accuracy:</b> Comparative pass rate for baseline Glean Web responses evaluated against the same criteria (shows N/A when Glean is omitted from the run matrix).</li>
                <li><b>Avg Latency (TTLT):</b> Mean generation duration (Time-to-Last-Token in seconds) across all streaming responses.</li>
            </ul>
        `
    },
    scorecard: {
        icon: "🎯",
        title: "Comparison Scorecard & Multi-Source Attribution",
        content: `
            <p>The Comparison Scorecard provides a row-by-row breakdown across Gemini Enterprise models, Glean, and Ground Truth specifications:</p>
            <ul style="margin: 0.5rem 0 0 1.25rem; padding: 0; display: flex; flex-direction: column; gap: 0.5rem;">
                <li><b>Multi-Model Comparison:</b> Each candidate model (e.g. <code>gemini-3.5-flash</code> vs <code>gemini-3.1-pro</code>) is evaluated individually for LLM Judge factuality, Evidence Match, Source Match, TTFT, and TTLT.</li>
                <li><b>Multi-Source Golden Datasets:</b> A query can have multiple approved authoritative sources (e.g. Google Drive policies, Confluence wikis). Citation matching succeeds when the model cites any of the approved golden references.</li>
                <li><b>Action Panel (Golden Dataset Curation):</b> When a model cites a verified grounded enterprise document that is not yet in the golden dataset, you can click <code>➕ Add Sources to Dataset</code> or <code>🔄 Replace Groundtruth Source</code> to update both the canonical dataset file and the active run results in one click.</li>
            </ul>
        `
    },
    canonical_datasets: {
        icon: "📁",
        title: "Canonical (Named) Datasets",
        content: `
            <p>Canonical datasets are golden benchmark test suites saved in <code>backend/data/datasets/</code>. You can edit queries, configure target connector actions (Google Drive, Jira, Confluence, Slack), and specify authoritative target answers.</p>
        `
    },
    historical_datasets: {
        icon: "🔒",
        title: "Historical Datasets (Read-Only Snapshots)",
        content: `
            <p>Point-in-time snapshots frozen at the exact moment of each evaluation run. Ensures complete auditability and allows one-click duplication into new editable test suites.</p>
        `
    }
};

function openHelpModal(topicKey) {
    const modal = document.getElementById('modal-help-dialog');
    const topic = HELP_TOPICS[topicKey] || {
        icon: "ℹ️",
        title: "Information Guide",
        content: "<p>Detailed guidance for this benchmark panel.</p>"
    };

    const iconEl = document.getElementById('help-modal-icon');
    const titleEl = document.getElementById('help-modal-title');
    const bodyEl = document.getElementById('help-modal-body');

    if (iconEl) iconEl.textContent = topic.icon;
    if (titleEl) titleEl.textContent = topic.title;
    if (bodyEl) bodyEl.innerHTML = topic.content;

    if (modal) modal.style.display = 'flex';
}

function closeHelpModal() {
    const modal = document.getElementById('modal-help-dialog');
    if (modal) modal.style.display = 'none';
}

// Global exposure
window.HELP_TOPICS = HELP_TOPICS;
window.openHelpModal = openHelpModal;
window.closeHelpModal = closeHelpModal;
