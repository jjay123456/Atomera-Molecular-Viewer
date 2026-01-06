from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum

class JobStage(str, Enum):
    QUEUED = "QUEUED"
    STRUCTURE = "STRUCTURE"
    POCKETS = "POCKETS"
    AFFINITY = "AFFINITY"
    DONE = "DONE"
    ERROR = "ERROR"

class ProteinUploadResponse(BaseModel):
    protein_id: str
    filename: str
    stats: Dict[str, Any]

class LigandUploadResponse(BaseModel):
    ligand_set_id: str
    ligand_count: int
    filenames: List[str]

class SequenceSubmission(BaseModel):
    header: str
    sequence: str

class SmilesSubmission(BaseModel):
    smiles_list: List[str]
    gen3d: bool = True

class JobRequest(BaseModel):
    protein_id: Optional[str] = None
    ligand_set_id: Optional[str] = None
    # For now, simple config
    pocket_mode: str = "auto" 
    affinity_mode: str = "boltz2"

class JobStatusResponse(BaseModel):
    job_id: str
    status: JobStage
    message: Optional[str] = None
    created_at: float

class JobResultSummary(BaseModel):
    job_id: str
    ranked_ligands: List[Dict[str, Any]]
    pockets: List[Dict[str, Any]]
