from fastapi import APIRouter, Depends, HTTPException
from app.db.supabase_client import supabase
from app.api.deps import get_current_user
from app.models.pydantic_models import JobCreate, ApplicationUpdate
from typing import List, Dict, Any

router = APIRouter()

def check_interviewer_role(current_user: Dict = Depends(get_current_user)):
    if current_user.get("role") != "interviewer":
        raise HTTPException(status_code=403, detail="Operation not permitted for this user role")
    return current_user

@router.post("/jobs", status_code=201)
def create_job(job: JobCreate, current_user: Dict = Depends(check_interviewer_role)):
    new_job = {
        "title": job.title,
        "description": job.description,
        "created_by": current_user["id"]
    }
    response = supabase.table("jobs").insert(new_job).execute()
    if response.data:
        return response.data[0]
    raise HTTPException(status_code=500, detail="Could not create job")

@router.get("/jobs/my-postings", response_model=List[Dict[str, Any]])
def get_my_job_postings(current_user: Dict = Depends(check_interviewer_role)):
    response = supabase.table("jobs").select("*").eq("created_by", current_user["id"]).order("created_at", desc=True).execute()
    return response.data

@router.get("/applications/{job_id}", response_model=List[Dict[str, Any]])
def get_applications_for_job(job_id: str, current_user: Dict = Depends(check_interviewer_role)):
    # First, verify this job belongs to the interviewer
    job_res = supabase.table("jobs").select("id").eq("id", job_id).eq("created_by", current_user["id"]).execute()
    if not job_res.data:
        raise HTTPException(status_code=404, detail="Job not found or access denied")
        
    # Fetch applications and join with candidate user details
    response = supabase.table("applications").select("*, candidate:users(full_name, email)").eq("job_id", job_id).execute()
    return response.data

@router.patch("/applications/{application_id}")
def update_application_status(application_id: str, status_update: ApplicationUpdate, current_user: Dict = Depends(check_interviewer_role)):
    # A more robust check would verify the application belongs to a job owned by the interviewer.
    response = supabase.table("applications").update({"status": status_update.status}).eq("id", application_id).execute()
    if response.data:
        return response.data[0]
    raise HTTPException(status_code=404, detail="Application not found")