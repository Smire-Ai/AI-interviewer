# File: backend/app/services/huggingface_service.py

import os
import json
# --- THIS IS THE FIX: 'handle_file' is removed from the import ---
from gradio_client import Client
from dotenv import load_dotenv

load_dotenv()
HUGGINGFACE_HUB_TOKEN = os.environ.get("HUGGINGFACE_HUB_TOKEN")

def analyze_resume_with_hf(resume_path: str, jd: str, github_user: str):
    """
    Calls the Hugging Face model to analyze a resume.
    """
    try:
        print("[Service] Connecting to resume-analyzer-template client...")
        client = Client("ahmedatk/resume-analyzer-template", hf_token=HUGGINGFACE_HUB_TOKEN)
        
        print(f"[Service] Sending data to model...")
        # --- THIS IS THE FIX: We now pass the file path directly as a string ---
        result = client.predict(
            resume=resume_path,
            jd=jd,
            github_user=github_user,
            api_name="/predict"
        )
        
        print("[Service] Successfully received a result from the model.")
        if isinstance(result, (list, tuple)) and len(result) >= 3:
            return result
        else:
            print(f"[Service] CRITICAL ERROR: The model returned an unexpected result format: {result}")
            return None

    except Exception as e:
        print(f"[Service] An unexpected error occurred: {type(e).__name__} - {e}")
        return None

def start_interview_with_hf(resume_path: str, job_desc: str):
    """
    Starts an AI interview session.
    """
    try:
        print("[Service] Connecting to ai_interviewer client...")
        client = Client("ahmedatk/ai_interviewer", hf_token=HUGGINGFACE_HUB_TOKEN)
        
        # --- THIS IS THE FIX: Pass the file path directly ---
        result = client.predict(
            resume=resume_path,
            job_desc=job_desc,
            api_name="/gradio_start_interview"
        )
        print("[Service] Interview started successfully.")
        return result
    except Exception as e:
        print(f"[Service] Error in start_interview: {e}")
        return None

# The other functions don't handle files, so they don't need changes,
# but I include them for completeness.
def handle_interview_response_with_hf(response: str):
    try:
        client = Client("ahmedatk/ai_interviewer", hf_token=HUGGINGFACE_HUB_TOKEN)
        result = client.predict(
            response=response,
            api_name="/gradio_handle_response"
        )
        return result
    except Exception as e:
        print(f"[Service] Error in handle_response: {e}")
        return None

def end_interview_with_hf():
    try:
        client = Client("ahmedatk/ai_interviewer", hf_token=HUGGINGFACE_HUB_TOKEN)
        result = client.predict(
            api_name="/gradio_end_interview"
        )
        return result
    except Exception as e:
        print(f"[Service] Error in end_interview: {e}")
        return None