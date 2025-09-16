# FastAPI core imports
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

# Python standard library
import shutil
import os
import tempfile

# Project-specific modules
from .auth.auth import verify_firebase_token
from .database import database  # Supabase client
from .services import huggingface_service
app = FastAPI()

origins = ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = tempfile.gettempdir()

# --- HELPER FUNCTION TO CLEAN FILE PATHS ---
def clean_temp_path(full_path: str) -> str:
    """
    Takes a full file path from Gradio and returns only the relative part
    needed for the /get-audio endpoint. This handles both Windows and Linux paths.
    """
    if not full_path:
        return ""
    # os.path.normpath cleans up slashes (e.g., C:\\Users -> C:/Users)
    normalized_path = os.path.normpath(full_path)
    # tempfile.gettempdir() gets the base temp directory (e.g., C:/Users/Ahmad/AppData/Local/Temp)
    temp_dir = os.path.normpath(tempfile.gettempdir())
    
    # We remove the base temp directory from the full path
    # os.path.relpath finds the relative path from one point to another
    relative_path = os.path.relpath(normalized_path, temp_dir)
    
    print(f"[Path Helper] Original: {full_path}, Relative: {relative_path}")
    return relative_path

# --- Endpoint to serve audio ---
@app.get("/get-audio/{file_path:path}")
async def get_audio_file(file_path: str):
    safe_base_dir = tempfile.gettempdir()
    # Reconstruct the full path on the server
    full_path = os.path.join(safe_base_dir, file_path)
    
    if not os.path.normpath(full_path).startswith(safe_base_dir):
        raise HTTPException(status_code=403, detail="Access denied.")
    
    if os.path.exists(full_path):
        return FileResponse(full_path, media_type="audio/mpeg") # Use mpeg for .mp3 files
    
    raise HTTPException(status_code=404, detail=f"Audio file not found at: {full_path}")

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Interview Platform API"}

@app.post("/start-interview/")
async def start_interview(resume: UploadFile = File(...), job_desc: str = Form(...)):
    file_path = os.path.join(UPLOAD_DIR, resume.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(resume.file, buffer)
        
        interview_data = huggingface_service.start_interview_with_hf(file_path, job_desc)
        
        if interview_data:
            return {
                "conversation": interview_data[0],
                # --- THIS IS THE FIX ---
                "audio_question_path": clean_temp_path(interview_data[1])
            }
        raise HTTPException(status_code=500, detail="Failed to start interview.")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@app.post("/handle-response/")
async def handle_response(response: str = Form(...)):
    interview_data = huggingface_service.handle_interview_response_with_hf(response)
    if interview_data:
        return {
            "conversation": interview_data[0],
            # --- THIS IS THE FIX ---
            "audio_question_path": clean_temp_path(interview_data[1]),
            "interview_pdf_path": interview_data[2]
        }
    raise HTTPException(status_code=500, detail="Failed to handle response.")


@app.post("/analyze-resume/")
async def analyze_resume(resume: UploadFile = File(...), jd: str = Form(...), github_user: str = Form(...)):
    file_path = os.path.join(UPLOAD_DIR, resume.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(resume.file, buffer)
        analysis_result = huggingface_service.analyze_resume_with_hf(file_path, jd, github_user)
        if analysis_result:
            return {
                "analysis_json": analysis_result[0],
                "radar_chart_html": analysis_result[1],
                "pdf_report_path": analysis_result[2]
            }
        raise HTTPException(status_code=500, detail="Resume analysis failed.")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)







            # NEW ENDPOINT FOR USER SYNCING
@app.post("/sync-user")
async def sync_user(
    token: str = Body(..., embed=True), # Expect a JSON body like {"token": "..."}
    role: str = Body(..., embed=True) # And {"role": "..."}
):
    """
    Receives a Firebase ID token from the frontend, verifies it,
    and saves/updates the user in the Supabase 'users' table.
    """
    try:
        print("[API /sync-user] Received request to sync user.")
        decoded_token = verify_firebase_token(token)
        firebase_uid = decoded_token['uid']
        email = decoded_token.get('email')
        display_name = decoded_token.get('name')

        # Check if user already exists
        existing_user = database.table('users').select('firebase_uid').eq('firebase_uid', firebase_uid).execute()

        if existing_user.data:
            print(f"[API /sync-user] User {email} already exists. Updating role.")
            # If user exists, just update their role
            user_data, error = database.table('users').update({
                'role': role,
                'display_name': display_name,
                'email': email # Also update email/name in case it changed
            }).eq('firebase_uid', firebase_uid).execute()
        else:
            print(f"[API /sync-user] New user {email}. Creating record.")
            # If user is new, insert a new record
            user_data, error = database.table('users').insert({
                'firebase_uid': firebase_uid,
                'email': email,
                'display_name': display_name,
                'role': role
            }).execute()
        
        if error and error.message:
             raise HTTPException(status_code=500, detail=f"Supabase error: {error.message}")

        print(f"[API /sync-user] Successfully synced user {email} with role {role}.")
        return {"status": "success", "message": "User synced successfully."}

    except HTTPException as e:
        # Re-raise HTTP exceptions
        raise e
    except Exception as e:
        print(f"An error occurred during user sync: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred.")
    

@app.post("/sync-user")
async def sync_user(
    token: str = Body(..., embed=True),
    role: str = Body(..., embed=True)
):
    try:
        print("[API /sync-user] Received request.")
        decoded_token = verify_firebase_token(token)
        firebase_uid = decoded_token['uid']
        email = decoded_token.get('email')
        display_name = decoded_token.get('name')

        existing_user = database.table('users').select('firebase_uid').eq('firebase_uid', firebase_uid).execute()

        if existing_user.data:
            print(f"[API /sync-user] User {email} exists. Updating role.")
            database.table('users').update({
                'role': role,
                'display_name': display_name,
                'email': email
            }).eq('firebase_uid', firebase_uid).execute()
        else:
            print(f"[API /sync-user] New user {email}. Inserting record.")
            database.table('users').insert({
                'firebase_uid': firebase_uid,
                'email': email,
                'display_name': display_name,
                'role': role
            }).execute()
        
        return {"status": "success", "message": "User synced."}
    except Exception as e:
        print(f"[API /sync-user] ERROR: {e}")
        raise HTTPException(status_code=500, detail="An internal server error occurred during user sync.")
