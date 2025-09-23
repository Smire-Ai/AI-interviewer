from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List
import json
import uuid
import os
import tempfile
import shutil
import io
from huggingface_hub import InferenceClient

from .database.database import supabase
from .auth.auth import verify_firebase_token
from .services import huggingface_service

app = FastAPI()

origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = tempfile.gettempdir()


@app.get("/")
def read_root():
    return {"message": "Welcome..."}


@app.post("/sync-user")
async def sync_user(token_data: dict = Body(...)):
    try:
        token, role = token_data.get("token"), token_data.get("role")
        decoded_token = verify_firebase_token(f"Bearer {token}")
        firebase_uid = decoded_token["uid"]
        email, display_name = decoded_token.get("email"), decoded_token.get("name")

        existing_user = (
            supabase.table("users")
            .select("firebase_uid")
            .eq("firebase_uid", firebase_uid)
            .execute()
        )

        if existing_user.data:
            supabase.table("users").update(
                {
                    "role": role,
                    "display_name": display_name,
                    "email": email,
                }
            ).eq("firebase_uid", firebase_uid).execute()
        else:
            supabase.table("users").insert(
                {
                    "firebase_uid": firebase_uid,
                    "email": email,
                    "display_name": display_name,
                    "role": role,
                }
            ).execute()

        return {"status": "success"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/hr/get-candidates")
async def hr_get_candidates(decoded_token: dict = Depends(verify_firebase_token)):
    try:
        firebase_uid = decoded_token["uid"]
        user_record = (
            supabase.table("users")
            .select("role")
            .eq("firebase_uid", firebase_uid)
            .single()
            .execute()
        )
        if not user_record.data or user_record.data.get("role") != "HR":
            raise HTTPException(status_code=403, detail="Forbidden")

        candidates = (
            supabase.table("candidates")
            .select("id, created_at, name, email")
            .eq("hr_user_id", firebase_uid)
            .order("created_at", desc=True)
            .execute()
        )
        return candidates.data if candidates.data else []

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/hr/upload-resumes")
async def hr_upload_resumes(
    token: str = Form(...),
    candidate_data_json: str = Form(...),
    files: List[UploadFile] = File(...),
):
    try:
        decoded_token = verify_firebase_token(f"Bearer {token}")
        firebase_uid = decoded_token["uid"]

        user_record = (
            supabase.table("users")
            .select("role")
            .eq("firebase_uid", firebase_uid)
            .single()
            .execute()
        )
        if not user_record.data or user_record.data.get("role") != "HR":
            raise HTTPException(status_code=403, detail="Forbidden")

        candidate_data = json.loads(candidate_data_json)

        for i, file in enumerate(files):
            candidate_info = candidate_data[i]

            new_candidate = supabase.table("candidates").insert(
                {
                    "name": candidate_info["name"],
                    "email": candidate_info["email"],
                    "hr_user_id": firebase_uid,
                }
            ).execute()
            candidate_id = new_candidate.data[0]["id"]

            storage_path = f"{firebase_uid}/{uuid.uuid4()}.pdf"
            supabase.storage.from_("hr-resumes").upload(
                storage_path, await file.read()
            )

            supabase.table("candidate_resumes").insert(
                {
                    "candidate_id": candidate_id,
                    "storage_path": storage_path,
                    "original_filename": file.filename,
                }
            ).execute()

        return {"status": "success", "message": f"{len(files)} resumes uploaded."}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/hr/candidate/{candidate_id}")
async def get_candidate_details(
    candidate_id: int,
    decoded_token: dict = Depends(verify_firebase_token)
):
    try:
        firebase_uid = decoded_token['uid']
        candidate_details = supabase.table('candidates').select(
            'id, name, email'
        ).eq('id', candidate_id).eq('hr_user_id', firebase_uid).single().execute()

        if not candidate_details.data:
            raise HTTPException(status_code=404, detail="Candidate not found or you do not have permission to view it.")

        resumes = supabase.table('candidate_resumes').select(
            'id, original_filename, storage_path, created_at'
        ).eq('candidate_id', candidate_id).order('created_at', desc=True).execute()

        return {
            "details": candidate_details.data,
            "resumes": resumes.data if resumes.data else []
        }
    except Exception as e:
        print(f"[API /hr/candidate/{candidate_id}] ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/hr/analyze-resume")
async def hr_analyze_resume(
    data: dict = Body(...),
    decoded_token: dict = Depends(verify_firebase_token)
):
    try:
        firebase_uid = decoded_token['uid']
        resume_id = data.get('resume_id')
        job_description = data.get('job_description')

        resume_record = supabase.table('candidate_resumes').select(
            'storage_path, candidate:candidates(hr_user_id)'
        ).eq('id', resume_id).single().execute()

        if not resume_record.data:
            raise HTTPException(status_code=404, detail="Resume not found.")

        if resume_record.data['candidate']['hr_user_id'] != firebase_uid:
            raise HTTPException(status_code=403, detail="Forbidden: You do not own this resume.")

        storage_path = resume_record.data['storage_path']
        file_content = supabase.storage.from_('hr-resumes').download(storage_path)

        temp_file_path = os.path.join(tempfile.gettempdir(), storage_path.split('/')[-1])
        with open(temp_file_path, "wb") as f:
            f.write(file_content)

        analysis_result = huggingface_service.analyze_resume_with_hf(temp_file_path, job_description, "")

        os.remove(temp_file_path)

        if analysis_result:
            return {
                "analysis_json": analysis_result[0],
                "radar_chart_html": analysis_result[1],
                "pdf_report_path": analysis_result[2]
            }
        raise HTTPException(status_code=500, detail="Resume analysis failed.")

    except Exception as e:
        print(f"[API /hr/analyze-resume] ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze-resume/")
async def analyze_resume(
    resume: UploadFile = File(...), jd: str = Form(...), github_user: str = Form(...)
):
    file_path = os.path.join(UPLOAD_DIR, resume.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(resume.file, buffer)

        analysis_result = huggingface_service.analyze_resume_with_hf(
            file_path, jd, github_user
        )
        if analysis_result:
            return {
                "analysis_json": analysis_result[0],
                "radar_chart_html": analysis_result[1],
                "pdf_report_path": analysis_result[2],
            }

        raise HTTPException(status_code=500, detail="Resume analysis failed.")

    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


@app.post("/generate-audio")
async def generate_audio(
    data: dict = Body(...),
    decoded_token: dict = Depends(verify_firebase_token)
):
    try:
        text = data.get("text")
        if not text:
            raise HTTPException(status_code=400, detail="Text is required.")

        client = InferenceClient(model="hexgrad/Kokoro-82M", token=os.environ.get("HUGGINGFACE_HUB_TOKEN"))
        audio_bytes = client.text_to_speech(text)

        return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/mpeg")

    except Exception as e:
        print(f"[API /generate-audio] CRITICAL ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))
