/**
 * PREP Section
 * Structural refinement controls
 */

import { getState, setState, setStatusMessage } from '../state.js';
import { refreshSection } from '../layout/section-panel.js';

let refinementStatus = {
    geometry: 'pending',
    coordinates: 'pending'
};

/**
 * Render PREP section
 */
export function renderPrepSection(container, state) {
    const { isPrepComplete, target } = state;

    container.innerHTML = `
    <div class="section-header">STRUCTURAL REFINEMENT</div>
    <div class="section-content">
      <!-- Refinement Status -->
      <div class="form-group">
        <div class="form-label">FastFold Refinement Status</div>
        <div class="item-list">
          <div class="list-item">
            <span class="list-item-primary">Geometry Cleanup</span>
            ${renderStatusIndicator(refinementStatus.geometry)}
          </div>
          <div class="list-item">
            <span class="list-item-primary">Coordinate Consistency</span>
            ${renderStatusIndicator(refinementStatus.coordinates)}
          </div>
        </div>
      </div>
      
      <!-- Validation Messages -->
      ${isPrepComplete ? renderValidationMessages() : ''}
      
      <!-- Action Button -->
      <div class="form-row mt-md">
        <button class="btn btn-primary" id="apply-refinement-btn" ${isPrepComplete ? 'disabled' : ''}>
          ${isPrepComplete ? 'REFINEMENT COMPLETE' : 'APPLY REFINEMENT'}
        </button>
      </div>
    </div>
  `;

    // Attach event handlers
    attachPrepHandlers(container);
}

/**
 * Render status indicator
 */
function renderStatusIndicator(status) {
    let dotClass = '';
    let label = '';

    switch (status) {
        case 'pending':
            dotClass = '';
            label = 'Pending';
            break;
        case 'running':
            dotClass = 'active';
            label = 'Running...';
            break;
        case 'complete':
            dotClass = 'complete';
            label = 'Complete';
            break;
        case 'error':
            dotClass = 'error';
            label = 'Error';
            break;
    }

    return `
    <span class="status-indicator">
      <span class="status-dot ${dotClass}"></span>
      ${label}
    </span>
  `;
}

/**
 * Render validation messages
 */
function renderValidationMessages() {
    return `
    <div class="form-group mt-md">
      <div class="form-label">Validation Results</div>
      <div class="item-list">
        <div class="list-item">
          <span class="list-item-primary" style="color: var(--success);">✓ Structure validated</span>
        </div>
        <div class="list-item">
          <span class="list-item-primary" style="color: var(--text-muted);">No warnings</span>
        </div>
      </div>
    </div>
  `;
}

/**
 * Attach event handlers
 */
function attachPrepHandlers(container) {
    const refineBtn = container.querySelector('#apply-refinement-btn');
    if (refineBtn) {
        refineBtn.addEventListener('click', handleApplyRefinement);
    }
}

/**
 * Handle refinement application (stub)
 */
async function handleApplyRefinement() {
    setStatusMessage('Applying structural refinement...');

    // Simulate refinement steps
    refinementStatus.geometry = 'running';
    refreshSection();

    await simulateDelay(800);
    refinementStatus.geometry = 'complete';
    refinementStatus.coordinates = 'running';
    refreshSection();

    await simulateDelay(600);
    refinementStatus.coordinates = 'complete';

    // Update state
    setState({
        isPrepComplete: true,
        statusMessage: 'Refinement complete'
    });

    refreshSection();
}

/**
 * Utility: simulate async delay
 */
function simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
