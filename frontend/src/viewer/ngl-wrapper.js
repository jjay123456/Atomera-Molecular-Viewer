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

    screenshot() {
        this.stage.makeImage({ factor: 1, antialias: true }).then((blob) => {
            NGL.download(blob, "atomera_screenshot.png");
        });
    }
}
