# api/urls.py
from django.urls import path
from .views import (
    StartInterviewView,
    SubmitAnswerView,
    JobDescriptionListView,
    JobDescriptionCreateView,
    InterviewDetailView,
    UserProfileCreateView,
    UserProfileDetailView,
    AtsCheckView,  # New import
)

urlpatterns = [
    # -------------------------------
    # Job-related URLs
    # -------------------------------
    path('jobs/', JobDescriptionListView.as_view(), name='job-list'),
    path('jobs/create/', JobDescriptionCreateView.as_view(), name='job-create'),

    # -------------------------------
    # Interview-related URLs
    # -------------------------------
    path('interviews/start/', StartInterviewView.as_view(), name='start-interview'),
    path('interviews/<uuid:id>/', InterviewDetailView.as_view(), name='interview-detail'),
    path('interviews/<uuid:interview_id>/submit_answer/', SubmitAnswerView.as_view(), name='submit-answer'),

    # -------------------------------
    # UserProfile / Auth-related URLs
    # -------------------------------
    path('auth/signup/', UserProfileCreateView.as_view(), name='user-signup'),
    path('auth/user/', UserProfileDetailView.as_view(), name='user-detail'),

    # -------------------------------
    # ATS resume check URL
    # -------------------------------
    path('jobs/<uuid:job_id>/check_resume/', AtsCheckView.as_view(), name='ats-check'),
]
