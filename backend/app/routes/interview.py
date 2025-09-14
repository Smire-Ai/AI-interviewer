"""
Interview routes with real-time AI features
"""

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import json
import asyncio

from ..models.database import get_db, User, InterviewSession, InterviewQuestion, AudioFeedback
from ..services.face_detection import FaceDetectionService
from ..services.kokoro_tts import KokoroTTSService
from ..services.interview_ai import InterviewAIService
from .auth import get_current_user

router = APIRouter()

# Pydantic models
class InterviewSessionCreate(BaseModel):
    candidate_email: str
    job_title: str
    job_description: str
    scheduled_time: datetime
    face_detection_enabled: bool = True
    voice_feedback_enabled: bool = True
    ats_scoring_enabled: bool = True

class InterviewSessionResponse(BaseModel):
    id: int
    session_id: str
    job_title: str
    job_description: str
    status: str
    scheduled_time: datetime
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    hr_name: str
    candidate_name: Optional[str]
    face_detection_enabled: bool
    voice_feedback_enabled: bool
    ats_scoring_enabled: bool

class QuestionRequest(BaseModel):
    question_text: str
    question_type: str  # technical, behavioral, cultural

class AnswerRequest(BaseModel):
    question_id: int
    answer_text: str

# Connection manager for WebSocket
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}
    
    async def connect(self, websocket: WebSocket, session_id: str, user_id: int):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = {}
        self.active_connections[session_id][user_id] = websocket
    
    def disconnect(self, session_id: str, user_id: int):
        if session_id in self.active_connections:
            if user_id in self.active_connections[session_id]:
                del self.active_connections[session_id][user_id]
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]
    
    async def send_personal_message(self, message: str, session_id: str, user_id: int):
        if session_id in self.active_connections and user_id in self.active_connections[session_id]:
            await self.active_connections[session_id][user_id].send_text(message)
    
    async def broadcast_to_session(self, message: str, session_id: str):
        if session_id in self.active_connections:
            for websocket in self.active_connections[session_id].values():
                await websocket.send_text(message)

manager = ConnectionManager()

# Initialize services
face_detection_service = FaceDetectionService()
tts_service = KokoroTTSService()
interview_ai_service = InterviewAIService()

# Routes
@router.post("/sessions", response_model=InterviewSessionResponse)
async def create_interview_session(
    session_data: InterviewSessionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new interview session (HR only)"""
    if current_user.role != "hr":
        raise HTTPException(status_code=403, detail="Only HR users can create interview sessions")
    
    # Find candidate by email
    candidate = db.query(User).filter(
        User.email == session_data.candidate_email,
        User.role == "candidate"
    ).first()
    
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Create session
    session_id = str(uuid.uuid4())
    db_session = InterviewSession(
        session_id=session_id,
        hr_id=current_user.id,
        candidate_id=candidate.id,
        job_title=session_data.job_title,
        job_description=session_data.job_description,
        scheduled_time=session_data.scheduled_time,
        face_detection_enabled=session_data.face_detection_enabled,
        voice_feedback_enabled=session_data.voice_feedback_enabled,
        ats_scoring_enabled=session_data.ats_scoring_enabled
    )
    
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    return InterviewSessionResponse(
        id=db_session.id,
        session_id=db_session.session_id,
        job_title=db_session.job_title,
        job_description=db_session.job_description,
        status=db_session.status,
        scheduled_time=db_session.scheduled_time,
        started_at=db_session.started_at,
        ended_at=db_session.ended_at,
        hr_name=current_user.full_name,
        candidate_name=candidate.full_name,
        face_detection_enabled=db_session.face_detection_enabled,
        voice_feedback_enabled=db_session.voice_feedback_enabled,
        ats_scoring_enabled=db_session.ats_scoring_enabled
    )

@router.get("/sessions", response_model=List[InterviewSessionResponse])
async def get_user_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all interview sessions for current user"""
    if current_user.role == "hr":
        sessions = db.query(InterviewSession).filter(InterviewSession.hr_id == current_user.id).all()
    else:
        sessions = db.query(InterviewSession).filter(InterviewSession.candidate_id == current_user.id).all()
    
    result = []
    for session in sessions:
        hr_user = db.query(User).filter(User.id == session.hr_id).first()
        candidate_user = db.query(User).filter(User.id == session.candidate_id).first() if session.candidate_id else None
        
        result.append(InterviewSessionResponse(
            id=session.id,
            session_id=session.session_id,
            job_title=session.job_title,
            job_description=session.job_description,
            status=session.status,
            scheduled_time=session.scheduled_time,
            started_at=session.started_at,
            ended_at=session.ended_at,
            hr_name=hr_user.full_name,
            candidate_name=candidate_user.full_name if candidate_user else None,
            face_detection_enabled=session.face_detection_enabled,
            voice_feedback_enabled=session.voice_feedback_enabled,
            ats_scoring_enabled=session.ats_scoring_enabled
        ))
    
    return result

@router.get("/sessions/{session_id}")
async def get_interview_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific interview session"""
    session = db.query(InterviewSession).filter(InterviewSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check access permissions
    if current_user.role == "hr" and session.hr_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    elif current_user.role == "candidate" and session.candidate_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    hr_user = db.query(User).filter(User.id == session.hr_id).first()
    candidate_user = db.query(User).filter(User.id == session.candidate_id).first() if session.candidate_id else None
    
    return InterviewSessionResponse(
        id=session.id,
        session_id=session.session_id,
        job_title=session.job_title,
        job_description=session.job_description,
        status=session.status,
        scheduled_time=session.scheduled_time,
        started_at=session.started_at,
        ended_at=session.ended_at,
        hr_name=hr_user.full_name,
        candidate_name=candidate_user.full_name if candidate_user else None,
        face_detection_enabled=session.face_detection_enabled,
        voice_feedback_enabled=session.voice_feedback_enabled,
        ats_scoring_enabled=session.ats_scoring_enabled
    )

@router.post("/sessions/{session_id}/start")
async def start_interview(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Start an interview session"""
    session = db.query(InterviewSession).filter(InterviewSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Only HR can start sessions
    if current_user.role != "hr" or session.hr_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the assigned HR can start the session")
    
    if session.status != "scheduled":
        raise HTTPException(status_code=400, detail="Session cannot be started")
    
    session.status = "in_progress"
    session.started_at = datetime.utcnow()
    db.commit()
    
    # Notify all connected clients
    await manager.broadcast_to_session(
        json.dumps({"type": "session_started", "timestamp": session.started_at.isoformat()}),
        session_id
    )
    
    return {"message": "Interview started successfully"}

@router.post("/sessions/{session_id}/end")
async def end_interview(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """End an interview session"""
    session = db.query(InterviewSession).filter(InterviewSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Only HR can end sessions
    if current_user.role != "hr" or session.hr_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the assigned HR can end the session")
    
    if session.status != "in_progress":
        raise HTTPException(status_code=400, detail="Session is not in progress")
    
    session.status = "completed"
    session.ended_at = datetime.utcnow()
    db.commit()
    
    # Generate final ATS score if enabled
    if session.ats_scoring_enabled:
        await interview_ai_service.generate_final_ats_score(session.id, db)
    
    # Notify all connected clients
    await manager.broadcast_to_session(
        json.dumps({"type": "session_ended", "timestamp": session.ended_at.isoformat()}),
        session_id
    )
    
    return {"message": "Interview ended successfully"}

@router.post("/sessions/{session_id}/questions")
async def ask_question(
    session_id: str,
    question_data: QuestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Ask a question during the interview (HR only)"""
    session = db.query(InterviewSession).filter(InterviewSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if current_user.role != "hr" or session.hr_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only HR can ask questions")
    
    if session.status != "in_progress":
        raise HTTPException(status_code=400, detail="Session is not in progress")
    
    # Create question record
    question = InterviewQuestion(
        session_id=session.id,
        question_text=question_data.question_text,
        question_type=question_data.question_type
    )
    
    db.add(question)
    db.commit()
    db.refresh(question)
    
    # Generate audio feedback if enabled
    if session.voice_feedback_enabled:
        audio_file = await tts_service.generate_speech(
            question_data.question_text,
            voice_type="professional"
        )
        
        feedback = AudioFeedback(
            session_id=session.id,
            question_id=question.id,
            feedback_text=question_data.question_text,
            voice_type="professional",
            audio_file_path=audio_file
        )
        db.add(feedback)
        db.commit()
    
    # Broadcast question to all session participants
    await manager.broadcast_to_session(
        json.dumps({
            "type": "new_question",
            "question_id": question.id,
            "question_text": question_data.question_text,
            "question_type": question_data.question_type,
            "timestamp": question.timestamp.isoformat()
        }),
        session_id
    )
    
    return {"message": "Question sent successfully", "question_id": question.id}

@router.post("/sessions/{session_id}/answers")
async def submit_answer(
    session_id: str,
    answer_data: AnswerRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit an answer to a question (Candidate only)"""
    session = db.query(InterviewSession).filter(InterviewSession.session_id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if current_user.role != "candidate" or session.candidate_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the assigned candidate can submit answers")
    
    question = db.query(InterviewQuestion).filter(InterviewQuestion.id == answer_data.question_id).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Update question with answer
    question.candidate_answer = answer_data.answer_text
    
    # Generate AI feedback
    ai_feedback, score = await interview_ai_service.analyze_answer(
        question.question_text,
        answer_data.answer_text,
        question.question_type,
        session.job_description
    )
    
    question.ai_feedback = ai_feedback
    question.score = score
    
    db.commit()
    
    # Generate audio feedback if enabled
    if session.voice_feedback_enabled:
        feedback_text = f"Thank you for your answer. {ai_feedback[:100]}..."
        audio_file = await tts_service.generate_speech(
            feedback_text,
            voice_type="encouraging"
        )
        
        feedback = AudioFeedback(
            session_id=session.id,
            question_id=question.id,
            feedback_text=feedback_text,
            voice_type="encouraging",
            audio_file_path=audio_file
        )
        db.add(feedback)
        db.commit()
    
    # Broadcast answer to HR
    await manager.send_personal_message(
        json.dumps({
            "type": "answer_submitted",
            "question_id": question.id,
            "answer_text": answer_data.answer_text,
            "ai_feedback": ai_feedback,
            "score": score,
            "timestamp": datetime.utcnow().isoformat()
        }),
        session_id,
        session.hr_id
    )
    
    return {"message": "Answer submitted successfully", "score": score, "feedback": ai_feedback}

@router.websocket("/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    db: Session = Depends(get_db)
):
    """WebSocket endpoint for real-time interview features"""
    # Note: In a real implementation, you'd need to authenticate the WebSocket connection
    # For now, we'll accept the connection and handle authentication via message
    
    await websocket.accept()
    user_id = None
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "authenticate":
                # Handle authentication
                user_id = message.get("user_id")
                if user_id:
                    await manager.connect(websocket, session_id, user_id)
                    await websocket.send_text(json.dumps({"type": "authenticated", "user_id": user_id}))
            
            elif message["type"] == "face_detection" and user_id:
                # Handle face detection data
                face_data = message.get("face_data")
                if face_data:
                    attention_score = await face_detection_service.analyze_attention(face_data)
                    
                    # Update current question with attention score
                    session = db.query(InterviewSession).filter(InterviewSession.session_id == session_id).first()
                    if session and session.face_detection_enabled:
                        current_question = db.query(InterviewQuestion).filter(
                            InterviewQuestion.session_id == session.id,
                            InterviewQuestion.candidate_answer.is_(None)
                        ).first()
                        
                        if current_question:
                            current_question.attention_score = attention_score
                            db.commit()
                    
                    # Send attention score back to client
                    await websocket.send_text(json.dumps({
                        "type": "attention_score",
                        "score": attention_score
                    }))
            
            elif message["type"] == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
    
    except WebSocketDisconnect:
        if user_id:
            manager.disconnect(session_id, user_id)