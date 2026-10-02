/**
 * Unified Action Panel & Golden Source Curation Controller
 * Powers both the View Results screen and Trace Inspector modal.
 */

let currentSourceCurationContext = null;

function renderActionPanelHtml(ctx, scenarioIdx, geIdx, isInsideInspector = false) {
    if (!ctx) return '';
    const isJudgePass = Boolean(ctx.judge_pass === true || ctx.judge_pass === 'True' || ctx.accuracy_pass === true);
    const isSourcePass = Boolean(ctx.has_required_source === true || ctx.has_required_source === 'True');
    const isEvidencePass = Boolean(ctx.evidence_match === true || ctx.evidence_match === 'True' || isSourcePass);
    const gtQuality = (ctx.gt_source_quality || 'STRONG').toUpperCase();
    const isGtWeak = (gtQuality === 'WEAK' || gtQuality === 'DOMAIN_MISMATCH' || gtQuality === 'INACCESSIBLE' || !ctx.expected_source || ctx.expected_source === 'None' || ctx.expected_source === '[]');

    let citedList = [];
    if (Array.isArray(ctx.source_urls)) {
        citedList = ctx.source_urls.filter(s => s && String(s).trim() !== 'None');
    } else if (typeof ctx.source_urls === 'string' && ctx.source_urls.trim() && ctx.source_urls !== 'None') {
        citedList = ctx.source_urls.split(' | ').map(s => s.trim()).filter(s => s && s !== 'None');
    }
    const hasCitedSources = citedList.length > 0;

    // Determine Capabilities
    const canAddSource = isEvidencePass && !isSourcePass && hasCitedSources;
    const canReplaceSource = isGtWeak && isEvidencePass && hasCitedSources;

    // Determine AI Recommendation
    let recommendationType = 'NONE';
    let recommendationText = '';
    let isAddRecommended = false;
    let isReplaceRecommended = false;
    let isInspectRecommended = false;

    if (canReplaceSource) {
        recommendationType = 'REPLACE';
        isReplaceRecommended = true;
        recommendationText = 'Current golden reference was evaluated as WEAK / Inaccessible, but candidate response cited verified grounded enterprise evidence. Recommended action is to replace the weak reference.';
    } else if (canAddSource) {
        recommendationType = 'ADD';
        isAddRecommended = true;
        recommendationText = 'Golden reference is authoritative, and cited document is also verified to contain supporting evidence. Recommended action is to add it as an approved alternative reference.';
    } else if (isSourcePass) {
        recommendationType = 'PASS';
        recommendationText = 'Benchmark citation provenance is fully aligned with the authoritative golden dataset.';
    } else if (!isEvidencePass) {
        recommendationType = 'INSPECT';
        isInspectRecommended = true;
        recommendationText = 'Candidate response failed evidence grounding. Inspect the execution trace to diagnose ungrounded retrieval or hallucination.';
    }

    // Action 1: INSPECT TRACE (Shown only when NOT already inside Trace Inspector)
    const inspectBtnHtml = !isInsideInspector ? `
        <button class="btn btn-secondary btn-sm" onclick="openTraceDebugModal(${scenarioIdx}, ${geIdx})" style="padding: 0.3rem 0.75rem; font-size: 0.76rem; background: var(--bg-card); color: #60a5fa; border: ${isInspectRecommended ? '2px solid #3b82f6' : '1px solid rgba(96, 165, 250, 0.4)'}; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 0.35rem;">
            <span>🔬</span> <span>Inspect Trace</span>
            ${isInspectRecommended ? '<span class="badge" style="background: rgba(59, 130, 246, 0.25); color: #60a5fa; font-size: 0.64rem; padding: 0.05rem 0.35rem; margin-left: 0.2rem;">💡 AI RECOMMENDED</span>' : ''}
        </button>
    ` : '';

    // Action 2: ADD SOURCES TO DATASET
    const addBtnHtml = canAddSource ? `
        <button class="btn btn-secondary btn-sm" onclick="openAddSourceModalFromIdx(${scenarioIdx}, ${geIdx})" style="padding: 0.3rem 0.75rem; font-size: 0.76rem; background: ${isAddRecommended ? 'rgba(34, 197, 94, 0.18)' : 'rgba(34, 197, 94, 0.1)'}; color: var(--success-color); border: ${isAddRecommended ? '2px solid var(--success-color)' : '1px solid rgba(34, 197, 94, 0.4)'}; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 0.35rem;">
            <span>➕</span> <span>Add Sources to Dataset</span>
            ${isAddRecommended ? '<span class="badge" style="background: rgba(34, 197, 94, 0.25); color: var(--success-color); font-size: 0.64rem; padding: 0.05rem 0.35rem; margin-left: 0.2rem;">💡 AI RECOMMENDED</span>' : ''}
        </button>
    ` : `
        <button class="btn btn-secondary btn-sm" disabled title="${isSourcePass ? 'Golden reference already matches' : (!isEvidencePass ? 'Disabled: Cited source does not have verified evidence grounding' : 'No cited sources available')}" style="padding: 0.3rem 0.75rem; font-size: 0.76rem; opacity: 0.45; cursor: not-allowed; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.35rem;">
            <span>➕</span> <span>Add Sources to Dataset</span>
        </button>
    `;

    // Action 3: REPLACE GROUNDTRUTH SOURCE
    const replaceBtnHtml = canReplaceSource ? `
        <button class="btn btn-secondary btn-sm" onclick="openReplaceSourceModalFromIdx(${scenarioIdx}, ${geIdx})" style="padding: 0.3rem 0.75rem; font-size: 0.76rem; background: ${isReplaceRecommended ? 'rgba(245, 158, 11, 0.18)' : 'rgba(245, 158, 11, 0.1)'}; color: #f59e0b; border: ${isReplaceRecommended ? '2px solid #f59e0b' : '1px solid rgba(245, 158, 11, 0.4)'}; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 0.35rem;">
            <span>🔄</span> <span>Replace Groundtruth Source</span>
            ${isReplaceRecommended ? '<span class="badge" style="background: rgba(245, 158, 11, 0.25); color: #f59e0b; font-size: 0.64rem; padding: 0.05rem 0.35rem; margin-left: 0.2rem;">💡 AI RECOMMENDED</span>' : ''}
        </button>
    ` : `
        <button class="btn btn-secondary btn-sm" disabled title="${!isGtWeak ? 'Disabled: Golden reference is evaluated as STRONG and authoritative' : (!isEvidencePass ? 'Disabled: No verified grounded alternative cited to replace with' : 'No replacement sources')}" style="padding: 0.3rem 0.75rem; font-size: 0.76rem; opacity: 0.45; cursor: not-allowed; border-radius: 6px; display: inline-flex; align-items: center; gap: 0.35rem;">
            <span>🔄</span> <span>Replace Groundtruth Source</span>
        </button>
    `;

    const recommendationBannerHtml = recommendationText ? `
        <div style="background: ${isReplaceRecommended ? 'rgba(245, 158, 11, 0.08)' : (isAddRecommended ? 'rgba(34, 197, 94, 0.08)' : 'rgba(59, 130, 246, 0.06)')}; border-left: 3px solid ${isReplaceRecommended ? '#f59e0b' : (isAddRecommended ? 'var(--success-color)' : '#60a5fa')}; border-radius: 6px; padding: 0.45rem 0.75rem; font-size: 0.74rem; color: var(--text-main); line-height: 1.35; display: flex; align-items: center; gap: 0.45rem;">
            <span style="font-size: 0.9rem;">💡</span>
            <div><b>AI Recommendation:</b> ${escapeHtml(recommendationText)}</div>
        </div>
    ` : '';

    return `
        <div class="detail-box" style="margin: 0; padding: 0.85rem; background: rgba(59, 130, 246, 0.05); border-radius: 8px; border: 1px solid rgba(96, 165, 250, 0.3); display: flex; flex-direction: column; gap: 0.65rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.4rem;">
                <b style="color: #60a5fa; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.6px; display: flex; align-items: center; gap: 0.35rem;">
                    <span>⚡</span> <span>Action Panel</span>
                </b>
                <span style="font-size: 0.7rem; color: var(--text-sub);">Trace & Benchmark Curation</span>
            </div>
            
            ${recommendationBannerHtml}

            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center;">
                ${inspectBtnHtml}
                ${addBtnHtml}
                ${replaceBtnHtml}
            </div>
        </div>
    `;
}

function openAddSourceModalFromIdx(scenarioIdx, geIdx) {
    const qGroup = window.currentRunScenarioGroups?.[scenarioIdx] || window._currentInspectedQGroup;
    if (!qGroup) return;
    const geResults = (qGroup.results || []).filter(r => r.system !== 'Glean_Web');
    const r = geResults[geIdx || 0] || geResults[0] || window._currentInspectedRecord;
    if (!r) return;
    openSourceCurationModal('ADD', qGroup, r);
}

function openReplaceSourceModalFromIdx(scenarioIdx, geIdx) {
    const qGroup = window.currentRunScenarioGroups?.[scenarioIdx] || window._currentInspectedQGroup;
    if (!qGroup) return;
    const geResults = (qGroup.results || []).filter(r => r.system !== 'Glean_Web');
    const r = geResults[geIdx || 0] || geResults[0] || window._currentInspectedRecord;
    if (!r) return;
    openSourceCurationModal('REPLACE', qGroup, r);
}

function openSourceCurationModal(mode, qGroup, r) {
    currentSourceCurationContext = {
        mode: mode,
        query: qGroup.query,
        ground_truth: qGroup.ground_truth,
        expected_source: qGroup.expected_source || r.expected_source || 'None',
        gt_source_quality: r.gt_source_quality || 'STRONG',
        gt_quality_reasoning: r.gt_quality_reasoning || 'Authoritative golden reference specified.',
        audited_sources: r.audited_sources || [],
        source_urls: r.source_urls || [],
        evidence_quote: r.evidence_quote || '',
        evidence_reasoning: r.evidence_reasoning || '',
        run_id: window.currentResultsRunId || r.run_id || '',
        dataset_name: window.currentSelectedDatasetName || 'google-team-gdrive_dev_golden'
    };

    const modal = document.getElementById('modal-manage-sources');
    if (!modal) return;

    // Header updates
    document.getElementById('manage-sources-icon').textContent = (mode === 'REPLACE') ? '🔄' : '➕';
    document.getElementById('manage-sources-title').textContent = (mode === 'REPLACE') ? 'Replace Ground Truth Golden Reference' : 'Add Grounded Sources to Golden Dataset';
    document.getElementById('manage-sources-subtitle').textContent = (mode === 'REPLACE') 
        ? 'Select which weak or deprecated reference to replace with a verified cited enterprise document' 
        : 'Append verified enterprise document as an authoritative golden reference';

    document.getElementById('manage-sources-query').textContent = qGroup.query;
    document.getElementById('manage-sources-gt').textContent = qGroup.ground_truth || 'None specified';

    // Normalize expected sources list
    let expList = [];
    if (Array.isArray(currentSourceCurationContext.expected_source)) {
        expList = currentSourceCurationContext.expected_source.filter(s => s && String(s).trim() !== 'None');
    } else if (typeof currentSourceCurationContext.expected_source === 'string' && currentSourceCurationContext.expected_source.trim() && currentSourceCurationContext.expected_source !== 'None') {
        expList = currentSourceCurationContext.expected_source.split(' | ').map(s => s.trim()).filter(s => s && s !== 'None');
    }

    // Current Golden Reference box
    const isGtWeak = (currentSourceCurationContext.gt_source_quality === 'WEAK' || currentSourceCurationContext.gt_source_quality === 'DOMAIN_MISMATCH' || currentSourceCurationContext.gt_source_quality === 'INACCESSIBLE');
    const isDomainMismatch = (currentSourceCurationContext.gt_source_quality === 'DOMAIN_MISMATCH' || currentSourceCurationContext.gt_source_quality === 'INACCESSIBLE');
    const badgeEl = document.getElementById('manage-sources-gt-quality-badge');
    if (badgeEl) {
        badgeEl.className = isGtWeak ? 'badge badge-fail' : 'badge badge-pass';
        badgeEl.style.background = isDomainMismatch ? 'rgba(239, 68, 68, 0.2)' : (isGtWeak ? 'rgba(245, 158, 11, 0.2)' : 'rgba(34, 197, 94, 0.15)');
        badgeEl.style.color = isDomainMismatch ? '#ef4444' : (isGtWeak ? '#f59e0b' : 'var(--success-color)');
        badgeEl.textContent = isDomainMismatch ? '🚫 DOMAIN / ACL MISMATCH' : (isGtWeak ? '⚠️ WEAK REFERENCE' : '🛡️ STRONG REFERENCE');
    }

    const expContainer = document.getElementById('manage-sources-current-exp');
    if (expContainer) {
        const auditedList = currentSourceCurationContext.audited_sources || [];
        const getAuditedForUrl = (url) => {
            const clean = String(url || '').trim().toLowerCase();
            const driveId = (clean.match(/id=([a-z0-9_-]+)/i) || clean.match(/\/d\/([a-z0-9_-]+)/i))?.[1];
            return auditedList.find(s => {
                const sUri = String(s.uri || '').toLowerCase();
                if (driveId && sUri.includes(driveId.toLowerCase())) return true;
                return sUri === clean || (sUri && clean.includes(sUri)) || (s.title && clean.includes(s.title.toLowerCase()));
            });
        };

        if (mode === 'REPLACE') {
            expContainer.innerHTML = `
                <div style="font-size: 0.74rem; font-weight: 700; color: var(--text-sub); margin-bottom: 0.45rem; text-transform: uppercase; letter-spacing: 0.5px;">
                    1. Select Which Golden Reference to Replace & Inspect Why:
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.55rem;">
                    ${expList.map((expUrl, idx) => {
                        const audit = getAuditedForUrl(expUrl);
                        const isAcc = audit ? Boolean(audit.accessible) : true;
                        const isStrong = audit ? Boolean(audit.is_strong) : (!isGtWeak);
                        const isWeak = audit ? Boolean(audit.is_weak) : isGtWeak;
                        const docReason = audit?.reasoning || currentSourceCurationContext.gt_quality_reasoning || 'Evaluated golden dataset quality.';
                        const docTitle = audit?.title || expUrl.split('/').pop() || expUrl;
                        const isLink = expUrl.startsWith('http://') || expUrl.startsWith('https://');

                        return `
                            <label style="display: flex; flex-direction: column; gap: 0.4rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.65rem 0.85rem; cursor: pointer; transition: border-color 0.15s;">
                                <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.65rem; flex-wrap: wrap;">
                                    <div style="display: flex; align-items: center; gap: 0.5rem; flex: 1; min-width: 200px;">
                                        <input type="radio" name="source_curation_old_target" value="${escapeHtml(expUrl)}" ${idx === 0 ? 'checked' : ''} style="margin: 0; cursor: pointer;">
                                        <strong style="font-size: 0.82rem; color: var(--text-main); font-family: monospace;">${escapeHtml(docTitle)}</strong>
                                    </div>
                                    <div style="display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap;">
                                        ${audit?.connector_used ? `
                                            <span class="badge" style="background: rgba(99, 102, 241, 0.15); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.3); font-size: 0.66rem; padding: 0.1rem 0.4rem;">
                                                🔌 ${escapeHtml(audit.connector_used)}
                                            </span>
                                        ` : ''}
                                        <span class="badge ${isStrong ? 'badge-pass' : 'badge-fail'}" style="${isWeak ? 'background: rgba(245, 158, 11, 0.2); color: #f59e0b;' : ''}; font-size: 0.66rem; padding: 0.1rem 0.4rem;">
                                            ${isStrong ? '🛡️ STRONG REFERENCE' : (isWeak ? '⚠️ WEAK REFERENCE' : '🚫 INACCESSIBLE')}
                                        </span>
                                        ${isLink ? `
                                            <a href="${escapeHtml(expUrl)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" onclick="event.stopPropagation();" style="font-size: 0.7rem; padding: 0.15rem 0.45rem; text-decoration: none; color: #60a5fa; border: 1px solid rgba(96,165,250,0.4); border-radius: 4px; background: rgba(96,165,250,0.08); display: inline-flex; align-items: center; gap: 0.2rem;">
                                                <span>📄</span> <span>Open Document ↗</span>
                                            </a>
                                        ` : ''}
                                    </div>
                                </div>
                                <div style="font-size: 0.75rem; color: var(--text-sub); word-break: break-all; font-family: monospace;">
                                    ${escapeHtml(expUrl)}
                                </div>
                                <div style="font-size: 0.74rem; color: var(--text-sub); font-style: italic; border-top: 1px solid var(--border-color); padding-top: 0.35rem; line-height: 1.35;">
                                    <b>Audit Reason:</b> ${escapeHtml(docReason)}
                                </div>
                            </label>
                        `;
                    }).join('')}
                </div>
            `;
        } else {
            // Mode: ADD (display current list)
            expContainer.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 0.45rem;">
                    ${expList.map(expUrl => {
                        const isLink = expUrl.startsWith('http://') || expUrl.startsWith('https://');
                        return `
                            <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.5rem 0.75rem;">
                                <span style="font-family: monospace; font-size: 0.78rem; color: var(--text-main); word-break: break-all;">${escapeHtml(expUrl)}</span>
                                ${isLink ? `
                                    <a href="${escapeHtml(expUrl)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" style="font-size: 0.7rem; padding: 0.15rem 0.45rem; text-decoration: none; color: #60a5fa; border: 1px solid rgba(96,165,250,0.4); border-radius: 4px; background: rgba(96,165,250,0.08); display: inline-flex; align-items: center; gap: 0.2rem; flex-shrink: 0;">
                                        <span>📄</span> <span>Open Document ↗</span>
                                    </a>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
    }
    const reasonEl = document.getElementById('manage-sources-gt-quality-reason');
    if (reasonEl) {
        reasonEl.style.display = (mode === 'REPLACE') ? 'none' : 'block';
        reasonEl.textContent = currentSourceCurationContext.gt_quality_reasoning;
    }

    // Candidate Cited Sources Container
    const candContainer = document.getElementById('manage-sources-candidates-container');
    candContainer.innerHTML = '';

    let citedList = [];
    if (Array.isArray(r.source_urls)) {
        citedList = r.source_urls.filter(s => s && String(s).trim() !== 'None');
    } else if (typeof r.source_urls === 'string' && r.source_urls.trim() && r.source_urls !== 'None') {
        citedList = r.source_urls.split(' | ').map(s => s.trim()).filter(s => s && s !== 'None');
    }

    if (citedList.length === 0) {
        candContainer.innerHTML = '<div style="color: var(--text-sub); font-style: italic; padding: 0.5rem;">No cited sources found in response.</div>';
    } else {
        const retDocs = Array.isArray(r.retrieved_documents) ? r.retrieved_documents : [];
        citedList.forEach((srcUrl, idx) => {
            const inputType = (mode === 'REPLACE') ? 'radio' : 'checkbox';
            const isChecked = (idx === 0) ? 'checked' : '';
            const isLink = srcUrl.startsWith('http://') || srcUrl.startsWith('https://');
            const openDocBtn = isLink ? `
                <a href="${escapeHtml(srcUrl)}" target="_blank" rel="noopener" class="btn btn-secondary btn-sm" onclick="event.stopPropagation();" style="font-size: 0.72rem; padding: 0.2rem 0.55rem; color: #60a5fa; text-decoration: none; display: inline-flex; align-items: center; gap: 0.25rem; border: 1px solid rgba(96, 165, 250, 0.4); border-radius: 4px; background: rgba(96, 165, 250, 0.08); flex-shrink: 0;">
                    <span>📄</span> <span>Open Document ↗</span>
                </a>
            ` : '';

            // Look up document-specific title and snippet
            const srcClean = String(srcUrl || '').toLowerCase().trim();
            const srcDriveId = (srcClean.match(/id=([a-z0-9_-]+)/i) || srcClean.match(/\/d\/([a-z0-9_-]+)/i))?.[1];

            const matchedDoc = retDocs.find(d => {
                const dUri = String(d.uri || d.link || '').toLowerCase();
                const dId = String(d.id || d.document_id || '').toLowerCase();
                if (srcDriveId && (dUri.includes(srcDriveId.toLowerCase()) || dId.includes(srcDriveId.toLowerCase()))) return true;
                return dUri === srcClean || (dUri && srcClean.includes(dUri)) || dId === srcClean;
            }) || retDocs[idx] || {};

            const docTitle = matchedDoc.title || (srcDriveId ? `Document (${srcDriveId.substring(0, 10)}...)` : srcUrl.split('/').pop() || 'Cited Document');
            const rawSnippet = matchedDoc.snippets || matchedDoc.snippet || matchedDoc.full_content || '';
            const cleanSnippet = (typeof stripHtmlTags === 'function' ? stripHtmlTags(rawSnippet) : String(rawSnippet)).trim();

            const rowHtml = `
                <label style="display: flex; gap: 0.65rem; align-items: flex-start; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 6px; padding: 0.75rem 0.85rem; cursor: pointer; transition: border-color 0.15s;">
                    <input type="${inputType}" name="source_curation_candidate" value="${escapeHtml(srcUrl)}" ${isChecked} style="margin-top: 0.3rem;">
                    <div style="flex: 1; word-break: break-all;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; gap: 0.5rem; flex-wrap: wrap;">
                            <div style="display: flex; align-items: center; gap: 0.4rem;">
                                <span style="font-size: 1rem;">📄</span>
                                <b style="font-size: 0.84rem; color: var(--text-main);">${escapeHtml(docTitle)}</b>
                            </div>
                            <div style="display: flex; align-items: center; gap: 0.45rem;">
                                ${openDocBtn}
                                <span class="badge badge-pass" style="font-size: 0.68rem; padding: 0.1rem 0.4rem;">✅ EVIDENCE GROUNDED</span>
                            </div>
                        </div>
                        <div style="font-family: monospace; font-size: 0.74rem; color: var(--accent-primary); margin-bottom: 0.35rem; word-break: break-all;">
                            ${escapeHtml(srcUrl)}
                        </div>
                        ${cleanSnippet ? `
                            <div style="font-size: 0.74rem; color: var(--text-sub); line-height: 1.45; background: rgba(59, 130, 246, 0.06); padding: 0.35rem 0.55rem; border-left: 2px solid #3b82f6; border-radius: 3px; font-family: monospace; max-height: 80px; overflow-y: auto;">
                                "${escapeHtml(cleanSnippet.substring(0, 250))}${cleanSnippet.length > 250 ? '...' : ''}"
                            </div>
                        ` : `
                            <div style="font-size: 0.76rem; color: var(--text-sub); line-height: 1.4;">
                                ${escapeHtml(r.evidence_reasoning || 'Verified by grounding judge to contain necessary facts supporting candidate response.')}
                            </div>
                        `}
                    </div>
                </label>
            `;
            candContainer.innerHTML += rowHtml;
        });
    }

    // Submit button label
    const submitBtnLabel = document.getElementById('manage-sources-btn-label');
    if (submitBtnLabel) {
        submitBtnLabel.textContent = (mode === 'REPLACE') ? '🔄 Replace Golden Reference' : '➕ Add Selected Source(s) to Dataset';
    }

    modal.style.display = 'flex';
}

function closeManageSourcesModal() {
    const modal = document.getElementById('modal-manage-sources');
    if (modal) modal.style.display = 'none';
    currentSourceCurationContext = null;
}

async function submitSourceCurationAction() {
    if (!currentSourceCurationContext) return;
    const ctx = currentSourceCurationContext;
    const selectedInputs = Array.from(document.querySelectorAll('input[name="source_curation_candidate"]:checked'));

    if (selectedInputs.length === 0) {
        if (typeof window.showToast === 'function') {
            window.showToast('Please select at least one source to apply.', 'error');
        } else {
            alert('Please select at least one source.');
        }
        return;
    }

    const selectedUrls = selectedInputs.map(i => i.value);
    const submitBtn = document.getElementById('btn-manage-sources-submit');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
    }

    try {
        if (ctx.mode === 'REPLACE') {
            const oldTargetInput = document.querySelector('input[name="source_curation_old_target"]:checked') || document.querySelector('input[name="source_curation_old_target"]');
            const oldSource = oldTargetInput ? oldTargetInput.value : ((Array.isArray(ctx.expected_source) ? ctx.expected_source[0] : ctx.expected_source) || '');
            const newSource = selectedUrls[0];
            const resp = await fetch('/api/datasets/replace_source', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dataset_name: ctx.dataset_name,
                    query: ctx.query,
                    old_source_url: oldSource,
                    new_source_url: newSource,
                    run_id: ctx.run_id
                })
            });
            const data = await resp.json();
            if (data.status === 'success') {
                if (typeof window.showToast === 'function') {
                    window.showToast(data.message || 'Successfully replaced golden reference!', 'success');
                }
                closeManageSourcesModal();
                if (typeof loadMasterComparison === 'function') loadMasterComparison();
            } else {
                throw new Error(data.message || 'Failed to replace golden reference.');
            }
        } else {
            for (const sUrl of selectedUrls) {
                const resp = await fetch('/api/datasets/add_source', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        dataset_name: ctx.dataset_name,
                        query: ctx.query,
                        new_source_url: sUrl,
                        run_id: ctx.run_id
                    })
                });
                const data = await resp.json();
                if (data.status !== 'success') {
                    throw new Error(data.message || 'Failed to add source to dataset.');
                }
            }
            if (typeof window.showToast === 'function') {
                window.showToast('Successfully added cited sources to dataset!', 'success');
            }
            closeManageSourcesModal();
            if (typeof loadMasterComparison === 'function') loadMasterComparison();
        }
    } catch (err) {
        if (typeof window.showToast === 'function') {
            window.showToast(err.message || 'Error executing source curation action.', 'error');
        } else {
            alert(err.message || 'Error executing source curation action.');
        }
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = (ctx.mode === 'REPLACE') ? '🔄 Replace Golden Reference' : '➕ Add to Golden Dataset';
        }
    }
}
