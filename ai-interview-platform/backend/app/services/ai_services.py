# backend/app/services/ai_services.py (FINAL - SELF-CONTAINED LOGIC)

import os
import json
import requests
import pdfplumber
from io import BytesIO

# --- CONFIGURATION ---
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
HEADERS = {
    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
    "Content-Type": "application/json",
    "HTTP-Referer": "http://localhost:5500", # Can be any URL
    "X-Title": "AI Interview Platform"       # Can be any name
}
# Using a powerful, reliable, and often free/low-cost model from OpenRouter
SELECTED_MODEL = "openai/gpt-oss-20b"

# This is the system prompt from your Hugging Face space
SYSTEM_PROMPT = """
You are an expert AI résumé analyzer.
Analyze the provided résumé against the given job description.
Your response MUST be a single, valid JSON object and nothing else.
The JSON object must have keys: "overall_score" (int 0-100), "summary" (string), "sections" (a dictionary of section analyses), and "killer_quote" (string).
Each section analysis must have keys: "score" (int 0-100), "missing" (list of strings), "suggestions" (list of strings), and "comment" (string).
The sections are: "contact", "summary", "experience", "skills", "education", "projects".
"""

def clean_text(text):
    """A simple text cleaning function."""
    return ' '.join(text.split())

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """Extracts and cleans text from PDF bytes using pdfplumber."""
    if not pdf_bytes:
        return ""
    try:
        with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
            return clean_text(" ".join(page.extract_text() or "" for page in pdf.pages))
    except Exception as e:
        print(f"Error extracting text with pdfplumber: {e}")
        return ""

def analyze_resume_with_ai(resume_file_bytes: bytes, job_description: str, file_name: str) -> dict:
    """
    Replicates the Hugging Face logic locally by calling the OpenRouter API directly.
    """
    if not OPENROUTER_API_KEY:
        print("CRITICAL: OPENROUTER_API_KEY not found in .env file.")
        return {"overall_score": 0, "summary": "AI service is not configured. API Key is missing.", "sections": {}, "killer_quote": ""}

    print(f"Analyzing '{file_name}' locally using OpenRouter...")
    
    resume_text = extract_text_from_pdf(resume_file_bytes)
    if not resume_text:
        return {"overall_score": 0, "summary": "Could not read text from the provided PDF file.", "sections": {}, "killer_quote": ""}

    # This is the payload structure from your engine.py
    payload = {
        "model": SELECTED_MODEL,
        "messages": [{"role": "user", "content": f"{SYSTEM_PROMPT}\n\nRésumé:\n{resume_text}\n\nJob Description:\n{job_description}"}],
        "max_tokens": 2048, # Increased for more detailed analysis
        "temperature": 0.2,
        "response_format": {"type": "json_object"} # Force JSON output
    }

    try:
        response = requests.post(OPENROUTER_URL, headers=HEADERS, json=payload, timeout=60)
        response.raise_for_status()
        
        raw_content = response.json()["choices"][0]["message"]["content"]
        
        # This robustly finds and parses the JSON block from the response
        json_start = raw_content.find("{")
        json_end = raw_content.rfind("}") + 1
        if json_start == -1 or json_end == 0:
            raise json.JSONDecodeError("No JSON object found in AI response", raw_content, 0)
            
        json_string = raw_content[json_start:json_end]
        ai_output_json = json.loads(json_string)
        
        print("Successfully received and parsed analysis from OpenRouter.")
        return ai_output_json

    except Exception as e:
        print(f"ERROR: An exception occurred while calling OpenRouter: {e}")
        # Here you can implement your fallback scoring if you want, or just return an error
        return {
            "overall_score": 0,
            "summary": f"An error occurred during AI analysis: {str(e)}",
            "sections": {},
            "killer_quote": ""
        }