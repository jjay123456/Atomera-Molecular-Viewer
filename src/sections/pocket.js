/**
 * POCKET Section
 * Binding site definition
 */

import { getState, setState, setStatusMessage } from '../state.js';
import { highlightPocket } from '../layout/viewer.js';
import { refreshSection } from '../layout/section-panel.js';

/**
 * Render POCKET section
 */
export function renderPocketSection(container, state) {
    const { pockets, selectedPocket } = state;

    container.innerHTML = `
    <div class="section-header">BINDING POCKET DEFINITION</div>
    <div class="section-content">
      <!-- Detection Action -->
      <div class="form-group">
        <button class="btn btn-primary" id="detect-pockets-btn" ${pockets.length > 0 ? 'disabled' : ''}>
          ${pockets.length > 0 ? 'POCKETS DETECTED' : 'DETECT POCKETS (P2Rank)'}
        </button>
      </div>
      
      <!-- Pocket List -->
      ${pockets.length > 0 ? renderPocketList(pockets, selectedPocket) : ''}
      
      <!-- Selected Pocket Info -->
      ${selectedPocket ? renderPocketInfo(selectedPocket) : ''}
    </div>
  `;

    // Attach event handlers
    attachPocketHandlers(container);
}

/**
 * Render pocket list
 */
function renderPocketList(pockets, selectedPocket) {
    return `
    <div class="form-group mt-md">
      <div class="form-label">Detected Pockets (click to select)</div>
      <div class="item-list" id="pocket-list">
        ${pockets.map((pocket, index) => `
          <div class="list-item ${selectedPocket?.id === pocket.id ? 'selected' : ''}" 
               data-pocket-index="${index}">
            <span class="list-item-primary">${pocket.id}</span>
            <span class="list-item-secondary">Score: ${pocket.score.toFixed(2)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Render selected pocket info
 */
function renderPocketInfo(pocket) {
    return `
    <div class="info-grid mt-md">
      <div class="info-item">
        <span class="info-label">Pocket ID</span>
        <span class="info-value">${pocket.id}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Rank</span>
        <span class="info-value">#${pocket.rank}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Volume</span>
        <span class="info-value">${pocket.volume.toFixed(1)} Å³</span>
      </div>
      <div class="info-item">
        <span class="info-label">Residues</span>
        <span class="info-value">${pocket.residues.length}</span>
      </div>
    </div>
  `;
}

/**
 * Attach event handlers
 */
function attachPocketHandlers(container) {
    // Detect pockets button
    const detectBtn = container.querySelector('#detect-pockets-btn');
    if (detectBtn) {
        detectBtn.addEventListener('click', handleDetectPockets);
    }

    // Pocket selection
    const pocketList = container.querySelector('#pocket-list');
    if (pocketList) {
        pocketList.addEventListener('click', handlePocketSelection);
    }
}

/**
 * Handle pocket detection (stub)
 */
async function handleDetectPockets() {
    setStatusMessage('Detecting binding pockets via P2Rank...');

    // Simulate pocket detection
    await simulateDelay(1200);

    // Generate mock pockets
    const mockPockets = [
        {
            id: 'Pocket-1',
            rank: 1,
            score: 0.92,
            volume: 847.3,
            residues: generateMockResidues(12)
        },
        {
            id: 'Pocket-2',
            rank: 2,
            score: 0.78,
            volume: 623.1,
            residues: generateMockResidues(9)
        },
        {
            id: 'Pocket-3',
            rank: 3,
            score: 0.65,
            volume: 412.8,
            residues: generateMockResidues(7)
        }
    ];

    setState({
        pockets: mockPockets,
        statusMessage: `Detected ${mockPockets.length} binding pockets`
    });

    refreshSection();
}

/**
 * Handle pocket selection
 */
function handlePocketSelection(event) {
    const listItem = event.target.closest('.list-item');
    if (!listItem) return;

    const index = parseInt(listItem.dataset.pocketIndex, 10);
    const state = getState();
    const pocket = state.pockets[index];

    if (pocket) {
        setState({
            selectedPocket: pocket,
            statusMessage: `Selected ${pocket.id}`
        });

        // Highlight in viewer
        highlightPocket(pocket);

        refreshSection();
    }
}

/**
 * Generate mock residues for a pocket
 */
function generateMockResidues(count) {
    const residues = [];
    const baseResno = Math.floor(Math.random() * 100) + 50;

    for (let i = 0; i < count; i++) {
        residues.push({
            resno: baseResno + i * 2,
            chainname: 'A',
            resname: ['ALA', 'VAL', 'LEU', 'ILE', 'PHE', 'TYR', 'TRP'][Math.floor(Math.random() * 7)]
        });
    }

    return residues;
}

/**
 * Utility: simulate async delay
 */
function simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
