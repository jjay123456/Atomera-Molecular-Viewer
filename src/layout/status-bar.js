/**
 * Status Bar Component
 * Displays workflow state at a glance
 */

import { getState, subscribe } from '../state.js';

let statusElements = {};

/**
 * Initialize status bar
 */
export function initStatusBar() {
    statusElements = {
        target: document.getElementById('status-target'),
        pocket: document.getElementById('status-pocket'),
        job: document.getElementById('status-job'),
        scale: document.getElementById('status-scale'),
        message: document.getElementById('status-message')
    };

    // Subscribe to state changes
    subscribe(updateStatusBar);

    // Initial render
    updateStatusBar(getState());
}

/**
 * Update status bar based on state
 */
function updateStatusBar(state) {
    const { target, selectedPocket, isScreeningActive, screeningProgress, statusMessage } = state;

    // Target status
    if (statusElements.target) {
        statusElements.target.textContent = target
            ? `TARGET: ${target.name || 'Loaded'}`
            : 'TARGET: —';
    }

    // Pocket status
    if (statusElements.pocket) {
        statusElements.pocket.textContent = selectedPocket
            ? `POCKET: ${selectedPocket.id || 'Selected'}`
            : 'POCKET: —';
    }

    // Job status
    if (statusElements.job) {
        if (isScreeningActive) {
            statusElements.job.textContent = 'JOB: running';
        } else if (screeningProgress?.jobId) {
            statusElements.job.textContent = 'JOB: complete';
        } else {
            statusElements.job.textContent = 'JOB: idle';
        }
    }

    // Worker scale
    if (statusElements.scale) {
        statusElements.scale.textContent = `WORKERS: ${screeningProgress?.workers || 0}`;
    }

    // Status message
    if (statusElements.message) {
        statusElements.message.textContent = statusMessage || 'Ready';
    }
}
