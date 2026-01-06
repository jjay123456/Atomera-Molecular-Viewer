from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import uploads, jobs, results

app = FastAPI(title="Atomera API", version="1.0.0")

# CORS middleware to allow frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(uploads.router, prefix="/api", tags=["uploads"])
app.include_router(jobs.router, prefix="/api", tags=["jobs"])
app.include_router(results.router, prefix="/api", tags=["results"])

@app.get("/")
async def root():
    return {"message": "Atomera Backend API"}
