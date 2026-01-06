/**
 * Atomera - Central State Management
 * Manages workflow state, UI state, and section gating
 */

// Initial application state
const initialState = {
    // Workflow state
    target: null,          // { name, residueCount, chainCount, moleculeClass, structure }
    isTargetLoaded: false,
    isPrepComplete: false,
    selectedPocket: null,  // { id, rank, volume, residues }
    pockets: [],           // Detected pockets list
    isScreeningActive: false,
    screeningProgress: {   // Screening job state
        jobId: null,
        processed: 0,
        total: 0,
        workers: 0
    },
    hits: [],              // Ranked hit list
    selectedHit: null,     // { id, score, confidence, pose }
    interactions: null,    // { hBonds, contacts, distances }

    // UI state
    activeSection: 'target',
    inspectorData: null,
    statusMessage: 'Ready'
};

// Current state (mutable copy)
let state = { ...initialState };

// Subscribers for state changes
const subscribers = new Set();

/**
 * Get current state (read-only)
 */
export function getState() {
    return { ...state };
}

/**
 * Update state and notify subscribers
 */
export function setState(updates) {
    state = { ...state, ...updates };
    notifySubscribers();
}

/**
 * Subscribe to state changes
 */
export function subscribe(callback) {
    subscribers.add(callback);
    return () => subscribers.delete(callback);
}

/**
 * Notify all subscribers of state change
 */
function notifySubscribers() {
    subscribers.forEach(callback => callback(getState()));
}

/**
 * Section gating logic - determines which sections are accessible
 */
export function getSectionGating() {
    const s = state;
    return {
        target: { unlocked: true, complete: s.isTargetLoaded },
        prep: { unlocked: s.isTargetLoaded, complete: s.isPrepComplete },
        pocket: { unlocked: s.isPrepComplete, complete: s.selectedPocket !== null },
        screen: { unlocked: s.selectedPocket !== null, complete: s.hits.length > 0 },
        hits: { unlocked: s.isScreeningActive || s.hits.length > 0, complete: s.selectedHit !== null },
        interactions: { unlocked: s.selectedHit !== null, complete: false }
    };
}

/**
 * Check if a section can be accessed
 */
export function canAccessSection(sectionId) {
    const gating = getSectionGating();
    return gating[sectionId]?.unlocked || false;
}

/**
 * Switch to a section (if unlocked)
 */
export function switchSection(sectionId) {
    if (canAccessSection(sectionId)) {
        setState({ activeSection: sectionId });
        return true;
    }
    return false;
}

/**
 * Update status bar message
 */
export function setStatusMessage(message) {
    setState({ statusMessage: message });
}

/**
 * Reset state to initial
 */
export function resetState() {
    state = { ...initialState };
    notifySubscribers();
}

// Export state object for direct access in development
export { state };
