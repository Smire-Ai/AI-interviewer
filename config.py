import os
from typing import Optional

class Settings:
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ai_interviewer.db")
    
    # OpenAI Configuration
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    
    # File Upload Configuration
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: set = {'.pdf', '.docx', '.doc'}
    
    # Interview Configuration
    DEFAULT_NUM_QUESTIONS: int = 10
    MIN_QUESTIONS: int = 5
    MAX_QUESTIONS: int = 20
    
    # Scoring Configuration
    SKILLS_WEIGHT: float = 0.6
    CONTENT_WEIGHT: float = 0.4
    INTERVIEW_WEIGHT: float = 0.7
    RESUME_MATCH_WEIGHT: float = 0.3

settings = Settings()