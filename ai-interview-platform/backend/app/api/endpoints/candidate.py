# backend/app/api/endpoints/candidate.py (MODIFIED)

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from app.db.supabase_client import supabase
from app.api.deps import get_current_user
from app.services.ai_services import analyze_resume_with_ai
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

    # Read the resume file into memory
    resume_bytes = await resume.read()

    # ** THIS IS THE CHANGE **
    # Pass the raw file bytes and job description to the AI service
    ai_summary_data = analyze_resume_with_ai(
        resume_file_bytes=resume_bytes,
        job_description=job_description,
        file_name=resume.filename
    )

    # Save to DB
    new_application = {
        "job_id": job_id,
        "candidate_id": current_user["id"],
        "resume_text": "Parsed text not stored, analysis is in ai_summary.", # We no longer need to store the full text
        "ai_summary": json.dumps(ai_summary_data),
        "match_score": ai_summary_data.get("overall_score", 0) # Use the new overall_score field
    }
    
    response = supabase.table("applications").insert(new_application).execute()
    if response.data:
        return response.data[0]
    raise HTTPException(status_code=500, detail="Could not submit application")


@router.get("/my-applications", response_model=List[Dict[str, Any]])
def get_my_applications(current_user: Dict = Depends(check_candidate_role)):
    response = supabase.table("applications").select("*, job:jobs(title, description)").eq("candidate_id", current_user["id"]).order("created_at", desc=True).execute()
    return response.data