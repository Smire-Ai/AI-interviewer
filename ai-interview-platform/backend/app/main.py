# backend/app/main.py (MODIFIED)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import auth, interviewer, candidate, interview # The import is okay

app = FastAPI(
    title="AI Interview Platform API",
    description="Backend services for the AI Interview Platform.",
    version="1.0.0"
)

# ... (CORS configuration remains the same) ...
origins = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://192.168.1.13:5500",
    "http://127.0.0.1:",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(interviewer.router, prefix="/interviewer", tags=["Interviewer"])
app.include_router(candidate.router, prefix="/candidate", tags=["Candidate"])

# ** THIS IS THE CHANGE **
# app.include_router(interview.router, prefix="/interview", tags=["Interview"]) # Comment this line out

@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to the AI Interview Platform API"}