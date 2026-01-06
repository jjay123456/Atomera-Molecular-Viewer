/**
 * Section Panel Component
 * Manages active section rendering (one at a time)
 */

import { getState, subscribe, getSectionGating } from '../state.js';

// Import section modules
import { renderTargetSection } from '../sections/target.js';
import { renderPrepSection } from '../sections/prep.js';
import { renderPocketSection } from '../sections/pocket.js';
import { renderScreenSection } from '../sections/screen.js';
import { renderHitsSection } from '../sections/hits.js';
import { renderInteractionsSection } from '../sections/interactions.js';

// Section renderers map
const sectionRenderers = {
    target: renderTargetSection,
    prep: renderPrepSection,
    pocket: renderPocketSection,
    screen: renderScreenSection,
    hits: renderHitsSection,
    interactions: renderInteractionsSection
};

// Empty state messages
const emptyStateMessages = {
    target: 'No target loaded. Upload a protein structure or generate one from sequence.',
    prep: 'Target must be loaded before structural refinement.',
    pocket: 'Prepare the target before defining a binding pocket.',
    screen: 'Define a binding pocket before starting screening.',
    hits: 'No hits available. Run a screen to generate results.',
    interactions: 'Select a hit to inspect molecular interactions.'
};

let panelElement = null;
let currentSection = null;

/**
 * Initialize section panel
 */
export function initSectionPanel() {
    panelElement = document.getElementById('section-panel');
    if (!panelElement) return;

    // Subscribe to state changes
    subscribe(updateSectionPanel);

    // Initial render
    updateSectionPanel(getState());
}

/**
 * Update section panel based on state
 */
function updateSectionPanel(state) {
    if (!panelElement) return;

    const { activeSection } = state;
    const gating = getSectionGating();

    // Only re-render if section changed
    if (currentSection !== activeSection) {
        currentSection = activeSection;
        renderSection(activeSection, gating);
    } else {
        // Update current section content
        const renderer = sectionRenderers[activeSection];
        if (renderer) {
            const isUnlocked = gating[activeSection]?.unlocked;
            if (isUnlocked) {
                renderer(panelElement, state);
            }
        }
    }
}

/**
 * Render a section
 */
function renderSection(sectionId, gating) {
    if (!panelElement) return;

    const isUnlocked = gating[sectionId]?.unlocked;

    // Clear panel
    panelElement.innerHTML = '';

    if (!isUnlocked) {
        // Show empty state for locked section
        renderEmptyState(sectionId);
        return;
    }

    // Render the section
    const renderer = sectionRenderers[sectionId];
    if (renderer) {
        renderer(panelElement, getState());
    }
}

/**
 * Render empty state for locked section
 */
function renderEmptyState(sectionId) {
    const message = emptyStateMessages[sectionId] || 'Section not available.';

    panelElement.innerHTML = `
    <div class="section-empty">
      <div class="section-empty-icon">⚠</div>
      <div class="section-empty-text">${message}</div>
    </div>
  `;
}

/**
 * Force re-render of current section
 */
export function refreshSection() {
    const state = getState();
    const gating = getSectionGating();
    renderSection(state.activeSection, gating);
}
