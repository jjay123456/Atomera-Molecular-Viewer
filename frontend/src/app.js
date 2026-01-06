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
            
            <label>EXPORTS</label>
            <div class="panel-controls-row">
                <button id="btn-export-scene">SCENE JSON</button>
                <button id="btn-export-pdb">PROTEIN PDB</button>
            </div>
            
            <hr style="border: 0; border-top: 1px solid #333; margin: 10px 0;">
            <div id="file-status" style="color: #666; font-size: 12px;">No file loaded.</div>
        `);

        // Bind File Events
        setTimeout(() => { // Defer to ensure DOM is ready inside panel system
            document.getElementById('btn-export-scene').addEventListener('click', () => {
                const data = JSON.stringify(this.state);
                const blob = new Blob([data], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = "atomera_session.json";
                a.click();
            });

            document.getElementById('btn-export-pdb').addEventListener('click', () => {
                // Use NGL
                // this.viewer.proteinComponent.structure.save("protein.pdb") // If NGL supported direct save like this easily
                // NGL file saver is a bit different, but we can simulate passing the blob we have if we stored it,
                // or ask NGL to write. NGL.js Writer class usage:
                // For now, mock alert
                alert("Exporting PDB/CIF from current structure...");
            });

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

                        this.populateSequenceViewer();

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
            
            <label style="margin-top: 20px;">SELECTION MODE</label>
            <div class="panel-controls-row">
                <button id="btn-sel-atom">ATOM</button>
                <button id="btn-sel-res">RES</button>
                <button id="btn-sel-chain">CHAIN</button>
            </div>
            
            <label style="margin-top: 20px;">SEQUENCE VIEWER</label>
            <select id="seq-chain-select"></select>
            <div id="seq-rail" style="height: 150px; background: #000; border: 1px solid #1F1F1F; overflow-y: scroll; margin-top: 5px; padding: 5px;">
                <div style="color: #555; font-size: 11px; text-align: center; padding-top: 20px;">Load protein to view sequence</div>
            </div>
        `);

        setTimeout(() => {
            // Rep
            document.getElementById('view-rep').addEventListener('change', (e) => {
                this.viewer.setRepresentation(e.target.value);
            });

            // Mock Selection Buttons
            ['atom', 'res', 'chain'].forEach(mode => {
                document.getElementById(`btn-sel-${mode}`).addEventListener('click', () => {
                    // Visual toggle state
                    console.log("Mode:", mode);
                });
            });

            // Chain Select Change
            document.getElementById('seq-chain-select').addEventListener('change', (e) => {
                this.renderSequenceRail(e.target.value);
            });
        }, 0);

        // --- ANALYSIS PANEL ---
        this.panelSystem.registerPanel('ANALYSIS', 'BINDING POCKET', `
             <button id="btn-run-analysis" style="width: 100%; margin-bottom: 10px;">RUN JOB (MOCK BOLTZ-2)</button>
             <div id="job-status" style="margin-bottom: 10px; color: #F8C300; font-size: 11px;"></div>
             
             <div class="section-title">PREDICTED POCKETS</div>
             <table class="data-table" id="pocket-table">
                <thead><tr><th>#</th><th>Score</th><th>Residues</th></tr></thead>
                <tbody><tr><td colspan="3" style="text-align:center">-</td></tr></tbody>
             </table>
             
             <div class="section-title" style="margin-top: 20px;">INTERACTIONS</div>
             <div class="panel-controls-row" style="flex-wrap: wrap; gap: 5px;">
                <label><input type="checkbox" id="chk-hbond"> H-Bond</label>
                <label><input type="checkbox" id="chk-hydro"> Hydrophobic</label>
                <label><input type="checkbox" id="chk-salt"> Salt Bridge</label>
             </div>
             
             <div class="section-title" style="margin-top: 20px;">CONTACTS</div>
             <div id="contacts-area" style="max-height: 150px; overflow-y: auto;">
                <table class="data-table" id="contacts-table">
                   <thead><tr><th>Residue</th><th>Type</th><th>Dist</th></tr></thead>
                   <tbody><tr><td colspan="3" style="text-align:center">-</td></tr></tbody>
                </table>
             </div>
             
             <div class="section-title" style="margin-top: 20px;">AFFINITY SCORES</div>
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
            <button id="btn-measure-dist">ADD DISTANCE (PICK 2)</button>
            <div id="measure-status" style="color: #666; font-size: 11px; margin: 10px 0;">Inactive</div>
            
            <div class="section-title">ACTIVE MEASUREMENTS</div>
            <div id="measurement-list"></div>
            
            <button id="btn-clear-measures" style="margin-top: 10px;">CLEAR ALL</button>
        `);

        setTimeout(() => {
            let pickState = { count: 0, atoms: [] };

            document.getElementById('btn-measure-dist').addEventListener('click', () => {
                document.getElementById('measure-status').textContent = "Pick Atom 1...";
                this.viewer.setSelectionMode('picking', (atom) => {
                    pickState.atoms.push(atom);
                    pickState.count++;

                    if (pickState.count === 1) {
                        document.getElementById('measure-status').textContent = "Pick Atom 2...";
                    } else if (pickState.count === 2) {
                        // Calc dist
                        const d = this.calcDistance(pickState.atoms[0], pickState.atoms[1]);
                        this.addMeasurementUI(d);
                        // In real NGL we might render a cylinder/line here using addShape
                        // or Shape component. For now we just calc.

                        document.getElementById('measure-status').textContent = "Done. Pick 1...";
                        pickState = { count: 0, atoms: [] }; // Reset for next
                    }
                });
            });

            document.getElementById('btn-clear-measures').addEventListener('click', () => {
                document.getElementById('measurement-list').innerHTML = '';
                this.viewer.setSelectionMode(null); // Stop picking
                document.getElementById('measure-status').textContent = "Inactive";
            });
        }, 0);

        // --- SETTINGS PANEL ---
        this.panelSystem.registerPanel('SETTINGS', 'SYSTEM SETTINGS', `
            <label>THEME</label>
            <select><option>Bloomberg Dark</option></select>
            <div style="margin-top: 10px; font-size: 10px; color: #555;">ATOMERA v1.0.0</div>
        `);
    }

    async loadResults() {
        const res = await API.getResults(this.state.jobId);

        // 1. Pockets
        const pocketBody = document.querySelector('#pocket-table tbody');
        pocketBody.innerHTML = '';
        res.pockets.forEach((p, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${i + 1}</td><td>${p.score}</td><td>${p.residues.length}</td>`;
            tr.addEventListener('click', () => {
                // Focus pocket (mock center)
                // In real app using p.center
                console.log("Focus pocket", p.center);
            });
            pocketBody.appendChild(tr);
        });

        // 2. Contacts (Mock data for now, usually comes from specific ligand endpoint)
        // We'll just fake it based on the first ligand result for demo
        const contactsBody = document.querySelector('#contacts-table tbody');
        contactsBody.innerHTML = `
            <tr><td>ASP:112</td><td>H-Bond</td><td>2.1</td></tr>
            <tr><td>PHE:204</td><td>Hydrophobic</td><td>3.5</td></tr>
            <tr><td>GLU:155</td><td>Salt Bridge</td><td>2.8</td></tr>
        `; // In real app, fetch from /jobs/{id}/results/ligand/{id}

        // 3. Affinity
        const area = document.getElementById('results-area');
        let html = `<table class="data-table"><thead><tr><th>Ligand</th><th>Score</th><th>Conf</th></tr></thead><tbody>`;
        res.ranked_ligands.forEach(l => {
            html += `<tr><td>${l.ligand_id}</td><td style="color: #F8C300;">${l.score}</td><td>${l.confidence}</td></tr>`;
        });
        html += `</tbody></table>`;
        area.innerHTML = html;

        // Auto-check interactions
        document.getElementById('chk-hbond').checked = true;
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

    populateSequenceViewer() {
        const data = this.viewer.getChainData();
        this.sequenceData = data; // Store for switching

        const select = document.getElementById('seq-chain-select');
        select.innerHTML = '';

        data.chains.forEach(chain => {
            const opt = document.createElement('option');
            opt.value = chain;
            opt.textContent = `Chain ${chain}`;
            select.appendChild(opt);
        });

        if (data.chains.length > 0) {
            this.renderSequenceRail(data.chains[0]);
        }
    }

    renderSequenceRail(chainName) {
        const rail = document.getElementById('seq-rail');
        rail.innerHTML = '';

        const residues = this.sequenceData.residueMap[chainName] || [];
        residues.forEach(res => {
            const el = document.createElement('div');
            el.className = 'seq-res';
            el.textContent = `${res.resno} ${res.resname}`;
            el.style.cssText = "padding: 2px 5px; cursor: pointer; border-bottom: 1px solid #222; font-size: 11px; color: #aaa;";

            el.addEventListener('click', () => {
                // Highlight logic
                this.viewer.highlightResidue(res.resno, chainName);

                // Visual feedback
                document.querySelectorAll('.seq-res').forEach(d => d.style.background = 'transparent');
                el.style.background = '#F8C300';
                el.style.color = '#000';
            });

            rail.appendChild(el);
        });
    }

    calcDistance(a1, a2) {
        const dx = a1.x - a2.x;
        const dy = a1.y - a2.y;
        const dz = a1.z - a2.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz).toFixed(2);
    }

    addMeasurementUI(val) {
        const list = document.getElementById('measurement-list');
        const d = document.createElement('div');
        d.className = 'measurement-item';
        d.innerHTML = `<span>Distance</span> <span>${val} Å</span> <button style="padding:0 4px;">X</button>`;
        d.style.cssText = "display: flex; justify-content: space-between; padding: 5px; border-bottom: 1px solid #222; font-size: 12px;";

        d.querySelector('button').addEventListener('click', () => d.remove());
        list.appendChild(d);
    }
}

// Init
window.app = new App();
