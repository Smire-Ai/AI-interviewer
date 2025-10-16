# api/gemini_service.py
# -------------------------------
# Gemini AI service for generating interview questions and ATS resume analysis
# -------------------------------

# Import statements
# Replace these with actual imports as per your project
# e.g., your AI model client, exceptions, etc.
from .exceptions import GeminiServiceError

# Placeholder for your AI model instance
# Make sure you initialize your model somewhere in this module
model = None  # Replace with your actual model initialization


# Example: Generate the first question for an interview
def generate_initial_question(job_title, job_description, candidate_resume_text):
    if not model:
        raise GeminiServiceError("AI model not initialized.")
    
    prompt = f"""
    Generate a first interview question for a candidate applying for the following job:
    Title: {job_title}
    Description: {job_description}
    Candidate Resume: {candidate_resume_text}
    """
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        raise GeminiServiceError(detail=f"AI generation for initial question failed: {e}")


# Example: Generate a follow-up question and feedback for an answer
def generate_followup_question(job_title, job_description, conversation_history, candidate_answer):
    if not model:
        raise GeminiServiceError("AI model not initialized.")
    
    prompt = f"""
    You are an AI interviewer.
    Job Title: {job_title}
    Job Description: {job_description}
    Conversation so far:
    {conversation_history}
    Candidate Answer:
    {candidate_answer}

    Generate AI feedback for the candidate and the next interview question.
    Format:
    [FEEDBACK]||[NEXT_QUESTION]
    """
    try:
        response = model.generate_content(prompt)
        parts = response.text.strip().split("||")
        feedback = parts[0].strip() if len(parts) > 0 else "No feedback available."
        next_question = parts[1].strip() if len(parts) > 1 else "Next question could not be generated."
        return feedback, next_question
    except Exception as e:
        raise GeminiServiceError(detail=f"AI generation for followup question failed: {e}")


# -------------------------------
# ATS Resume Analysis
# -------------------------------
def check_resume_ats(job_description, resume_text):
    """
    Analyze a candidate's resume against a job description using AI (ATS style).

    Returns a dict:
    {
        "score": int,         # 0-100 match score
        "summary": str,       # One-sentence summary of fit
        "suggestions": str    # Actionable improvement suggestions
    }
    """
    if not model:
        raise GeminiServiceError(detail="AI model is not initialized.")

    prompt = f"""
    Act as an expert Applicant Tracking System (ATS).
    Your task is to analyze a candidate's resume against a job description and provide a match score and constructive feedback.

    JOB DESCRIPTION:
    ---
    {job_description}
    ---

    CANDIDATE'S RESUME:
    ---
    {resume_text}
    ---

    Provide your analysis in the following format, using "||" as a separator:
    [A match score between 0 and 100, as an integer only]||[A brief, one-sentence summary of the candidate's fit]||[A few actionable suggestions for the candidate to improve their resume for this specific job]
    
    Example:
    85||The candidate is a strong fit with extensive experience in Python and Django, but lacks specific keywords from the job description.||Add keywords like "microservices" and "CI/CD". Quantify achievements in past projects with numbers, such as "improved performance by 20%".
    """
    try:
        response = model.generate_content(prompt)
        parts = response.text.strip().split('||')

        if len(parts) == 3:
            try:
                score = int(parts[0].strip())
            except ValueError:
                score = 50  # fallback if AI returns a non-integer

            return {
                "score": score,
                "summary": parts[1].strip(),
                "suggestions": parts[2].strip()
            }
        else:
            # Fallback if AI response format is unexpected
            return {
                "score": 50,
                "summary": "Could not fully analyze the resume.",
                "suggestions": "Ensure your resume text is clear and complete."
            }

    except Exception as e:
        raise GeminiServiceError(detail=f"AI generation for ATS failed: {e}")
