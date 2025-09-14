"""
Admin routes for system management
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta

from ..models.database import get_db, User, InterviewSession, InterviewQuestion, ATSScore
from .auth import get_current_user

router = APIRouter()

# Pydantic models
class UserAdmin(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    company: Optional[str]
    position: Optional[str]
    is_active: bool
    created_at: datetime

class SystemStats(BaseModel):
    total_users: int
    total_hr_users: int
    total_candidates: int
    total_sessions: int
    completed_sessions: int
    active_sessions: int
    average_session_duration: Optional[float]
    total_questions: int
    total_answers: int

class UserUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[str] = None

# Admin check decorator
async def check_admin_access(current_user: User = Depends(get_current_user)):
    """Check if user has admin access (HR users for now)"""
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.get("/stats", response_model=SystemStats)
async def get_system_stats(
    admin_user: User = Depends(check_admin_access),
    db: Session = Depends(get_db)
):
    """Get system statistics"""
    # User stats
    total_users = db.query(User).count()
    total_hr_users = db.query(User).filter(User.role == "hr").count()
    total_candidates = db.query(User).filter(User.role == "candidate").count()
    
    # Session stats
    total_sessions = db.query(InterviewSession).count()
    completed_sessions = db.query(InterviewSession).filter(InterviewSession.status == "completed").count()
    active_sessions = db.query(InterviewSession).filter(InterviewSession.status == "in_progress").count()
    
    # Calculate average session duration
    completed_session_data = db.query(InterviewSession).filter(
        InterviewSession.status == "completed",
        InterviewSession.started_at.isnot(None),
        InterviewSession.ended_at.isnot(None)
    ).all()
    
    if completed_session_data:
        durations = []
        for session in completed_session_data:
            duration = (session.ended_at - session.started_at).total_seconds() / 60  # in minutes
            durations.append(duration)
        average_session_duration = sum(durations) / len(durations)
    else:
        average_session_duration = None
    
    # Question and answer stats
    total_questions = db.query(InterviewQuestion).count()
    total_answers = db.query(InterviewQuestion).filter(InterviewQuestion.candidate_answer.isnot(None)).count()
    
    return SystemStats(
        total_users=total_users,
        total_hr_users=total_hr_users,
        total_candidates=total_candidates,
        total_sessions=total_sessions,
        completed_sessions=completed_sessions,
        active_sessions=active_sessions,
        average_session_duration=average_session_duration,
        total_questions=total_questions,
        total_answers=total_answers
    )

@router.get("/users", response_model=List[UserAdmin])
async def get_all_users(
    admin_user: User = Depends(check_admin_access),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100,
    role_filter: Optional[str] = None
):
    """Get all users with admin details"""
    query = db.query(User)
    
    if role_filter:
        query = query.filter(User.role == role_filter)
    
    users = query.offset(skip).limit(limit).all()
    
    return [
        UserAdmin(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            company=user.company,
            position=user.position,
            is_active=user.is_active,
            created_at=user.created_at
        )
        for user in users
    ]

@router.get("/users/{user_id}", response_model=UserAdmin)
async def get_user_details(
    user_id: int,
    admin_user: User = Depends(check_admin_access),
    db: Session = Depends(get_db)
):
    """Get detailed user information"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserAdmin(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        company=user.company,
        position=user.position,
        is_active=user.is_active,
        created_at=user.created_at
    )

@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    user_update: UserUpdate,
    admin_user: User = Depends(check_admin_access),
    db: Session = Depends(get_db)
):
    """Update user information (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent admin from deactivating themselves
    if user.id == admin_user.id and user_update.is_active is False:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
    
    if user_update.is_active is not None:
        user.is_active = user_update.is_active
    
    if user_update.role is not None:
        if user_update.role not in ["hr", "candidate"]:
            raise HTTPException(status_code=400, detail="Invalid role")
        user.role = user_update.role
    
    db.commit()
    
    return {"message": "User updated successfully"}

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin_user: User = Depends(check_admin_access),
    db: Session = Depends(get_db)
):
    """Delete a user account (admin only)"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent admin from deleting themselves
    if user.id == admin_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    # Check if user has associated sessions
    user_sessions = db.query(InterviewSession).filter(
        (InterviewSession.hr_id == user_id) | (InterviewSession.candidate_id == user_id)
    ).count()
    
    if user_sessions > 0:
        # Instead of deleting, deactivate the user to preserve data integrity
        user.is_active = False
        db.commit()
        return {"message": "User deactivated (has associated interview sessions)"}
    else:
        # Safe to delete
        db.delete(user)
        db.commit()
        return {"message": "User deleted successfully"}

@router.get("/sessions")
async def get_all_sessions(
    admin_user: User = Depends(check_admin_access),
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 50,
    status_filter: Optional[str] = None
):
    """Get all interview sessions with admin details"""
    query = db.query(InterviewSession)
    
    if status_filter:
        query = query.filter(InterviewSession.status == status_filter)
    
    sessions = query.offset(skip).limit(limit).all()
    
    result = []
    for session in sessions:
        hr_user = db.query(User).filter(User.id == session.hr_id).first()
        candidate_user = db.query(User).filter(User.id == session.candidate_id).first() if session.candidate_id else None
        
        # Get question count
        question_count = db.query(InterviewQuestion).filter(InterviewQuestion.session_id == session.id).count()
        answered_count = db.query(InterviewQuestion).filter(
            InterviewQuestion.session_id == session.id,
            InterviewQuestion.candidate_answer.isnot(None)
        ).count()
        
        # Get ATS score if available
        ats_score = db.query(ATSScore).filter(ATSScore.session_id == session.id).first()
        
        result.append({
            "id": session.id,
            "session_id": session.session_id,
            "hr_name": hr_user.full_name,
            "hr_email": hr_user.email,
            "candidate_name": candidate_user.full_name if candidate_user else None,
            "candidate_email": candidate_user.email if candidate_user else None,
            "job_title": session.job_title,
            "status": session.status,
            "scheduled_time": session.scheduled_time,
            "started_at": session.started_at,
            "ended_at": session.ended_at,
            "created_at": session.created_at,
            "question_count": question_count,
            "answered_count": answered_count,
            "ats_overall_score": ats_score.overall_score if ats_score else None,
            "face_detection_enabled": session.face_detection_enabled,
            "voice_feedback_enabled": session.voice_feedback_enabled,
            "ats_scoring_enabled": session.ats_scoring_enabled
        })
    
    return result

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    admin_user: User = Depends(check_admin_access),
    db: Session = Depends(get_db)
):
    """Delete an interview session and all associated data"""
    session = db.query(InterviewSession).filter(InterviewSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Delete associated data in order
    # Delete ATS scores
    db.query(ATSScore).filter(ATSScore.session_id == session.id).delete()
    
    # Delete interview questions
    db.query(InterviewQuestion).filter(InterviewQuestion.session_id == session.id).delete()
    
    # Delete the session
    db.delete(session)
    db.commit()
    
    return {"message": "Session and all associated data deleted successfully"}

@router.get("/analytics/usage")
async def get_usage_analytics(
    admin_user: User = Depends(check_admin_access),
    db: Session = Depends(get_db),
    days: int = 30
):
    """Get usage analytics for the past N days"""
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # New users registered
    new_users = db.query(User).filter(User.created_at >= start_date).count()
    new_hr_users = db.query(User).filter(
        User.created_at >= start_date,
        User.role == "hr"
    ).count()
    new_candidates = db.query(User).filter(
        User.created_at >= start_date,
        User.role == "candidate"
    ).count()
    
    # Sessions created and completed
    sessions_created = db.query(InterviewSession).filter(InterviewSession.created_at >= start_date).count()
    sessions_completed = db.query(InterviewSession).filter(
        InterviewSession.ended_at >= start_date,
        InterviewSession.status == "completed"
    ).count()
    
    # Active features usage
    face_detection_usage = db.query(InterviewSession).filter(
        InterviewSession.created_at >= start_date,
        InterviewSession.face_detection_enabled == True
    ).count()
    
    voice_feedback_usage = db.query(InterviewSession).filter(
        InterviewSession.created_at >= start_date,
        InterviewSession.voice_feedback_enabled == True
    ).count()
    
    ats_scoring_usage = db.query(InterviewSession).filter(
        InterviewSession.created_at >= start_date,
        InterviewSession.ats_scoring_enabled == True
    ).count()
    
    return {
        "period_days": days,
        "start_date": start_date.isoformat(),
        "end_date": datetime.utcnow().isoformat(),
        "new_users": {
            "total": new_users,
            "hr_users": new_hr_users,
            "candidates": new_candidates
        },
        "sessions": {
            "created": sessions_created,
            "completed": sessions_completed,
            "completion_rate": (sessions_completed / sessions_created * 100) if sessions_created > 0 else 0
        },
        "feature_usage": {
            "face_detection_enabled": face_detection_usage,
            "voice_feedback_enabled": voice_feedback_usage,
            "ats_scoring_enabled": ats_scoring_usage,
            "face_detection_rate": (face_detection_usage / sessions_created * 100) if sessions_created > 0 else 0,
            "voice_feedback_rate": (voice_feedback_usage / sessions_created * 100) if sessions_created > 0 else 0,
            "ats_scoring_rate": (ats_scoring_usage / sessions_created * 100) if sessions_created > 0 else 0
        }
    }