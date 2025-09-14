import openai
import json
import os
from typing import List, Dict, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

class AIService:
    def __init__(self):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        if self.openai_api_key:
            openai.api_key = self.openai_api_key
        self.use_openai = bool(self.openai_api_key)
        
    def calculate_resume_jd_match(self, resume_skills: List[str], resume_experience: str, 
                                jd_skills: List[str], jd_content: str) -> float:
        """Calculate match percentage between resume and job description"""
        try:
            # Skills matching
            resume_skills_lower = [skill.lower() for skill in resume_skills]
            jd_skills_lower = [skill.lower() for skill in jd_skills]
            
            matched_skills = set(resume_skills_lower) & set(jd_skills_lower)
            skills_score = len(matched_skills) / len(jd_skills_lower) if jd_skills_lower else 0
            
            # Content similarity using TF-IDF
            vectorizer = TfidfVectorizer(stop_words='english', max_features=1000)
            texts = [resume_experience, jd_content]
            
            if len(resume_experience.strip()) > 0 and len(jd_content.strip()) > 0:
                tfidf_matrix = vectorizer.fit_transform(texts)
                similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
                content_score = similarity
            else:
                content_score = 0
            
            # Weighted final score
            final_score = (skills_score * 0.6 + content_score * 0.4) * 100
            return min(final_score, 100)
            
        except Exception as e:
            print(f"Error calculating match: {e}")
            return 50.0  # Default score if calculation fails
    
    def generate_questions_with_openai(self, resume_data: Dict, jd_data: Dict, num_questions: int = 10) -> List[Dict]:
        """Generate interview questions using OpenAI"""
        try:
            prompt = f"""
            Based on the following resume and job description, generate {num_questions} relevant interview questions.
            
            Resume Skills: {resume_data.get('skills', '[]')}
            Resume Experience: {resume_data.get('experience', '')}
            Resume Education: {resume_data.get('education', '')}
            
            Job Description: {jd_data.get('content', '')}
            Required Skills: {jd_data.get('required_skills', '[]')}
            Experience Level: {jd_data.get('experience_level', '')}
            
            Generate a mix of:
            - Technical questions (40%)
            - Behavioral questions (30%)
            - Experience-based questions (30%)
            
            Return the response as a JSON array with objects containing:
            - question: the interview question
            - type: one of "technical", "behavioral", "experience"
            - difficulty: one of "easy", "medium", "hard"
            
            Make sure questions are relevant to both the candidate's background and the job requirements.
            """
            
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert HR interviewer. Generate relevant, professional interview questions."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1500,
                temperature=0.7
            )
            
            questions_text = response.choices[0].message.content
            questions = json.loads(questions_text)
            return questions
            
        except Exception as e:
            print(f"Error generating questions with OpenAI: {e}")
            return self.generate_fallback_questions(resume_data, jd_data, num_questions)
    
    def generate_fallback_questions(self, resume_data: Dict, jd_data: Dict, num_questions: int = 10) -> List[Dict]:
        """Generate fallback questions when OpenAI is not available"""
        questions = [
            {"question": "Tell me about yourself and your background.", "type": "behavioral", "difficulty": "easy"},
            {"question": "What interests you about this position?", "type": "behavioral", "difficulty": "easy"},
            {"question": "Describe your experience with the technologies mentioned in your resume.", "type": "technical", "difficulty": "medium"},
            {"question": "How do you handle challenging situations at work?", "type": "behavioral", "difficulty": "medium"},
            {"question": "What is your greatest professional achievement?", "type": "experience", "difficulty": "medium"},
            {"question": "Where do you see yourself in 5 years?", "type": "behavioral", "difficulty": "easy"},
            {"question": "Describe a time when you had to learn a new technology quickly.", "type": "experience", "difficulty": "medium"},
            {"question": "How do you stay updated with industry trends?", "type": "behavioral", "difficulty": "easy"},
            {"question": "What motivates you in your work?", "type": "behavioral", "difficulty": "easy"},
            {"question": "Do you have any questions for us?", "type": "behavioral", "difficulty": "easy"}
        ]
        
        return questions[:num_questions]
    
    def generate_questions(self, resume_data: Dict, jd_data: Dict, num_questions: int = 10) -> List[Dict]:
        """Generate interview questions based on resume and job description"""
        if self.use_openai:
            return self.generate_questions_with_openai(resume_data, jd_data, num_questions)
        else:
            return self.generate_fallback_questions(resume_data, jd_data, num_questions)
    
    def evaluate_answer_with_openai(self, question: str, answer: str, question_type: str) -> Dict:
        """Evaluate an interview answer using OpenAI"""
        try:
            prompt = f"""
            Evaluate the following interview answer on a scale of 1-10:
            
            Question: {question}
            Question Type: {question_type}
            Answer: {answer}
            
            Provide evaluation based on:
            - Relevance to the question
            - Clarity and communication
            - Technical accuracy (if applicable)
            - Depth of response
            
            Return response as JSON with:
            - score: number between 1-10
            - feedback: detailed feedback string
            - strengths: list of strengths
            - improvements: list of areas for improvement
            """
            
            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert interviewer evaluating candidate responses."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=500,
                temperature=0.3
            )
            
            evaluation = json.loads(response.choices[0].message.content)
            return evaluation
            
        except Exception as e:
            print(f"Error evaluating answer with OpenAI: {e}")
            return self.evaluate_answer_fallback(question, answer, question_type)
    
    def evaluate_answer_fallback(self, question: str, answer: str, question_type: str) -> Dict:
        """Fallback answer evaluation when OpenAI is not available"""
        # Simple scoring based on answer length and basic criteria
        answer_length = len(answer.split())
        
        if answer_length < 10:
            score = 3
            feedback = "Answer is too brief. Consider providing more detail."
        elif answer_length < 50:
            score = 6
            feedback = "Good start, but could use more depth and examples."
        elif answer_length < 100:
            score = 8
            feedback = "Well-structured answer with good detail."
        else:
            score = 9
            feedback = "Comprehensive and detailed response."
        
        return {
            "score": score,
            "feedback": feedback,
            "strengths": ["Good communication"],
            "improvements": ["Consider adding specific examples"]
        }
    
    def evaluate_answer(self, question: str, answer: str, question_type: str) -> Dict:
        """Evaluate an interview answer"""
        if self.use_openai and answer.strip():
            return self.evaluate_answer_with_openai(question, answer, question_type)
        else:
            return self.evaluate_answer_fallback(question, answer, question_type)
    
    def calculate_overall_score(self, question_scores: List[float], resume_jd_match: float) -> Dict:
        """Calculate overall interview score and provide feedback"""
        if not question_scores:
            return {"score": 0, "grade": "F", "feedback": "No answers provided"}
        
        avg_score = np.mean(question_scores)
        # Weight the final score: 70% interview performance, 30% resume-JD match
        final_score = (avg_score * 7 + resume_jd_match * 0.3) / 10
        
        # Grade assignment
        if final_score >= 8.5:
            grade = "A+"
        elif final_score >= 8.0:
            grade = "A"
        elif final_score >= 7.5:
            grade = "B+"
        elif final_score >= 7.0:
            grade = "B"
        elif final_score >= 6.5:
            grade = "C+"
        elif final_score >= 6.0:
            grade = "C"
        elif final_score >= 5.0:
            grade = "D"
        else:
            grade = "F"
        
        # Feedback based on score
        if final_score >= 8.0:
            feedback = "Excellent candidate! Strong technical skills and great communication."
        elif final_score >= 7.0:
            feedback = "Good candidate with solid skills. Minor areas for improvement."
        elif final_score >= 6.0:
            feedback = "Average candidate. Some skills match but needs development."
        elif final_score >= 5.0:
            feedback = "Below average. Significant gaps in required skills or communication."
        else:
            feedback = "Poor fit for the role. Major skill gaps and communication issues."
        
        return {
            "score": round(final_score, 1),
            "grade": grade,
            "feedback": feedback,
            "resume_match": round(resume_jd_match, 1),
            "interview_performance": round(avg_score, 1)
        }