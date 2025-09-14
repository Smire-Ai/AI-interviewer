from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, Form
from sqlalchemy.orm import Session
from app.models.database import get_db, Resume, JobDescription
from app.services.resume_extractor import ResumeExtractor
from typing import Optional
import json

router = APIRouter()
resume_extractor = ResumeExtractor()

@router.post("/upload")
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload and process a resume file"""
    try:
        # Validate file type
        if not file.filename.lower().endswith(('.pdf', '.docx', '.doc')):
            raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
        
        # Read file content
        file_content = await file.read()
        
        # Process resume
        extracted_data = resume_extractor.process_resume(file_content, file.filename)
        
        # Save to database
        resume = Resume(
            filename=file.filename,
            content=extracted_data["content"],
            skills=extracted_data["skills"],
            experience=extracted_data["experience"],
            education=extracted_data["education"],
            contact_info=extracted_data["contact_info"]
        )
        
        db.add(resume)
        db.commit()
        db.refresh(resume)
        
        return {
            "message": "Resume uploaded successfully",
            "resume_id": resume.id,
            "filename": resume.filename,
            "skills": json.loads(resume.skills),
            "contact_info": json.loads(resume.contact_info)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing resume: {str(e)}")

@router.get("/list")
async def list_resumes(db: Session = Depends(get_db)):
    """List all uploaded resumes"""
    resumes = db.query(Resume).all()
    return [
        {
            "id": resume.id,
            "filename": resume.filename,
            "skills": json.loads(resume.skills) if resume.skills else [],
            "created_at": resume.created_at
        }
        for resume in resumes
    ]

@router.get("/{resume_id}")
async def get_resume(resume_id: int, db: Session = Depends(get_db)):
    """Get resume details by ID"""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    return {
        "id": resume.id,
        "filename": resume.filename,
        "content": resume.content,
        "skills": json.loads(resume.skills) if resume.skills else [],
        "experience": resume.experience,
        "education": resume.education,
        "contact_info": json.loads(resume.contact_info) if resume.contact_info else {},
        "created_at": resume.created_at
    }

@router.delete("/{resume_id}")
async def delete_resume(resume_id: int, db: Session = Depends(get_db)):
    """Delete a resume"""
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    db.delete(resume)
    db.commit()
    
    return {"message": "Resume deleted successfully"}

@router.post("/job-description")
async def create_job_description(
    title: str = Form(...),
    content: str = Form(...),
    required_skills: str = Form(...),
    experience_level: str = Form(...),
    db: Session = Depends(get_db)
):
    """Create a new job description"""
    try:
        # Parse required skills as JSON array
        skills_list = json.loads(required_skills) if required_skills.startswith('[') else [skill.strip() for skill in required_skills.split(',')]
        
        job_description = JobDescription(
            title=title,
            content=content,
            required_skills=json.dumps(skills_list),
            experience_level=experience_level
        )
        
        db.add(job_description)
        db.commit()
        db.refresh(job_description)
        
        return {
            "message": "Job description created successfully",
            "jd_id": job_description.id,
            "title": job_description.title
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating job description: {str(e)}")

@router.get("/job-description/list")
async def list_job_descriptions(db: Session = Depends(get_db)):
    """List all job descriptions"""
    job_descriptions = db.query(JobDescription).all()
    return [
        {
            "id": jd.id,
            "title": jd.title,
            "experience_level": jd.experience_level,
            "required_skills": json.loads(jd.required_skills) if jd.required_skills else [],
            "created_at": jd.created_at
        }
        for jd in job_descriptions
    ]

@router.get("/job-description/{jd_id}")
async def get_job_description(jd_id: int, db: Session = Depends(get_db)):
    """Get job description details by ID"""
    jd = db.query(JobDescription).filter(JobDescription.id == jd_id).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found")
    
    return {
        "id": jd.id,
        "title": jd.title,
        "content": jd.content,
        "required_skills": json.loads(jd.required_skills) if jd.required_skills else [],
        "experience_level": jd.experience_level,
        "created_at": jd.created_at
    }