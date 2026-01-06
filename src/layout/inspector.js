/**
 * Inspector Panel Component
 * Read-only context panel that auto-updates on selection
 */

import { getState, subscribe } from '../state.js';

let inspectorElement = null;

/**
 * Initialize inspector panel
 */
export function initInspector() {
    inspectorElement = document.getElementById('inspector-content');
    if (!inspectorElement) return;

    // Subscribe to state changes
    subscribe(updateInspector);

    // Initial render
    updateInspector(getState());
}

/**
 * Update inspector based on state
 */
function updateInspector(state) {
    if (!inspectorElement) return;

    const { activeSection, target, selectedPocket, selectedHit, interactions } = state;

    let content = '';

    // Build inspector content based on current context
    switch (activeSection) {
        case 'target':
        case 'prep':
            content = renderProteinInspector(target);
            break;
        case 'pocket':
            content = renderPocketInspector(target, selectedPocket);
            break;
        case 'screen':
            content = renderScreeningInspector(target, selectedPocket, state.screeningProgress);
            break;
        case 'hits':
            content = renderHitInspector(selectedHit);
            break;
        case 'interactions':
            content = renderInteractionInspector(selectedHit, interactions);
            break;
        default:
            content = '<div class="inspector-empty">No selection</div>';
    }

    inspectorElement.innerHTML = content;
}

/**
 * Render protein info in inspector
 */
function renderProteinInspector(target) {
    if (!target) {
        return '<div class="inspector-empty">No protein loaded</div>';
    }

    const flagClass = target.moleculeClass?.flagged ? 'warning' : '';

    return `
    <div class="inspector-section">
      <div class="inspector-section-title">Protein</div>
      <div class="inspector-row">
        <span class="inspector-key">Name</span>
        <span class="inspector-value">${target.name || '—'}</span>
      </div>
      <div class="inspector-row">
        <span class="inspector-key">Residues</span>
        <span class="inspector-value">${target.residueCount || '—'}</span>
      </div>
      <div class="inspector-row">
        <span class="inspector-key">Chains</span>
        <span class="inspector-value">${target.chainCount || '—'}</span>
      </div>
      <div class="inspector-row">
        <span class="inspector-key">Atoms</span>
        <span class="inspector-value">${target.atomCount || '—'}</span>
      </div>
    </div>
    <div class="inspector-section">
      <div class="inspector-section-title">Classification</div>
      <div class="inspector-row">
        <span class="inspector-key">Type</span>
        <span class="inspector-value ${flagClass}">${target.moleculeClass?.label || '—'}</span>
      </div>
    </div>
  `;
}

/**
 * Render pocket info in inspector
 */
function renderPocketInspector(target, pocket) {
    let content = renderProteinInspector(target);

    if (pocket) {
        content += `
      <div class="inspector-section">
        <div class="inspector-section-title">Selected Pocket</div>
        <div class="inspector-row">
          <span class="inspector-key">ID</span>
          <span class="inspector-value">${pocket.id || '—'}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-key">Rank</span>
          <span class="inspector-value">#${pocket.rank || '—'}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-key">Volume</span>
          <span class="inspector-value">${pocket.volume ? pocket.volume.toFixed(1) + ' Å³' : '—'}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-key">Residues</span>
          <span class="inspector-value">${pocket.residues?.length || '—'}</span>
        </div>
      </div>
    `;
    }

    return content;
}

/**
 * Render screening info in inspector
 */
function renderScreeningInspector(target, pocket, progress) {
    let content = renderPocketInspector(target, pocket);

    if (progress && progress.jobId) {
        const pct = progress.total > 0
            ? ((progress.processed / progress.total) * 100).toFixed(1)
            : 0;

        content += `
      <div class="inspector-section">
        <div class="inspector-section-title">Screening Job</div>
        <div class="inspector-row">
          <span class="inspector-key">Job ID</span>
          <span class="inspector-value">${progress.jobId}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-key">Progress</span>
          <span class="inspector-value">${pct}%</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-key">Workers</span>
          <span class="inspector-value">${progress.workers}</span>
        </div>
      </div>
    `;
    }

    return content;
}

/**
 * Render hit info in inspector
 */
function renderHitInspector(hit) {
    if (!hit) {
        return '<div class="inspector-empty">No hit selected</div>';
    }

    return `
    <div class="inspector-section">
      <div class="inspector-section-title">Selected Hit</div>
      <div class="inspector-row">
        <span class="inspector-key">Ligand ID</span>
        <span class="inspector-value">${hit.id || '—'}</span>
      </div>
      <div class="inspector-row">
        <span class="inspector-key">Score</span>
        <span class="inspector-value">${hit.score?.toFixed(2) || '—'}</span>
      </div>
      <div class="inspector-row">
        <span class="inspector-key">Confidence</span>
        <span class="inspector-value">${hit.confidence || '—'}</span>
      </div>
    </div>
  `;
}

/**
 * Render interaction info in inspector
 */
function renderInteractionInspector(hit, interactions) {
    let content = renderHitInspector(hit);

    if (interactions) {
        content += `
      <div class="inspector-section">
        <div class="inspector-section-title">Interactions</div>
        <div class="inspector-row">
          <span class="inspector-key">H-Bonds</span>
          <span class="inspector-value">${interactions.hBonds?.length || 0}</span>
        </div>
        <div class="inspector-row">
          <span class="inspector-key">Contacts</span>
          <span class="inspector-value">${interactions.contacts?.length || 0}</span>
        </div>
      </div>
    `;

        // Show individual bonds
        if (interactions.hBonds && interactions.hBonds.length > 0) {
            content += `
        <div class="inspector-section">
          <div class="inspector-section-title">H-Bond Details</div>
          ${interactions.hBonds.slice(0, 5).map(bond => `
            <div class="inspector-row">
              <span class="inspector-key">${bond.residue}:${bond.chain}</span>
              <span class="inspector-value">${bond.distance?.toFixed(2) || '—'} Å</span>
            </div>
          `).join('')}
        </div>
      `;
        }
    }

    return content;
}
