# backend/app/services/ai_services.py (FINAL-FINAL VERSION)

import os
import json
import io
from PyPDF2 import PdfReader
from groq import Groq, APIError

# --- GROQ CLIENT INITIALIZATION ---
try:
    groq_client = Groq()
    # Using the currently active, high-quality Llama3 model on Groq
    GROQ_MODEL_NAME = 'qwen/qwen3-32b' 
except Exception as e:
    print(f"CRITICAL: Failed to initialize Groq Client. Check your GROQ_API_KEY. Error: {e}")
    groq_client = None
    GROQ_MODEL_NAME = None

def _query_groq_for_json(prompt: str) -> str:
    # ... (This function is correct and uses the variable, no changes needed)
    if not groq_client:
        return '{"error": "AI service is not configured."}'
    messages = [
        {"role": "system", "content": "You are a helpful assistant that provides responses in valid JSON format."},
        {"role": "user", "content": prompt}
    ]
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=messages,
            model=GROQ_MODEL_NAME,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        print(f"General AI Error in _query_groq_for_json: {e}")
        return f'{{"error": "An unknown error occurred.", "details": "{str(e)}"}}'

def parse_pdf_resume(file_bytes: bytes) -> str:
    # ... (No changes needed)
    pdf_file = io.BytesIO(file_bytes)
    reader = PdfReader(pdf_file)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return ''.join(c for c in text if c.isprintable())

def analyze_resume_with_ai(resume_text: str, job_description: str) -> dict:
    # ... (No changes needed)
    prompt = f"""
    Analyze the resume based on the job description... (prompt is the same)
    """
    response_text = _query_groq_for_json(prompt)
    try:
        return json.loads(response_text)
    except (json.JSONDecodeError, TypeError):
        print(f"Failed to parse JSON from AI for resume analysis: {response_text}")
        return {"match_score": 0, "summary": "AI analysis failed due to malformed response.", "strengths": [], "weaknesses": []}

def get_ai_interview_question(job_title: str, conversation_history: list) -> str:
    # ... (No changes needed, it uses the variable correctly)
    if not groq_client:
        return "AI service is not configured."
    system_instruction = f"You are an expert AI interviewer..." # (prompt is the same)
    messages = [{"role": "system", "content": system_instruction}]
    for message in conversation_history:
        role = message['role'] 
        messages.append({'role': role, 'content': message['content']})
    if not conversation_history:
        messages.append({"role": "user", "content": "Let's begin. Please ask the first question."})
    try:
        chat_completion = groq_client.chat.completions.create(
            messages=messages,
            model=GROQ_MODEL_NAME, # Ensures it uses the correct model
            temperature=0.8,
        )
        return chat_completion.choices[0].message.content.strip()
    except Exception as e:
        print(f"Groq Interview Error: {e}")
        return "That's interesting. Can you tell me more about your experience with that?"

def generate_final_interview_report(transcript: list, proctoring_notes: list, resume_summary: dict) -> dict:
    # ... (No changes needed)
    prompt = f"""
    Act as a senior hiring manager... (prompt is the same)
    """
    report_text = _query_groq_for_json(prompt)
    try:
        return json.loads(report_text)
    except (json.JSONDecodeError, TypeError):
        print(f"Failed to parse final JSON from AI: {report_text}")
        return {"final_score": 0, "performance_summary": "AI report failed.", "communication_skills": "N/A", "proctoring_summary": "N/A"}