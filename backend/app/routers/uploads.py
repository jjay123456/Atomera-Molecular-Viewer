from fastapi import APIRouter, File, UploadFile, HTTPException
from typing import List
import uuid
import os
import shutil
from ..models.schemas import ProteinUploadResponse, LigandUploadResponse, SequenceSubmission, SmilesSubmission

router = APIRouter()

UPLOAD_DIR = "/app/compute/uploads" # Matches docker volume

# Ensure upload dir exists (in real app, use lifecycle event or check)
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/protein/upload", response_model=ProteinUploadResponse)
async def upload_protein(file: UploadFile = File(...)):
    protein_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{protein_id}_{file.filename}")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Mock stats
    return ProteinUploadResponse(
        protein_id=protein_id,
        filename=file.filename,
        stats={"chains": 1, "residues": 0, "atoms": 0} # Real stats would utilize a parser
    )

@router.post("/protein/sequence", response_model=ProteinUploadResponse)
async def submit_sequence(submission: SequenceSubmission):
    protein_id = str(uuid.uuid4())
    # Save sequence to a file to simulate processing flow
    file_path = os.path.join(UPLOAD_DIR, f"{protein_id}.fasta")
    with open(file_path, "w") as f:
        f.write(f">{submission.header}\n{submission.sequence}")
        
    return ProteinUploadResponse(
        protein_id=protein_id,
        filename="sequence.fasta",
        stats={"length": len(submission.sequence)}
    )

@router.post("/ligand/upload", response_model=LigandUploadResponse)
async def upload_ligands(files: List[UploadFile] = File(...)):
    ligand_set_id = str(uuid.uuid4())
    saved_files = []
    
    # Create specific dir for this set
    set_dir = os.path.join(UPLOAD_DIR, ligand_set_id)
    os.makedirs(set_dir, exist_ok=True)

    for file in files:
        file_path = os.path.join(set_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        saved_files.append(file.filename)
        
    return LigandUploadResponse(
        ligand_set_id=ligand_set_id,
        ligand_count=len(saved_files),
        filenames=saved_files
    )

@router.post("/ligand/smiles", response_model=LigandUploadResponse)
async def submit_smiles(submission: SmilesSubmission):
    ligand_set_id = str(uuid.uuid4())
    set_dir = os.path.join(UPLOAD_DIR, ligand_set_id)
    os.makedirs(set_dir, exist_ok=True)
    
    # Save as .smi
    with open(os.path.join(set_dir, "input.smi"), "w") as f:
        for smi in submission.smiles_list:
            f.write(f"{smi}\n")
            
    return LigandUploadResponse(
        ligand_set_id=ligand_set_id,
        ligand_count=len(submission.smiles_list),
        filenames=["input.smi"]
    )
