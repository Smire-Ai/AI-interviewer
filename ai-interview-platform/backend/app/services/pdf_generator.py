import io
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from datetime import datetime

def create_interview_report_pdf(report_data: dict) -> bytes:
    """Generates a PDF report from the final interview data."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []

    # --- Logo and Title ---
    # Make sure you have a logo.png in your frontend/images folder
    # For simplicity, we'll reference it by path, but in a real app, you'd fetch it from storage.
    # We will skip adding the image from the backend for deployment simplicity.
    story.append(Paragraph("AI Interview Report", styles['h1']))
    story.append(Spacer(1, 0.2 * inch))

    # --- Candidate Info ---
    story.append(Paragraph(f"<b>Candidate:</b> {report_data.get('candidate_name', 'N/A')}", styles['Normal']))
    story.append(Paragraph(f"<b>Email:</b> {report_data.get('candidate_email', 'N/A')}", styles['Normal']))
    story.append(Paragraph(f"<b>Job Title:</b> {report_data.get('job_title', 'N/A')}", styles['Normal']))
    story.append(Paragraph(f"<b>Date:</b> {datetime.now().strftime('%Y-%m-%d')}", styles['Normal']))
    story.append(Spacer(1, 0.3 * inch))

    # --- Summary Section ---
    story.append(Paragraph("<b>Final Evaluation</b>", styles['h2']))
    story.append(Paragraph(f"<b>Overall Score: {report_data.get('final_score', 0)}/100</b>", styles['h3']))
    story.append(Paragraph(f"<b>Summary:</b> {report_data.get('performance_summary', 'N/A')}", styles['BodyText']))
    story.append(Paragraph(f"<b>Communication Skills:</b> {report_data.get('communication_skills', 'N/A')}", styles['BodyText']))
    story.append(Spacer(1, 0.3 * inch))

    # --- Proctoring Section ---
    story.append(Paragraph("<b>Proctoring Summary</b>", styles['h2']))
    story.append(Paragraph(report_data.get('proctoring_summary', 'No issues detected.'), styles['BodyText']))
    story.append(Spacer(1, 0.3 * inch))

    # --- Transcript Section ---
    story.append(Paragraph("<b>Interview Transcript</b>", styles['h2']))
    for entry in report_data.get('transcript', []):
        role = "AI Interviewer" if entry['role'] == 'assistant' else "Candidate"
        story.append(Paragraph(f"<b>{role}:</b> {entry['content']}", styles['BodyText']))
        story.append(Spacer(1, 0.1 * inch))

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()