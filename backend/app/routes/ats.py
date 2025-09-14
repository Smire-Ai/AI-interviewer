"""
ATS (Applicant Tracking System) scoring routes
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from ..models.database import get_db, User, InterviewSession, ATSScore, InterviewQuestion
from ..services.ats_service import ATSService
from .auth import get_current_user

router = APIRouter()

# Pydantic models
class ATSScoreResponse(BaseModel):
    id: int
    session_id: int
    overall_score: float
    technical_score: float
    behavioral_score: float
    communication_score: float
    keyword_match_score: float
    experience_score: float
    education_score: float
    strengths: Optional[str]
    weaknesses: Optional[str]
    recommendations: Optional[str]
    created_at: datetime

class ATSAnalysisRequest(BaseModel):
    resume_text: Optional[str] = None
    job_requirements: Optional[str] = None

class SessionATSReport(BaseModel):
    session_info: dict
    ats_score: ATSScoreResponse
    question_scores: List[dict]
    overall_analysis: dict

# Initialize ATS service
ats_service = ATSService()

@router.get("/scores/{session_id}", response_model=ATSScoreResponse)
async def get_ats_score(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get ATS score for a specific interview session"""
    # Find session
    session = db.query(InterviewSession).filter(InterviewSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check permissions
    if current_user.role == "hr" and session.hr_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == "candidate" and session.candidate_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get ATS score
    ats_score = db.query(ATSScore).filter(ATSScore.session_id == session.id).first()
    if not ats_score:
        raise HTTPException(status_code=404, detail="ATS score not found. The interview may not be completed yet.")
    
    return ATSScoreResponse(
        id=ats_score.id,
        session_id=ats_score.session_id,
        overall_score=ats_score.overall_score,
        technical_score=ats_score.technical_score,
        behavioral_score=ats_score.behavioral_score,
        communication_score=ats_score.communication_score,
        keyword_match_score=ats_score.keyword_match_score,
        experience_score=ats_score.experience_score,
        education_score=ats_score.education_score,
        strengths=ats_score.strengths,
        weaknesses=ats_score.weaknesses,
        recommendations=ats_score.recommendations,
        created_at=ats_score.created_at
    )

@router.post("/scores/{session_id}/generate")
async def generate_ats_score(
    session_id: str,
    analysis_request: ATSAnalysisRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate or regenerate ATS score for a session (HR only)"""
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR users can generate ATS scores")
    
    # Find session
    session = db.query(InterviewSession).filter(InterviewSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.hr_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not session.ats_scoring_enabled:
        raise HTTPException(status_code=400, detail="ATS scoring is not enabled for this session")
    
    # Get all questions and answers for the session
    questions = db.query(InterviewQuestion).filter(InterviewQuestion.session_id == session.id).all()
    
    if not questions:
        raise HTTPException(status_code=400, detail="No questions found for this session")
    
    # Prepare data for ATS analysis
    interview_data = {
        "job_title": session.job_title,
        "job_description": session.job_description,
        "questions_and_answers": [
            {
                "question": q.question_text,
                "answer": q.candidate_answer,
                "type": q.question_type,
                "individual_score": q.score
            }
            for q in questions if q.candidate_answer
        ],
        "resume_text": analysis_request.resume_text,
        "job_requirements": analysis_request.job_requirements or session.job_description
    }
    
    if not interview_data["questions_and_answers"]:
        raise HTTPException(status_code=400, detail="No answered questions found for ATS analysis")
    
    # Generate ATS score using the service
    ats_result = await ats_service.generate_comprehensive_score(interview_data)
    
    # Check if ATS score already exists
    existing_score = db.query(ATSScore).filter(ATSScore.session_id == session.id).first()
    
    if existing_score:
        # Update existing score
        existing_score.overall_score = ats_result["overall_score"]
        existing_score.technical_score = ats_result["technical_score"]
        existing_score.behavioral_score = ats_result["behavioral_score"]
        existing_score.communication_score = ats_result["communication_score"]
        existing_score.keyword_match_score = ats_result["keyword_match_score"]
        existing_score.experience_score = ats_result["experience_score"]
        existing_score.education_score = ats_result["education_score"]
        existing_score.strengths = ats_result["strengths"]
        existing_score.weaknesses = ats_result["weaknesses"]
        existing_score.recommendations = ats_result["recommendations"]
        existing_score.created_at = datetime.utcnow()
        
        db.commit()
        ats_score = existing_score
    else:
        # Create new ATS score
        ats_score = ATSScore(
            session_id=session.id,
            overall_score=ats_result["overall_score"],
            technical_score=ats_result["technical_score"],
            behavioral_score=ats_result["behavioral_score"],
            communication_score=ats_result["communication_score"],
            keyword_match_score=ats_result["keyword_match_score"],
            experience_score=ats_result["experience_score"],
            education_score=ats_result["education_score"],
            strengths=ats_result["strengths"],
            weaknesses=ats_result["weaknesses"],
            recommendations=ats_result["recommendations"]
        )
        
        db.add(ats_score)
        db.commit()
        db.refresh(ats_score)
    
    return ATSScoreResponse(
        id=ats_score.id,
        session_id=ats_score.session_id,
        overall_score=ats_score.overall_score,
        technical_score=ats_score.technical_score,
        behavioral_score=ats_score.behavioral_score,
        communication_score=ats_score.communication_score,
        keyword_match_score=ats_score.keyword_match_score,
        experience_score=ats_score.experience_score,
        education_score=ats_score.education_score,
        strengths=ats_score.strengths,
        weaknesses=ats_score.weaknesses,
        recommendations=ats_score.recommendations,
        created_at=ats_score.created_at
    )

@router.get("/reports/{session_id}", response_model=SessionATSReport)
async def get_complete_ats_report(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get complete ATS report including session info, scores, and analysis"""
    # Find session
    session = db.query(InterviewSession).filter(InterviewSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check permissions
    if current_user.role == "hr" and session.hr_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == "candidate" and session.candidate_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get ATS score
    ats_score = db.query(ATSScore).filter(ATSScore.session_id == session.id).first()
    if not ats_score:
        raise HTTPException(status_code=404, detail="ATS score not found")
    
    # Get questions and scores
    questions = db.query(InterviewQuestion).filter(InterviewQuestion.session_id == session.id).all()
    
    # Get user info
    hr_user = db.query(User).filter(User.id == session.hr_id).first()
    candidate_user = db.query(User).filter(User.id == session.candidate_id).first()
    
    # Prepare session info
    session_info = {
        "session_id": session.session_id,
        "job_title": session.job_title,
        "job_description": session.job_description,
        "status": session.status,
        "scheduled_time": session.scheduled_time.isoformat(),
        "started_at": session.started_at.isoformat() if session.started_at else None,
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "hr_name": hr_user.full_name,
        "candidate_name": candidate_user.full_name if candidate_user else None,
        "duration_minutes": (
            (session.ended_at - session.started_at).total_seconds() / 60
            if session.started_at and session.ended_at else None
        )
    }
    
    # Prepare question scores
    question_scores = [
        {
            "question_id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type,
            "candidate_answer": q.candidate_answer,
            "ai_feedback": q.ai_feedback,
            "score": q.score,
            "attention_score": q.attention_score,
            "confidence_score": q.confidence_score,
            "timestamp": q.timestamp.isoformat()
        }
        for q in questions
    ]
    
    # Prepare overall analysis
    overall_analysis = {
        "total_questions": len(questions),
        "answered_questions": len([q for q in questions if q.candidate_answer]),
        "average_score": sum([q.score for q in questions if q.score]) / len([q for q in questions if q.score]) if any(q.score for q in questions) else 0,
        "average_attention": sum([q.attention_score for q in questions if q.attention_score]) / len([q for q in questions if q.attention_score]) if any(q.attention_score for q in questions) else None,
        "question_type_breakdown": {
            "technical": len([q for q in questions if q.question_type == "technical"]),
            "behavioral": len([q for q in questions if q.question_type == "behavioral"]),
            "cultural": len([q for q in questions if q.question_type == "cultural"])
        }
    }
    
    return SessionATSReport(
        session_info=session_info,
        ats_score=ATSScoreResponse(
            id=ats_score.id,
            session_id=ats_score.session_id,
            overall_score=ats_score.overall_score,
            technical_score=ats_score.technical_score,
            behavioral_score=ats_score.behavioral_score,
            communication_score=ats_score.communication_score,
            keyword_match_score=ats_score.keyword_match_score,
            experience_score=ats_score.experience_score,
            education_score=ats_score.education_score,
            strengths=ats_score.strengths,
            weaknesses=ats_score.weaknesses,
            recommendations=ats_score.recommendations,
            created_at=ats_score.created_at
        ),
        question_scores=question_scores,
        overall_analysis=overall_analysis
    )

@router.get("/analytics/summary")
async def get_ats_analytics_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get ATS analytics summary for HR users"""
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR users can access analytics")
    
    # Get all sessions for the HR user
    sessions = db.query(InterviewSession).filter(InterviewSession.hr_id == current_user.id).all()
    session_ids = [s.id for s in sessions]
    
    if not session_ids:
        return {
            "total_interviews": 0,
            "completed_interviews": 0,
            "average_overall_score": 0,
            "score_distribution": {},
            "top_performing_candidates": [],
            "common_strengths": [],
            "common_weaknesses": []
        }
    
    # Get ATS scores for all sessions
    ats_scores = db.query(ATSScore).filter(ATSScore.session_id.in_(session_ids)).all()
    
    if not ats_scores:
        return {
            "total_interviews": len(sessions),
            "completed_interviews": 0,
            "average_overall_score": 0,
            "score_distribution": {},
            "top_performing_candidates": [],
            "common_strengths": [],
            "common_weaknesses": []
        }
    
    # Calculate analytics
    completed_interviews = len(ats_scores)
    total_interviews = len(sessions)
    average_score = sum([score.overall_score for score in ats_scores]) / completed_interviews
    
    # Score distribution
    score_ranges = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
    for score in ats_scores:
        if score.overall_score <= 20:
            score_ranges["0-20"] += 1
        elif score.overall_score <= 40:
            score_ranges["21-40"] += 1
        elif score.overall_score <= 60:
            score_ranges["41-60"] += 1
        elif score.overall_score <= 80:
            score_ranges["61-80"] += 1
        else:
            score_ranges["81-100"] += 1
    
    # Top performing candidates
    top_scores = sorted(ats_scores, key=lambda x: x.overall_score, reverse=True)[:5]
    top_candidates = []
    
    for score in top_scores:
        session = db.query(InterviewSession).filter(InterviewSession.id == score.session_id).first()
        candidate = db.query(User).filter(User.id == session.candidate_id).first()
        
        top_candidates.append({
            "candidate_name": candidate.full_name if candidate else "Unknown",
            "job_title": session.job_title,
            "overall_score": score.overall_score,
            "session_date": session.ended_at.isoformat() if session.ended_at else None
        })
    
    # Common strengths and weaknesses (simplified analysis)
    all_strengths = [score.strengths for score in ats_scores if score.strengths]
    all_weaknesses = [score.weaknesses for score in ats_scores if score.weaknesses]
    
    return {
        "total_interviews": total_interviews,
        "completed_interviews": completed_interviews,
        "average_overall_score": round(average_score, 2),
        "score_distribution": score_ranges,
        "top_performing_candidates": top_candidates,
        "common_strengths": all_strengths[:10],  # Simplified - would need NLP processing
        "common_weaknesses": all_weaknesses[:10]  # Simplified - would need NLP processing
    }