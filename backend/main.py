"""
AI Interview Platform - Main Application
Role-based interview platform with AI features
"""

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.routes import auth, interview, ats, admin
from app.models.database import create_tables

app = FastAPI(
    title="AI Interview Platform",
    description="Role-based AI Interview Platform with ATS scoring and MediaPipe integration",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files and templates
app.mount("/static", StaticFiles(directory="../frontend/static"), name="static")
templates = Jinja2Templates(directory="../frontend/templates")

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(interview.router, prefix="/api/interview", tags=["interview"])
app.include_router(ats.router, prefix="/api/ats", tags=["ats"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

@app.on_event("startup")
async def startup_event():
    """Create database tables on startup"""
    create_tables()

@app.get("/")
async def home(request: Request):
    """Home page route"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/hr")
async def hr_dashboard(request: Request):
    """HR dashboard route"""
    return templates.TemplateResponse("hr_dashboard.html", {"request": request})

@app.get("/candidate")
async def candidate_dashboard(request: Request):
    """Candidate dashboard route"""
    return templates.TemplateResponse("candidate_dashboard.html", {"request": request})

@app.get("/interview/{session_id}")
async def interview_room(request: Request, session_id: str):
    """Interview room route"""
    return templates.TemplateResponse("interview_room.html", {
        "request": request, 
        "session_id": session_id
    })

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)