/**
 * INTERACTIONS Section
 * Molecular binding validation
 */

import { getState, setState } from '../state.js';
import { showInteractions } from '../layout/viewer.js';
import { refreshSection } from '../layout/section-panel.js';

let showOverlays = true;

/**
 * Render INTERACTIONS section
 */
export function renderInteractionsSection(container, state) {
    const { selectedHit, interactions } = state;

    if (!selectedHit || !interactions) {
        container.innerHTML = `
      <div class="section-header">MOLECULAR INTERACTIONS</div>
      <div class="section-content">
        <div class="section-empty">
          <div class="section-empty-text">
            Select a hit to inspect molecular interactions.
          </div>
        </div>
      </div>
    `;
        return;
    }

    container.innerHTML = `
    <div class="section-header">MOLECULAR INTERACTIONS</div>
    <div class="section-content">
      <!-- Toggle Overlays -->
      <div class="form-group">
        <label class="radio-option">
          <input type="checkbox" id="toggle-overlays" ${showOverlays ? 'checked' : ''}>
          Show interaction markers in 3D view
        </label>
      </div>
      
      <!-- Hydrogen Bonds -->
      <div class="form-group mt-md">
        <div class="form-label">Hydrogen Bonds (${interactions.hBonds?.length || 0})</div>
        ${renderHBondsList(interactions.hBonds)}
      </div>
      
      <!-- Contact Residues -->
      <div class="form-group mt-md">
        <div class="form-label">Contact Residues (${interactions.contacts?.length || 0})</div>
        ${renderContactsList(interactions.contacts)}
      </div>
    </div>
  `;

    // Attach event handlers
    attachInteractionHandlers(container);

    // Update viewer overlays
    showInteractions(interactions, showOverlays);
}

/**
 * Render hydrogen bonds list
 */
function renderHBondsList(hBonds) {
    if (!hBonds || hBonds.length === 0) {
        return '<div style="color: var(--text-muted); font-style: italic;">No hydrogen bonds detected</div>';
    }

    return `
    <div class="item-list">
      ${hBonds.map(bond => `
        <div class="list-item">
          <div>
            <span class="list-item-primary">${bond.residue}:${bond.chain}</span>
            <span class="list-item-secondary" style="margin-left: 8px; text-transform: capitalize;">${bond.type || 'H-bond'}</span>
          </div>
          <span class="list-item-secondary">${bond.distance} Å</span>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Render contacts list
 */
function renderContactsList(contacts) {
    if (!contacts || contacts.length === 0) {
        return '<div style="color: var(--text-muted); font-style: italic;">No contacts detected</div>';
    }

    return `
    <div class="item-list">
      ${contacts.map(contact => `
        <div class="list-item">
          <span class="list-item-primary">${contact.residue}:${contact.chain}</span>
          <span class="list-item-secondary">${contact.distance} Å</span>
        </div>
      `).join('')}
    </div>
  `;
}

/**
 * Attach event handlers
 */
function attachInteractionHandlers(container) {
    const toggleCheckbox = container.querySelector('#toggle-overlays');
    if (toggleCheckbox) {
        toggleCheckbox.addEventListener('change', handleToggleOverlays);
    }
}

/**
 * Handle overlay toggle
 */
function handleToggleOverlays(event) {
    showOverlays = event.target.checked;

    const state = getState();
    showInteractions(state.interactions, showOverlays);
}
