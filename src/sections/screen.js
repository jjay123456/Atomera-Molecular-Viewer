/**
 * SCREEN Section
 * High-throughput screening controls
 */

import { getState, setState, setStatusMessage } from '../state.js';
import { refreshSection } from '../layout/section-panel.js';

let selectedScale = '10000';
let screeningInterval = null;

/**
 * Render SCREEN section
 */
export function renderScreenSection(container, state) {
    const { isScreeningActive, screeningProgress, hits } = state;

    container.innerHTML = `
    <div class="section-header">HIGH-THROUGHPUT SCREENING</div>
    <div class="section-content">
      <!-- Screen Size Selector -->
      <div class="form-group">
        <div class="form-label">Library Size</div>
        <div class="radio-group">
          <label class="radio-option">
            <input type="radio" name="screen-size" value="10000" ${selectedScale === '10000' ? 'checked' : ''} ${isScreeningActive ? 'disabled' : ''}>
            10,000 molecules
          </label>
          <label class="radio-option">
            <input type="radio" name="screen-size" value="100000" ${selectedScale === '100000' ? 'checked' : ''} ${isScreeningActive ? 'disabled' : ''}>
            100,000 molecules
          </label>
          <label class="radio-option">
            <input type="radio" name="screen-size" value="1000000" ${selectedScale === '1000000' ? 'checked' : ''} ${isScreeningActive ? 'disabled' : ''}>
            1,000,000+ molecules
          </label>
        </div>
      </div>
      
      <!-- Controls -->
      <div class="form-row mt-md">
        ${isScreeningActive
            ? '<button class="btn btn-danger" id="cancel-screening-btn">CANCEL SCREENING</button>'
            : `<button class="btn btn-primary" id="start-screening-btn" ${hits.length > 0 ? 'disabled' : ''}>
              ${hits.length > 0 ? 'SCREENING COMPLETE' : 'START SCREENING'}
            </button>`
        }
      </div>
      
      <!-- Progress Indicators -->
      ${isScreeningActive || screeningProgress.jobId ? renderProgressIndicators(screeningProgress, isScreeningActive) : ''}
    </div>
  `;

    // Attach event handlers
    attachScreenHandlers(container);
}

/**
 * Render progress indicators
 */
function renderProgressIndicators(progress, isActive) {
    const pct = progress.total > 0
        ? Math.min(100, (progress.processed / progress.total) * 100)
        : 0;

    return `
    <div class="form-group mt-lg">
      <div class="form-label">Screening Progress</div>
      
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Job ID</span>
          <span class="info-value">${progress.jobId || '—'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Workers</span>
          <span class="info-value">${progress.workers}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Processed</span>
          <span class="info-value">${progress.processed.toLocaleString()} / ${progress.total.toLocaleString()}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Status</span>
          <span class="info-value">${isActive ? 'Running' : 'Complete'}</span>
        </div>
      </div>
      
      <div class="progress-bar mt-md">
        <div class="progress-fill" style="width: ${pct}%"></div>
      </div>
    </div>
  `;
}

/**
 * Attach event handlers
 */
function attachScreenHandlers(container) {
    // Scale selector
    const scaleRadios = container.querySelectorAll('input[name="screen-size"]');
    scaleRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            selectedScale = e.target.value;
        });
    });

    // Start screening button
    const startBtn = container.querySelector('#start-screening-btn');
    if (startBtn) {
        startBtn.addEventListener('click', handleStartScreening);
    }

    // Cancel screening button
    const cancelBtn = container.querySelector('#cancel-screening-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', handleCancelScreening);
    }
}

/**
 * Handle starting screening (stub)
 */
function handleStartScreening() {
    const total = parseInt(selectedScale, 10);
    const jobId = `JOB-${Date.now().toString(36).toUpperCase()}`;

    setState({
        isScreeningActive: true,
        screeningProgress: {
            jobId,
            processed: 0,
            total,
            workers: 1
        },
        statusMessage: 'Screening started...'
    });

    refreshSection();

    // Simulate screening progress
    let processed = 0;
    let workers = 1;
    const batchSize = Math.ceil(total / 20);

    screeningInterval = setInterval(() => {
        processed = Math.min(total, processed + batchSize);

        // Simulate worker scaling
        if (processed > total * 0.1 && workers < 2) workers = 2;
        if (processed > total * 0.3 && workers < 4) workers = 4;
        if (processed > total * 0.5 && workers < 8) workers = 8;

        setState({
            screeningProgress: {
                jobId,
                processed,
                total,
                workers
            },
            statusMessage: `Screening: ${Math.round((processed / total) * 100)}%`
        });

        refreshSection();

        // Complete screening
        if (processed >= total) {
            clearInterval(screeningInterval);
            screeningInterval = null;

            // Generate mock hits
            const mockHits = generateMockHits(25);

            setState({
                isScreeningActive: false,
                hits: mockHits,
                statusMessage: `Screening complete. ${mockHits.length} hits found.`
            });

            refreshSection();
        }
    }, 400);
}

/**
 * Handle canceling screening
 */
function handleCancelScreening() {
    if (screeningInterval) {
        clearInterval(screeningInterval);
        screeningInterval = null;
    }

    setState({
        isScreeningActive: false,
        screeningProgress: {
            jobId: null,
            processed: 0,
            total: 0,
            workers: 0
        },
        statusMessage: 'Screening cancelled'
    });

    refreshSection();
}

/**
 * Generate mock hits
 */
function generateMockHits(count) {
    const hits = [];

    for (let i = 0; i < count; i++) {
        hits.push({
            id: `ZINC${Math.floor(Math.random() * 90000000 + 10000000)}`,
            score: (Math.random() * 3 - 10).toFixed(2), // Negative docking scores
            confidence: ['High', 'High', 'Medium', 'Medium', 'Low'][Math.floor(Math.random() * 5)],
            pose: null // Would contain ligand pose data
        });
    }

    // Sort by score (lower is better for docking)
    hits.sort((a, b) => parseFloat(a.score) - parseFloat(b.score));

    return hits;
}
