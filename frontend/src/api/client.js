const API_BASE = "http://localhost:8000/api";

export const API = {
    async uploadProtein(file) {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`${API_BASE}/protein/upload`, {
            method: "POST",
            body: formData
        });
        return res.json();
    },

    async uploadLigand(file) {
        const formData = new FormData();
        formData.append("files", file); // Backend expects list, but we mock single for now or adjust

        // Backend expects 'files' list in current upload_ligands router
        // Let's adjust based on router: "files: List[UploadFile]"

        const res = await fetch(`${API_BASE}/ligand/upload`, {
            method: "POST",
            body: formData
        });
        return res.json();
    },

    async createJob(proteinId, ligandSetId) {
        const res = await fetch(`${API_BASE}/jobs`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                protein_id: proteinId,
                ligand_set_id: ligandSetId,
                pocket_mode: "auto"
            })
        });
        return res.json();
    },

    async getJobStatus(jobId) {
        const res = await fetch(`${API_BASE}/jobs/${jobId}`);
        return res.json();
    },

    async getResults(jobId) {
        const res = await fetch(`${API_BASE}/jobs/${jobId}/results/summary`);
        return res.json();
    }
};
