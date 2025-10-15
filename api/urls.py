# api/urls.py
from django.urls import path
from .views import (
    StartInterviewView,
    SubmitAnswerView,
    JobDescriptionListView,
    JobDescriptionCreateView,  # new import
    InterviewDetailView
)

urlpatterns = [
    # List all available job descriptions
    path('jobs/', JobDescriptionListView.as_view(), name='job-list'),

    # Create a new job description (admin only)
    path('jobs/create/', JobDescriptionCreateView.as_view(), name='job-create'),

    # Start a new interview
    path('interviews/start/', StartInterviewView.as_view(), name='start-interview'),

    # Retrieve details of a specific interview (includes all turns)
    path('interviews/<uuid:id>/', InterviewDetailView.as_view(), name='interview-detail'),

    # Submit an answer for an existing interview
    path('interviews/<uuid:interview_id>/submit_answer/', SubmitAnswerView.as_view(), name='submit-answer'),
]
