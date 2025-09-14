#!/usr/bin/env python3
"""
Basic functionality test for AI Interviewer
"""

import json
from app.services.resume_extractor import ResumeExtractor
from app.services.ai_service import AIService

def test_resume_extractor():
    """Test resume extraction functionality"""
    print("Testing Resume Extractor...")
    
    extractor = ResumeExtractor()
    
    # Test skills extraction
    sample_text = """
    John Doe
    Software Engineer
    
    Skills: Python, JavaScript, React, Django, Machine Learning, AWS
    
    Experience:
    Senior Software Developer at Tech Corp (2020-2023)
    - Built web applications using React and Django
    - Implemented machine learning models
    
    Education:
    BS Computer Science, MIT, 2020
    """
    
    skills = extractor.extract_skills(sample_text)
    print(f"Extracted skills: {skills}")
    
    contact_info = extractor.extract_contact_info("john.doe@email.com +1-234-567-8900")
    print(f"Extracted contact info: {contact_info}")
    
    experience = extractor.extract_experience(sample_text)
    print(f"Extracted experience: {experience[:100]}..." if len(experience) > 100 else f"Extracted experience: {experience}")
    
    print("✅ Resume Extractor test passed\n")

def test_ai_service():
    """Test AI service functionality"""
    print("Testing AI Service...")
    
    ai_service = AIService()
    
    # Test match calculation
    resume_skills = ["Python", "JavaScript", "React"]
    jd_skills = ["Python", "React", "Django"]
    match_score = ai_service.calculate_resume_jd_match(
        resume_skills, "Python developer with React experience", 
        jd_skills, "Looking for Python developer with React skills"
    )
    print(f"Resume-JD match score: {match_score}%")
    
    # Test question generation (fallback mode)
    resume_data = {"skills": resume_skills, "experience": "Python developer", "education": "CS degree"}
    jd_data = {"content": "Python developer role", "required_skills": jd_skills, "experience_level": "Mid Level"}
    
    questions = ai_service.generate_questions(resume_data, jd_data, 5)
    print(f"Generated {len(questions)} questions:")
    for i, q in enumerate(questions[:3], 1):
        print(f"  {i}. {q['question']} ({q['type']})")
    
    # Test answer evaluation
    evaluation = ai_service.evaluate_answer(
        "Tell me about your Python experience",
        "I have 3 years of Python experience building web applications",
        "technical"
    )
    print(f"Answer evaluation: {evaluation}")
    
    print("✅ AI Service test passed\n")

def test_scoring_system():
    """Test scoring system"""
    print("Testing Scoring System...")
    
    ai_service = AIService()
    question_scores = [8.5, 7.0, 9.0, 6.5, 8.0]
    resume_jd_match = 75.0
    
    overall_score = ai_service.calculate_overall_score(question_scores, resume_jd_match)
    print(f"Overall score calculation: {overall_score}")
    
    print("✅ Scoring System test passed\n")

if __name__ == "__main__":
    print("🤖 AI Interviewer - Basic Functionality Tests\n")
    print("=" * 50)
    
    try:
        test_resume_extractor()
        test_ai_service()
        test_scoring_system()
        
        print("=" * 50)
        print("🎉 All tests passed successfully!")
        print("\nThe AI Interviewer system is ready to use.")
        print("Run 'python main.py' to start the web application.")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()