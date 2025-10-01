# backend/app/models/pydantic_models.py

from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional, Dict, Any

# --- User & Auth ---
class UserCreate(BaseModel):
    email: EmailStr
    # ADD VALIDATION HERE: min_length=8, max_length=72
    password: str = Field(..., min_length=8, max_length=72)
    full_name: str
    role: str # 'candidate' or 'interviewer'

class UserLogin(BaseModel):
    email: EmailStr
    password: str

# ... (the rest of the file remains the same) ...
class Token(BaseModel):
    access_token: str
    token_type: str
    user_info: Dict[str, Any]

class TokenData(BaseModel):
    email: Optional[str] = None

# --- Job ---
class JobCreate(BaseModel):
    title: str
    description: str

class Job(JobCreate):
    id: str
    created_by: str

# --- Application ---
class ApplicationCreate(BaseModel):
    job_id: str
    resume_text: str

class ApplicationUpdate(BaseModel):
    status: str # 'accepted' or 'rejected'

# --- Interview ---
class InterviewResponse(BaseModel):
    application_id: str
    conversation_history: List[Dict[str, str]]
    user_answer: str

class InterviewComplete(BaseModel):
    application_id: str
    transcript: List[Dict[str, str]]
    proctoring_notes: List[Dict[str, Any]]