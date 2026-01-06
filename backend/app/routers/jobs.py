from fastapi import APIRouter, BackgroundTasks, HTTPException
from ..models.schemas import JobRequest, JobStatusResponse, JobStage
from ..workers.stubs import run_job_flow
import uuid
import time

router = APIRouter()

# Simple in-memory job store for prototype
# In production, this would be Redis/DB
JOBS_DB = {} 

@router.post("/jobs", response_model=JobStatusResponse)
async def create_job(request: JobRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    
    job_info = {
        "job_id": job_id,
        "status": JobStage.QUEUED,
        "created_at": time.time(),
        "request": request.dict()
    }
    JOBS_DB[job_id] = job_info
    
    # Dispatch worker (using BackgroundTasks for simpler prototype than Celery)
    background_tasks.add_task(run_job_flow, job_id, JOBS_DB)
    
    return JobStatusResponse(**job_info)

@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    if job_id not in JOBS_DB:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JobStatusResponse(**JOBS_DB[job_id])
