import os
from gradio_client import Client
from dotenv import load_dotenv

load_dotenv()
HUGGINGFACE_HUB_TOKEN = os.environ.get("HUGGINGFACE_HUB_TOKEN")

def analyze_resume_with_hf(resume_path: str, jd: str, github_user: str):
    """
    Calls the Hugging Face model to analyze a resume.
    """
    try:
        print("[Service/Analyze] Connecting to resume-analyzer-template client...")
        client = Client("ahmedatk/resume-analyzer-template", hf_token=HUGGINGFACE_HUB_TOKEN)
        
        print(f"[Service/Analyze] Sending data to model in order: path='{resume_path}', jd='{jd[:20]}...', github='{github_user}'")
        
        # --- THIS IS THE CRITICAL FIX ---
        # Arguments are passed by position (in order), not by name.
        result = client.predict(
            resume_path,      # 1st argument
            jd,               # 2nd argument
            github_user,      # 3rd argument
            api_name="/predict"
        )
        
        print("[Service/Analyze] Successfully received a result from the model.")
        if isinstance(result, (list, tuple)) and len(result) >= 3:
            return result
        else:
            print(f"[Service/Analyze] ERROR: The model returned an unexpected result format: {result}")
            return None

    except Exception as e:
        print(f"[Service/Analyze] CRITICAL ERROR: {type(e).__name__} - {e}")
        return None


def start_interview_with_hf(resume_path: str, job_desc: str):
    try:
        client = Client("ahmedatk/ai_interviewer", hf_token=HUGGINGFACE_HUB_TOKEN)
        result = client.predict(
            resume_path,
            job_desc,    
            api_name="/gradio_start_interview"
        )
        return result
    except Exception as e:
        print(f"[Service/Interview] Error in start_interview: {e}")
        return None

def handle_interview_response_with_hf(response: str):
    try:
        client = Client("ahmedatk/ai_interviewer", hf_token=HUGGINGFACE_HUB_TOKEN)
        result = client.predict(
            response, # Pass by position
            api_name="/gradio_handle_response"
        )
        return result
    except Exception as e:
        print(f"[Service/Interview] Error in handle_response: {e}")
        return None

def end_interview_with_hf():
    try:
        client = Client("ahmedatk/ai_interviewer", hf_token=HUGGINGFACE_HUB_TOKEN)
        result = client.predict(api_name="/gradio_end_interview")
        return result
    except Exception as e:
        print(f"[Service/Interview] Error in end_interview: {e}")
        return None