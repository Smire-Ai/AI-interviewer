from fastapi import APIRouter, Depends, HTTPException, status
from app.db.supabase_client import supabase
from app.api.deps import get_current_user
from app.models.pydantic_models import InterviewResponse, InterviewComplete
from app.services.ai_services import get_ai_interview_question, generate_final_interview_report
from app.services.pdf_generator import create_interview_report_pdf
from typing import Dict, Any
import json

router = APIRouter()

@router.post("/start", status_code=status.HTTP_200_OK)
def start_interview(application_id_data: Dict[str, Any], current_user: Dict = Depends(get_current_user)):
    """
    Starts an interview for an accepted application.
    Verifies that the user is the correct candidate and the application has been accepted.
    Returns the first interview question.
    """
    application_id = application_id_data.get("application_id")
    if not application_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Application ID is required.")

    # Verify the user is the candidate for this application and it's accepted
    app_res = supabase.table("applications").select("status, job:jobs(title)").eq("id", application_id).eq("candidate_id", current_user["id"]).execute()
    
    if not app_res.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found or you do not have permission to access it.")

    application_data = app_res.data[0]
    if application_data.get("status") != "accepted":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Interview not authorized. Application has not been accepted.")
    
    job_title = application_data["job"]["title"]
    
    # Get the first question from the AI service with an empty conversation history
    first_question = get_ai_interview_question(job_title, [])
    
    if not first_question:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI service is currently unavailable. Please try again later.")

    return {"question": first_question}


@router.post("/respond", status_code=status.HTTP_200_OK)
def handle_interview_response(response: InterviewResponse, current_user: Dict = Depends(get_current_user)):
    """
    Handles a single turn in the interview.
    Receives the candidate's answer and returns the AI's next question.
    """
    # Verify the user is the correct candidate for this application
    app_res = supabase.table("applications").select("job:jobs(title)").eq("id", response.application_id).eq("candidate_id", current_user["id"]).execute()
    if not app_res.data:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this interview.")

    job_title = app_res.data[0]["job"]["title"]
    
    # The frontend is responsible for maintaining the history. We just use it to get the next question.
    history = response.conversation_history
    history.append({"role": "user", "content": response.user_answer})

    next_question = get_ai_interview_question(job_title, history)

    if not next_question:
         # In case of AI failure, return a generic follow-up to keep the interview going
        next_question = "That's interesting. Can you tell me more about that?"

    # The AI's question is added to the history for the *next* turn
    history.append({"role": "assistant", "content": next_question})
    
    return {"next_question": next_question, "updated_history": history}


@router.post("/complete", status_code=status.HTTP_200_OK)
def complete_interview(data: InterviewComplete, current_user: Dict = Depends(get_current_user)):
    """
    Finalizes the interview, generates an AI report, creates a PDF,
    and saves all data to the database.
    """
    # Fetch all necessary data in one go: application, job, and candidate details
    app_res = supabase.table("applications").select(
        "ai_summary, job:jobs(title), candidate:users(full_name, email)"
    ).eq("id", data.application_id).eq("candidate_id", current_user["id"]).execute()

    if not app_res.data:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to complete this interview.")
    
    app_data = app_res.data[0]
    
    # Safely load the JSON summary from the resume analysis phase
    try:
        resume_summary = json.loads(app_data.get("ai_summary", "{}"))
    except json.JSONDecodeError:
        resume_summary = {}

    # 1. Generate the final report analysis from the AI service
    final_report_data = generate_final_interview_report(data.transcript, data.proctoring_notes, resume_summary)
    
    # 2. Prepare all data needed for the PDF document
    pdf_data_for_report = {
        **final_report_data,
        "candidate_name": app_data["candidate"]["full_name"],
        "candidate_email": app_data["candidate"]["email"],
        "job_title": app_data["job"]["title"],
        "transcript": data.transcript
    }
    pdf_bytes = create_interview_report_pdf(pdf_data_for_report)
    
    # 3. Upload PDF to Supabase Storage
    file_path = f"{current_user['id']}/{data.application_id}_report.pdf"
    report_url = ""
    try:
        # Using upsert=True is safer as it overwrites if the user somehow completes the interview twice
        supabase.storage.from_("reports").upload(file_path, pdf_bytes, {"content-type": "application/pdf", "upsert": "true"})
        report_url = supabase.storage.from_("reports").get_public_url(file_path)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to upload report to storage: {str(e)}")

    # 4. Save the final interview record to the database
    interview_record = {
        "application_id": data.application_id,
        "transcript": json.dumps(data.transcript),
        "proctoring_notes": json.dumps(data.proctoring_notes),
        "feedback": json.dumps(final_report_data),
        "final_score": final_report_data.get("final_score", 0),
        "report_url": report_url
    }
    
    # Use upsert to prevent creating duplicate interview entries for the same application
    db_response = supabase.table("interviews").upsert(interview_record, on_conflict="application_id").execute()
    
    if not db_response.data:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to save interview results to the database.")

    return {"message": "Interview completed successfully!", "report_url": report_url}