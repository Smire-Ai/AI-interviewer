from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from app.models.database import get_db, Resume, JobDescription, Interview, InterviewQuestion
from app.services.ai_service import AIService
from pydantic import BaseModel
from typing import List, Optional
import json

router = APIRouter()
ai_service = AIService()

class AnswerSubmission(BaseModel):
    question_id: int
    answer: str

class InterviewStart(BaseModel):
    resume_id: int
    jd_id: int
    num_questions: Optional[int] = 10

@router.post("/start")
async def start_interview(
    interview_data: InterviewStart,
    db: Session = Depends(get_db)
):
    """Start a new interview session"""
    try:
        # Get resume and job description
        resume = db.query(Resume).filter(Resume.id == interview_data.resume_id).first()
        if not resume:
            raise HTTPException(status_code=404, detail="Resume not found")
        
        jd = db.query(JobDescription).filter(JobDescription.id == interview_data.jd_id).first()
        if not jd:
            raise HTTPException(status_code=404, detail="Job description not found")
        
        # Prepare data for AI service
        resume_data = {
            "skills": json.loads(resume.skills) if resume.skills else [],
            "experience": resume.experience or "",
            "education": resume.education or ""
        }
        
        jd_data = {
            "content": jd.content,
            "required_skills": json.loads(jd.required_skills) if jd.required_skills else [],
            "experience_level": jd.experience_level
        }
        
        # Calculate resume-JD match
        match_score = ai_service.calculate_resume_jd_match(
            resume_data["skills"],
            resume_data["experience"],
            jd_data["required_skills"],
            jd_data["content"]
        )
        
        # Generate interview questions
        questions = ai_service.generate_questions(resume_data, jd_data, interview_data.num_questions)
        
        # Create interview record
        interview = Interview(
            resume_id=interview_data.resume_id,
            job_description_id=interview_data.jd_id,
            questions=json.dumps(questions),
            answers="{}",
            score=0.0,
            status="in_progress"
        )
        
        db.add(interview)
        db.commit()
        db.refresh(interview)
        
        # Create individual question records
        question_records = []
        for i, q in enumerate(questions):
            question_record = InterviewQuestion(
                interview_id=interview.id,
                question=q["question"],
                question_type=q["type"]
            )
            db.add(question_record)
            question_records.append(question_record)
        
        db.commit()
        
        # Refresh to get IDs
        for qr in question_records:
            db.refresh(qr)
        
        return {
            "message": "Interview started successfully",
            "interview_id": interview.id,
            "match_score": round(match_score, 1),
            "questions": [
                {
                    "id": qr.id,
                    "question": qr.question,
                    "type": qr.question_type
                }
                for qr in question_records
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error starting interview: {str(e)}")

@router.post("/answer")
async def submit_answer(
    answer_data: AnswerSubmission,
    db: Session = Depends(get_db)
):
    """Submit an answer to an interview question"""
    try:
        # Get the question
        question = db.query(InterviewQuestion).filter(InterviewQuestion.id == answer_data.question_id).first()
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        # Evaluate the answer using AI service
        evaluation = ai_service.evaluate_answer(
            question.question,
            answer_data.answer,
            question.question_type
        )
        
        # Update question with answer and score
        question.answer = answer_data.answer
        question.score = evaluation["score"]
        
        db.commit()
        
        return {
            "message": "Answer submitted successfully",
            "evaluation": evaluation
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error submitting answer: {str(e)}")

@router.post("/{interview_id}/complete")
async def complete_interview(
    interview_id: int,
    db: Session = Depends(get_db)
):
    """Complete an interview and calculate final score"""
    try:
        # Get interview
        interview = db.query(Interview).filter(Interview.id == interview_id).first()
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        
        # Get all questions and answers for this interview
        questions = db.query(InterviewQuestion).filter(InterviewQuestion.interview_id == interview_id).all()
        
        # Calculate scores
        question_scores = [q.score for q in questions if q.score is not None]
        
        # Get resume and JD for match calculation
        resume = db.query(Resume).filter(Resume.id == interview.resume_id).first()
        jd = db.query(JobDescription).filter(JobDescription.id == interview.job_description_id).first()
        
        resume_skills = json.loads(resume.skills) if resume.skills else []
        jd_skills = json.loads(jd.required_skills) if jd.required_skills else []
        
        match_score = ai_service.calculate_resume_jd_match(
            resume_skills,
            resume.experience or "",
            jd_skills,
            jd.content
        )
        
        # Calculate overall score
        overall_evaluation = ai_service.calculate_overall_score(question_scores, match_score)
        
        # Update interview record
        interview.score = overall_evaluation["score"]
        interview.status = "completed"
        interview.feedback = json.dumps(overall_evaluation)
        
        # Update answers in interview record
        answers = {}
        for q in questions:
            answers[str(q.id)] = {
                "question": q.question,
                "answer": q.answer or "",
                "score": q.score or 0
            }
        interview.answers = json.dumps(answers)
        
        db.commit()
        
        return {
            "message": "Interview completed successfully",
            "interview_id": interview_id,
            "overall_score": overall_evaluation["score"],
            "grade": overall_evaluation["grade"],
            "feedback": overall_evaluation["feedback"],
            "resume_match": overall_evaluation["resume_match"],
            "interview_performance": overall_evaluation["interview_performance"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error completing interview: {str(e)}")

@router.get("/list")
async def list_interviews(db: Session = Depends(get_db)):
    """List all interviews"""
    interviews = db.query(Interview).all()
    results = []
    
    for interview in interviews:
        resume = db.query(Resume).filter(Resume.id == interview.resume_id).first()
        jd = db.query(JobDescription).filter(JobDescription.id == interview.job_description_id).first()
        
        results.append({
            "id": interview.id,
            "resume_filename": resume.filename if resume else "Unknown",
            "job_title": jd.title if jd else "Unknown",
            "score": interview.score,
            "status": interview.status,
            "created_at": interview.created_at,
            "completed_at": interview.completed_at
        })
    
    return results

@router.get("/{interview_id}")
async def get_interview_details(
    interview_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed interview results"""
    try:
        # Get interview
        interview = db.query(Interview).filter(Interview.id == interview_id).first()
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        
        # Get related data
        resume = db.query(Resume).filter(Resume.id == interview.resume_id).first()
        jd = db.query(JobDescription).filter(JobDescription.id == interview.job_description_id).first()
        questions = db.query(InterviewQuestion).filter(InterviewQuestion.interview_id == interview_id).all()
        
        # Parse feedback if available
        feedback = json.loads(interview.feedback) if interview.feedback else {}
        
        return {
            "id": interview.id,
            "resume": {
                "filename": resume.filename if resume else "Unknown",
                "skills": json.loads(resume.skills) if resume and resume.skills else []
            },
            "job_description": {
                "title": jd.title if jd else "Unknown",
                "required_skills": json.loads(jd.required_skills) if jd and jd.required_skills else []
            },
            "questions_and_answers": [
                {
                    "question": q.question,
                    "answer": q.answer or "",
                    "score": q.score or 0,
                    "type": q.question_type
                }
                for q in questions
            ],
            "overall_score": interview.score,
            "status": interview.status,
            "feedback": feedback,
            "created_at": interview.created_at,
            "completed_at": interview.completed_at
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting interview details: {str(e)}")

@router.delete("/{interview_id}")
async def delete_interview(
    interview_id: int,
    db: Session = Depends(get_db)
):
    """Delete an interview and its questions"""
    try:
        # Delete questions first
        db.query(InterviewQuestion).filter(InterviewQuestion.interview_id == interview_id).delete()
        
        # Delete interview
        interview = db.query(Interview).filter(Interview.id == interview_id).first()
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        
        db.delete(interview)
        db.commit()
        
        return {"message": "Interview deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting interview: {str(e)}")