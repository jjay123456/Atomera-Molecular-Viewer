/**
 * NGL Viewer Component
 * Wraps NGL.js for molecular structure visualization
 */

import * as NGL from 'ngl';
import { getState, subscribe, setState } from '../state.js';

let stage = null;
let proteinComponent = null;
let ligandComponent = null;
let pocketRepresentation = null;
let interactionRepresentations = [];

/**
 * Initialize NGL stage
 */
export function initViewer() {
    const container = document.getElementById('ngl-viewport');
    if (!container) return;

    // Create NGL Stage
    stage = new NGL.Stage(container, {
        backgroundColor: '#0a0a0f',
        quality: 'high',
        impostor: true,
        workerDefault: true
    });

    // Handle window resize
    window.addEventListener('resize', handleResize);

    // Subscribe to state changes for viewer updates
    subscribe(updateViewer);

    // Initial sizing
    handleResize();

    return stage;
}

/**
 * Handle window resize
 */
function handleResize() {
    if (stage) {
        stage.handleResize();
    }
}

/**
 * Load protein structure from file or data
 */
export async function loadProteinStructure(fileOrData, name = 'protein') {
    if (!stage) return null;

    try {
        // Clear existing protein
        if (proteinComponent) {
            stage.removeComponent(proteinComponent);
            proteinComponent = null;
        }

        // Load the structure
        let component;
        if (typeof fileOrData === 'string') {
            // String data (PDB format)
            const blob = new Blob([fileOrData], { type: 'text/plain' });
            component = await stage.loadFile(blob, { ext: 'pdb', name });
        } else if (fileOrData instanceof File) {
            // File object
            component = await stage.loadFile(fileOrData, { name });
        } else {
            throw new Error('Invalid input: expected File or string data');
        }

        proteinComponent = component;

        // Add ribbon representation (green for protein)
        component.addRepresentation('cartoon', {
            color: '#4a9f6a',
            smoothSheet: true
        });

        // Auto-center and zoom
        stage.autoView();

        // Extract protein info
        const structure = component.structure;
        const proteinInfo = {
            name: name,
            residueCount: structure.residueStore.count,
            chainCount: structure.chainStore.count,
            atomCount: structure.atomStore.count,
            moleculeClass: detectMoleculeClass(structure)
        };

        return proteinInfo;

    } catch (error) {
        console.error('Error loading structure:', error);
        throw error;
    }
}

/**
 * Detect molecule class from structure
 */
function detectMoleculeClass(structure) {
    const residueCount = structure.residueStore.count;
    const atomCount = structure.atomStore.count;

    // Simple heuristics for molecule classification
    if (residueCount > 500) {
        return { type: 'large-molecule', label: 'Large molecule / antibody', flagged: true };
    } else if (residueCount < 50) {
        return { type: 'peptide', label: 'Peptide', flagged: false };
    } else {
        return { type: 'small-molecule-compatible', label: 'Small-molecule compatible', flagged: false };
    }
}

/**
 * Highlight a pocket on the structure
 */
export function highlightPocket(pocket) {
    if (!proteinComponent || !pocket) return;

    // Clear existing pocket representation
    if (pocketRepresentation) {
        proteinComponent.removeRepresentation(pocketRepresentation);
        pocketRepresentation = null;
    }

    // Create selection string from residues
    const residueSelection = pocket.residues
        .map(r => `${r.resno}:${r.chainname}`)
        .join(' or ');

    // Add surface representation for pocket
    pocketRepresentation = proteinComponent.addRepresentation('surface', {
        sele: residueSelection || 'all',
        color: '#e0a040',
        opacity: 0.5,
        surfaceType: 'vws'
    });

    // Focus on pocket region
    if (residueSelection) {
        proteinComponent.autoView(residueSelection, 1000);
    }
}

/**
 * Display ligand pose
 */
export async function displayLigand(ligandData) {
    if (!stage) return;

    // Clear existing ligand
    if (ligandComponent) {
        stage.removeComponent(ligandComponent);
        ligandComponent = null;
    }

    if (!ligandData) return;

    try {
        // Load ligand structure
        const blob = new Blob([ligandData.pdbData || ligandData], { type: 'text/plain' });
        const component = await stage.loadFile(blob, { ext: 'pdb', name: 'ligand' });

        ligandComponent = component;

        // Add stick representation (gray for ligand)
        component.addRepresentation('ball+stick', {
            color: '#a0a0a0',
            multipleBond: true
        });

        stage.autoView();

    } catch (error) {
        console.error('Error loading ligand:', error);
    }
}

/**
 * Show/hide interaction markers
 */
export function showInteractions(interactions, show = true) {
    // Clear existing interaction representations
    interactionRepresentations.forEach(rep => {
        if (proteinComponent) {
            proteinComponent.removeRepresentation(rep);
        }
    });
    interactionRepresentations = [];

    if (!show || !interactions || !proteinComponent) return;

    // Highlight hydrogen bond donors/acceptors
    if (interactions.hBonds && interactions.hBonds.length > 0) {
        const hBondResidues = interactions.hBonds
            .map(bond => `${bond.residue}:${bond.chain}`)
            .join(' or ');

        if (hBondResidues) {
            const rep = proteinComponent.addRepresentation('ball+stick', {
                sele: hBondResidues,
                color: '#50a0ff'
            });
            interactionRepresentations.push(rep);
        }
    }

    // Highlight contact residues
    if (interactions.contacts && interactions.contacts.length > 0) {
        const contactResidues = interactions.contacts
            .map(c => `${c.residue}:${c.chain}`)
            .join(' or ');

        if (contactResidues) {
            const rep = proteinComponent.addRepresentation('spacefill', {
                sele: contactResidues,
                color: '#ffaa40',
                opacity: 0.3
            });
            interactionRepresentations.push(rep);
        }
    }
}

/**
 * Clear all visualizations
 */
export function clearViewer() {
    if (stage) {
        stage.removeAllComponents();
        proteinComponent = null;
        ligandComponent = null;
        pocketRepresentation = null;
        interactionRepresentations = [];
    }
}

/**
 * Update viewer based on state changes
 */
function updateViewer(state) {
    // Handle viewer overlay for screening
    const overlay = document.getElementById('viewer-overlay');
    if (overlay) {
        if (state.isScreeningActive) {
            overlay.classList.remove('hidden');
        } else {
            overlay.classList.add('hidden');
        }
    }
}

/**
 * Get the NGL stage instance
 */
export function getStage() {
    return stage;
}
