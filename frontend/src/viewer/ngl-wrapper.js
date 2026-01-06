import * as NGL from 'ngl';

export class NGLWrapper {
    constructor(containerId) {
        this.stage = new NGL.Stage(containerId, {
            backgroundColor: "black"
        });
        this.proteinComponent = null;
        this.ligandComponents = [];

        // Resize logic
        window.addEventListener("resize", () => {
            this.stage.handleResize();
        });
    }

    async loadProtein(blobOrUrl) {
        this.stage.removeAllComponents();
        this.proteinComponent = await this.stage.loadFile(blobOrUrl, { defaultRepresentation: true });
        this.proteinComponent.autoView();

        // Set default aesthetic (Cartoon)
        this.proteinComponent.removeAllRepresentations();
        this.proteinComponent.addRepresentation("cartoon", {
            colorScheme: "chainid"
        });
    }

    async loadLigand(blobOrUrl) {
        const comp = await this.stage.loadFile(blobOrUrl);
        this.ligandComponents.push(comp);

        comp.removeAllRepresentations();
        comp.addRepresentation("ball+stick", {
            multipleBond: true
        });

        // Auto zoom to ligand?
        comp.autoView();
    }

    setRepresentation(type) {
        if (!this.proteinComponent) return;

        this.proteinComponent.removeAllRepresentations();

        if (type === 'cartoon') {
            this.proteinComponent.addRepresentation("cartoon", { colorScheme: "chainid" });
        } else if (type === 'surface') {
            this.proteinComponent.addRepresentation("surface", { opacity: 0.5, side: "front" });
        } else if (type === 'ball+stick') {
            this.proteinComponent.addRepresentation("ball+stick");
        }

        this.stage.handleResize();
    }

    getChainData() {
        if (!this.proteinComponent) return { chains: [], residueMap: {} };

        const structure = this.proteinComponent.structure;
        const chains = [];
        const residueMap = {}; // chain -> [residues]

        structure.eachChain(cp => {
            chains.push(cp.chainname);
            residueMap[cp.chainname] = [];
            cp.eachResidue(rp => {
                residueMap[cp.chainname].push({
                    resno: rp.resno,
                    resname: rp.resname,
                    index: rp.index // global index
                });
            });
        });

        return { chains, residueMap };
    }

    highlightResidue(resno, chainName) {
        // Remove previous highlight
        this.stage.getComponentsByName("highlight").list.forEach(c => this.stage.removeComponent(c));

        const sele = `${resno}:${chainName}`;
        this.proteinComponent.addRepresentation("licorice", {
            sele: sele,
            color: "yellow",
            name: "highlight"
        });

        // Center view on this selection
        const center = this.proteinComponent.structure.getAtomSetWithinSelection(new NGL.Selection(sele)).center;
        this.stage.animationControls.zoomTo(center, 2000);
    }

    setSelectionMode(mode, callback) {
        this.stage.signals.clicked.removeAll(); // clear old

        if (mode === 'picking') {
            this.stage.signals.clicked.add((pickingProxy) => {
                if (pickingProxy && (pickingProxy.atom || pickingProxy.bond)) {
                    const atom = pickingProxy.atom || pickingProxy.closestBondAtom;
                    if (callback) callback(atom);
                }
            });
        }
    }

    addDistanceRepresentation(atom1, atom2) {
        this.stage.addComponentFromObject({
            type: "structure",
            name: "distance-measure",
            structure: {
                metadata: {},
                atoms: [
                    { name: "A", element: "C", x: atom1.x, y: atom1.y, z: atom1.z },
                    { name: "B", element: "C", x: atom2.x, y: atom2.y, z: atom2.z }
                ],
                bonds: [[0, 1]]
            }
        }).then(comp => {
            comp.addRepresentation("distance", { labelUnit: "angstrom" });
        });
    }

    screenshot() {
        this.stage.makeImage({ factor: 1, antialias: true, trim: false }).then((blob) => {
            NGL.download(blob, "atomera_screenshot.png");
        });
    }
}
