import { LitElement, html } from 'lit';
import '@material/web/checkbox/checkbox.js';
import '@material/web/select/outlined-select.js';
import '@material/web/select/select-option.js';
import '@material/web/textfield/outlined-text-field.js';

export class RunConfigPanel extends LitElement {
  static properties = {
    models: { type: Array },
    iterations: { type: Number },
    concurrency: { type: Number },
    instructionOverride: { type: String },
    answerGenerationMode: { type: String },
    assistSkippingMode: { type: String },
    searchResultMode: { type: String },
    apiTimeout: { type: Number },
    scenarioTimeout: { type: Number },
    runTimeout: { type: Number }
  };

  constructor() {
    super();
    this.models = ['gemini-3.5-flash'];
    this.iterations = 1;
    this.concurrency = 25;
    this.instructionOverride = '';
    this.answerGenerationMode = 'NORMAL';
    this.assistSkippingMode = 'REQUEST_ASSIST';
    this.searchResultMode = 'CHUNKS';
    this.apiTimeout = 60;
    this.scenarioTimeout = 120;
    this.runTimeout = 600;
  }

  createRenderRoot() {
    return this; // Light DOM
  }

  _onModelChange(modelId, e) {
    const checked = e.target.checked;
    if (checked) {
      if (!this.models.includes(modelId)) {
        this.models = [...this.models, modelId];
      }
    } else {
      this.models = this.models.filter(m => m !== modelId);
    }
    this._notifyChange();
  }

  _onIterationsChange(e) {
    this.iterations = parseInt(e.target.value, 10);
    this._notifyChange();
  }

  _onConcurrencyChange(e) {
    this.concurrency = parseInt(e.target.value, 10);
    this._notifyChange();
  }

  _onInstructionOverrideChange(e) {
    this.instructionOverride = e.target.value;
    this._notifyChange();
  }

  _onAnswerModeChange(e) {
    this.answerGenerationMode = e.target.value;
    this._notifyChange();
  }

  _onAssistSkippingChange(e) {
    this.assistSkippingMode = e.target.value;
    this._notifyChange();
  }

  _onSearchResultModeChange(e) {
    this.searchResultMode = e.target.value;
    this._notifyChange();
  }

  _applyPromptPreset(presetKey) {
    if (presetKey === 'yahoo_concise') {
      this.instructionOverride = "You are the Yahoo Enterprise Assistant.\n1. Provide direct, concise, and factual answers in 1-3 sentences.\n2. Base your answer strictly on the provided internal documents.\n3. If explaining deprecated tools or protocols, always state the modern approved replacement.\n4. Always cite the exact source document name or URL.";
    } else if (presetKey === 'technical') {
      this.instructionOverride = "Provide a comprehensive technical breakdown with exact version numbers, deprecation timelines, and configuration examples.";
    } else {
      this.instructionOverride = "";
    }
    const txtArea = document.getElementById('config-instruction-override');
    if (txtArea) {
      txtArea.value = this.instructionOverride;
    }
    this._notifyChange();
  }

  _onApiTimeoutChange(e) {
    this.apiTimeout = parseInt(e.target.value, 10);
    this._notifyChange();
  }

  _onScenarioTimeoutChange(e) {
    this.scenarioTimeout = parseInt(e.target.value, 10);
    this._notifyChange();
  }

  _onRunTimeoutChange(e) {
    this.runTimeout = parseInt(e.target.value, 10);
    this._notifyChange();
  }

  _notifyChange() {
    this.dispatchEvent(new CustomEvent('change', {
      detail: {
        models: this.models,
        iterations: this.iterations,
        concurrency: this.concurrency,
        instructionOverride: this.instructionOverride,
        answerGenerationMode: this.answerGenerationMode,
        assistSkippingMode: this.assistSkippingMode,
        searchResultMode: this.searchResultMode,
        apiTimeout: this.apiTimeout,
        scenarioTimeout: this.scenarioTimeout,
        runTimeout: this.runTimeout
      },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    return html`
      <div style="display: flex; flex-direction: column; gap: 1rem; max-width: 800px; margin: 0 auto 1rem auto;">
        
        <!-- Top Card: Model Settings -->
        <div class="card" style="margin-bottom: 0;">
          <h2 style="font-family: var(--font-display); font-size: 1.15rem; margin-bottom: 0.75rem;">Model & Scale Settings</h2>
          
          <div style="margin-bottom: 0.75rem;">
            <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Benchmark Models:</label>
            <div style="display: flex; gap: 1.5rem; align-items: center;">
              <label style="font-size: 0.88rem; cursor: pointer; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem;">
                <md-checkbox id="config-model-flash" value="gemini-3.5-flash" ?checked="${this.models.includes('gemini-3.5-flash')}" @change="${(e) => this._onModelChange('gemini-3.5-flash', e)}"></md-checkbox>
                <span>gemini-3.5-flash</span>
              </label>
              <label style="font-size: 0.88rem; cursor: pointer; color: var(--text-main); display: flex; align-items: center; gap: 0.4rem;">
                <md-checkbox id="config-model-pro" value="gemini-3.1-pro" ?checked="${this.models.includes('gemini-3.1-pro')}" @change="${(e) => this._onModelChange('gemini-3.1-pro', e)}"></md-checkbox>
                <span>gemini-3.1-pro</span>
              </label>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
              <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Iterations:</label>
              <md-outlined-select id="config-iterations-select" style="width: 100%; --md-outlined-select-container-shape: 8px;" @change="${this._onIterationsChange}">
                <md-select-option value="1" ?selected="${this.iterations === 1}"><div slot="headline">1 Iteration</div></md-select-option>
                <md-select-option value="2" ?selected="${this.iterations === 2}"><div slot="headline">2 Iterations</div></md-select-option>
                <md-select-option value="3" ?selected="${this.iterations === 3}"><div slot="headline">3 Iterations</div></md-select-option>
              </md-outlined-select>
            </div>
            <div>
              <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Concurrency Limit:</label>
              <md-outlined-select id="config-concurrency-select" style="width: 100%; --md-outlined-select-container-shape: 8px;" @change="${this._onConcurrencyChange}">
                <md-select-option value="1" ?selected="${this.concurrency === 1}"><div slot="headline">1 Connection (Sequential)</div></md-select-option>
                <md-select-option value="5" ?selected="${this.concurrency === 5}"><div slot="headline">5 Connections</div></md-select-option>
                <md-select-option value="10" ?selected="${this.concurrency === 10}"><div slot="headline">10 Connections</div></md-select-option>
                <md-select-option value="25" ?selected="${this.concurrency === 25}"><div slot="headline">25 Connections (Default)</div></md-select-option>
                <md-select-option value="50" ?selected="${this.concurrency === 50}"><div slot="headline">50 Connections (Max Scale)</div></md-select-option>
              </md-outlined-select>
            </div>
          </div>
        </div>

        <!-- NEW Card: StreamAssist Engine Controls -->
        <div class="card" style="margin-bottom: 0; display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
            <h2 style="font-family: var(--font-display); font-size: 1.15rem; margin: 0;">StreamAssist Engine & Retrieval Tuning</h2>
            <span style="font-size: 0.75rem; background: rgba(99, 102, 241, 0.1); color: var(--accent-primary); padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600;">Discovery Engine v1alpha</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div>
              <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Answer Generation Mode:</label>
              <md-outlined-select id="config-answer-mode-select" style="width: 100%; --md-outlined-select-container-shape: 8px;" @change="${this._onAnswerModeChange}">
                <md-select-option value="NORMAL" ?selected="${this.answerGenerationMode === 'NORMAL'}"><div slot="headline">NORMAL (Fast Grounded RAG - Recommended)</div></md-select-option>
                <md-select-option value="AGENT" ?selected="${this.answerGenerationMode === 'AGENT'}"><div slot="headline">AGENT (Autonomous Low-Code Agent)</div></md-select-option>
              </md-outlined-select>
            </div>
            <div>
              <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Assist Skipping Mode:</label>
              <md-outlined-select id="config-assist-skipping-select" style="width: 100%; --md-outlined-select-container-shape: 8px;" @change="${this._onAssistSkippingChange}">
                <md-select-option value="REQUEST_ASSIST" ?selected="${this.assistSkippingMode === 'REQUEST_ASSIST'}"><div slot="headline">REQUEST_ASSIST (Guaranteed Generative AI)</div></md-select-option>
                <md-select-option value="AUTO" ?selected="${this.assistSkippingMode === 'AUTO'}"><div slot="headline">AUTO (Classifier Gated)</div></md-select-option>
                <md-select-option value="SKIP_ASSIST" ?selected="${this.assistSkippingMode === 'SKIP_ASSIST'}"><div slot="headline">SKIP_ASSIST (Raw Search Snippets Only)</div></md-select-option>
              </md-outlined-select>
            </div>
          </div>
        </div>

        <!-- Card: Agent Prompt Parameters -->
        <div class="card" style="margin-bottom: 0; display: flex; flex-direction: column;">
          <h2 style="font-family: var(--font-display); font-size: 1.15rem; margin-bottom: 0.75rem;">Agent Prompt Parameters</h2>
          
          <div style="margin-bottom: 0.75rem;">
            <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Target Agent config ID:</label>
            <md-outlined-select id="config-agent-select" style="width: 100%; --md-outlined-select-container-shape: 8px;">
              <md-select-option value="core_assistant" selected><div slot="headline">core_assistant (Enterprise Search)</div></md-select-option>
            </md-outlined-select>
          </div>

          <div style="display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); text-transform: uppercase;">Custom System Prompt Override:</label>
              <div style="display: flex; gap: 0.4rem;">
                <button type="button" class="btn btn-secondary" style="font-size: 0.72rem; padding: 0.2rem 0.5rem; height: auto;" @click="${() => this._applyPromptPreset('yahoo_concise')}">⚡ Yahoo Standard</button>
                <button type="button" class="btn btn-secondary" style="font-size: 0.72rem; padding: 0.2rem 0.5rem; height: auto;" @click="${() => this._applyPromptPreset('technical')}">📋 Technical</button>
                <button type="button" class="btn btn-secondary" style="font-size: 0.72rem; padding: 0.2rem 0.5rem; height: auto;" @click="${() => this._applyPromptPreset('clear')}">🧹 Clear</button>
              </div>
            </div>
            <textarea
              id="config-instruction-override"
              rows="3"
              .value="${this.instructionOverride}"
              placeholder="Leave empty to use the agent's default system instructions, or click a preset above..."
              @input="${this._onInstructionOverrideChange}"
              style="width: 100%; background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border); border-radius: 6px; padding: 0.5rem 0.75rem; font-family: inherit; font-size: 0.85rem; box-sizing: border-box; outline: none; transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s, color 0.2s; resize: vertical;"
              onfocus="this.style.borderColor='var(--accent-primary)'; this.style.boxShadow='0 0 0 2px var(--accent-glow)';"
              onblur="this.style.borderColor='var(--input-border)'; this.style.boxShadow='none';"
            ></textarea>
          </div>
        </div>

        <!-- Card: Timeout & Reliability Settings -->
        <div class="card" style="margin-bottom: 0; display: flex; flex-direction: column;">
          <h2 style="font-family: var(--font-display); font-size: 1.15rem; margin-bottom: 0.75rem;">Timeout & Reliability Settings</h2>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem;">
            <div>
              <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">API Request Timeout:</label>
              <md-outlined-select id="config-api-timeout-select" style="width: 100%; --md-outlined-select-container-shape: 8px;" @change="${this._onApiTimeoutChange}">
                <md-select-option value="30" ?selected="${this.apiTimeout === 30}"><div slot="headline">30s (Fast)</div></md-select-option>
                <md-select-option value="60" ?selected="${this.apiTimeout === 60}"><div slot="headline">60s (Default)</div></md-select-option>
                <md-select-option value="90" ?selected="${this.apiTimeout === 90}"><div slot="headline">90s (Relaxed)</div></md-select-option>
                <md-select-option value="120" ?selected="${this.apiTimeout === 120}"><div slot="headline">120s (Extended)</div></md-select-option>
              </md-outlined-select>
            </div>
            <div>
              <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Scenario Timeout:</label>
              <md-outlined-select id="config-scenario-timeout-select" style="width: 100%; --md-outlined-select-container-shape: 8px;" @change="${this._onScenarioTimeoutChange}">
                <md-select-option value="60" ?selected="${this.scenarioTimeout === 60}"><div slot="headline">60s (Quick)</div></md-select-option>
                <md-select-option value="90" ?selected="${this.scenarioTimeout === 90}"><div slot="headline">90s (Relaxed)</div></md-select-option>
                <md-select-option value="120" ?selected="${this.scenarioTimeout === 120}"><div slot="headline">120s (Default)</div></md-select-option>
                <md-select-option value="300" ?selected="${this.scenarioTimeout === 300}"><div slot="headline">5m (Max)</div></md-select-option>
              </md-outlined-select>
            </div>
            <div>
              <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Overall Run Timeout:</label>
              <md-outlined-select id="config-run-timeout-select" style="width: 100%; --md-outlined-select-container-shape: 8px;" @change="${this._onRunTimeoutChange}">
                <md-select-option value="300" ?selected="${this.runTimeout === 300}"><div slot="headline">5m (Fast Run)</div></md-select-option>
                <md-select-option value="600" ?selected="${this.runTimeout === 600}"><div slot="headline">10m (Default)</div></md-select-option>
                <md-select-option value="1200" ?selected="${this.runTimeout === 1200}"><div slot="headline">20m (Long Run)</div></md-select-option>
                <md-select-option value="1800" ?selected="${this.runTimeout === 1800}"><div slot="headline">30m (Max)</div></md-select-option>
              </md-outlined-select>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('run-config-panel', RunConfigPanel);
