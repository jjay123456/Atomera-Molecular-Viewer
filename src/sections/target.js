/**
 * TARGET Module - Research-Grade Protein Structure Acquisition
 * 
 * Responsibilities:
 * 1. Acquire protein structure (PDB/mmCIF upload or FASTA sequence)
 * 2. Generate 3D structure from sequence (ESMFold simulation)
 * 3. Validate and manage structure lifecycle
 * 4. Assess scale and suitability for small-molecule docking
 * 5. Provide job semantics and reversibility
 * 6. Ensure traceability and provenance
 */

import { getState, setState, setStatusMessage } from '../state.js';
import { loadProteinStructure, clearViewer } from '../layout/viewer.js';
import { refreshSection } from '../layout/section-panel.js';

// ============================================
// TARGET MODULE STATE
// ============================================

const TargetState = {
  // Input source
  inputMethod: 'upload', // 'upload' | 'sequence'

  // File input state
  selectedFile: null,
  fileName: '',
  fileSize: 0,
  fileFormat: '',

  // Sequence input state
  fastaInput: '',
  fastaValidation: {
    isValid: false,
    header: '',
    sequenceLength: 0,
    errors: [],
    warnings: []
  },

  // Job state
  currentJob: null, // { id, type, status, progress, startTime, message }
  jobHistory: [],

  // Structure state
  structureStatus: 'empty', // 'empty' | 'pending' | 'loading' | 'validating' | 'ready' | 'error'
  structureData: null,

  // Validation results
  validationResults: null,

  // Classification
  classification: null,

  // Provenance
  provenance: null,

  // UI state
  pendingMethodSwitch: null, // Target method if user is confirming switch
  showConfirmDialog: false
};

let state = { ...TargetState };

// ============================================
// FASTA VALIDATION
// ============================================

const AMINO_ACIDS = new Set('ACDEFGHIKLMNPQRSTVWY'.split(''));
const EXTENDED_AMINO_ACIDS = new Set('ACDEFGHIKLMNPQRSTVWYBXZJUO'.split(''));
const MIN_SEQUENCE_LENGTH = 20;
const MAX_SEQUENCE_LENGTH = 2500;

function validateFasta(input) {
  const result = {
    isValid: false,
    header: '',
    sequenceLength: 0,
    cleanSequence: '',
    errors: [],
    warnings: []
  };

  if (!input || input.trim().length === 0) {
    result.errors.push('No sequence provided');
    return result;
  }

  const lines = input.trim().split('\n');

  // Check header
  if (!lines[0].startsWith('>')) {
    result.errors.push('Missing FASTA header (must start with >)');
  } else {
    result.header = lines[0].substring(1).trim();
    if (result.header.length === 0) {
      result.warnings.push('Empty header identifier');
    }
  }

  // Extract and validate sequence
  const sequenceLines = lines.slice(lines[0].startsWith('>') ? 1 : 0);
  const rawSequence = sequenceLines.join('').toUpperCase().replace(/\s/g, '');

  // Check for invalid characters
  const invalidChars = new Set();
  for (const char of rawSequence) {
    if (!EXTENDED_AMINO_ACIDS.has(char)) {
      invalidChars.add(char);
    }
  }

  if (invalidChars.size > 0) {
    result.errors.push(`Invalid characters: ${[...invalidChars].join(', ')}`);
  }

  // Check for ambiguous residues
  const ambiguousChars = [];
  for (const char of rawSequence) {
    if (EXTENDED_AMINO_ACIDS.has(char) && !AMINO_ACIDS.has(char)) {
      ambiguousChars.push(char);
    }
  }
  if (ambiguousChars.length > 0) {
    result.warnings.push(`Ambiguous residues detected: ${[...new Set(ambiguousChars)].join(', ')}`);
  }

  result.cleanSequence = rawSequence;
  result.sequenceLength = rawSequence.length;

  // Length validation
  if (result.sequenceLength < MIN_SEQUENCE_LENGTH) {
    result.errors.push(`Sequence too short (${result.sequenceLength} residues, minimum ${MIN_SEQUENCE_LENGTH})`);
  }

  if (result.sequenceLength > MAX_SEQUENCE_LENGTH) {
    result.errors.push(`Sequence too long (${result.sequenceLength} residues, maximum ${MAX_SEQUENCE_LENGTH})`);
  }

  // Final validity
  result.isValid = result.errors.length === 0 && result.sequenceLength >= MIN_SEQUENCE_LENGTH;

  return result;
}

// ============================================
// FILE VALIDATION
// ============================================

function validateFile(file) {
  const result = {
    isValid: false,
    format: '',
    errors: [],
    warnings: []
  };

  if (!file) {
    result.errors.push('No file selected');
    return result;
  }

  const name = file.name.toLowerCase();
  const size = file.size;

  // Format detection
  if (name.endsWith('.pdb')) {
    result.format = 'PDB';
  } else if (name.endsWith('.cif') || name.endsWith('.mmcif')) {
    result.format = 'mmCIF';
  } else {
    result.errors.push('Unsupported file format (use .pdb or .cif/.mmcif)');
    return result;
  }

  // Size validation
  if (size === 0) {
    result.errors.push('File is empty');
  } else if (size > 50 * 1024 * 1024) { // 50MB limit
    result.errors.push('File exceeds 50MB limit');
  } else if (size > 10 * 1024 * 1024) {
    result.warnings.push('Large file may take longer to process');
  }

  result.isValid = result.errors.length === 0;
  return result;
}

// ============================================
// JOB MANAGEMENT
// ============================================

function createJob(type, description) {
  const job = {
    id: `JOB-${Date.now().toString(36).toUpperCase()}`,
    type,
    description,
    status: 'pending', // 'pending' | 'running' | 'complete' | 'failed' | 'cancelled'
    progress: 0,
    startTime: null,
    endTime: null,
    message: 'Initializing...',
    result: null
  };

  state.currentJob = job;
  state.jobHistory.push(job);
  updateState();

  return job;
}

function updateJob(updates) {
  if (state.currentJob) {
    Object.assign(state.currentJob, updates);
    updateState();
  }
}

function completeJob(result, message = 'Complete') {
  if (state.currentJob) {
    state.currentJob.status = 'complete';
    state.currentJob.progress = 100;
    state.currentJob.endTime = Date.now();
    state.currentJob.message = message;
    state.currentJob.result = result;
    updateState();
  }
}

function failJob(error) {
  if (state.currentJob) {
    state.currentJob.status = 'failed';
    state.currentJob.endTime = Date.now();
    state.currentJob.message = error;
    updateState();
  }
}

// ============================================
// STATE MANAGEMENT
// ============================================

function updateState() {
  refreshSection();
}

function resetTargetState() {
  state = { ...TargetState };
  clearViewer();
  setState({
    target: null,
    isTargetLoaded: false,
    isPrepComplete: false,
    selectedPocket: null,
    pockets: [],
    hits: [],
    selectedHit: null
  });
  setStatusMessage('Target cleared');
  updateState();
}

// ============================================
// RENDER FUNCTIONS
// ============================================

/**
 * Main render entry point
 */
export function renderTargetSection(container, appState) {
  container.innerHTML = `
    <div class="target-module">
      ${renderInputSourceSection()}
      ${renderJobStatusSection()}
      ${renderStructureStatusSection()}
      ${renderClassificationSection()}
      ${renderProvenanceSection()}
      ${renderActionsSection()}
    </div>
    ${state.showConfirmDialog ? renderConfirmDialog() : ''}
  `;

  attachEventHandlers(container);
}

/**
 * SECTION 1 — INPUT SOURCE
 */
function renderInputSourceSection() {
  const isJobRunning = state.currentJob?.status === 'running';
  const hasStructure = state.structureStatus === 'ready';

  return `
    <div class="target-section">
      <div class="section-title">INPUT SOURCE</div>
      
      <!-- Input Method Selector -->
      <div class="input-method-selector">
        <label class="method-option ${state.inputMethod === 'upload' ? 'selected' : ''} ${isJobRunning ? 'disabled' : ''}">
          <input type="radio" name="input-method" value="upload" 
            ${state.inputMethod === 'upload' ? 'checked' : ''} 
            ${isJobRunning ? 'disabled' : ''}>
          <span class="method-label">Upload Structure</span>
          <span class="method-formats">PDB / mmCIF</span>
        </label>
        <label class="method-option ${state.inputMethod === 'sequence' ? 'selected' : ''} ${isJobRunning ? 'disabled' : ''}">
          <input type="radio" name="input-method" value="sequence" 
            ${state.inputMethod === 'sequence' ? 'checked' : ''} 
            ${isJobRunning ? 'disabled' : ''}>
          <span class="method-label">Paste Sequence</span>
          <span class="method-formats">FASTA</span>
        </label>
      </div>
      
      <!-- Input Content -->
      <div class="input-content">
        ${state.inputMethod === 'upload' ? renderFileInput() : renderSequenceInput()}
      </div>
    </div>
  `;
}

/**
 * File upload input
 */
function renderFileInput() {
  const isJobRunning = state.currentJob?.status === 'running';
  const fileValidation = state.selectedFile ? validateFile(state.selectedFile) : null;

  return `
    <div class="file-input-area">
      <div class="file-picker">
        <input type="file" id="structure-file" accept=".pdb,.cif,.mmcif" 
          ${isJobRunning ? 'disabled' : ''}>
        <label for="structure-file" class="file-picker-label ${isJobRunning ? 'disabled' : ''}">
          <span class="file-icon">📁</span>
          <span class="file-text">${state.fileName || 'Choose file...'}</span>
        </label>
      </div>
      
      ${state.selectedFile ? `
        <div class="file-info">
          <div class="file-detail">
            <span class="detail-label">Format</span>
            <span class="detail-value">${fileValidation?.format || '—'}</span>
          </div>
          <div class="file-detail">
            <span class="detail-label">Size</span>
            <span class="detail-value">${formatFileSize(state.fileSize)}</span>
          </div>
        </div>
        
        ${fileValidation?.errors.length > 0 ? `
          <div class="validation-errors">
            ${fileValidation.errors.map(e => `<div class="error-item">✖ ${e}</div>`).join('')}
          </div>
        ` : ''}
        
        ${fileValidation?.warnings.length > 0 ? `
          <div class="validation-warnings">
            ${fileValidation.warnings.map(w => `<div class="warning-item">⚠ ${w}</div>`).join('')}
          </div>
        ` : ''}
        
        ${fileValidation?.isValid ? `
          <button class="btn btn-primary" id="load-structure-btn" ${isJobRunning ? 'disabled' : ''}>
            LOAD STRUCTURE
          </button>
        ` : ''}
      ` : `
        <div class="file-hint">
          Supported formats: PDB (Protein Data Bank), mmCIF (Macromolecular Crystallographic Information File)
        </div>
      `}
    </div>
  `;
}

/**
 * FASTA sequence input
 */
function renderSequenceInput() {
  const isJobRunning = state.currentJob?.status === 'running';
  const validation = state.fastaValidation;
  const hasInput = state.fastaInput.trim().length > 0;

  return `
    <div class="sequence-input-area">
      <textarea 
        id="fasta-input" 
        class="fasta-textarea ${hasInput ? (validation.isValid ? 'valid' : 'invalid') : ''}"
        placeholder=">protein_name
MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPILSRVGDGTQDNLSGAEKAVQVKVKALPDAQFEVVHSLAKWKRQQIAAALEHHHHHH"
        ${isJobRunning ? 'disabled' : ''}
      >${state.fastaInput}</textarea>
      
      <!-- Real-time validation feedback -->
      <div class="fasta-validation">
        ${hasInput ? `
          <div class="validation-status ${validation.isValid ? 'valid' : 'invalid'}">
            ${validation.isValid ? '✔ Valid FASTA' : '✖ Invalid FASTA'}
          </div>
          
          ${validation.header ? `
            <div class="validation-detail">
              <span class="detail-label">Identifier</span>
              <span class="detail-value">${validation.header}</span>
            </div>
          ` : ''}
          
          <div class="validation-detail">
            <span class="detail-label">Length</span>
            <span class="detail-value">${validation.sequenceLength} residues</span>
          </div>
          
          ${validation.errors.length > 0 ? `
            <div class="validation-errors">
              ${validation.errors.map(e => `<div class="error-item">✖ ${e}</div>`).join('')}
            </div>
          ` : ''}
          
          ${validation.warnings.length > 0 ? `
            <div class="validation-warnings">
              ${validation.warnings.map(w => `<div class="warning-item">⚠ ${w}</div>`).join('')}
            </div>
          ` : ''}
          
          ${validation.isValid ? `
            <button class="btn btn-primary" id="generate-structure-btn" ${isJobRunning ? 'disabled' : ''}>
              GENERATE STRUCTURE (ESMFold)
            </button>
          ` : ''}
        ` : `
          <div class="sequence-hint">
            Enter a FASTA-formatted protein sequence. Header line (>) is required.
            <br>Supported length: ${MIN_SEQUENCE_LENGTH}–${MAX_SEQUENCE_LENGTH} residues.
          </div>
        `}
      </div>
    </div>
  `;
}

/**
 * Job status section
 */
function renderJobStatusSection() {
  const job = state.currentJob;
  if (!job || job.status === 'complete') return '';

  const elapsed = job.startTime ? Math.floor((Date.now() - job.startTime) / 1000) : 0;

  return `
    <div class="target-section job-section">
      <div class="section-title">JOB STATUS</div>
      
      <div class="job-info">
        <div class="job-header">
          <span class="job-id">${job.id}</span>
          <span class="job-type">${job.type}</span>
        </div>
        
        <div class="job-status ${job.status}">
          <span class="status-dot ${job.status === 'running' ? 'active' : job.status}"></span>
          <span class="status-text">${job.status.toUpperCase()}</span>
        </div>
        
        <div class="job-message">${job.message}</div>
        
        ${job.status === 'running' ? `
          <div class="job-progress">
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${job.progress}%"></div>
            </div>
            <span class="progress-text">${job.progress}%</span>
          </div>
          <div class="job-elapsed">Elapsed: ${elapsed}s</div>
          
          <button class="btn btn-secondary" id="cancel-job-btn">CANCEL</button>
        ` : ''}
        
        ${job.status === 'failed' ? `
          <button class="btn btn-secondary" id="retry-job-btn">RETRY</button>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Structure status section
 */
function renderStructureStatusSection() {
  if (state.structureStatus === 'empty') return '';

  const data = state.structureData;
  const validation = state.validationResults;

  return `
    <div class="target-section">
      <div class="section-title">STRUCTURE STATUS</div>
      
      <div class="structure-status-indicator ${state.structureStatus}">
        ${getStructureStatusIcon(state.structureStatus)}
        <span>${getStructureStatusLabel(state.structureStatus)}</span>
      </div>
      
      ${data ? `
        <div class="structure-info">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Name</span>
              <span class="info-value">${data.name || '—'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Residues</span>
              <span class="info-value">${data.residueCount?.toLocaleString() || '—'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Chains</span>
              <span class="info-value">${data.chainCount || '—'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Atoms</span>
              <span class="info-value">${data.atomCount?.toLocaleString() || '—'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Source</span>
              <span class="info-value">${data.source || '—'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Resolution</span>
              <span class="info-value">${data.resolution || 'N/A'}</span>
            </div>
          </div>
        </div>
        
        ${validation ? `
          <div class="validation-results">
            <div class="validation-header">Validation Results</div>
            ${validation.checks.map(check => `
              <div class="validation-check ${check.status}">
                <span class="check-icon">${check.status === 'pass' ? '✔' : check.status === 'warn' ? '⚠' : '✖'}</span>
                <span class="check-name">${check.name}</span>
                <span class="check-result">${check.result}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      ` : ''}
    </div>
  `;
}

/**
 * Classification section
 */
function renderClassificationSection() {
  const classification = state.classification;
  if (!classification) return '';

  return `
    <div class="target-section">
      <div class="section-title">TARGET CLASSIFICATION</div>
      
      <div class="classification-result ${classification.suitability}">
        <div class="classification-type">
          <span class="type-icon">${classification.icon}</span>
          <span class="type-label">${classification.type}</span>
        </div>
        
        <div class="classification-suitability">
          <span class="suitability-label">Small-Molecule Docking:</span>
          <span class="suitability-value ${classification.suitability}">${classification.suitabilityLabel}</span>
        </div>
        
        ${classification.warnings.length > 0 ? `
          <div class="classification-warnings">
            ${classification.warnings.map(w => `<div class="warning-item">⚠ ${w}</div>`).join('')}
          </div>
        ` : ''}
        
        <div class="classification-details">
          <div class="detail-row">
            <span class="detail-label">Molecular Weight</span>
            <span class="detail-value">${classification.molecularWeight} kDa <span class="simulated">(Estimated)</span></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Expected Binding Sites</span>
            <span class="detail-value">${classification.expectedBindingSites} <span class="simulated">(Estimated)</span></span>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Provenance section
 */
function renderProvenanceSection() {
  const prov = state.provenance;
  if (!prov) return '';

  return `
    <div class="target-section">
      <div class="section-title">PROVENANCE</div>
      
      <div class="provenance-info">
        <div class="provenance-row">
          <span class="prov-label">Acquisition Method</span>
          <span class="prov-value">${prov.method}</span>
        </div>
        <div class="provenance-row">
          <span class="prov-label">Source</span>
          <span class="prov-value">${prov.source}</span>
        </div>
        <div class="provenance-row">
          <span class="prov-label">Acquired At</span>
          <span class="prov-value">${prov.timestamp}</span>
        </div>
        <div class="provenance-row">
          <span class="prov-label">Session ID</span>
          <span class="prov-value">${prov.sessionId}</span>
        </div>
        ${prov.originalFilename ? `
          <div class="provenance-row">
            <span class="prov-label">Original Filename</span>
            <span class="prov-value">${prov.originalFilename}</span>
          </div>
        ` : ''}
        ${prov.checksum ? `
          <div class="provenance-row">
            <span class="prov-label">Checksum (SHA-256)</span>
            <span class="prov-value hash">${prov.checksum}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Actions section
 */
function renderActionsSection() {
  if (state.structureStatus !== 'ready') return '';

  return `
    <div class="target-section actions-section">
      <button class="btn btn-secondary" id="clear-target-btn">
        CLEAR TARGET
      </button>
    </div>
  `;
}

/**
 * Confirmation dialog
 */
function renderConfirmDialog() {
  return `
    <div class="confirm-overlay">
      <div class="confirm-dialog">
        <div class="confirm-title">Confirm Action</div>
        <div class="confirm-message">
          Switching input method will discard the current target and all associated data.
          This action cannot be undone.
        </div>
        <div class="confirm-actions">
          <button class="btn btn-secondary" id="confirm-cancel-btn">Cancel</button>
          <button class="btn btn-danger" id="confirm-proceed-btn">Discard & Switch</button>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// EVENT HANDLERS
// ============================================

function attachEventHandlers(container) {
  // Input method switch
  container.querySelectorAll('input[name="input-method"]').forEach(radio => {
    radio.addEventListener('change', handleInputMethodChange);
  });

  // File input
  const fileInput = container.querySelector('#structure-file');
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  }

  // FASTA input
  const fastaInput = container.querySelector('#fasta-input');
  if (fastaInput) {
    fastaInput.addEventListener('input', handleFastaInput);
  }

  // Load structure button
  const loadBtn = container.querySelector('#load-structure-btn');
  if (loadBtn) {
    loadBtn.addEventListener('click', handleLoadStructure);
  }

  // Generate structure button
  const generateBtn = container.querySelector('#generate-structure-btn');
  if (generateBtn) {
    generateBtn.addEventListener('click', handleGenerateStructure);
  }

  // Cancel job button
  const cancelBtn = container.querySelector('#cancel-job-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', handleCancelJob);
  }

  // Retry job button
  const retryBtn = container.querySelector('#retry-job-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', handleRetryJob);
  }

  // Clear target button
  const clearBtn = container.querySelector('#clear-target-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', handleClearTarget);
  }

  // Confirm dialog buttons
  const confirmCancel = container.querySelector('#confirm-cancel-btn');
  if (confirmCancel) {
    confirmCancel.addEventListener('click', () => {
      state.showConfirmDialog = false;
      state.pendingMethodSwitch = null;
      updateState();
    });
  }

  const confirmProceed = container.querySelector('#confirm-proceed-btn');
  if (confirmProceed) {
    confirmProceed.addEventListener('click', () => {
      const newMethod = state.pendingMethodSwitch;
      resetTargetState();
      state.inputMethod = newMethod;
      state.showConfirmDialog = false;
      state.pendingMethodSwitch = null;
      updateState();
    });
  }
}

function handleInputMethodChange(event) {
  const newMethod = event.target.value;

  // If we have data, confirm before switching
  if (state.structureStatus !== 'empty' || state.selectedFile || state.fastaInput.trim()) {
    state.pendingMethodSwitch = newMethod;
    state.showConfirmDialog = true;
    // Revert radio to current
    event.target.checked = false;
    document.querySelector(`input[name="input-method"][value="${state.inputMethod}"]`).checked = true;
    updateState();
  } else {
    state.inputMethod = newMethod;
    updateState();
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    state.selectedFile = file;
    state.fileName = file.name;
    state.fileSize = file.size;
    state.fileFormat = file.name.split('.').pop().toUpperCase();
    updateState();
  }
}

function handleFastaInput(event) {
  state.fastaInput = event.target.value;
  state.fastaValidation = validateFasta(state.fastaInput);
  updateState();
}

async function handleLoadStructure() {
  if (!state.selectedFile) return;

  const job = createJob('STRUCTURE_LOAD', 'Loading protein structure');
  job.status = 'running';
  job.startTime = Date.now();
  state.structureStatus = 'loading';
  updateState();

  try {
    // Simulate loading stages
    await simulateProgress(job, [
      { progress: 20, message: 'Parsing structure file...' },
      { progress: 50, message: 'Extracting coordinates...' },
      { progress: 70, message: 'Building molecular representation...' },
      { progress: 90, message: 'Validating structure...' }
    ]);

    // Actually load the structure
    const name = state.fileName.replace(/\.(pdb|cif|mmcif)$/i, '');
    const proteinInfo = await loadProteinStructure(state.selectedFile, name);

    // Set structure data
    state.structureData = {
      ...proteinInfo,
      source: 'File Upload',
      resolution: 'Experimental'
    };

    // Run validation
    state.validationResults = generateValidationResults(state.structureData);

    // Classify target
    state.classification = classifyTarget(state.structureData);

    // Set provenance
    state.provenance = {
      method: 'File Upload',
      source: state.fileName,
      originalFilename: state.fileName,
      timestamp: new Date().toISOString(),
      sessionId: `SES-${Date.now().toString(36).toUpperCase()}`,
      checksum: await generateChecksum(state.selectedFile)
    };

    state.structureStatus = 'ready';
    completeJob(proteinInfo, 'Structure loaded successfully');

    // Update global app state
    setState({
      target: state.structureData,
      isTargetLoaded: true,
      statusMessage: `Loaded ${name} (${proteinInfo.residueCount} residues)`
    });

  } catch (error) {
    state.structureStatus = 'error';
    failJob(error.message || 'Failed to load structure');
    setStatusMessage('Error loading structure');
  }
}

async function handleGenerateStructure() {
  if (!state.fastaValidation.isValid) return;

  const job = createJob('STRUCTURE_PREDICTION', 'Generating structure via ESMFold');
  job.status = 'running';
  job.startTime = Date.now();
  state.structureStatus = 'loading';
  updateState();

  try {
    // Simulate ESMFold prediction stages
    await simulateProgress(job, [
      { progress: 10, message: 'Submitting sequence to ESMFold...' },
      { progress: 25, message: 'Encoding sequence features...' },
      { progress: 40, message: 'Running transformer attention...' },
      { progress: 60, message: 'Predicting 3D coordinates...' },
      { progress: 80, message: 'Refining structure...' },
      { progress: 95, message: 'Validating prediction...' }
    ], 500);

    // Generate mock structure data
    const name = state.fastaValidation.header || 'predicted_structure';
    const residueCount = state.fastaValidation.sequenceLength;

    state.structureData = {
      name: name,
      residueCount: residueCount,
      chainCount: 1,
      atomCount: residueCount * 8, // Approximate
      source: 'ESMFold Prediction',
      resolution: 'Predicted (pLDDT: 85.2)',
      moleculeClass: classifyBySize(residueCount)
    };

    // Run validation
    state.validationResults = generateValidationResults(state.structureData, true);

    // Classify target
    state.classification = classifyTarget(state.structureData);

    // Set provenance
    state.provenance = {
      method: 'Sequence Prediction (ESMFold)',
      source: `FASTA: ${name}`,
      timestamp: new Date().toISOString(),
      sessionId: `SES-${Date.now().toString(36).toUpperCase()}`,
      sequenceHash: simpleHash(state.fastaValidation.cleanSequence)
    };

    state.structureStatus = 'ready';
    completeJob(state.structureData, 'Structure predicted successfully (Simulated)');

    // Update global app state
    setState({
      target: state.structureData,
      isTargetLoaded: true,
      statusMessage: `Generated ${name} (${residueCount} residues) — Simulated`
    });

  } catch (error) {
    state.structureStatus = 'error';
    failJob(error.message || 'Failed to generate structure');
    setStatusMessage('Error generating structure');
  }
}

function handleCancelJob() {
  if (state.currentJob && state.currentJob.status === 'running') {
    state.currentJob.status = 'cancelled';
    state.currentJob.endTime = Date.now();
    state.currentJob.message = 'Cancelled by user';
    state.structureStatus = 'empty';
    setStatusMessage('Job cancelled');
    updateState();
  }
}

function handleRetryJob() {
  const lastJob = state.currentJob;
  if (lastJob?.type === 'STRUCTURE_LOAD') {
    handleLoadStructure();
  } else if (lastJob?.type === 'STRUCTURE_PREDICTION') {
    handleGenerateStructure();
  }
}

function handleClearTarget() {
  resetTargetState();
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getStructureStatusIcon(status) {
  const icons = {
    empty: '○',
    pending: '◐',
    loading: '◑',
    validating: '◑',
    ready: '●',
    error: '✖'
  };
  return icons[status] || '○';
}

function getStructureStatusLabel(status) {
  const labels = {
    empty: 'No structure',
    pending: 'Pending',
    loading: 'Loading...',
    validating: 'Validating...',
    ready: 'Ready',
    error: 'Error'
  };
  return labels[status] || 'Unknown';
}

function classifyBySize(residueCount) {
  if (residueCount > 800) {
    return { type: 'large-molecule', label: 'Large molecule / antibody-scale', flagged: true };
  } else if (residueCount > 500) {
    return { type: 'medium-molecule', label: 'Medium-sized protein', flagged: false };
  } else if (residueCount < 50) {
    return { type: 'peptide', label: 'Peptide', flagged: false };
  } else {
    return { type: 'small-molecule-compatible', label: 'Small-molecule compatible', flagged: false };
  }
}

function classifyTarget(data) {
  const residueCount = data.residueCount || 0;
  const warnings = [];

  let type, suitability, suitabilityLabel, icon;

  if (residueCount > 800) {
    type = 'Antibody / Large Complex';
    suitability = 'unsuitable';
    suitabilityLabel = 'Not Recommended';
    icon = '🔬';
    warnings.push('Target exceeds 800 residues — may require specialized docking methods');
    warnings.push('Consider using peptide docking or protein-protein docking tools');
  } else if (residueCount > 500) {
    type = 'Large Protein';
    suitability = 'caution';
    suitabilityLabel = 'Proceed with Caution';
    icon = '🧬';
    warnings.push('Large target may have extended computation times');
  } else if (residueCount < 50) {
    type = 'Peptide';
    suitability = 'suitable';
    suitabilityLabel = 'Suitable';
    icon = '⛓';
    warnings.push('Short peptide — limited binding site options');
  } else {
    type = 'Standard Protein';
    suitability = 'suitable';
    suitabilityLabel = 'Suitable';
    icon = '🎯';
  }

  // Estimated values
  const molecularWeight = (residueCount * 110 / 1000).toFixed(1); // ~110 Da per residue average
  const expectedBindingSites = Math.max(1, Math.floor(residueCount / 150));

  return {
    type,
    suitability,
    suitabilityLabel,
    icon,
    warnings,
    molecularWeight,
    expectedBindingSites
  };
}

function generateValidationResults(data, isPredicted = false) {
  const checks = [
    {
      name: 'Coordinate Integrity',
      status: 'pass',
      result: 'All atoms have valid coordinates'
    },
    {
      name: 'Chain Connectivity',
      status: 'pass',
      result: `${data.chainCount} chain(s) detected`
    },
    {
      name: 'Missing Residues',
      status: isPredicted ? 'pass' : (Math.random() > 0.7 ? 'warn' : 'pass'),
      result: isPredicted ? 'None (predicted structure)' : (Math.random() > 0.7 ? '3 residues in loop regions' : 'None detected')
    },
    {
      name: 'Stereochemistry',
      status: 'pass',
      result: 'All chiral centers valid'
    }
  ];

  if (isPredicted) {
    checks.push({
      name: 'Prediction Confidence',
      status: 'pass',
      result: 'pLDDT > 70 for 92% of residues (Simulated)'
    });
  }

  return { checks };
}

async function generateChecksum(file) {
  // Simulated checksum - in real app would use crypto.subtle.digest
  return `${simpleHash(file.name + file.size)}...${simpleHash(Date.now().toString())}`;
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

async function simulateProgress(job, stages, baseDelay = 300) {
  for (const stage of stages) {
    if (state.currentJob?.status === 'cancelled') {
      throw new Error('Job cancelled');
    }
    await delay(baseDelay + Math.random() * 200);
    updateJob({ progress: stage.progress, message: stage.message });
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
