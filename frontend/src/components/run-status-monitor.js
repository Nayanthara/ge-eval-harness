import { LitElement, html } from 'lit';
import { getConsoleUrl } from '../utils.js';

export class RunStatusMonitor extends LitElement {
  static properties = {
    runId: { type: String },
    runStatus: { type: String },
    isMonitoring: { type: Boolean },
    events: { type: Array },
    runConfig: { type: Object },
    latencySummary: { type: Object },
    helpOpen: { type: Object }
  };

  constructor() {
    super();
    this.runId = '';
    this.runStatus = 'running';
    this.isMonitoring = true;
    this.events = [];
    this.runConfig = null;
    this.latencySummary = null;
    this.helpOpen = {};
  }

  createRenderRoot() {
    return this; // Light DOM
  }

  async _handleCancelRun(e) {
    if (e) e.preventDefault();
    if (!this.runId) return;

    const confirmCancel = confirm(`Are you sure you want to cancel active evaluation run '${this.runId}'?`);
    if (!confirmCancel) return;

    try {
      if (typeof window.showToast === 'function') {
        window.showToast(`Cancelling run ${this.runId}...`, 'info');
      }
      const res = await fetch(`/api/runs/${encodeURIComponent(this.runId)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.status === 'success') {
        this.runStatus = 'cancelled';
        this.isMonitoring = false;
        if (typeof window.showToast === 'function') {
          window.showToast(`Run ${this.runId} successfully cancelled!`, 'success');
        }
        if (typeof window.loadRunsHistory === 'function') {
          window.loadRunsHistory(true);
        }
        if (typeof window.monitorRunEvents === 'function') {
          window.monitorRunEvents(this.runId);
        }
      } else {
        if (typeof window.showToast === 'function') {
          window.showToast(data.message || 'Failed to cancel run', 'error');
        }
      }
    } catch (err) {
      console.error('Error cancelling run:', err);
      if (typeof window.showToast === 'function') {
        window.showToast(`Error cancelling run: ${err.message}`, 'error');
      }
    }
  }

  openHelpModal(panelId) {
    if (typeof window.openHelpModal === 'function') {
      window.openHelpModal(panelId);
    }
  }

  renderHelpButton(panelId) {
    return html`
      <button class="btn btn-secondary btn-sm" 
              @click="${() => this.openHelpModal(panelId)}" 
              title="Click to learn more about this panel"
              style="padding: 0.15rem 0.45rem; font-size: 0.72rem; border-radius: 12px; display: inline-flex; align-items: center; gap: 0.25rem; background: var(--bg-card-secondary); color: var(--text-sub); border: 1px solid var(--border-color); cursor: pointer; font-weight: 500;">
        <span>ℹ️</span>
        <span>Info</span>
      </button>
    `;
  }

  _handleViewDataset(e, datasetId, type) {
    e.preventDefault();
    if (typeof window.viewDatasetReadOnly === 'function') {
      window.viewDatasetReadOnly(datasetId, type, 'run-status');
    } else {
      window.location.hash = `dataset-viewer?id=${encodeURIComponent(datasetId)}&type=${encodeURIComponent(type)}&from=run-status`;
    }
  }

  render() {
    const projectId = window.GCP_PROJECT_ID || '';
    const engineId = window.GCP_ENGINE_ID || '';

    const predefinedSteps = [
      { name: "Initialization", displayName: "Initialization", aliases: ["Init"] },
      { name: "REST API Benchmarks", displayName: "REST API Benchmarks" },
      { name: "LLM Judge Evaluation", displayName: "LLM Judge Evaluation" },
      { name: "AI Failure Diagnostics", displayName: "AI Failure Diagnostics" },
      { name: "Persistence", displayName: "Persistence" }
    ];

    const stepStates = {};
    predefinedSteps.forEach(s => {
      stepStates[s.name] = {
        status: 'PENDING',
        time: '--:--:--',
        info: 'Waiting to start...'
      };
    });

    let completed = 0;
    if (this.events && this.events.length > 0) {
      this.events.forEach(ev => {
        const matchingStep = predefinedSteps.find(s => s.name === ev.step || (s.aliases && s.aliases.includes(ev.step)));
        const stepKey = matchingStep ? matchingStep.name : ev.step;
        if (stepStates[stepKey]) {
          stepStates[stepKey] = {
            status: ev.status.toUpperCase(),
            time: ev.time || '',
            info: ev.info || ''
          };
        }
      });
    }

    predefinedSteps.forEach(s => {
      if (stepStates[s.name].status === 'COMPLETED') {
        completed++;
      }
    });

    const isRunCompleted = (completed >= predefinedSteps.length) || (stepStates['Persistence'] && stepStates['Persistence'].status === 'COMPLETED');
    const pct = isRunCompleted ? 100 : Math.min(100, Math.round((completed / predefinedSteps.length) * 100));

    // Fire complete event if all steps are completed
    if (isRunCompleted && this.runId) {
      this.dispatchEvent(new CustomEvent('completed', { bubbles: true, composed: true }));
    }

    // Extract Matrix Calculation Parameters
    const models = this.runConfig?.models || ['gemini-3.5-flash'];
    let numModels = models.length || 1;
    let iterations = Number(this.runConfig?.iterations) || 1;
    const maxConcurrent = this.runConfig?.max_concurrent_calls || 10;
    
    let sampleCount = Number(this.runConfig?.sample_count) || 0;
    let totalRequests = Number(this.runConfig?.total_requests) || 0;
    let completedRequests = 0;

    // Parse matrix calculation and progress from logs if not explicit in config
    if (this.events && this.events.length > 0) {
      this.events.forEach(ev => {
        const text = ev.info || '';
        
        // Match 0: "Dataset: gdrive_benchmark_small_10 (10 queries)"
        const dsInitMatch = text.match(/Dataset:\s+.*?\s+\((\d+)\s+queries\)/i);
        if (dsInitMatch && (!sampleCount || sampleCount === 0)) {
          sampleCount = parseInt(dsInitMatch[1], 10);
        }

        // Match 1: "Cartesian matrix expanded: 10 queries × 1 models (gemini-3.5-flash) × 1 iterations = 10 total calls"
        const matrixFullMatch = text.match(/(\d+)\s+(?:queries|samples)\s+×\s+(\d+)\s+models(?:\s+.*?)?(?:×\s+(\d+)\s+iter(?:ations)?)?\s*=\s*(\d+)\s+total\s+(?:calls|requests|API\s+requests)/i);
        if (matrixFullMatch) {
          if (!sampleCount || sampleCount === 0) sampleCount = parseInt(matrixFullMatch[1], 10);
          if (matrixFullMatch[2]) numModels = parseInt(matrixFullMatch[2], 10);
          if (matrixFullMatch[3]) iterations = parseInt(matrixFullMatch[3], 10);
          if (!totalRequests || totalRequests === 0) totalRequests = parseInt(matrixFullMatch[4], 10);
        }

        // Match 2: "10 queries × 1 models" or "5 samples × 2 models"
        const matrixMatch = text.match(/(\d+)\s+(?:samples|queries)\s+×\s+(\d+)\s+models/i);
        if (matrixMatch && (!sampleCount || sampleCount === 0)) {
          sampleCount = parseInt(matrixMatch[1], 10);
        }

        // Match 3: "Expanded configuration into 5 query rows"
        const rowsMatch = text.match(/Expanded configuration into (\d+) query rows/i);
        if (rowsMatch && (!sampleCount || sampleCount === 0)) {
          sampleCount = parseInt(rowsMatch[1], 10);
        }

        // Match 4: "Graded 5 GE outputs"
        const gradedMatch = text.match(/Graded\s+(\d+)\s+(?:GE\s+)?outputs/i);
        if (gradedMatch && (!totalRequests || totalRequests === 0)) {
          totalRequests = parseInt(gradedMatch[1], 10);
        }

        // Match 5: "Executing 10 concurrent streamAssist REST calls" or "Executing 10 requests" or "10 total calls"
        const totalReqMatch = text.match(/(\d+)\s+total\s+(?:calls|API\s+requests|requests)/i) || 
                              text.match(/Executing\s+(\d+)\s+(?:concurrent\s+)?(?:streamAssist\s+REST\s+calls|API\/UI\s+requests|API\s+requests|requests|calls)/i);
        if (totalReqMatch && (!totalRequests || totalRequests === 0)) {
          totalRequests = parseInt(totalReqMatch[1], 10);
        }

        // Match 6: "Progress: 4/10 completed" or "Progress: 4/10 requests completed"
        const progMatch = text.match(/Progress:\s*(\d+)\/(\d+)\s+(?:completed|requests|calls)/i);
        if (progMatch) {
          completedRequests = parseInt(progMatch[1], 10);
          if (!totalRequests || totalRequests === 0) {
            totalRequests = parseInt(progMatch[2], 10);
          }
        }
      });
    }

    if (sampleCount === 0 && totalRequests > 0 && numModels > 0 && iterations > 0) {
      sampleCount = Math.max(1, Math.round(totalRequests / (numModels * iterations)));
    }
    if (totalRequests === 0 && sampleCount > 0) {
      totalRequests = sampleCount * numModels * iterations;
    }

    // Check if REST API Benchmarks step or entire run is finished
    const apiBenchState = stepStates['REST API Benchmarks']?.status || 'PENDING';
    if ((apiBenchState === 'COMPLETED' || completed === 4) && totalRequests > 0) {
      completedRequests = totalRequests;
    }

    const requestProgressPct = totalRequests > 0 ? Math.min(100, Math.round((completedRequests / totalRequests) * 100)) : 0;

    // Derive Latency stats (eval API TTLT and LLM judge TTLT)
    let apiStats = this.latencySummary?.eval_api_ttlt || this.latencySummary?.ttlt_sec || null;
    let judgeStats = this.latencySummary?.llm_judge_ttlt || this.latencySummary?.judge_ttlt_sec || null;

    // Fallback parsing from events if latencySummary not explicitly set
    if (!apiStats || !apiStats.p50) {
      const restEvent = (this.events || []).find(e => (e.step || '').toLowerCase().includes('rest') && (e.info || '').includes('p50='));
      if (restEvent && restEvent.info) {
        const mP50 = restEvent.info.match(/p50=([\d\.]+)s/);
        const mP95 = restEvent.info.match(/p95=([\d\.]+)s/);
        const mMax = restEvent.info.match(/max=([\d\.]+)s/);
        const mAvg = restEvent.info.match(/Avg ([\d\.]+)s/);
        if (mP50) {
          apiStats = {
            p50: parseFloat(mP50[1]),
            p95: mP95 ? parseFloat(mP95[1]) : parseFloat(mP50[1]),
            max: mMax ? parseFloat(mMax[1]) : parseFloat(mP50[1]),
            avg: mAvg ? parseFloat(mAvg[1]) : parseFloat(mP50[1]),
            min: parseFloat(mP50[1]),
          };
        }
      }
    }

    if (!judgeStats || !judgeStats.p50) {
      const judgeEvent = (this.events || []).find(e => (e.step || '').toLowerCase().includes('judge') && (e.info || '').includes('p50='));
      if (judgeEvent && judgeEvent.info) {
        const mP50 = judgeEvent.info.match(/p50=([\d\.]+)s/);
        const mP95 = judgeEvent.info.match(/p95=([\d\.]+)s/);
        const mMax = judgeEvent.info.match(/max=([\d\.]+)s/);
        if (mP50) {
          judgeStats = {
            p50: parseFloat(mP50[1]),
            p95: mP95 ? parseFloat(mP95[1]) : parseFloat(mP50[1]),
            max: mMax ? parseFloat(mMax[1]) : parseFloat(mP50[1]),
            avg: parseFloat(mP50[1]),
            min: parseFloat(mP50[1]),
          };
        }
      }
    }

    const isCustomInstruction = Boolean(
      this.runConfig?.custom_system_instruction ||
      (this.runConfig?.instruction_sets && this.runConfig.instruction_sets.includes('Custom')) ||
      this.runConfig?.system_instruction_mode === 'Custom'
    );
    const instructionModeLabel = isCustomInstruction ? 'Custom' : 'Default';

    return html`
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
              <h2 id="status-title-id" style="font-family: var(--font-display); font-size: 1.15rem; margin: 0;">Step-by-Step Progress Pipeline</h2>
              ${isCustomInstruction ? html`
                <span class="badge badge-pass" style="font-size: 0.72rem; padding: 0.15rem 0.5rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                  <span>⚙️</span>
                  <span>Custom Instructions</span>
                </span>
              ` : ''}
            </div>
            <div id="status-info-banner" style="font-size: 0.84rem; color: var(--text-sub); margin-top: 0.2rem;">
              ${this.runId ? `Live monitoring active for run ${this.runId}` : 'Select a run or launch a new matrix evaluation session to monitor step logs here.'}
            </div>
          </div>
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            ${this.renderHelpButton('pipeline')}
            ${this.runId && (this.runStatus === 'running' || this.isMonitoring) ? html`
              <button 
                class="btn btn-outline" 
                style="color: var(--danger-color, #d93025); border: 1px solid var(--danger-color, #d93025); background: rgba(217, 48, 37, 0.08); font-size: 0.8rem; padding: 0.32rem 0.75rem; border-radius: 6px; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem; cursor: pointer; transition: all 0.2s;"
                @click="${this._handleCancelRun}"
                title="Immediately cancel this running evaluation"
              >
                <span>🛑</span>
                <span>Cancel Run</span>
              </button>
            ` : ''}
            <div id="status-progress-bar-container" style="width: 200px; background: var(--bg-card-secondary); height: 10px; border-radius: 5px; border: 1px solid var(--border-color); position: relative; overflow: hidden; display: ${this.runId ? 'block' : 'none'};">
              <div id="status-progress-fill" style="background: var(--accent-primary); width: ${pct}%; height: 100%; transition: width 0.3s ease;"></div>
            </div>
          </div>
        </div>

        <!-- Concurrency & Matrix Calculation Insight Card -->
        ${this.runId ? html`
          <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.75rem 1.15rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(60,64,67,0.08);">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 0.5rem;">
              <div>
                <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.6px; color: var(--accent-primary); font-weight: 700; display: flex; align-items: center; gap: 0.35rem; margin-bottom: 0.2rem;">
                  <span>🧮</span>
                  <span>Batch Matrix Calculation Formula</span>
                </div>
                <div style="font-size: 0.95rem; font-weight: 700; color: var(--text-main); font-family: var(--font-display); display: flex; align-items: center; flex-wrap: wrap; gap: 0.35rem;">
                  <span style="color: var(--accent-primary); background: var(--bg-card-secondary); padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-color); font-size: 0.85rem;">
                    ${sampleCount || 1} Samples
                  </span>
                  <span style="color: var(--text-sub); font-size: 0.85rem;">×</span>
                  <span style="color: var(--success-color); background: var(--bg-card-secondary); padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-color); font-size: 0.85rem;">
                    ${numModels} Models (${models.map(m => m.replace('gemini-', '')).join(', ')})
                  </span>
                  ${isCustomInstruction ? html`
                    <span style="color: var(--text-sub); font-size: 0.85rem;">×</span>
                    <span style="color: var(--accent-primary); background: var(--bg-card-secondary); padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-color); font-size: 0.85rem;">
                      Custom Instructions
                    </span>
                  ` : ''}
                  ${iterations > 1 ? html`
                    <span style="color: var(--text-sub); font-size: 0.85rem;">×</span>
                    <span style="color: var(--accent-primary); background: var(--bg-card-secondary); padding: 0.15rem 0.5rem; border-radius: 4px; border: 1px solid var(--border-color); font-size: 0.85rem;">
                      ${iterations} Iter
                    </span>
                  ` : ''}
                  <span style="color: var(--text-sub); font-size: 0.85rem;">=</span>
                  <span style="color: var(--accent-primary); background: var(--bg-card-secondary); padding: 0.15rem 0.6rem; border-radius: 4px; border: 1px solid var(--border-color); font-weight: 800; font-size: 0.85rem;">
                    ${totalRequests || (sampleCount || 1) * numModels * iterations} Total API Requests
                  </span>
                </div>
              </div>

              <!-- Concurrency Cap & Progress Callout + Info Button -->
              <div style="display: flex; gap: 0.65rem; align-items: center;">
                <div style="text-align: right; background: var(--bg-card-secondary); padding: 0.25rem 0.6rem; border-radius: 6px; border: 1px solid var(--border-color);">
                  <div style="font-size: 0.64rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600; letter-spacing: 0.4px;">Concurrency Pool</div>
                  <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-main);">${maxConcurrent} Connections</div>
                </div>
                <div style="text-align: right; background: var(--bg-card-secondary); padding: 0.25rem 0.6rem; border-radius: 6px; border: 1px solid var(--border-color);">
                  <div style="font-size: 0.64rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600; letter-spacing: 0.4px;">Request Progress</div>
                  <div style="font-size: 0.85rem; font-weight: 700; color: ${completedRequests === totalRequests && totalRequests > 0 ? 'var(--success-color)' : 'var(--accent-primary)'};">
                    ${completedRequests} / ${totalRequests || (sampleCount || 1) * numModels * iterations} (${requestProgressPct}%)
                  </div>
                </div>
                ${this.renderHelpButton('matrix')}
              </div>
            </div>

            <!-- Mini Request Progress Bar -->
            <div style="width: 100%; background: var(--bg-card-secondary); height: 6px; border-radius: 3px; border: 1px solid var(--border-color); overflow: hidden;">
              <div style="background: linear-gradient(90deg, var(--accent-primary) 0%, var(--success-color) 100%); width: ${requestProgressPct}%; height: 100%; transition: width 0.4s ease;"></div>
            </div>
          </div>
        ` : ''}

        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
          <span style="font-size: 0.76rem; text-transform: uppercase; font-weight: 700; color: var(--text-sub); letter-spacing: 0.5px;">Phase Execution Logs</span>
          ${this.renderHelpButton('steps')}
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="width: 15%;">Step Name</th>
                <th style="width: 15%;">Status</th>
                <th style="width: 15%;">Time</th>
                <th style="width: 55%;">Detail Summary / Provenance logs</th>
              </tr>
            </thead>
            <tbody id="run-status-body">
              ${!this.runId ? html`
                <tr><td colspan="4" style="text-align: center; color: var(--text-sub); padding: 1.25rem;">Select a run or launch a new matrix evaluation session to monitor step logs here.</td></tr>
              ` : predefinedSteps.map(s => {
                const stateObj = stepStates[s.name];
                const state = stateObj.status;
                
                let statusClass = 'badge-pass';
                if (state === 'PENDING') statusClass = 'badge-secondary';
                else if (state === 'RUNNING') statusClass = 'badge-glean';
                else if (state.includes('FAILED') || state.includes('ERROR')) statusClass = 'badge-fail';

                return html`
                  <tr>
                    <td><b>${s.displayName}</b></td>
                    <td><span class="badge ${statusClass}">${state}</span></td>
                    <td><code style="font-size: 0.78rem; color: var(--text-sub);">${stateObj.time}</code></td>
                    <td><div style="font-size: 0.82rem; color: var(--text-main);">${stateObj.info}</div></td>
                  </tr>
                `;
              })}
            </tbody>
          </table>
        </div>

        <!-- Completion Call-to-Action Banner -->
        ${isRunCompleted && this.runId ? html`
          <div style="margin-top: 1rem; background: var(--bg-card-secondary); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.75rem 1.15rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(60,64,67,0.08);">
            <div style="display: flex; align-items: center; gap: 0.65rem;">
              <span style="font-size: 1.35rem;">🎉</span>
              <div>
                <strong style="color: var(--success-color); font-size: 0.92rem; display: block; margin-bottom: 0.15rem;">Evaluation Run Complete!</strong>
                <div style="color: var(--text-sub); font-size: 0.8rem;">All benchmark matrix queries, latencies, and LLM judge evaluations have been recorded.</div>
              </div>
            </div>
            <button class="btn btn-primary" onclick="viewHistoricalRunResults('${this.runId}')" style="background: var(--accent-primary); color: #fff; font-weight: 600; padding: 0.4rem 1rem; border-radius: 18px; cursor: pointer; border: none; box-shadow: 0 1px 3px rgba(0,0,0,0.1); font-size: 0.84rem; display: inline-flex; align-items: center; gap: 0.35rem;">
              <span>📊</span>
              <span>View Results</span>
              <span>➡️</span>
            </button>
          </div>
        ` : ''}

        <!-- TTLT Latency Benchmarks Card -->
        ${this.runId ? html`
          <div style="margin-top: 1.15rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem 1.15rem; box-shadow: 0 1px 3px rgba(60,64,67,0.06);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
              <div>
                <h3 style="font-family: var(--font-display); font-size: 0.95rem; margin: 0; color: var(--text-main); display: flex; align-items: center; gap: 0.45rem; text-transform: uppercase; letter-spacing: 0.5px;">
                  <span>⏱️</span>
                  <span>Latency Benchmarks (Total Time To Last Token - TTLT)</span>
                </h3>
                <div style="font-size: 0.76rem; color: var(--text-sub); margin-top: 0.15rem;">
                  Statistical percentile distribution (p50, p95, and Max) across eval API calls and LLM-as-a-Judge evaluations.
                </div>
              </div>
              <div>
                ${this.renderHelpButton('latency')}
              </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 0.85rem;">
              
              <!-- Box 1: Eval API Calls (streamAssist TTLT) -->
              <div style="background: var(--bg-card-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.85rem 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
                  <div style="font-weight: 700; font-size: 0.84rem; color: var(--accent-primary); display: flex; align-items: center; gap: 0.35rem;">
                    <span>⚡</span>
                    <span>Eval API Calls (streamAssist TTLT)</span>
                  </div>
                  <span class="badge badge-pass" style="font-size: 0.68rem; padding: 0.15rem 0.45rem;">streamAssist</span>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.45rem; text-align: center;">
                  <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.45rem 0.2rem;">
                    <div style="font-size: 0.68rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600;">p50 (Median)</div>
                    <div style="font-size: 1.05rem; font-weight: 800; color: var(--accent-primary); font-family: monospace; margin-top: 0.15rem;" id="eval-api-ttlt-p50">
                      ${apiStats && apiStats.p50 !== undefined && apiStats.p50 > 0 ? `${apiStats.p50.toFixed(2)}s` : '--'}
                    </div>
                  </div>
                  <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.45rem 0.2rem;">
                    <div style="font-size: 0.68rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600;">p95</div>
                    <div style="font-size: 1.05rem; font-weight: 800; color: var(--accent-primary); font-family: monospace; margin-top: 0.15rem;" id="eval-api-ttlt-p95">
                      ${apiStats && apiStats.p95 !== undefined && apiStats.p95 > 0 ? `${apiStats.p95.toFixed(2)}s` : '--'}
                    </div>
                  </div>
                  <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.45rem 0.2rem;">
                    <div style="font-size: 0.68rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600;">Max</div>
                    <div style="font-size: 1.05rem; font-weight: 800; color: var(--accent-primary); font-family: monospace; margin-top: 0.15rem;" id="eval-api-ttlt-max">
                      ${apiStats && apiStats.max !== undefined && apiStats.max > 0 ? `${apiStats.max.toFixed(2)}s` : '--'}
                    </div>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-sub); margin-top: 0.45rem; padding: 0 0.2rem;">
                  <span>Min: <b style="color: var(--text-main); font-family: monospace;">${apiStats && apiStats.min !== undefined && apiStats.min > 0 ? `${apiStats.min.toFixed(2)}s` : '--'}</b></span>
                  <span>Avg: <b style="color: var(--text-main); font-family: monospace;">${apiStats && apiStats.avg !== undefined && apiStats.avg > 0 ? `${apiStats.avg.toFixed(2)}s` : '--'}</b></span>
                </div>
              </div>

              <!-- Box 2: LLM Judge Evaluation (Gemini 3.1 Pro TTLT) -->
              <div style="background: var(--bg-card-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.85rem 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
                  <div style="font-weight: 700; font-size: 0.84rem; color: var(--accent-primary); display: flex; align-items: center; gap: 0.35rem;">
                    <span>⚖️</span>
                    <span>LLM Judge Evaluation TTLT</span>
                  </div>
                  <span class="badge" style="background: var(--bg-card); color: var(--accent-primary); border: 1px solid var(--border-color); font-size: 0.68rem; padding: 0.15rem 0.45rem;">Gemini 3.1 Pro</span>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.45rem; text-align: center;">
                  <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.45rem 0.2rem;">
                    <div style="font-size: 0.68rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600;">p50 (Median)</div>
                    <div style="font-size: 1.05rem; font-weight: 800; color: var(--accent-primary); font-family: monospace; margin-top: 0.15rem;" id="judge-ttlt-p50">
                      ${judgeStats && judgeStats.p50 !== undefined && judgeStats.p50 > 0 ? `${judgeStats.p50.toFixed(2)}s` : '--'}
                    </div>
                  </div>
                  <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.45rem 0.2rem;">
                    <div style="font-size: 0.68rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600;">p95</div>
                    <div style="font-size: 1.05rem; font-weight: 800; color: var(--accent-primary); font-family: monospace; margin-top: 0.15rem;" id="judge-ttlt-p95">
                      ${judgeStats && judgeStats.p95 !== undefined && judgeStats.p95 > 0 ? `${judgeStats.p95.toFixed(2)}s` : '--'}
                    </div>
                  </div>
                  <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.45rem 0.2rem;">
                    <div style="font-size: 0.68rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600;">Max</div>
                    <div style="font-size: 1.05rem; font-weight: 800; color: var(--accent-primary); font-family: monospace; margin-top: 0.15rem;" id="judge-ttlt-max">
                      ${judgeStats && judgeStats.max !== undefined && judgeStats.max > 0 ? `${judgeStats.max.toFixed(2)}s` : '--'}
                    </div>
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-sub); margin-top: 0.45rem; padding: 0 0.2rem;">
                  <span>Min: <b style="color: var(--text-main); font-family: monospace;">${judgeStats && judgeStats.min !== undefined && judgeStats.min > 0 ? `${judgeStats.min.toFixed(2)}s` : '--'}</b></span>
                  <span>Avg: <b style="color: var(--text-main); font-family: monospace;">${judgeStats && judgeStats.avg !== undefined && judgeStats.avg > 0 ? `${judgeStats.avg.toFixed(2)}s` : '--'}</b></span>
                </div>
              </div>

            </div>
          </div>
        ` : ''}

        <!-- HTTP API Dispatch Telemetry & Resilient Retry Breakdown Card -->
        ${this.runId ? html`
          ${(() => {
            const httpSummary = this.latencySummary?.http_status_summary || null;
            const statusBreakdown = httpSummary?.status_code_breakdown || { '200': (completedRequests || totalRequests || 0) };
            const totalDispatched = httpSummary?.total_dispatched_calls || (completedRequests || totalRequests || 0);
            const totalRetriedScenarios = httpSummary?.retried_scenarios_count || 0;
            const totalRetriesCount = httpSummary?.total_retries_count || 0;
            const successCalls = httpSummary?.successful_calls_count !== undefined ? httpSummary.successful_calls_count : (statusBreakdown['200'] || 0);
            const baseRequests = totalRequests || (sampleCount || 1) * numModels * iterations;
            const effectiveSuccessPct = baseRequests > 0 ? Math.min(100, Math.round((successCalls / baseRequests) * 100)) : 100;

            const responseTypeCatalog = [
              { code: '200', name: 'HTTP 200 OK', desc: 'Successful streamAssist synthesis & token delivery', badge: 'badge-pass', recovery: 'Direct Success' },
              { code: '429', name: 'HTTP 429 Rate Limit', desc: 'Discovery Engine quota throttle / burst concurrency delay', badge: 'badge-glean', recovery: 'Auto-recovered via exponential backoff & jitter' },
              { code: '503', name: 'HTTP 503 Unavailable', desc: 'Transient backend model / connector gateway unavailable', badge: 'badge-glean', recovery: 'Auto-recovered via fresh session retry' },
              { code: '408', name: 'HTTP 408 Timeout', desc: 'Per-attempt execution exceeded dynamic timeout allocation', badge: 'badge-secondary', recovery: 'Reprovisioned fresh user session' },
              { code: '500', name: 'HTTP 500 Server Error', desc: 'Internal backend service execution exception', badge: 'badge-fail', recovery: 'Attempted retry' },
              { code: '400', name: 'HTTP 400 Bad Request', desc: 'Invalid payload parameter or malformed request schema', badge: 'badge-fail', recovery: 'Fail-fast (Non-retryable)' },
              { code: '403', name: 'HTTP 403 Forbidden', desc: 'Insufficient IAM permission or authentication scope expired', badge: 'badge-fail', recovery: 'Fail-fast (Non-retryable)' },
            ];

            const displayedTypes = responseTypeCatalog.filter(t => (statusBreakdown[t.code] !== undefined && statusBreakdown[t.code] > 0) || ['200', '429', '503', '408'].includes(t.code));

            return html`
              <div style="margin-top: 1.15rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem 1.15rem; box-shadow: 0 1px 3px rgba(60,64,67,0.06);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; flex-wrap: wrap; gap: 0.5rem;">
                  <div>
                    <h3 style="font-family: var(--font-display); font-size: 0.95rem; margin: 0; color: var(--text-main); display: flex; align-items: center; gap: 0.45rem; text-transform: uppercase; letter-spacing: 0.5px;">
                      <span>📡</span>
                      <span>HTTP API Dispatch Telemetry & Resilient Retry Breakdown</span>
                    </h3>
                    <div style="font-size: 0.76rem; color: var(--text-sub); margin-top: 0.15rem;">
                      Real-time HTTPS response status distribution, retry tracking, and connection recovery statistics.
                    </div>
                  </div>
                  <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
                    <span class="badge ${totalRetriedScenarios === 0 ? 'badge-pass' : 'badge-glean'}" style="font-size: 0.72rem; padding: 0.2rem 0.55rem; display: inline-flex; align-items: center; gap: 0.3rem;">
                      <span>🔄</span>
                      <span>${totalRetriedScenarios > 0 ? `${totalRetriedScenarios} Scenarios Retried (${totalRetriesCount} total retries)` : 'Zero Retries (100% First-Pass)'}</span>
                    </span>
                    <span class="badge ${effectiveSuccessPct >= 95 ? 'badge-pass' : 'badge-fail'}" style="font-size: 0.72rem; padding: 0.2rem 0.55rem;">
                      ${successCalls}/${baseRequests} Successful (${effectiveSuccessPct}%)
                    </span>
                    ${this.renderHelpButton('http')}
                  </div>
                </div>

                <!-- KPI Metric Strip -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 0.65rem; margin-bottom: 0.85rem;">
                  <div style="background: var(--bg-card-secondary); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.6rem 0.75rem;">
                    <div style="font-size: 0.68rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600;">Total Dispatched Calls</div>
                    <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-main); font-family: monospace; margin-top: 0.2rem;">${totalDispatched}</div>
                    <div style="font-size: 0.68rem; color: var(--text-sub); margin-top: 0.15rem;">Base + retry attempts</div>
                  </div>
                  <div style="background: var(--bg-card-secondary); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.6rem 0.75rem;">
                    <div style="font-size: 0.68rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600;">HTTP 200 OK Delivered</div>
                    <div style="font-size: 1.15rem; font-weight: 800; color: var(--success-color); font-family: monospace; margin-top: 0.2rem;">${statusBreakdown['200'] || 0}</div>
                    <div style="font-size: 0.68rem; color: var(--text-sub); margin-top: 0.15rem;">Complete token streams</div>
                  </div>
                  <div style="background: var(--bg-card-secondary); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.6rem 0.75rem;">
                    <div style="font-size: 0.68rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600;">Retried Scenarios</div>
                    <div style="font-size: 1.15rem; font-weight: 800; color: ${totalRetriedScenarios > 0 ? 'var(--accent-primary)' : 'var(--text-sub)'}; font-family: monospace; margin-top: 0.2rem;">${totalRetriedScenarios}</div>
                    <div style="font-size: 0.68rem; color: var(--text-sub); margin-top: 0.15rem;">${totalRetriesCount} total retry attempts</div>
                  </div>
                  <div style="background: var(--bg-card-secondary); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.6rem 0.75rem;">
                    <div style="font-size: 0.68rem; color: var(--text-sub); text-transform: uppercase; font-weight: 600;">Transient Delays/Timeouts</div>
                    <div style="font-size: 1.15rem; font-weight: 800; color: ${(statusBreakdown['408'] || 0) + (statusBreakdown['429'] || 0) + (statusBreakdown['503'] || 0) > 0 ? 'var(--warning-color, #f9ab00)' : 'var(--text-sub)'}; font-family: monospace; margin-top: 0.2rem;">
                      ${(statusBreakdown['408'] || 0) + (statusBreakdown['429'] || 0) + (statusBreakdown['503'] || 0)}
                    </div>
                    <div style="font-size: 0.68rem; color: var(--text-sub); margin-top: 0.15rem;">HTTP 408 / 429 / 503</div>
                  </div>
                </div>

                <!-- Detailed HTTP Response Codes Table -->
                <div class="table-container">
                  <table style="width: 100%; font-size: 0.8rem; border-collapse: collapse;">
                    <thead>
                      <tr style="color: var(--text-sub); border-bottom: 1px solid var(--border-color); text-align: left;">
                        <th style="padding: 0.35rem 0.6rem; width: 22%;">HTTP Response Status</th>
                        <th style="padding: 0.35rem 0.6rem; width: 40%;">Description & API Behavior</th>
                        <th style="padding: 0.35rem 0.6rem; width: 14%; text-align: center;">Attempt Count</th>
                        <th style="padding: 0.35rem 0.6rem; width: 24%;">Harness Recovery Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${displayedTypes.map(t => {
                        const count = statusBreakdown[t.code] || 0;
                        const pct = totalDispatched > 0 ? ((count / totalDispatched) * 100).toFixed(1) : '0.0';
                        return html`
                          <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 0.4rem 0.6rem; vertical-align: middle;">
                              <span class="badge ${t.badge}" style="font-size: 0.72rem; padding: 0.15rem 0.45rem; font-weight: 700;">${t.name}</span>
                            </td>
                            <td style="padding: 0.4rem 0.6rem; vertical-align: middle; color: var(--text-main); font-size: 0.78rem;">
                              ${t.desc}
                            </td>
                            <td style="padding: 0.4rem 0.6rem; vertical-align: middle; text-align: center;">
                              <code style="font-weight: 700; font-size: 0.82rem; color: ${count > 0 ? 'var(--text-main)' : 'var(--text-sub)'};">${count}</code>
                              <span style="font-size: 0.7rem; color: var(--text-sub); margin-left: 0.25rem;">(${pct}%)</span>
                            </td>
                            <td style="padding: 0.4rem 0.6rem; vertical-align: middle; font-size: 0.74rem; color: ${count > 0 && t.code !== '200' ? 'var(--accent-primary)' : 'var(--text-sub)'};">
                              ${t.recovery}
                            </td>
                          </tr>
                        `;
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            `;
          })()}
        ` : ''}

        <!-- Section: Low-Level Logs & Diagnostic Console -->
        ${this.runId ? html`
          <div style="margin-top: 1.25rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 1rem 1.15rem; box-shadow: 0 1px 3px rgba(60,64,67,0.06);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem; flex-wrap: wrap; gap: 0.5rem;">
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span style="font-size: 1.1rem;">📜</span>
                <h3 style="font-family: var(--font-display); font-size: 0.95rem; margin: 0; color: var(--text-main); text-transform: uppercase; letter-spacing: 0.5px;">
                  Low-Level Logs & Diagnostic Output
                </h3>
              </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                ${this.renderHelpButton('logs')}
                <button class="btn btn-secondary btn-sm" @click="${this._copyLogs}" style="font-size: 0.75rem; padding: 0.25rem 0.55rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                  <span>📋</span>
                  <span>Copy</span>
                </button>
                <button class="btn btn-secondary btn-sm" @click="${this._downloadLogs}" style="font-size: 0.75rem; padding: 0.25rem 0.55rem; display: inline-flex; align-items: center; gap: 0.25rem;">
                  <span>💾</span>
                  <span>Export</span>
                </button>
              </div>
            </div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <button class="btn btn-secondary btn-sm" 
                        @click="${() => {
                          const logText = (this.events || []).map(e => `[${e.time || '--:--:--'}] [${e.step || 'General'}] [${e.status || 'INFO'}] ${e.info || ''}`).join('\n');
                          navigator.clipboard.writeText(logText);
                          if (typeof window.showToast === 'function') window.showToast('Copied diagnostic logs to clipboard!', 'success');
                          else alert('Diagnostic logs copied to clipboard!');
                        }}"
                        style="padding: 0.2rem 0.55rem; font-size: 0.74rem; background: var(--bg-card-secondary); border: 1px solid var(--border-color); border-radius: 4px; color: var(--text-main); cursor: pointer; display: inline-flex; align-items: center; gap: 0.3rem;">
                  <span>📋</span>
                  <span>Copy Raw Logs</span>
                </button>
              </div>
            </div>

            <!-- Auth / Remediation Command Banner if ADC error detected -->
            ${(() => {
              const hasAuthIssue = (this.events || []).some(ev => {
                const st = String(ev.status || '').toUpperCase();
                const info = String(ev.info || '');
                const isErr = st.includes('FAIL') || st.includes('ERR') || info.toLowerCase().includes('error') || info.toLowerCase().includes('failed') || info.toLowerCase().includes('unauthenticated');
                return isErr && (
                  info.includes('application-default login') ||
                  info.toLowerCase().includes('reauthentication') ||
                  info.toLowerCase().includes('adc authentication error') ||
                  info.toLowerCase().includes('credentials are missing') ||
                  info.toLowerCase().includes('credentials have expired') ||
                  info.toLowerCase().includes('unauthenticated') ||
                  info.toLowerCase().includes('could not automatically determine credentials')
                );
              });
              if (hasAuthIssue) {
                return html`
                  <div style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 0.75rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                      <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span style="font-size: 1.2rem;">🔑</span>
                        <div>
                          <strong style="color: #fca5a5; font-size: 0.85rem;">GCP ADC Authentication Required</strong>
                          <div style="color: #fecaca; font-size: 0.78rem;">Your Application Default Credentials have expired or are missing. Run this command in your terminal:</div>
                        </div>
                      </div>
                      <div style="display: flex; align-items: center; gap: 0.4rem; background: var(--bg-card); padding: 0.35rem 0.7rem; border-radius: 6px; border: 1px solid rgba(239, 68, 68, 0.3);">
                        <code style="font-family: monospace; font-size: 0.8rem; color: var(--danger-color);">gcloud auth application-default login</code>
                        <button class="btn btn-secondary btn-sm" 
                                @click="${() => {
                                  navigator.clipboard.writeText('gcloud auth application-default login');
                                  if (typeof window.showToast === 'function') window.showToast('Copied auth command to clipboard!', 'success');
                                  else alert('Copied auth command!');
                                }}"
                                style="padding: 0.1rem 0.4rem; font-size: 0.7rem; background: rgba(255,255,255,0.15); color: #fff; border: none; border-radius: 4px; cursor: pointer;">
                          📋 Copy
                        </button>
                      </div>
                    </div>
                  </div>
                `;
              }
              return '';
            })()}

            <!-- Terminal-styled Log Console Box -->
            <div id="low-level-logs-console" style="background: var(--code-bg, var(--bg-card-secondary)); border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem 1rem; max-height: 250px; overflow-y: auto; font-family: 'JetBrains Mono', 'Roboto Mono', 'Fira Code', monospace; font-size: 0.78rem; line-height: 1.5; color: var(--text-main);">
              ${!this.events || this.events.length === 0 ? html`
                <div style="color: var(--text-sub); font-style: italic;">No events logged yet. Waiting for runner output...</div>
              ` : this.events.map((ev) => {
                const step = ev.step || 'System';
                const status = String(ev.status || 'INFO').toUpperCase();
                const isError = status.includes('FAIL') || status.includes('ERR') || (ev.info && (ev.info.includes('Error') || ev.info.includes('Exception') || ev.info.includes('Traceback')));
                const isSuccess = status.includes('COMPLETED') || status.includes('DONE') || status.includes('PASS');
                const isWarn = status.includes('WARN') || status.includes('RETRY');
                
                let tagColor = 'var(--accent-primary)'; // Accent for INFO
                if (isError) tagColor = 'var(--danger-color)'; // Red for ERROR
                else if (isSuccess) tagColor = 'var(--success-color)'; // Green for SUCCESS
                else if (isWarn) tagColor = '#d97706'; // Amber for WARN

                return html`
                  <div style="margin-bottom: 0.25rem; display: flex; gap: 0.6rem; align-items: flex-start; word-break: break-word;">
                    <span style="color: var(--text-sub); flex-shrink: 0; user-select: none;">[${ev.time || '--:--:--'}]</span>
                    <span style="color: var(--accent-secondary); flex-shrink: 0; font-weight: 600;">[${step}]</span>
                    <span style="color: ${tagColor}; font-weight: 700; flex-shrink: 0;">[${status}]</span>
                    <span style="color: ${isError ? 'var(--danger-color)' : 'var(--text-main)'}; flex: 1;">${ev.info || ''}</span>
                  </div>
                `;
              })}
            </div>
          </div>
        ` : ''}

        <!-- Configuration Parameters Table -->
        ${this.runConfig && Object.keys(this.runConfig).length > 0 ? html`
          <div style="margin-top: 1.25rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.65rem;">
              <h3 style="font-family: var(--font-display); font-size: 0.95rem; margin: 0; color: var(--text-main); text-transform: uppercase; letter-spacing: 0.5px;">Run Configuration parameters</h3>
              ${this.renderHelpButton('config')}
            </div>

            <div class="table-container">
              <table style="width: 100%; font-size: 0.82rem;">
                <thead>
                  <tr style="color: var(--text-sub); border-bottom: 1px solid var(--border-color);">
                    <th style="width: 30%; padding: 0.35rem 0.6rem;">Parameter Setting</th>
                    <th style="width: 70%; padding: 0.35rem 0.6rem;">Configured Execution Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.35rem 0.6rem;"><b>Evaluation Dataset</b></td>
                    <td style="padding: 0.35rem 0.6rem;">
                      ${(() => {
                        const rawKey = this.runConfig.dataset_key || this.runConfig.dataset_name || this.runConfig.dataset_id || '';
                        const isCanonical = rawKey && rawKey !== 'custom_uploaded' && rawKey !== 'custom';
                        const targetId = isCanonical ? rawKey : (this.runId || 'current');
                        const targetType = isCanonical ? 'canonical' : 'run';
                        const displayName = isCanonical ? rawKey : (this.runId ? `manifest_${this.runId}.json` : 'Run Dataset Snapshot');
                        const badgeClass = isCanonical ? 'badge-pass' : 'badge-secondary';
                        const label = isCanonical ? 'Canonical Dataset' : 'Frozen Run Snapshot';
                        const runIdText = this.runId || targetId;
                        return html`
                          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                            <button class="btn btn-secondary btn-sm" 
                                    id="btn-view-status-dataset"
                                    @click="${(e) => this._handleViewDataset(e, targetId, targetType)}" 
                                    style="display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.65rem; font-size: 0.78rem; background: var(--bg-card-secondary); color: var(--accent-primary); border: 1px solid var(--border-color); font-weight: 600; border-radius: 6px; cursor: pointer;">
                              <span>📄</span>
                              <span>View Dataset (Run ID: ${runIdText})</span>
                              <span style="font-size: 0.72rem;">↗</span>
                            </button>
                            <span class="badge ${badgeClass}" style="font-size: 0.7rem; padding: 0.15rem 0.45rem;">${label}</span>
                          </div>
                        `;
                      })()}
                    </td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.35rem 0.6rem;"><b>Benchmark Models</b></td>
                    <td style="padding: 0.35rem 0.6rem;">
                      ${(this.runConfig.models || []).map(m => html`<span class="badge badge-pass" style="margin-right: 0.35rem; font-size: 0.72rem; padding: 0.15rem 0.45rem;">${m}</span>`)}
                    </td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.35rem 0.6rem; vertical-align: top;"><b>Active Data Connectors</b></td>
                    <td style="padding: 0.35rem 0.6rem;">
                      ${(() => {
                        const displayedConnectors = (this.runConfig.active_connectors && this.runConfig.active_connectors.length > 0)
                          ? this.runConfig.active_connectors
                          : (this.runConfig.connectors || []);
                        if (!displayedConnectors || displayedConnectors.length === 0 || (displayedConnectors.length === 1 && displayedConnectors[0] === 'none')) {
                          return html`<span style="color: var(--text-sub); font-style: italic;">None (RAG Disabled)</span>`;
                        }
                        return html`
                          <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem; margin-top: 0.15rem; text-align: left;">
                            <thead>
                              <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-sub);">
                                <th style="padding: 0.2rem 0.4rem; width: 75%;">CONNECTOR ID</th>
                                <th style="padding: 0.2rem 0.4rem; width: 25%; text-align: right;">CONSOLE LINK</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${displayedConnectors.map(c => {
                                const consoleUrl = getConsoleUrl(c, engineId, projectId);
                                return html`
                                  <tr style="border-bottom: 1px solid var(--border-color);">
                                    <td style="padding: 0.2rem 0.4rem; vertical-align: middle;">
                                      <code style="font-size: 0.76rem; color: var(--code-text); background: var(--code-bg); padding: 0.1rem 0.3rem; border-radius: 4px;">${c}</code>
                                    </td>
                                    <td style="padding: 0.2rem 0.4rem; vertical-align: middle; text-align: right;">
                                      <a href="${consoleUrl}" target="_blank" style="font-size: 0.72rem; color: var(--accent-primary); text-decoration: underline;">
                                        Console Page ↗
                                      </a>
                                    </td>
                                  </tr>
                                `;
                              })}
                            </tbody>
                          </table>
                        `;
                      })()}
                    </td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.35rem 0.6rem;"><b>Iterations count</b></td>
                    <td style="padding: 0.35rem 0.6rem;"><code style="font-size: 0.8rem; color: var(--code-text); background: var(--code-bg); padding: 0.1rem 0.35rem; border-radius: 4px;">${this.runConfig.iterations || 1}</code></td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.35rem 0.6rem;"><b>Max Concurrent Connections</b></td>
                    <td style="padding: 0.35rem 0.6rem;"><code style="font-size: 0.8rem; color: var(--code-text); background: var(--code-bg); padding: 0.1rem 0.35rem; border-radius: 4px;">${this.runConfig.max_concurrent_calls || 3}</code></td>
                  </tr>
                  <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 0.45rem 0.6rem; vertical-align: top;">
                      <b>System Instructions Mode</b>
                      <div style="font-size: 0.72rem; color: var(--text-sub); margin-top: 0.15rem;">Configured agent directive prompt</div>
                    </td>
                    <td style="padding: 0.45rem 0.6rem;">
                      <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: ${isCustomInstruction && this.runConfig.custom_system_instruction ? '0.45rem' : '0'};">
                        <span class="badge ${isCustomInstruction ? 'badge-pass' : 'badge-secondary'}" style="font-size: 0.72rem; padding: 0.15rem 0.5rem; font-weight: 700;">
                          ${instructionModeLabel}
                        </span>
                        <span style="font-size: 0.78rem; color: var(--text-sub);">
                          ${isCustomInstruction 
                            ? 'Custom system directive override applied to all queries' 
                            : 'Default Gemini Enterprise core assistant instructions (No custom override)'}
                        </span>
                      </div>
                      ${isCustomInstruction && this.runConfig.custom_system_instruction ? html`
                        <div style="margin-top: 0.35rem;">
                          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
                            <span style="font-size: 0.7rem; font-weight: 600; color: var(--text-sub); text-transform: uppercase; letter-spacing: 0.5px;">Active Instruction Directive</span>
                            <button class="btn btn-secondary btn-sm" 
                                    @click="${() => {
                                      navigator.clipboard.writeText(this.runConfig.custom_system_instruction);
                                      if (typeof window.showToast === 'function') window.showToast('Copied instruction to clipboard!', 'success');
                                    }}"
                                    style="padding: 0.15rem 0.45rem; font-size: 0.68rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer; color: var(--text-main); display: inline-flex; align-items: center; gap: 0.25rem;">
                              <span>📋</span>
                              <span>Copy Instruction</span>
                            </button>
                          </div>
                          <div style="font-family: monospace; white-space: pre-wrap; background: var(--bg-card-secondary); padding: 0.6rem 0.75rem; border-radius: 6px; border: 1px solid var(--border-color); max-height: 140px; overflow-y: auto; color: var(--text-main); line-height: 1.4; font-size: 0.78rem; word-break: break-word;">${this.runConfig.custom_system_instruction}</div>
                        </div>
                      ` : ''}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('run-status-monitor', RunStatusMonitor);
