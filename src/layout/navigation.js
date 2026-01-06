/**
 * Navigation Component
 * Handles workflow section tabs with gating indicators
 */

import { getState, subscribe, switchSection, getSectionGating } from '../state.js';

let navElement = null;

/**
 * Initialize navigation component
 */
export function initNavigation() {
    navElement = document.getElementById('workflow-nav');
    if (!navElement) return;

    // Attach click handlers to nav tabs
    const tabs = navElement.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', handleTabClick);
    });

    // Subscribe to state changes
    subscribe(updateNavigation);

    // Initial render
    updateNavigation(getState());
}

/**
 * Handle tab click
 */
function handleTabClick(event) {
    const sectionId = event.target.dataset.section;
    if (sectionId) {
        switchSection(sectionId);
    }
}

/**
 * Update navigation based on state
 */
function updateNavigation(state) {
    if (!navElement) return;

    const gating = getSectionGating();
    const tabs = navElement.querySelectorAll('.nav-tab');

    tabs.forEach(tab => {
        const sectionId = tab.dataset.section;
        const sectionGate = gating[sectionId];

        // Remove all state classes
        tab.classList.remove('active', 'locked', 'unlocked', 'complete');

        // Apply appropriate class
        if (state.activeSection === sectionId) {
            tab.classList.add('active');
        } else if (!sectionGate?.unlocked) {
            tab.classList.add('locked');
        } else if (sectionGate?.complete) {
            tab.classList.add('complete');
        } else {
            tab.classList.add('unlocked');
        }
    });
}
