from fastapi import APIRouter, HTTPException
from typing import Dict, Any
from ..routers.jobs import JOBS_DB # Sharing memory for prototype
from ..models.schemas import JobResultSummary, JobStage

router = APIRouter()

@router.get("/jobs/{job_id}/results/summary", response_model=JobResultSummary)
async def get_job_summary(job_id: str):
    if job_id not in JOBS_DB:
        raise HTTPException(status_code=404, detail="Job not found")
        
    job = JOBS_DB[job_id]
    
    if job["status"] != JobStage.DONE:
        raise HTTPException(status_code=400, detail="Job not complete")
        
    results = job.get("results", {})
    
    return JobResultSummary(
        job_id=job_id,
        ranked_ligands=results.get("ranked_ligands", []),
        pockets=results.get("pockets", [])
    )
    
@router.get("/jobs/{job_id}/results/ligand/{ligand_id}")
async def get_ligand_details(job_id: str, ligand_id: str):
    """
    Returns specific complex structure and interactions.
    Mocked to return static content for now.
    """
    return {
        "complex_url": f"/static/{job_id}/{ligand_id}_complex.pdb",
        "interactions": [
            {"residue": "A:ASP:112", "type": "H-Bond", "dist": "2.1"},
            {"residue": "A:PHE:204", "type": "Hydrophobic", "dist": "3.5"},
        ]
    }
