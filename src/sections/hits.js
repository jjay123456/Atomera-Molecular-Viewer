/**
 * HITS Section
 * Scoring output and hit list
 */

import { getState, setState, setStatusMessage } from '../state.js';
import { displayLigand } from '../layout/viewer.js';
import { refreshSection } from '../layout/section-panel.js';

/**
 * Render HITS section
 */
export function renderHitsSection(container, state) {
    const { hits, selectedHit, isScreeningActive } = state;

    container.innerHTML = `
    <div class="section-header">HIT SCORING & RANKING</div>
    <div class="section-content">
      ${isScreeningActive
            ? renderScreeningStatus()
            : hits.length > 0
                ? renderHitList(hits, selectedHit)
                : renderEmptyHits()
        }
    </div>
  `;

    // Attach event handlers
    if (hits.length > 0) {
        attachHitsHandlers(container);
    }
}

/**
 * Render screening in progress status
 */
function renderScreeningStatus() {
    return `
    <div class="section-empty">
      <div class="status-indicator">
        <span class="status-dot active"></span>
        Screening in progress...
      </div>
      <div class="section-empty-text mt-md">
        Hits will appear here as they are discovered.
      </div>
    </div>
  `;
}

/**
 * Render empty hits state
 */
function renderEmptyHits() {
    return `
    <div class="section-empty">
      <div class="section-empty-text">
        No hits available. Run a screen to generate results.
      </div>
    </div>
  `;
}

/**
 * Render hit list
 */
function renderHitList(hits, selectedHit) {
    return `
    <div class="form-group">
      <div class="form-label">Ranked Hits (${hits.length} compounds)</div>
      <div class="item-list" id="hit-list" style="max-height: 200px;">
        ${hits.map((hit, index) => `
          <div class="list-item ${selectedHit?.id === hit.id ? 'selected' : ''}" 
               data-hit-index="${index}">
            <div>
              <span class="list-item-primary">${hit.id}</span>
              <span class="list-item-secondary" style="margin-left: 8px; color: ${getConfidenceColor(hit.confidence)}">${hit.confidence}</span>
            </div>
            <span class="list-item-secondary">Score: ${hit.score}</span>
          </div>
        `).join('')}
      </div>
    </div>
    
    ${selectedHit ? renderSelectedHitInfo(selectedHit) : '<div class="mt-md" style="color: var(--text-muted);">Click a hit to view its docked pose</div>'}
  `;
}

/**
 * Get color for confidence level
 */
function getConfidenceColor(confidence) {
    switch (confidence) {
        case 'High': return 'var(--success)';
        case 'Medium': return 'var(--warning)';
        case 'Low': return 'var(--text-muted)';
        default: return 'var(--text-muted)';
    }
}

/**
 * Render selected hit info
 */
function renderSelectedHitInfo(hit) {
    return `
    <div class="info-grid mt-md">
      <div class="info-item">
        <span class="info-label">Ligand ID</span>
        <span class="info-value">${hit.id}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Docking Score</span>
        <span class="info-value">${hit.score} kcal/mol</span>
      </div>
      <div class="info-item">
        <span class="info-label">Confidence</span>
        <span class="info-value" style="color: ${getConfidenceColor(hit.confidence)}">${hit.confidence}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Rank</span>
        <span class="info-value">#${getState().hits.findIndex(h => h.id === hit.id) + 1}</span>
      </div>
    </div>
  `;
}

/**
 * Attach event handlers
 */
function attachHitsHandlers(container) {
    const hitList = container.querySelector('#hit-list');
    if (hitList) {
        hitList.addEventListener('click', handleHitSelection);
    }
}

/**
 * Handle hit selection
 */
function handleHitSelection(event) {
    const listItem = event.target.closest('.list-item');
    if (!listItem) return;

    const index = parseInt(listItem.dataset.hitIndex, 10);
    const state = getState();
    const hit = state.hits[index];

    if (hit) {
        setState({
            selectedHit: hit,
            // Generate mock interactions when selecting a hit
            interactions: generateMockInteractions(),
            statusMessage: `Selected ${hit.id}`
        });

        // Display ligand in viewer (mock)
        displayLigand(hit);

        refreshSection();
    }
}

/**
 * Generate mock interactions for a selected hit
 */
function generateMockInteractions() {
    const hBonds = [];
    const contacts = [];

    // Generate 2-5 hydrogen bonds
    const hBondCount = Math.floor(Math.random() * 4) + 2;
    for (let i = 0; i < hBondCount; i++) {
        hBonds.push({
            residue: ['SER', 'THR', 'TYR', 'ASN', 'GLN'][Math.floor(Math.random() * 5)] + Math.floor(Math.random() * 200 + 50),
            chain: 'A',
            distance: (Math.random() * 0.8 + 2.5).toFixed(2),
            type: Math.random() > 0.5 ? 'donor' : 'acceptor'
        });
    }

    // Generate 3-8 contacts
    const contactCount = Math.floor(Math.random() * 6) + 3;
    for (let i = 0; i < contactCount; i++) {
        contacts.push({
            residue: ['VAL', 'LEU', 'ILE', 'PHE', 'ALA', 'MET'][Math.floor(Math.random() * 6)] + Math.floor(Math.random() * 200 + 50),
            chain: 'A',
            distance: (Math.random() * 1.5 + 3.0).toFixed(2)
        });
    }

    return { hBonds, contacts };
}
