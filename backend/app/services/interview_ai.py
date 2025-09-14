"""
AI service for interview analysis and feedback generation
"""

import re
import logging
from typing import Dict, List, Tuple, Optional
from transformers import pipeline, AutoTokenizer, AutoModel
import torch
import numpy as np
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class InterviewAIService:
    """AI service for analyzing interview responses and generating feedback"""
    
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Initialize models
        try:
            # Sentiment analysis pipeline
            self.sentiment_analyzer = pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                device=0 if torch.cuda.is_available() else -1
            )
            
            # Question answering pipeline for relevance checking
            self.qa_pipeline = pipeline(
                "question-answering",
                model="distilbert-base-cased-distilled-squad",
                device=0 if torch.cuda.is_available() else -1
            )
            
            # Text generation for feedback
            self.text_generator = pipeline(
                "text-generation",
                model="microsoft/DialoGPT-medium",
                device=0 if torch.cuda.is_available() else -1,
                max_length=150,
                do_sample=True,
                temperature=0.7
            )
            
            logger.info("Initialized Interview AI models")
            
        except Exception as e:
            logger.warning(f"Could not initialize all AI models: {e}")
            self.sentiment_analyzer = None
            self.qa_pipeline = None
            self.text_generator = None
    
    def analyze_answer_length(self, answer: str) -> Dict:
        """Analyze answer length and completeness"""
        if not answer:
            return {"score": 0.0, "feedback": "No answer provided"}
        
        word_count = len(answer.split())
        char_count = len(answer)
        
        # Scoring based on length appropriateness
        if word_count < 10:
            length_score = 0.3
            feedback = "Answer is too brief. Try to provide more detailed explanations."
        elif word_count < 50:
            length_score = 0.7
            feedback = "Good length, but could be more detailed."
        elif word_count < 150:
            length_score = 1.0
            feedback = "Excellent answer length with good detail."
        elif word_count < 300:
            length_score = 0.8
            feedback = "Very detailed answer. Make sure all points are relevant."
        else:
            length_score = 0.6
            feedback = "Answer is quite long. Try to be more concise while maintaining key points."
        
        return {
            "score": length_score,
            "word_count": word_count,
            "char_count": char_count,
            "feedback": feedback
        }
    
    def analyze_sentiment(self, answer: str) -> Dict:
        """Analyze sentiment and confidence of the answer"""
        if not answer or not self.sentiment_analyzer:
            return {"score": 0.5, "sentiment": "neutral", "confidence": 0.0}
        
        try:
            result = self.sentiment_analyzer(answer)[0]
            sentiment = result['label'].lower()
            confidence = result['score']
            
            # Map sentiment to score
            sentiment_scores = {
                'positive': 0.8,
                'neutral': 0.6,
                'negative': 0.4
            }
            
            # Adjust based on confidence
            base_score = sentiment_scores.get(sentiment, 0.5)
            adjusted_score = base_score * confidence + 0.5 * (1 - confidence)
            
            return {
                "score": adjusted_score,
                "sentiment": sentiment,
                "confidence": confidence,
                "interpretation": self._interpret_sentiment(sentiment, confidence)
            }
            
        except Exception as e:
            logger.error(f"Error in sentiment analysis: {e}")
            return {"score": 0.5, "sentiment": "neutral", "confidence": 0.0}
    
    def _interpret_sentiment(self, sentiment: str, confidence: float) -> str:
        """Interpret sentiment results for feedback"""
        if confidence < 0.6:
            return "Mixed emotional tone in response"
        
        interpretations = {
            'positive': "Confident and positive tone",
            'neutral': "Professional and balanced tone", 
            'negative': "May show hesitation or concern"
        }
        
        return interpretations.get(sentiment, "Neutral tone")
    
    def analyze_technical_keywords(self, answer: str, job_description: str, question_type: str) -> Dict:
        """Analyze presence of relevant technical keywords"""
        if not answer:
            return {"score": 0.0, "matched_keywords": [], "missing_keywords": []}
        
        # Extract keywords from job description
        job_keywords = self._extract_keywords(job_description.lower())
        answer_lower = answer.lower()
        
        # Find matched keywords
        matched_keywords = [kw for kw in job_keywords if kw in answer_lower]
        
        # Calculate score based on keyword matches
        if job_keywords:
            keyword_score = len(matched_keywords) / len(job_keywords)
        else:
            keyword_score = 0.5  # Default if no keywords extracted
        
        # Adjust score based on question type
        if question_type == "technical":
            keyword_score = min(1.0, keyword_score * 1.2)  # Boost technical questions
        elif question_type == "behavioral":
            keyword_score = min(1.0, keyword_score * 0.8)  # Reduce for behavioral
        
        return {
            "score": keyword_score,
            "matched_keywords": matched_keywords[:10],  # Limit for display
            "total_job_keywords": len(job_keywords),
            "match_percentage": round(keyword_score * 100, 2)
        }
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extract relevant keywords from text"""
        # Common technical and professional keywords
        tech_patterns = [
            r'\b(python|java|javascript|react|nodejs|sql|aws|docker|kubernetes)\b',
            r'\b(machine learning|ai|artificial intelligence|data science)\b',
            r'\b(agile|scrum|devops|ci/cd|git|github)\b',
            r'\b(api|rest|graphql|microservices|database)\b',
            r'\b(frontend|backend|fullstack|mobile|web development)\b'
        ]
        
        keywords = []
        for pattern in tech_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            keywords.extend(matches)
        
        # Also extract important nouns (simplified)
        words = text.split()
        important_words = [w for w in words if len(w) > 4 and w.isalpha()]
        keywords.extend(important_words[:20])  # Limit to prevent overload
        
        return list(set(keywords))  # Remove duplicates
    
    def analyze_structure(self, answer: str) -> Dict:
        """Analyze answer structure and organization"""
        if not answer:
            return {"score": 0.0, "feedback": "No answer to analyze"}
        
        # Check for structure indicators
        structure_indicators = [
            r'\bfirst\b|\bfirstly\b',
            r'\bsecond\b|\bsecondly\b', 
            r'\bthird\b|\bthirdly\b',
            r'\bfinally\b|\bin conclusion\b',
            r'\bfor example\b|\bfor instance\b',
            r'\bhowever\b|\bmoreover\b|\bfurthermore\b'
        ]
        
        structure_count = 0
        for pattern in structure_indicators:
            if re.search(pattern, answer, re.IGNORECASE):
                structure_count += 1
        
        # Check for paragraphs/line breaks
        paragraphs = len([p for p in answer.split('\n') if p.strip()])
        
        # Scoring
        structure_score = min(1.0, (structure_count * 0.2) + (min(paragraphs, 4) * 0.2))
        
        feedback_parts = []
        if structure_count > 0:
            feedback_parts.append("Good use of structure words")
        if paragraphs > 1:
            feedback_parts.append("Well-organized in sections")
        if structure_score < 0.3:
            feedback_parts.append("Consider organizing your answer with clear structure")
        
        return {
            "score": structure_score,
            "structure_indicators_found": structure_count,
            "paragraph_count": paragraphs,
            "feedback": ". ".join(feedback_parts) if feedback_parts else "Basic structure"
        }
    
    async def analyze_answer(self, question: str, answer: str, question_type: str, job_description: str) -> Tuple[str, float]:
        """
        Comprehensive answer analysis
        Returns (feedback_text, score)
        """
        if not answer or not answer.strip():
            return "No answer provided. Please provide a response to the question.", 0.0
        
        try:
            # Perform various analyses
            length_analysis = self.analyze_answer_length(answer)
            sentiment_analysis = self.analyze_sentiment(answer)
            keyword_analysis = self.analyze_technical_keywords(answer, job_description, question_type)
            structure_analysis = self.analyze_structure(answer)
            
            # Calculate weighted overall score
            weights = {
                'length': 0.25,
                'sentiment': 0.20,
                'keywords': 0.35,
                'structure': 0.20
            }
            
            overall_score = (
                length_analysis['score'] * weights['length'] +
                sentiment_analysis['score'] * weights['sentiment'] +
                keyword_analysis['score'] * weights['keywords'] +
                structure_analysis['score'] * weights['structure']
            )
            
            # Scale to 1-10
            final_score = max(1.0, min(10.0, overall_score * 10))
            
            # Generate comprehensive feedback
            feedback_parts = []
            
            # Length feedback
            if length_analysis['score'] < 0.5:
                feedback_parts.append(length_analysis['feedback'])
            
            # Sentiment feedback
            feedback_parts.append(f"Tone: {sentiment_analysis.get('interpretation', 'Professional tone detected')}")
            
            # Keyword feedback
            if keyword_analysis['score'] > 0.6:
                feedback_parts.append(f"Good use of relevant terminology ({keyword_analysis['match_percentage']}% keyword match)")
            elif keyword_analysis['score'] < 0.3:
                feedback_parts.append("Consider including more industry-specific terms and concepts")
            
            # Structure feedback
            if structure_analysis['score'] > 0.5:
                feedback_parts.append("Well-structured response")
            else:
                feedback_parts.append(structure_analysis['feedback'])
            
            # Overall assessment
            if final_score >= 8:
                feedback_parts.append("Excellent answer overall!")
            elif final_score >= 6:
                feedback_parts.append("Good answer with room for minor improvements")
            elif final_score >= 4:
                feedback_parts.append("Adequate answer, consider expanding on key points")
            else:
                feedback_parts.append("Consider providing more detailed and structured responses")
            
            final_feedback = ". ".join(feedback_parts)
            
            return final_feedback, final_score
            
        except Exception as e:
            logger.error(f"Error in answer analysis: {e}")
            return "Answer received. Technical analysis temporarily unavailable.", 5.0
    
    async def generate_question_suggestions(self, job_description: str, question_type: str, difficulty: str = "medium") -> List[str]:
        """Generate interview question suggestions based on job description"""
        
        # Predefined question templates by type
        technical_questions = [
            "Can you explain your experience with the main technologies mentioned in this role?",
            "How would you approach solving a technical challenge in this position?", 
            "What's your experience with the development tools and frameworks we use?",
            "Can you walk me through how you would architect a solution for our typical use case?",
            "How do you stay updated with the latest trends in this technology stack?"
        ]
        
        behavioral_questions = [
            "Tell me about a challenging project you worked on and how you overcame obstacles",
            "Describe a time when you had to work with a difficult team member",
            "How do you prioritize tasks when you have multiple deadlines?",
            "Can you give an example of when you had to learn something new quickly?",
            "Tell me about a time when you disagreed with a supervisor or colleague"
        ]
        
        cultural_questions = [
            "What type of work environment helps you be most productive?",
            "How do you handle feedback and criticism?",
            "What motivates you in your work?",
            "How do you prefer to collaborate with team members?",
            "What are your long-term career goals?"
        ]
        
        question_pools = {
            "technical": technical_questions,
            "behavioral": behavioral_questions,
            "cultural": cultural_questions
        }
        
        # Return appropriate questions based on type
        return question_pools.get(question_type, technical_questions)
    
    async def generate_final_ats_score(self, session_id: int, db):
        """Generate final ATS score for completed interview session"""
        try:
            from ..models.database import InterviewSession, InterviewQuestion, ATSScore
            
            # Get session and questions
            session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
            if not session:
                return None
            
            questions = db.query(InterviewQuestion).filter(InterviewQuestion.session_id == session_id).all()
            answered_questions = [q for q in questions if q.candidate_answer]
            
            if not answered_questions:
                return None
            
            # Calculate component scores
            individual_scores = [q.score for q in answered_questions if q.score]
            technical_questions = [q for q in answered_questions if q.question_type == "technical"]
            behavioral_questions = [q for q in answered_questions if q.question_type == "behavioral"]
            
            # Technical score
            technical_scores = [q.score for q in technical_questions if q.score]
            technical_score = sum(technical_scores) / len(technical_scores) * 10 if technical_scores else 50
            
            # Behavioral score  
            behavioral_scores = [q.score for q in behavioral_questions if q.score]
            behavioral_score = sum(behavioral_scores) / len(behavioral_scores) * 10 if behavioral_scores else 50
            
            # Communication score (based on sentiment and structure)
            communication_score = sum(individual_scores) / len(individual_scores) * 10 if individual_scores else 50
            
            # Attention score (from face detection)
            attention_scores = [q.attention_score for q in answered_questions if q.attention_score]
            avg_attention = sum(attention_scores) / len(attention_scores) if attention_scores else 0.7
            
            # Overall calculations
            keyword_match_score = 65  # Simplified for demo
            experience_score = 70     # Simplified for demo  
            education_score = 75      # Simplified for demo
            
            # Weighted overall score
            overall_score = (
                technical_score * 0.3 +
                behavioral_score * 0.25 +
                communication_score * 0.25 +
                (avg_attention * 100) * 0.2
            )
            
            # Generate insights
            strengths = []
            weaknesses = []
            
            if technical_score >= 70:
                strengths.append("Strong technical knowledge")
            else:
                weaknesses.append("Technical skills need improvement")
            
            if behavioral_score >= 70:
                strengths.append("Good behavioral responses")
            else:
                weaknesses.append("Behavioral responses could be more detailed")
            
            if avg_attention >= 0.8:
                strengths.append("Excellent attention and engagement")
            elif avg_attention < 0.6:
                weaknesses.append("Attention and engagement could be improved")
            
            # Create ATS score record
            ats_score = ATSScore(
                session_id=session_id,
                overall_score=min(100, max(0, overall_score)),
                technical_score=min(100, max(0, technical_score)),
                behavioral_score=min(100, max(0, behavioral_score)),
                communication_score=min(100, max(0, communication_score)),
                keyword_match_score=keyword_match_score,
                experience_score=experience_score,
                education_score=education_score,
                strengths="; ".join(strengths),
                weaknesses="; ".join(weaknesses),
                recommendations="Continue developing areas identified for improvement"
            )
            
            db.add(ats_score)
            db.commit()
            
            return ats_score
            
        except Exception as e:
            logger.error(f"Error generating final ATS score: {e}")
            return None
    
    def get_model_info(self) -> Dict:
        """Get information about loaded AI models"""
        return {
            "device": self.device,
            "models_loaded": {
                "sentiment_analyzer": self.sentiment_analyzer is not None,
                "qa_pipeline": self.qa_pipeline is not None,
                "text_generator": self.text_generator is not None
            },
            "torch_version": torch.__version__,
            "cuda_available": torch.cuda.is_available()
        }