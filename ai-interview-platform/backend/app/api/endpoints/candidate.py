from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from app.db.supabase_client import supabase
from app.api.deps import get_current_user
from app.services.ai_services import parse_pdf_resume, analyze_resume_with_ai
from typing import List, Dict, Any
import json

router = APIRouter()

def check_candidate_role(current_user: Dict = Depends(get_current_user)):
    if current_user.get("role") != "candidate":
        raise HTTPException(status_code=403, detail="Operation not permitted for this user role")
    return current_user

@router.get("/jobs", response_model=List[Dict[str, Any]])
def get_available_jobs(current_user: Dict = Depends(check_candidate_role)):
    response = supabase.table("jobs").select("*").order("created_at", desc=True).execute()
    return response.data

@router.post("/applications", status_code=201)
async def submit_application(
    job_id: str = Form(...),
    resume: UploadFile = File(...),
    current_user: Dict = Depends(check_candidate_role)
):
    # Check if already applied
    existing_app = supabase.table("applications").select("id").eq("job_id", job_id).eq("candidate_id", current_user["id"]).execute()
    if existing_app.data:
        raise HTTPException(status_code=400, detail="You have already applied for this job")

    # Get job description
    job_res = supabase.table("jobs").select("description").eq("id", job_id).execute()
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job not found")
    job_description = job_res.data[0]["description"]

    # Process resume
    resume_bytes = await resume.read()
    resume_text = parse_pdf_resume(resume_bytes)

    if not resume_text:
        raise HTTPException(status_code=400, detail="Could not read text from resume PDF.")

    # AI Analysis
    ai_summary = analyze_resume_with_ai(resume_text, job_description)

    # Save to DB
    new_application = {
        "job_id": job_id,
        "candidate_id": current_user["id"],
        "resume_text": resume_text,
        "ai_summary": json.dumps(ai_summary),
        "match_score": ai_summary.get("match_score", 0)
    }
    
    response = supabase.table("applications").insert(new_application).execute()
    if response.data:
        return response.data[0]
    raise HTTPException(status_code=500, detail="Could not submit application")


@router.get("/my-applications", response_model=List[Dict[str, Any]])
def get_my_applications(current_user: Dict = Depends(check_candidate_role)):
    response = supabase.table("applications").select("*, job:jobs(title, description)").eq("candidate_id", current_user["id"]).order("created_at", desc=True).execute()
    return response.data