# api/gemini_service.py
import os
import google.generativeai as genai
from rest_framework.exceptions import APIException

class GeminiServiceError(APIException):
    status_code = 503
    default_detail = 'Service Unavailable. Could not connect to the AI service.'
    default_code = 'ai_service_unavailable'

try:
    GEMINI_API_KEY = os.getenv('GEMINI_API_KEY')
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY environment variable not set.")
    
    genai.configure(api_key=GEMINI_API_KEY)
    # Using gemini-1.5-flash for speed and cost-effectiveness
    model = genai.GenerativeModel('gemini-1.5-flash')
    print("Gemini Service configured successfully.")

except Exception as e:
    model = None
    print(f"Error configuring Gemini Service: {e}")


def generate_initial_question(job_title, job_description, candidate_resume_text):
    if not model:
        raise GeminiServiceError()
    
    prompt = f"""
    Act as an expert technical interviewer hiring for a "{job_title}" role.
    The job description is as follows: "{job_description}".
    The candidate's resume is: "{candidate_resume_text}".

    Based on this information, ask the candidate one single, strong, opening question to assess their suitability for the role.
    Do not ask for an introduction. Dive straight into a relevant technical or behavioral question.
    Return only the question text.
    """
    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        raise GeminiServiceError(detail=f"AI generation failed: {e}")


def generate_followup_question(job_title, job_description, conversation_history, candidate_answer):
    if not model:
        raise GeminiServiceError()
    
    prompt = f"""
    You are an expert technical interviewer for a "{job_title}" role.
    The job description is: "{job_description}".

    Here is the interview history so far:
    {conversation_history}

    The candidate just gave the following answer to your last question:
    Candidate Answer: "{candidate_answer}"

    Your task is two-fold:
    1.  First, provide brief, constructive feedback on the candidate's answer.
    2.  Second, ask a relevant follow-up question that logically continues the conversation.

    Format your response as follows, using "||" as a separator:
    [Your feedback on the answer.]||[Your next question.]
    
    Example:
    That's a good overview of the STAR method. Can you provide a more specific example?||Tell me about a time you had to deal with a difficult stakeholder.
    """
    try:
        response = model.generate_content(prompt)
        parts = response.text.strip().split('||')
        if len(parts) == 2:
            feedback = parts[0].strip()
            next_question = parts[1].strip()
            return feedback, next_question
        else:
            # Fallback if the model doesn't follow the format perfectly
            return "Thank you for your response.", parts[0].strip()
    except Exception as e:
        raise GeminiServiceError(detail=f"AI generation failed: {e}")