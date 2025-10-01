import requests
import json
import io
from PyPDF2 import PdfReader
from app.core.config import OPENROUTER_API_KEY

# --- Basic configuration for OpenRouter ---
YOUR_SITE_URL = "http://localhost:5500"  # Change to your deployed URL
YOUR_APP_NAME = "AI Interview Platform"
SELECTED_MODEL = "mistralai/mistral-7b-instruct"  # A good, fast, free model


def query_openrouter(prompt: str) -> str:
    """Sends a prompt to the OpenRouter API and returns the response text."""
    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "HTTP-Referer": YOUR_SITE_URL,
                "X-Title": YOUR_APP_NAME,
            },
            json={
                "model": SELECTED_MODEL,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except requests.exceptions.RequestException as e:
        print(f"Error calling OpenRouter: {e}")
        return None
    except (KeyError, IndexError):
        print("Unexpected response format from OpenRouter.")
        return None


def parse_pdf_resume(file_bytes: bytes) -> str:
    """Extracts text from a PDF file."""
    pdf_file = io.BytesIO(file_bytes)
    reader = PdfReader(pdf_file)
    text = ""
    for page in reader.pages:
        text += page.extract_text() or ""
    return text.strip()


def analyze_resume_with_ai(resume_text: str, job_description: str) -> dict:
    """Analyzes resume against job description and returns structured JSON."""
    prompt = f"""
    Analyze the following resume based on the provided job description.
    Provide output in valid JSON format with keys: "match_score", "summary", "strengths", "weaknesses".

    Job Description:
    ---
    {job_description}
    ---

    Resume Text:
    ---
    {resume_text}
    ---
    """

    response_text = query_openrouter(prompt)
    try:
        return json.loads(response_text)
    except (json.JSONDecodeError, TypeError):
        return {
            "match_score": 0,
            "summary": "AI analysis failed.",
            "strengths": [],
            "weaknesses": []
        }


def get_ai_interview_question(job_title: str, conversation_history: list) -> str:
    """Generates the next interview question based on conversation history."""
    history_str = "\n".join([f"{msg['role']}: {msg['content']}" for msg in conversation_history])

    prompt = f"""
    You are an AI interviewer for the position of "{job_title}".
    Based on the conversation history below, ask the next relevant interview question.
    Keep it concise, do not repeat questions.
    If history is empty, start with: "Tell me about yourself."

    Conversation History:
    ---
    {history_str}
    ---

    Your next question:
    """

    return query_openrouter(prompt) or "Could you please elaborate on that?"


def generate_final_interview_report(transcript: list, proctoring_notes: list, resume_summary: dict) -> dict:
    """Generates a final interview report based on transcript, proctoring notes, and resume summary."""
    transcript_str = "\n".join([f"{entry['role']}: {entry['content']}" for entry in transcript])
    proctoring_str = "\n".join([f"- {note['timestamp']}: {note['event']}" for note in proctoring_notes])

    prompt = f"""
    Act as a senior hiring manager. Analyze the interview transcript, proctoring notes, and resume summary.
    Provide output in JSON format with keys: "final_score", "performance_summary", "communication_skills", "proctoring_summary".

    Initial Resume Analysis:
    ---
    {json.dumps(resume_summary, indent=2)}
    ---

    Proctoring Notes:
    ---
    {proctoring_str if proctoring_str else "None"}
    ---

    Interview Transcript:
    ---
    {transcript_str}
    ---
    """

    report_text = query_openrouter(prompt)
    try:
        return json.loads(report_text)
    except (json.JSONDecodeError, TypeError):
        return {
            "final_score": 0,
            "performance_summary": "Failed to generate AI report.",
            "communication_skills": "",
            "proctoring_summary": ""
        }
