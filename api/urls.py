# api/urls.py
from django.urls import path
from .views import StartInterviewView, SubmitAnswerView, JobDescriptionListView

urlpatterns = [
    # New endpoint — list all available job descriptions
    path('jobs/', JobDescriptionListView.as_view(), name='job-list'),

    # Existing endpoints — interview flow
    path('interviews/start/', StartInterviewView.as_view(), name='start-interview'),
    path('interviews/<uuid:interview_id>/submit_answer/', SubmitAnswerView.as_view(), name='submit-answer'),
]
