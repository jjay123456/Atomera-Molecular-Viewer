import { PanelSystem } from './ui/panel-system.js';
import { NGLWrapper } from './viewer/ngl-wrapper.js';
import { API } from './api/client.js';

class App {
    constructor() {
        this.panelSystem = new PanelSystem(document.getElementById('right-sidebar'));
        this.viewer = new NGLWrapper('viewer-container');

        this.state = {
            proteinId: null,
            ligandSetId: null,
            jobId: null
        };

        this.initPanels();
        this.bindNav();
        this.bindToolbar();
    }

    initPanels() {
        // --- FILE PANEL ---
        this.panelSystem.registerPanel('FILE', 'FILE OPERATIONS', `
            <div style="margin-bottom: 20px;">
                <label>PROTEIN STRUCTURE</label>
                <input type="file" id="input-protein" accept=".pdb,.cif">
                <button id="btn-upload-protein">UPLOAD PROTEIN</button>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label>LIGAND STRUCTURE</label>
                <input type="file" id="input-ligand" accept=".sdf,.mol2">
                <button id="btn-upload-ligand">UPLOAD LIGAND</button>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #333; margin: 10px 0;">
            <div id="file-status" style="color: #666; font-size: 12px;">No file loaded.</div>
        `);

        // Bind File Events
        setTimeout(() => { // Defer to ensure DOM is ready inside panel system
            document.getElementById('btn-upload-protein').addEventListener('click', async () => {
                const fileInput = document.getElementById('input-protein');
                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    document.getElementById('file-status').textContent = "Uploading Protein...";
                    try {
                        // 1. Upload to Backend
                        const res = await API.uploadProtein(file);
                        this.state.proteinId = res.protein_id;

                        // 2. Load in Viewer
                        await this.viewer.loadProtein(file);

                        document.getElementById('file-status').textContent = `Loaded: ${res.filename} (${res.protein_id})`;
                    } catch (e) {
                        console.error(e);
                        document.getElementById('file-status').textContent = "Error uploading protein.";
                    }
                }
            });

            document.getElementById('btn-upload-ligand').addEventListener('click', async () => {
                const fileInput = document.getElementById('input-ligand');
                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    try {
                        // 1. Upload
                        const res = await API.uploadLigand(file);
                        this.state.ligandSetId = res.ligand_set_id;

                        // 2. Viewer
                        await this.viewer.loadLigand(file);

                        document.getElementById('file-status').textContent += ` + Ligand set`;
                    } catch (e) {
                        console.error(e);
                    }
                }
            });
        }, 0);

        // --- VIEW PANEL ---
        this.panelSystem.registerPanel('VIEW', 'STRUCTURE VIEW', `
            <label>REPRESENTATION</label>
            <select id="view-rep">
                <option value="cartoon">Cartoon</option>
                <option value="surface">Surface</option>
                <option value="ball+stick">Ball & Stick</option>
            </select>
            
            <label style="margin-top: 20px; display: block;">COLOR SCHEME</label>
            <select>
                <option>Chain ID</option>
                <option>Element</option>
                <option>Residue</option>
            </select>
        `);

        setTimeout(() => {
            document.getElementById('view-rep').addEventListener('change', (e) => {
                this.viewer.setRepresentation(e.target.value);
            });
        }, 0);

        // --- ANALYSIS PANEL ---
        this.panelSystem.registerPanel('ANALYSIS', 'BINDING POCKET', `
             <button id="btn-run-analysis" style="width: 100%; margin-bottom: 10px;">RUN JOB (MOCK BOLTZ-2)</button>
             <div id="job-status" style="margin-bottom: 10px; color: #F8C300;"></div>
             <div id="results-area"></div>
        `);

        setTimeout(() => {
            document.getElementById('btn-run-analysis').addEventListener('click', async () => {
                if (!this.state.proteinId) {
                    alert("Please upload a protein first.");
                    return;
                }
                const statusDiv = document.getElementById('job-status');
                statusDiv.textContent = "Starting Job...";

                try {
                    const job = await API.createJob(this.state.proteinId, this.state.ligandSetId);
                    this.state.jobId = job.job_id;

                    // Poll
                    const poll = setInterval(async () => {
                        const s = await API.getJobStatus(this.state.jobId);
                        statusDiv.textContent = `Status: ${s.status}`;

                        if (s.status === 'DONE') {
                            clearInterval(poll);
                            this.loadResults();
                        } else if (s.status === 'ERROR') {
                            clearInterval(poll);
                            statusDiv.textContent = "Job Failed";
                        }
                    }, 1000);

                } catch (e) {
                    console.error(e);
                    statusDiv.textContent = "API Error";
                }
            });
        }, 0);

        // --- MEASURE PANEL ---
        this.panelSystem.registerPanel('MEASURE', 'MEASUREMENTS', `
            <div style="color: #666; padding: 20px; text-align: center;">Measurement tools placeholder</div>
        `);

        // --- SETTINGS PANEL ---
        this.panelSystem.registerPanel('SETTINGS', 'SYSTEM SETTINGS', `
            <label>THEME</label>
            <select><option>Bloomberg Dark</option></select>
            <div style="margin-top: 10px; font-size: 10px; color: #555;">ATOMERA v1.0.0</div>
        `);
    }

    async loadResults() {
        const res = await API.getResults(this.state.jobId);
        const area = document.getElementById('results-area');

        let html = `<div style="font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid #333;">TOP LIGANDS</div>`;
        html += `<table class="data-table"><thead><tr><th>Ligand</th><th>Score</th><th>Conf</th></tr></thead><tbody>`;

        res.ranked_ligands.forEach(l => {
            html += `<tr><td>${l.ligand_id}</td><td style="color: #F8C300;">${l.score}</td><td>${l.confidence}</td></tr>`;
        });

        html += `</tbody></table>`;
        area.innerHTML = html;
    }

    bindNav() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const id = item.dataset.panel;
                this.panelSystem.openPanel(id);

                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    bindToolbar() {
        document.getElementById('btn-screenshot').addEventListener('click', () => {
            this.viewer.screenshot();
        });

        document.getElementById('btn-reset').addEventListener('click', () => {
            if (this.viewer.proteinComponent) this.viewer.proteinComponent.autoView();
        });
    }
}

// Init
window.app = new App();
