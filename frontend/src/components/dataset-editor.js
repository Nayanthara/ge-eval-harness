import { LitElement, html } from 'lit';
import '@material/web/textfield/outlined-text-field.js';
import { getConsoleUrl } from '../utils.js';

export class DatasetEditor extends LitElement {
  static properties = {
    scenarios: { type: Array },
    connectors: { type: Array },
    editingIdx: { type: Number },
    _draftScenario: { type: Object },
    _connectorPage: { type: Number }
  };

  constructor() {
    super();
    this.scenarios = [];
    this.connectors = [];
    this.editingIdx = -1;
    this._draftScenario = null;
    this._connectorPage = 1;
  }

  createRenderRoot() {
    return this; // Light DOM
  }

  updated(changedProperties) {
    if (changedProperties.has('scenarios')) {
      // If the scenarios list was replaced from the outside, reset active edit mode
      this.editingIdx = -1;
      this._draftScenario = null;
    }
  }

  _isValidUrl(str) {
    if (!str || typeof str !== 'string') return false;
    const trimmed = str.trim();
    if (!trimmed) return false;

    // Strictly enforce valid HTTP or HTTPS URLs with valid hostnames
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      try {
        const url = new URL(trimmed);
        return Boolean(url.hostname && url.hostname.includes('.'));
      } catch (_) {
        return false;
      }
    }

    return false;
  }

  _canAddSourceLink() {
    const srcs = this._draftScenario.expected_source || [];
    if (srcs.length === 0) return true;
    if (srcs.length >= 10) return false;
    const last = srcs[srcs.length - 1];
    return this._isValidUrl(last);
  }

  _addEditorRow() {
    this._connectorPage = 1;
    this._draftScenario = {
      query: '',
      ground_truth: '',
      expected_source: [],
      connector_id: '',
      connector_scope: 'all',
      connectors_enabled: true,
      glean_response_text: '',
      glean_source_urls: ''
    };
    this.editingIdx = this.scenarios.length; // Indicates appending new scenario
  }

  _startEdit(idx) {
    this._connectorPage = 1;
    this.editingIdx = idx;
    const s = this.scenarios[idx];
    if (!s) return;
    
    let enabled = true;
    let scope = 'all';
    let connId = '';

    if (s.connector_id === 'none') {
      enabled = false;
      scope = 'all';
      connId = '';
    } else if (s.connector_id === 'all' || !s.connector_id) {
      enabled = true;
      scope = 'all';
      connId = '';
    } else {
      enabled = true;
      scope = 'specific';
      connId = s.connector_id;
    }

    let sources = [];
    if (Array.isArray(s.expected_source)) {
      sources = [...s.expected_source];
    } else if (typeof s.expected_source === 'string' && s.expected_source.trim()) {
      sources = [s.expected_source.trim()];
    }

    this._draftScenario = {
      query: s.query || '',
      ground_truth: s.ground_truth || '',
      expected_source: sources,
      connector_id: connId,
      connector_scope: scope,
      connectors_enabled: enabled,
      glean_response_text: s.glean_response_text || '',
      glean_source_urls: s.glean_source_urls || ''
    };
  }

  _deleteEditorRow(idx) {
    this.scenarios = this.scenarios.filter((_, i) => i !== idx);
    this._notifyChange();
  }

  _copyEditorRow(idx) {
    const s = this.scenarios[idx];
    if (!s) return;
    const copy = JSON.parse(JSON.stringify(s));
    const list = [...this.scenarios];
    list.splice(idx + 1, 0, copy);
    this.scenarios = list;
    this._notifyChange();
  }

  _cancelEdit() {
    this.editingIdx = -1;
    this._draftScenario = null;
  }

  _saveEdit() {
    if (!this._draftScenario.query.trim()) {
      alert("User Query is required!");
      return;
    }
    
    // Validate that all entered links are strictly valid HTTP/HTTPS URLs
    const invalidLinks = (this._draftScenario.expected_source || []).filter(link => !this._isValidUrl(link));
    if (invalidLinks.length > 0) {
      alert("Cannot save: All Expected Source Links must be properly formatted HTTP or HTTPS URLs (e.g. starting with https:// or http://). Filenames and raw text are not allowed.");
      return;
    }

    let finalConnectorId = 'all';
    if (!this._draftScenario.connectors_enabled) {
      finalConnectorId = 'none';
    } else {
      if (this._draftScenario.connector_scope === 'all') {
        finalConnectorId = 'all';
      } else {
        const checkedId = this._draftScenario.connector_id;
        if (!checkedId || !checkedId.trim()) {
          alert("Cannot save: You selected 'Specify connector' but no connector is checked. Please select at least one specific connector below, or switch back to 'All Connectors'.");
          return;
        }
        finalConnectorId = checkedId.trim();
      }
    }

    const savedScenario = {
      query: this._draftScenario.query,
      ground_truth: this._draftScenario.ground_truth,
      expected_source: this._draftScenario.expected_source,
      connector_id: finalConnectorId,
      glean_response_text: this._draftScenario.glean_response_text,
      glean_source_urls: this._draftScenario.glean_source_urls
    };

    const list = [...this.scenarios];
    if (this.editingIdx === list.length) {
      list.push(savedScenario);
    } else {
      list[this.editingIdx] = savedScenario;
    }
    this.scenarios = list;
    this.editingIdx = -1;
    this._draftScenario = null;
    this._notifyChange();
  }

  _onDraftQueryInput(e) {
    this._draftScenario.query = e.target.value;
  }

  _onDraftTruthInput(e) {
    this._draftScenario.ground_truth = e.target.value;
  }

  _onDraftSourceInput(srcIdx, e) {
    this._draftScenario.expected_source[srcIdx] = e.target.value.trim();
    this.requestUpdate();
  }

  _addDraftSourceLink() {
    if (!this._canAddSourceLink()) return;
    if (!Array.isArray(this._draftScenario.expected_source)) {
      this._draftScenario.expected_source = [];
    }
    this._draftScenario.expected_source.push('');
    this.requestUpdate();
  }

  _deleteDraftSourceLink(srcIdx) {
    this._draftScenario.expected_source.splice(srcIdx, 1);
    this.requestUpdate();
  }

  _onToggleConnectorsEnabled() {
    this._draftScenario.connectors_enabled = !this._draftScenario.connectors_enabled;
    this.requestUpdate();
  }

  _onChangeConnectorScope(e) {
    this._draftScenario.connector_scope = e.target.value;
    if (this._draftScenario.connector_scope === 'all') {
      this._draftScenario.connector_id = '';
    }
    this.requestUpdate();
  }

  _selectAllConnectors() {
    const ids = this.connectors.map(c => c.connector_id);
    this._draftScenario.connector_id = ids.join(',');
    this.requestUpdate();
  }

  _clearAllConnectors() {
    this._draftScenario.connector_id = '';
    this.requestUpdate();
  }

  _isDraftConnChecked(connId) {
    if (this._draftScenario.connector_scope === 'all') return true;
    const current = this._draftScenario.connector_id || '';
    return current.split(',').includes(connId);
  }

  _onDraftConnItemChange(e) {
    const connId = e.target.value;
    const isChecked = e.target.checked;
    
    let currentList = this._draftScenario.connector_id ? this._draftScenario.connector_id.split(',') : [];
    if (isChecked) {
      if (!currentList.includes(connId)) {
        currentList.push(connId);
      }
    } else {
      currentList = currentList.filter(id => id !== connId);
    }
    
    this._draftScenario.connector_id = currentList.join(',');
    this.requestUpdate();
  }

  _getConnectorDropdownLabel(connectorIdVal) {
    if (!connectorIdVal || connectorIdVal === 'all') return 'All Connectors';
    if (connectorIdVal === 'none') return 'No Connectors';
    const parts = connectorIdVal.split(',');
    if (parts.length === 1) {
      const conn = this.connectors.find(c => c.connector_id === parts[0]);
      return conn ? conn.display_name : parts[0].split('_')[0];
    }
    return `${parts.length} Selected`;
  }

  _notifyChange() {
    this.dispatchEvent(new CustomEvent('dataset-changed', {
      detail: { scenarios: this.scenarios },
      bubbles: true,
      composed: true
    }));
  }

  _renderReadOnlyTable() {
    return html`
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
          <h2 style="font-family: var(--font-display); font-size: 1.15rem;">Scenario Samples (Golden Dataset)</h2>
          <button class="btn btn-secondary btn-sm" id="btn-add-scenario" @click="${this._addEditorRow}">➕ Add Row</button>
        </div>
        
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="width: 32%;">User Query</th>
                <th style="width: 32%;">Expected Ground Truth Answer</th>
                <th style="width: 18%;">Expected Source Links</th>
                <th style="width: 10%;">Connector ID</th>
                <th style="width: 8%;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${this.scenarios.length === 0 ? html`
                <tr>
                  <td colspan="5" style="text-align: center; color: var(--text-sub); padding: 1.25rem 0;">
                    No scenarios added yet. Click "➕ Add Row" to get started.
                  </td>
                </tr>
              ` : this.scenarios.map((s, idx) => html`
                <tr>
                  <td style="vertical-align: top; padding: 0.4rem 0.5rem;">
                    <div style="font-size: 0.82rem; max-height: 60px; overflow-y: auto; white-space: pre-wrap; color: var(--text-main); font-weight: 500; line-height: 1.35;">${s.query || ''}</div>
                    ${(s.glean_response_text || s.glean_source_urls) ? html`
                      <span class="badge badge-glean" style="font-size: 0.65rem; margin-top: 0.25rem; padding: 0.1rem 0.4rem; text-transform: none; font-weight: normal; border-radius: 4px;">
                        📊 Glean Compare Configured
                      </span>
                    ` : ''}
                  </td>
                  <td style="vertical-align: top; padding: 0.4rem 0.5rem;">
                    <div style="font-size: 0.82rem; max-height: 60px; overflow-y: auto; white-space: pre-wrap; color: var(--text-main); line-height: 1.35;">${s.ground_truth || ''}</div>
                  </td>
                  <td style="vertical-align: top; padding: 0.4rem 0.5rem;">
                    <div style="display: flex; flex-direction: column; gap: 0.2rem;">
                      ${(s.expected_source || []).map(link => html`
                        <div style="font-size: 0.76rem; text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 250px; color: var(--accent-primary);">
                          🔗 <a href="${link}" target="_blank" style="color: var(--accent-primary); text-decoration: none;">${link}</a>
                        </div>
                      `)}
                    </div>
                  </td>
                  <td style="vertical-align: top; padding: 0.4rem 0.5rem;">
                    <span style="font-size: 0.8rem; color: var(--text-main); font-weight: 600;">
                      ${this._getConnectorDropdownLabel(s.connector_id)}
                    </span>
                  </td>
                  <td style="vertical-align: top; padding: 0.4rem 0.5rem; text-align: center;">
                    <div style="display: flex; flex-direction: column; gap: 0.2rem; align-items: center;">
                      <button class="btn btn-secondary btn-sm btn-edit-row" style="width: 100%; font-size: 0.7rem; padding: 0.18rem 0.4rem; white-space: nowrap;" @click="${() => this._startEdit(idx)}">✏️ Edit</button>
                      <button class="btn btn-secondary btn-sm btn-copy-row" style="width: 100%; font-size: 0.7rem; padding: 0.18rem 0.4rem; white-space: nowrap;" @click="${() => this._copyEditorRow(idx)}">📋 Copy</button>
                      <button class="btn btn-secondary btn-sm btn-delete-row" style="width: 100%; font-size: 0.7rem; padding: 0.18rem 0.4rem; color: var(--danger-color); white-space: nowrap;" @click="${() => this._deleteEditorRow(idx)}">🗑️ Delete</button>
                    </div>
                  </td>
                </tr>
              `)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  _renderConnectorPagination(totalConnectors) {
    const pageSize = 10;
    const totalPages = Math.ceil(totalConnectors / pageSize);
    if (totalPages <= 1) return '';

    return html`
      <div style="display: flex; justify-content: center; align-items: center; gap: 0.75rem; margin-top: 0.75rem; font-size: 0.82rem; border-top: 1px solid var(--border-color); padding-top: 0.5rem;">
        <button class="btn btn-secondary btn-sm" ?disabled="${this._connectorPage === 1}" @click="${() => { this._connectorPage--; this.requestUpdate(); }}">◀ Prev</button>
        <span style="color: var(--text-sub);">Page <b>${this._connectorPage}</b> of ${totalPages}</span>
        <button class="btn btn-secondary btn-sm" ?disabled="${this._connectorPage === totalPages}" @click="${() => { this._connectorPage++; this.requestUpdate(); }}">Next ▶</button>
      </div>
    `;
  }

  _renderFocusedEditor() {
    const isNew = this.editingIdx === this.scenarios.length;
    const projectId = window.GCP_PROJECT_ID || '';
    const engineId = window.GCP_ENGINE_ID || '';
    const enabled = this._draftScenario.connectors_enabled;
    const isScopeSpecific = this._draftScenario.connector_scope === 'specific';
    
    // Paginate connectors list
    const pageSize = 10;
    const paginatedConnectors = this.connectors.slice((this._connectorPage - 1) * pageSize, this._connectorPage * pageSize);

    return html`
      <div class="card" id="focused-scenario-editor" style="border: 1px solid var(--accent-primary); box-shadow: 0 1px 3px 0 rgba(60,64,67,0.15), 0 4px 8px 3px rgba(60,64,67,0.06);">
        <h2 style="font-family: var(--font-display); font-size: 1.15rem; margin-bottom: 0.85rem; color: var(--text-main);">
          ${isNew ? '➕ Add Dataset Scenario Sample' : '✏️ Edit Dataset Scenario Sample'}
        </h2>

        <!-- Query -->
        <div style="margin-bottom: 0.85rem;">
          <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">User Query:</label>
          <textarea
            id="focused-query"
            rows="3"
            maxlength="10000"
            placeholder="Type the query scenario to test..."
            .value="${this._draftScenario.query || ''}"
            @input="${this._onDraftQueryInput}"
            style="width: 100%; background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border); border-radius: 6px; padding: 0.5rem 0.75rem; font-family: inherit; font-size: 0.85rem; box-sizing: border-box; outline: none; transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s, color 0.2s; resize: vertical;"
            onfocus="this.style.borderColor='var(--accent-primary)'; this.style.boxShadow='0 0 0 2px var(--accent-glow)';"
            onblur="this.style.borderColor='var(--input-border)'; this.style.boxShadow='none';"
          ></textarea>
        </div>

        <!-- Ground Truth -->
        <div style="margin-bottom: 0.85rem;">
          <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Expected Answer (Ground Truth):</label>
          <textarea
            id="focused-truth"
            rows="3"
            maxlength="10000"
            placeholder="Type the reference answer/fact to judge evaluation..."
            .value="${this._draftScenario.ground_truth || ''}"
            @input="${this._onDraftTruthInput}"
            style="width: 100%; background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border); border-radius: 6px; padding: 0.5rem 0.75rem; font-family: inherit; font-size: 0.85rem; box-sizing: border-box; outline: none; transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s, color 0.2s; resize: vertical;"
            onfocus="this.style.borderColor='var(--accent-primary)'; this.style.boxShadow='0 0 0 2px var(--accent-glow)';"
            onblur="this.style.borderColor='var(--input-border)'; this.style.boxShadow='none';"
          ></textarea>
        </div>

        <!-- Expected Source Links -->
        <div style="margin-bottom: 0.85rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
            <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); text-transform: uppercase;">Expected Source Links:</label>
            ${this._canAddSourceLink() ? html`
              <button class="btn btn-secondary btn-sm" id="focused-add-link" @click="${this._addDraftSourceLink}">➕ Add Link</button>
            ` : html`
              <button class="btn btn-secondary btn-sm" id="focused-add-link" disabled style="opacity: 0.5; cursor: not-allowed;" title="Enter a valid URL in the current field first.">➕ Add Link</button>
            `}
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.4rem;">
            ${(this._draftScenario.expected_source || []).map((src, srcIdx) => html`
              <div style="display: flex; align-items: center; gap: 0.4rem;">
                <input
                  type="text"
                  class="focused-src-input"
                  data-idx="${srcIdx}"
                  placeholder="https://drive.google.com/... (Must be a valid HTTP or HTTPS URL)"
                  .value="${src}"
                  @input="${(e) => this._onDraftSourceInput(srcIdx, e)}"
                  style="flex: 1; background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border); border-radius: 6px; padding: 0.45rem 0.65rem; font-family: inherit; font-size: 0.82rem; box-sizing: border-box; outline: none; transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s, color 0.2s;"
                  onfocus="this.style.borderColor='var(--accent-primary)'; this.style.boxShadow='0 0 0 2px var(--accent-glow)';"
                  onblur="this.style.borderColor='var(--input-border)'; this.style.boxShadow='none';"
                />
                
                <!-- URL / Source Validation Checkmark Status -->
                <span style="font-size: 1rem; width: 22px; text-align: center;">
                  ${this._isValidUrl(src) ? html`<span style="color: var(--success-color);" title="Valid HTTP/HTTPS URL">✔️</span>` : (src ? html`<span style="color: var(--danger-color);" title="Invalid format: Must be a valid HTTP or HTTPS URL">❌</span>` : '')}
                </span>
                
                <button class="btn btn-secondary btn-sm" style="color: var(--danger-color); padding: 0.25rem 0.5rem;" @click="${() => this._deleteDraftSourceLink(srcIdx)}">✕</button>
              </div>
            `)}
            ${(!this._draftScenario.expected_source || this._draftScenario.expected_source.length === 0) ? html`
              <div style="color: var(--text-sub); font-size: 0.8rem; font-style: italic; padding: 0.25rem 0;">No expected sources defined.</div>
            ` : ''}
          </div>
        </div>

        <!-- Glean Comparison Option (Optional) -->
        <div style="margin-top: 0.85rem; border-top: 1px solid var(--border-color); padding-top: 0.85rem; margin-bottom: 0.85rem;">
          <h3 style="font-family: var(--font-display); font-size: 0.92rem; margin-bottom: 0.5rem; color: var(--text-main); text-transform: uppercase; letter-spacing: 0.5px;">Glean Comparison (Optional)</h3>
          
          <div style="margin-bottom: 0.65rem;">
            <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Glean Response Text:</label>
            <textarea
              id="focused-glean-response"
              rows="3"
              placeholder="Paste the response returned by Glean to grade and compare..."
              .value="${this._draftScenario.glean_response_text || ''}"
              @input="${(e) => { this._draftScenario.glean_response_text = e.target.value; }}"
              style="width: 100%; background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border); border-radius: 6px; padding: 0.5rem 0.75rem; font-family: inherit; font-size: 0.85rem; box-sizing: border-box; outline: none; transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s, color 0.2s; resize: vertical;"
              onfocus="this.style.borderColor='var(--accent-primary)'; this.style.boxShadow='0 0 0 2px var(--accent-glow)';"
              onblur="this.style.borderColor='var(--input-border)'; this.style.boxShadow='none';"
            ></textarea>
          </div>

          <div>
            <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); display: block; margin-bottom: 0.25rem; text-transform: uppercase;">Glean Source URLs:</label>
            <input
              type="text"
              id="focused-glean-sources"
              placeholder="Paste one or more Glean sources (separated by commas or newlines)..."
              .value="${this._draftScenario.glean_source_urls || ''}"
              @input="${(e) => { this._draftScenario.glean_source_urls = e.target.value; }}"
              style="width: 100%; background: var(--input-bg); color: var(--input-text); border: 1px solid var(--input-border); border-radius: 6px; padding: 0.45rem 0.65rem; font-family: inherit; font-size: 0.85rem; box-sizing: border-box; outline: none; transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s, color 0.2s;"
              onfocus="this.style.borderColor='var(--accent-primary)'; this.style.boxShadow='0 0 0 2px var(--accent-glow)';"
              onblur="this.style.borderColor='var(--input-border)'; this.style.boxShadow='none';"
            />
          </div>
        </div>

        <!-- Applicable Connectors Section -->
        <div style="margin-bottom: 1rem;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.35rem;">
            <label style="font-weight: 600; font-size: 0.78rem; color: var(--text-sub); text-transform: uppercase;">Applicable Data Connectors:</label>
            
            <!-- Sliding Switch Widget (Yes/No) -->
            <label class="switch-container" id="conn-enabled-switch" style="display: inline-flex; align-items: center; gap: 0.5rem; cursor: pointer;" @click="${this._onToggleConnectorsEnabled}">
              <span style="font-weight: 500; font-size: 0.8rem; color: var(--text-sub);">Enable Data Connectors:</span>
              <div style="position: relative; width: 38px; height: 20px; background: ${enabled ? 'var(--accent-primary)' : 'var(--input-border)'}; border-radius: 100px; transition: background 0.25s;">
                <div style="position: absolute; top: 2px; left: ${enabled ? '20px' : '2px'}; width: 16px; height: 16px; background: #fff; border-radius: 50%; transition: left 0.25s; box-shadow: 0 1px 3px rgba(0,0,0,0.2);"></div>
              </div>
              <span style="font-weight: bold; font-size: 0.8rem; color: ${enabled ? 'var(--accent-primary)' : 'var(--text-sub)'}; width: 28px;">
                ${enabled ? 'YES' : 'NO'}
              </span>
            </label>
          </div>

          <div style="font-size: 0.78rem; color: var(--text-sub); margin-bottom: 0.5rem; line-height: 1.35;">
            The list below shows the active data stores available for this evaluation harness. 
            The name shown is the unique data store ID.
            Click the link next to each connector to view its documents in the <a href="https://console.cloud.google.com/gemini-enterprise/locations/global/engines/${engineId}/connector?project=${projectId}" target="_blank" style="color: var(--accent-primary); text-decoration: underline;">Google Cloud Console Data Store Page</a>.
          </div>

          <!-- Scope Radio Buttons (only active when enabled is true) -->
          <div style="display: flex; gap: 1.5rem; margin-bottom: 0.65rem; opacity: ${enabled ? '1' : '0.35'}; pointer-events: ${enabled ? 'auto' : 'none'}; transition: all 0.25s;">
            <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; color: var(--text-main); font-size: 0.84rem;">
              <input type="radio" name="connector-scope" id="scope-all" value="all" ?checked="${this._draftScenario.connector_scope === 'all'}" @change="${this._onChangeConnectorScope}">
              <span style="color: var(--text-main);"><b>All Connectors (Dynamic)</b></span>
            </label>
            <label style="display: flex; align-items: center; gap: 0.4rem; cursor: pointer; color: var(--text-main); font-size: 0.84rem;">
              <input type="radio" name="connector-scope" id="scope-specific" value="specific" ?checked="${isScopeSpecific}" @change="${this._onChangeConnectorScope}">
              <span style="color: var(--text-main);"><b>Select Specific Connectors</b></span>
            </label>
          </div>

          <!-- Connectors Tabular Selection List -->
          <div style="display: flex; flex-direction: column; background: var(--bg-card-secondary); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid var(--border-color); max-height: 280px; overflow-y: auto; opacity: ${enabled ? '1' : '0.35'}; pointer-events: ${enabled ? 'auto' : 'none'}; transition: all 0.25s;">
            
            <!-- Helper Quick Links -->
            ${isScopeSpecific && enabled ? html`
              <div style="display: flex; gap: 0.75rem; font-size: 0.76rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.35rem; margin-bottom: 0.35rem;">
                <span style="color: var(--text-sub);">Quick actions:</span>
                <span style="color: var(--accent-primary); cursor: pointer; text-decoration: underline;" @click="${this._selectAllConnectors}">Select All</span>
                <span style="color: var(--accent-primary); cursor: pointer; text-decoration: underline;" @click="${this._clearAllConnectors}">Clear Selection</span>
              </div>
            ` : ''}

            <!-- Validation Error Warning if no connector selected in specific scope -->
            ${isScopeSpecific && enabled && (!this._draftScenario.connector_id || !this._draftScenario.connector_id.trim()) ? html`
              <div style="margin-bottom: 0.5rem; padding: 0.45rem 0.75rem; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 6px; color: var(--danger-color); font-size: 0.78rem; font-weight: 600; display: flex; align-items: center; gap: 0.4rem;">
                <span>⚠️ Error: You must select at least one specific connector from the list below before you can save.</span>
              </div>
            ` : ''}

            <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;">
              <thead>
                <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-sub);">
                  <th style="padding: 0.3rem 0.5rem; width: 80%;">Connector ID</th>
                  <th style="padding: 0.3rem 0.5rem; width: 20%; text-align: right;">Console Link</th>
                </tr>
              </thead>
              <tbody>
                ${paginatedConnectors.length === 0 ? html`
                  <tr>
                    <td colspan="2" style="text-align: center; color: var(--text-sub); padding: 1rem 0;">
                      No connectors loaded.
                    </td>
                  </tr>
                ` : paginatedConnectors.map(conn => {
                  const consoleUrl = getConsoleUrl(conn.connector_id, engineId, projectId);
                  
                  const isChecked = this._isDraftConnChecked(conn.connector_id);
                  const isCheckDisabled = !enabled || !isScopeSpecific;

                  return html`
                    <tr style="border-bottom: 1px solid var(--border-color);">
                      <td style="padding: 0.3rem 0.5rem; vertical-align: middle;">
                        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: ${isCheckDisabled ? 'default' : 'pointer'}; color: var(--text-main);">
                          <input type="checkbox" class="focused-conn-item-cb" value="${conn.connector_id}" ?checked="${isChecked}" ?disabled="${isCheckDisabled}" @change="${this._onDraftConnItemChange}">
                          <code style="font-size: 0.8rem; color: var(--code-text); background: var(--code-bg); padding: 0.1rem 0.35rem; border-radius: 4px; font-weight: 600;">${conn.connector_id}</code>
                        </label>
                      </td>
                      <td style="padding: 0.3rem 0.5rem; vertical-align: middle; text-align: right;">
                        <a href="${consoleUrl}" target="_blank" style="font-size: 0.75rem; color: var(--accent-primary); text-decoration: underline;">
                          Console Page ↗
                        </a>
                      </td>
                    </tr>
                  `;
                })}
              </tbody>
            </table>

            ${this._renderConnectorPagination(this.connectors.length)}
          </div>
        </div>

        <!-- Control Buttons -->
        <div style="display: flex; gap: 1rem; justify-content: flex-end;">
          <button class="btn btn-secondary" id="btn-cancel-edit" @click="${this._cancelEdit}">Cancel</button>
          <button class="btn btn-primary" id="btn-save-edit" ?disabled="${isScopeSpecific && enabled && (!this._draftScenario.connector_id || !this._draftScenario.connector_id.trim())}" @click="${this._saveEdit}">Save</button>
        </div>
      </div>
    `;
  }

  render() {
    if (this.editingIdx >= 0) {
      return this._renderFocusedEditor();
    }
    return this._renderReadOnlyTable();
  }
}

customElements.define('dataset-editor', DatasetEditor);
