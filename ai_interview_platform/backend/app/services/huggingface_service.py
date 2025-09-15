import os
import json
from gradio_client import Client, handle_file
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

HUGGINGFACE_HUB_TOKEN = os.environ.get("HUGGINGFACE_HUB_TOKEN")

def analyze_resume_with_hf(resume_path: str, jd: str, github_user: str):
    """
    Calls the Hugging Face model to analyze a resume against a job description.
    """
    try:
        print("[Service] Connecting to resume-analyzer-template client...")
        client = Client("ahmedatk/resume-analyzer-template", hf_token=HUGGINGFACE_HUB_TOKEN)
        
        print(f"[Service] Sending data to model: jd='{jd[:30]}...', github='{github_user}'")
        result = client.predict(
            resume=handle_file(resume_path),
            jd=jd,
            github_user=github_user,
            api_name="/predict"
        )
        
        print("[Service] Successfully received a result from the model.")
        # Check if the result is valid before returning
        if isinstance(result, (list, tuple)) and len(result) >= 3:
            return result
        else:
            print(f"[Service] CRITICAL ERROR: The model returned an unexpected result format: {result}")
            return None

    except json.JSONDecodeError as e:
        print(f"[Service] CRITICAL JSON ERROR: The Hugging Face Space likely returned a non-JSON response (e.g., it's waking up or down). Details: {e}")
        return None
    except Exception as e:
        # This will catch other errors like timeouts or connection issues.
        print(f"[Service] An unexpected error occurred: {type(e).__name__} - {e}")
        return None

# --- (Other functions remain the same as your provided code) ---

def start_interview_with_hf(resume_path: str, job_desc: str):
    try:
        client = Client("ahmedatk/ai_interviewer", hf_token=HUGGINGFACE_HUB_TOKEN)
        result = client.predict(
            resume=handle_file(resume_path),
            job_desc=job_desc,
            api_name="/gradio_start_interview"
        )
        return result
    except Exception as e:
        print(f"[Service] Error in start_interview: {e}")
        return None

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