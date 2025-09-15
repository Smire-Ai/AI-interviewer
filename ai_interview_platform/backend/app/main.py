from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os

# This is the corrected import. The '.' tells Python to look in the current package ('app').
from .services import huggingface_service

# --- App Initialization ---
app = FastAPI()

# --- CORS Middleware ---
origins = [
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Temporary Upload Directory ---
UPLOAD_DIR = "temp_uploads"
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# --- API Endpoints ---

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Interview Platform API"}

@app.post("/analyze-resume/")
async def analyze_resume(
    resume: UploadFile = File(...),
    jd: str = Form(...),
    github_user: str = Form(...)
):
    """Receive a resume and return its analysis."""
    print(f"[API] Received request for resume analysis: {resume.filename}")
    file_path = os.path.join(UPLOAD_DIR, resume.filename)
    
    try:
        # Save the file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(resume.file, buffer)
        print(f"[API] Saved resume temporarily to {file_path}")

        # Call the service to do the heavy lifting
        print("[API] Calling Hugging Face service...")
        analysis_result = huggingface_service.analyze_resume_with_hf(file_path, jd, github_user)

        if analysis_result:
            print("[API] Successfully received analysis from service.")
            return {
                "analysis_json": analysis_result[0],
                "radar_chart_html": analysis_result[1],
                "pdf_report_path": analysis_result[2]
            }
        else:
            # This happens if the service returned None (an error occurred)
            print("[API] Analysis from service failed. Returning 500 error.")
            raise HTTPException(status_code=500, detail="Resume analysis failed after service call.")

    finally:
        # Clean up the temporary file, no matter what happens
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"[API] Cleaned up temporary file: {file_path}")

# --- (The other endpoints remain the same, but I'm including them for completeness) ---

@app.post("/start-interview/")
async def start_interview(
    resume: UploadFile = File(...),
    job_desc: str = Form(...)
):
    """Start an AI interview session."""
    file_path = os.path.join(UPLOAD_DIR, resume.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(resume.file, buffer)
        interview_data = huggingface_service.start_interview_with_hf(file_path, job_desc)
        if interview_data:
            return {
                "conversation": interview_data[0],
                "audio_question_path": interview_data[1],
                "interview_pdf_path": interview_data[2]
            }
        raise HTTPException(status_code=500, detail="Failed to start interview.")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@app.post("/handle-response/")
async def handle_response(response: str = Form(...)):
    """Handle a user's response during an interview."""
    interview_data = huggingface_service.handle_interview_response_with_hf(response)
    if interview_data:
        return {
            "conversation": interview_data[0],
            "audio_question_path": interview_data[1],
            "interview_pdf_path": interview_data[2]
        }
    raise HTTPException(status_code=500, detail="Failed to handle response.")

@app.post("/end-interview/")
async def end_interview():
    """End the interview and get the final report."""
    interview_data = huggingface_service.end_interview_with_hf()
    if interview_data:
        return {
            "conversation": interview_data[0],
            "audio_question_path": interview_data[1],
            "interview_pdf_path": interview_data[2]
        }
    raise HTTPException(status_code=500, detail="Failed to end interview.")