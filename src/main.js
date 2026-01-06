/**
 * Atomera - Main Application Entry Point
 * Initializes all components and bootstraps the application
 */

import './style.css';

// Import layout components
import { initNavigation } from './layout/navigation.js';
import { initViewer } from './layout/viewer.js';
import { initSectionPanel } from './layout/section-panel.js';
import { initInspector } from './layout/inspector.js';
import { initStatusBar } from './layout/status-bar.js';

// Import state
import { getState, subscribe } from './state.js';

/**
 * Initialize the application
 */
function init() {
  console.log('Atomera initializing...');

  // Initialize NGL 3D viewer first
  initViewer();

  // Initialize layout components
  initNavigation();
  initSectionPanel();
  initInspector();
  initStatusBar();

  console.log('Atomera ready.');
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
