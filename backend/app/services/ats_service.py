"""
ATS (Applicant Tracking System) service for comprehensive candidate scoring
"""

import re
import logging
from typing import Dict, List, Optional, Tuple
import numpy as np
from datetime import datetime
import json

logger = logging.getLogger(__name__)

class ATSService:
    """Comprehensive ATS scoring service for interview analysis"""
    
    def __init__(self):
        # Scoring weights for different components
        self.scoring_weights = {
            "technical_skills": 0.35,
            "behavioral_responses": 0.25, 
            "communication": 0.20,
            "keyword_match": 0.10,
            "experience_relevance": 0.10
        }
        
        # Technical skill categories and keywords
        self.skill_categories = {
            "programming": [
                "python", "java", "javascript", "typescript", "c++", "c#", "go", "rust",
                "php", "ruby", "swift", "kotlin", "scala", "r", "matlab"
            ],
            "web_development": [
                "html", "css", "react", "angular", "vue", "nodejs", "express",
                "django", "flask", "spring", "asp.net", "laravel"
            ],
            "mobile_development": [
                "android", "ios", "react native", "flutter", "xamarin", "cordova",
                "swift", "kotlin", "objective-c"
            ],
            "database": [
                "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch",
                "oracle", "sqlite", "cassandra", "dynamodb"
            ],
            "cloud": [
                "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
                "jenkins", "gitlab", "github actions", "circleci"
            ],
            "data_science": [
                "machine learning", "deep learning", "tensorflow", "pytorch",
                "pandas", "numpy", "scikit-learn", "jupyter", "tableau", "powerbi"
            ],
            "devops": [
                "ci/cd", "devops", "git", "linux", "bash", "ansible", "puppet",
                "chef", "monitoring", "logging"
            ]
        }
        
        # Behavioral indicators
        self.behavioral_indicators = {
            "leadership": [
                "led team", "managed", "coordinated", "organized", "mentored",
                "guided", "supervised", "directed", "initiative"
            ],
            "problem_solving": [
                "solved", "resolved", "troubleshot", "debugged", "analyzed",
                "investigated", "optimized", "improved", "fixed"
            ],
            "collaboration": [
                "collaborated", "worked with", "team player", "cross-functional",
                "partnered", "communicated", "coordinated", "supported"
            ],
            "adaptability": [
                "adapted", "learned", "flexible", "adjusted", "pivoted",
                "change", "new technology", "quickly", "fast learner"
            ],
            "achievement": [
                "achieved", "accomplished", "delivered", "exceeded", "successful",
                "completed", "implemented", "launched", "increased", "reduced"
            ]
        }
    
    def extract_technical_skills(self, text: str) -> Dict[str, List[str]]:
        """Extract technical skills from text by category"""
        text_lower = text.lower()
        found_skills = {}
        
        for category, keywords in self.skill_categories.items():
            category_skills = []
            for keyword in keywords:
                if keyword in text_lower:
                    category_skills.append(keyword)
            
            if category_skills:
                found_skills[category] = category_skills
        
        return found_skills
    
    def calculate_technical_score(self, interview_data: Dict) -> Tuple[float, Dict]:
        """Calculate technical skills score based on answers and job requirements"""
        job_description = interview_data.get("job_description", "").lower()
        questions_answers = interview_data.get("questions_and_answers", [])
        
        # Extract required skills from job description
        required_skills = self.extract_technical_skills(job_description)
        
        # Combine all answers
        all_answers = " ".join([qa.get("answer", "") for qa in questions_answers if qa.get("answer")])
        demonstrated_skills = self.extract_technical_skills(all_answers)
        
        # Calculate match scores for each category
        category_scores = {}
        total_score = 0
        total_weight = 0
        
        for category, required in required_skills.items():
            demonstrated = demonstrated_skills.get(category, [])
            
            if required:
                match_ratio = len(set(demonstrated) & set(required)) / len(required)
                category_scores[category] = match_ratio * 100
                total_score += match_ratio * len(required)
                total_weight += len(required)
        
        # Overall technical score
        overall_technical = (total_score / total_weight * 100) if total_weight > 0 else 50
        
        # Boost score for technical question performance
        technical_questions = [qa for qa in questions_answers if qa.get("type") == "technical"]
        if technical_questions:
            avg_technical_score = np.mean([qa.get("individual_score", 5) for qa in technical_questions])
            overall_technical = (overall_technical + avg_technical_score * 10) / 2
        
        return min(100, overall_technical), {
            "category_scores": category_scores,
            "required_skills": required_skills,
            "demonstrated_skills": demonstrated_skills,
            "technical_question_avg": np.mean([qa.get("individual_score", 5) for qa in technical_questions]) * 10 if technical_questions else None
        }
    
    def calculate_behavioral_score(self, interview_data: Dict) -> Tuple[float, Dict]:
        """Calculate behavioral competency score"""
        questions_answers = interview_data.get("questions_and_answers", [])
        behavioral_questions = [qa for qa in questions_answers if qa.get("type") == "behavioral"]
        
        if not behavioral_questions:
            return 50, {"message": "No behavioral questions found"}
        
        # Analyze behavioral indicators in answers
        all_behavioral_text = " ".join([qa.get("answer", "") for qa in behavioral_questions])
        text_lower = all_behavioral_text.lower()
        
        indicator_scores = {}
        total_indicators = 0
        found_indicators = 0
        
        for competency, indicators in self.behavioral_indicators.items():
            competency_count = 0
            for indicator in indicators:
                if indicator in text_lower:
                    competency_count += 1
                    found_indicators += 1
                total_indicators += 1
            
            indicator_scores[competency] = (competency_count / len(indicators)) * 100
        
        # Base score from individual question scores
        individual_scores = [qa.get("individual_score", 5) for qa in behavioral_questions]
        base_score = np.mean(individual_scores) * 10
        
        # Behavioral indicator bonus
        indicator_bonus = (found_indicators / total_indicators) * 20 if total_indicators > 0 else 0
        
        final_score = min(100, base_score + indicator_bonus)
        
        return final_score, {
            "competency_scores": indicator_scores,
            "base_score": base_score,
            "indicator_bonus": indicator_bonus,
            "behavioral_question_count": len(behavioral_questions)
        }
    
    def calculate_communication_score(self, interview_data: Dict) -> Tuple[float, Dict]:
        """Calculate communication effectiveness score"""
        questions_answers = interview_data.get("questions_and_answers", [])
        
        if not questions_answers:
            return 0, {"message": "No questions answered"}
        
        # Metrics to analyze
        total_words = 0
        total_sentences = 0
        clarity_score = 0
        structure_score = 0
        
        for qa in questions_answers:
            answer = qa.get("answer", "")
            if not answer:
                continue
            
            # Word and sentence count
            words = len(answer.split())
            sentences = len([s for s in answer.split('.') if s.strip()])
            
            total_words += words
            total_sentences += sentences
            
            # Clarity indicators (simple heuristics)
            clarity_indicators = [
                "specifically", "for example", "such as", "in other words",
                "to clarify", "what I mean", "in particular"
            ]
            clarity_count = sum(1 for indicator in clarity_indicators if indicator in answer.lower())
            clarity_score += min(10, clarity_count * 2)
            
            # Structure indicators
            structure_indicators = [
                "first", "second", "third", "finally", "in conclusion",
                "however", "moreover", "furthermore", "additionally"
            ]
            structure_count = sum(1 for indicator in structure_indicators if indicator in answer.lower())
            structure_score += min(10, structure_count * 2)
        
        question_count = len([qa for qa in questions_answers if qa.get("answer")])
        
        # Calculate averages
        avg_words_per_answer = total_words / question_count if question_count > 0 else 0
        avg_sentences_per_answer = total_sentences / question_count if question_count > 0 else 0
        avg_clarity = clarity_score / question_count if question_count > 0 else 0
        avg_structure = structure_score / question_count if question_count > 0 else 0
        
        # Scoring
        # Word count score (optimal range: 50-200 words per answer)
        if 50 <= avg_words_per_answer <= 200:
            word_score = 100
        elif avg_words_per_answer < 50:
            word_score = (avg_words_per_answer / 50) * 100
        else:
            word_score = max(50, 100 - ((avg_words_per_answer - 200) / 10))
        
        # Sentence structure score
        sentence_score = min(100, avg_sentences_per_answer * 20)
        
        # Combined communication score
        communication_score = (
            word_score * 0.3 +
            sentence_score * 0.2 +
            avg_clarity * 0.25 +
            avg_structure * 0.25
        )
        
        return min(100, communication_score), {
            "avg_words_per_answer": avg_words_per_answer,
            "avg_sentences_per_answer": avg_sentences_per_answer,
            "clarity_score": avg_clarity,
            "structure_score": avg_structure,
            "word_score": word_score,
            "sentence_score": sentence_score
        }
    
    def calculate_keyword_match_score(self, interview_data: Dict) -> Tuple[float, Dict]:
        """Calculate job description keyword matching score"""
        job_description = interview_data.get("job_description", "")
        job_requirements = interview_data.get("job_requirements", job_description)
        resume_text = interview_data.get("resume_text", "")
        
        # Combine all candidate responses
        questions_answers = interview_data.get("questions_and_answers", [])
        candidate_text = resume_text + " " + " ".join([qa.get("answer", "") for qa in questions_answers])
        
        if not job_requirements or not candidate_text:
            return 50, {"message": "Insufficient data for keyword matching"}
        
        # Extract important keywords from job requirements
        job_keywords = self._extract_important_keywords(job_requirements.lower())
        candidate_keywords = self._extract_important_keywords(candidate_text.lower())
        
        # Calculate matches
        matched_keywords = list(set(job_keywords) & set(candidate_keywords))
        match_ratio = len(matched_keywords) / len(job_keywords) if job_keywords else 0
        
        # Keyword density bonus
        keyword_density = len(matched_keywords) / len(candidate_keywords.split()) if candidate_keywords else 0
        density_bonus = min(20, keyword_density * 1000)  # Small bonus for natural keyword usage
        
        keyword_score = min(100, (match_ratio * 80) + density_bonus)
        
        return keyword_score, {
            "job_keywords_count": len(job_keywords),
            "matched_keywords_count": len(matched_keywords),
            "match_ratio": match_ratio,
            "keyword_density": keyword_density,
            "matched_keywords": matched_keywords[:10]  # Show first 10 matches
        }
    
    def _extract_important_keywords(self, text: str) -> List[str]:
        """Extract important keywords from text"""
        # Remove common words
        stop_words = {
            "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
            "of", "with", "by", "from", "up", "about", "into", "through", "during",
            "before", "after", "above", "below", "between", "among", "this", "that",
            "these", "those", "is", "are", "was", "were", "be", "been", "being",
            "have", "has", "had", "do", "does", "did", "will", "would", "could",
            "should", "may", "might", "must", "can", "shall"
        }
        
        # Extract words and filter
        words = re.findall(r'\b[a-zA-Z][a-zA-Z0-9]*\b', text.lower())
        keywords = [w for w in words if len(w) > 2 and w not in stop_words]
        
        # Add technical terms and phrases
        technical_phrases = re.findall(r'\b[a-zA-Z][a-zA-Z0-9]*[+#.]*\b', text.lower())
        keywords.extend([p for p in technical_phrases if len(p) > 2])
        
        return list(set(keywords))
    
    def calculate_experience_score(self, interview_data: Dict) -> Tuple[float, Dict]:
        """Calculate experience relevance score"""
        # This is a simplified version - in production, you'd analyze:
        # - Years of experience mentioned
        # - Relevance of past projects
        # - Industry experience
        # - Role progression
        
        questions_answers = interview_data.get("questions_and_answers", [])
        resume_text = interview_data.get("resume_text", "")
        
        experience_indicators = [
            r'(\d+)\s*years?\s*(?:of\s*)?experience',
            r'worked\s*(?:for|at|with)',
            r'project\s*(?:manager|lead|coordinator)',
            r'senior\s*\w+',
            r'led\s*(?:a\s*)?team',
            r'managed\s*\w+'
        ]
        
        combined_text = resume_text + " " + " ".join([qa.get("answer", "") for qa in questions_answers])
        
        experience_score = 60  # Base score
        
        for pattern in experience_indicators:
            matches = re.findall(pattern, combined_text.lower())
            if matches:
                experience_score += min(10, len(matches) * 2)
        
        return min(100, experience_score), {
            "base_score": 60,
            "experience_indicators_found": len([p for p in experience_indicators if re.search(p, combined_text.lower())]),
            "estimated_experience": "Based on text analysis"
        }
    
    async def generate_comprehensive_score(self, interview_data: Dict) -> Dict:
        """Generate comprehensive ATS score with detailed breakdown"""
        try:
            # Calculate component scores
            technical_score, technical_details = self.calculate_technical_score(interview_data)
            behavioral_score, behavioral_details = self.calculate_behavioral_score(interview_data)
            communication_score, communication_details = self.calculate_communication_score(interview_data)
            keyword_score, keyword_details = self.calculate_keyword_match_score(interview_data)
            experience_score, experience_details = self.calculate_experience_score(interview_data)
            
            # Calculate weighted overall score
            overall_score = (
                technical_score * self.scoring_weights["technical_skills"] +
                behavioral_score * self.scoring_weights["behavioral_responses"] +
                communication_score * self.scoring_weights["communication"] +
                keyword_score * self.scoring_weights["keyword_match"] +
                experience_score * self.scoring_weights["experience_relevance"]
            )
            
            # Generate strengths and weaknesses
            strengths = []
            weaknesses = []
            recommendations = []
            
            # Analyze each component
            if technical_score >= 75:
                strengths.append("Strong technical skills demonstrated")
            elif technical_score < 50:
                weaknesses.append("Technical skills below expectations")
                recommendations.append("Focus on developing core technical competencies")
            
            if behavioral_score >= 75:
                strengths.append("Excellent behavioral responses and soft skills")
            elif behavioral_score < 50:
                weaknesses.append("Behavioral competencies need development")
                recommendations.append("Work on providing specific examples in behavioral situations")
            
            if communication_score >= 75:
                strengths.append("Clear and effective communication")
            elif communication_score < 50:
                weaknesses.append("Communication clarity could be improved")
                recommendations.append("Practice structuring responses more clearly")
            
            if keyword_score >= 70:
                strengths.append("Good alignment with job requirements")
            elif keyword_score < 40:
                weaknesses.append("Limited alignment with job requirements")
                recommendations.append("Research role requirements more thoroughly")
            
            # Default messages if lists are empty
            if not strengths:
                strengths.append("Shows potential in various areas")
            if not weaknesses:
                weaknesses.append("Minor areas for improvement identified")
            if not recommendations:
                recommendations.append("Continue developing professional skills")
            
            return {
                "overall_score": round(overall_score, 2),
                "technical_score": round(technical_score, 2),
                "behavioral_score": round(behavioral_score, 2),
                "communication_score": round(communication_score, 2),
                "keyword_match_score": round(keyword_score, 2),
                "experience_score": round(experience_score, 2),
                "education_score": 75,  # Placeholder - would analyze education background
                "strengths": "; ".join(strengths),
                "weaknesses": "; ".join(weaknesses),
                "recommendations": "; ".join(recommendations),
                "detailed_analysis": {
                    "technical_details": technical_details,
                    "behavioral_details": behavioral_details,
                    "communication_details": communication_details,
                    "keyword_details": keyword_details,
                    "experience_details": experience_details
                },
                "scoring_weights": self.scoring_weights,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating comprehensive ATS score: {e}")
            return {
                "overall_score": 50,
                "technical_score": 50,
                "behavioral_score": 50,
                "communication_score": 50,
                "keyword_match_score": 50,
                "experience_score": 50,
                "education_score": 50,
                "strengths": "Unable to fully analyze responses",
                "weaknesses": "Technical analysis encountered issues",
                "recommendations": "Manual review recommended",
                "error": str(e)
            }