import time
import os
import json
from ..models.schemas import JobStage

# Mock data generation
def run_job_flow(job_id: str, job_store: dict):
    """
    Simulates the Atomera pipeline: ESMFold -> P2Rank -> Boltz-2
    """
    try:
        # Step 1: Structure
        job_store[job_id]["status"] = JobStage.STRUCTURE
        time.sleep(2) # Simulate ESMFold
        # In a real app, we'd read inputs and run inference.
        # Here we just assume success.
        
        # Step 2: Pockets
        job_store[job_id]["status"] = JobStage.POCKETS
        time.sleep(2) # Simulate P2Rank
        
        # Mock Pockets
        pockets = [
            {"id": 1, "score": 0.95, "center": [10.0, 15.5, 20.0], "residues": ["A:123", "A:124", "A:126"]},
            {"id": 2, "score": 0.82, "center": [-5.0, 10.0, 5.0], "residues": ["A:45", "A:46"]},
        ]
        
        # Step 3: Affinity
        job_store[job_id]["status"] = JobStage.AFFINITY
        time.sleep(2) # Simulate Boltz-2
        
        # Mock Results
        ranked_ligands = [
            {
                "ligand_id": "lig_1", 
                "score": -9.5, 
                "affinity_type": "pIC50",
                "binder_prob": 0.98,
                "confidence": "High"
            },
            {
                "ligand_id": "lig_2", 
                "score": -7.2, 
                "affinity_type": "pIC50",
                "binder_prob": 0.65,
                "confidence": "Medium"
            }
        ]
        
        # Save results to a "file" (mocked via store for now, or real file)
        # For simplicity in this stub, we put it in the store.
        job_store[job_id]["results"] = {
            "pockets": pockets,
            "ranked_ligands": ranked_ligands
        }
        
        job_store[job_id]["status"] = JobStage.DONE
        
    except Exception as e:
        job_store[job_id]["status"] = JobStage.ERROR
        job_store[job_id]["message"] = str(e)
