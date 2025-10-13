# api/urls.py
from django.urls import path
from .views import StartInterviewView, SubmitAnswerView

urlpatterns = [
    path('interviews/start/', StartInterviewView.as_view(), name='start-interview'),
    path('interviews/<uuid:interview_id>/submit_answer/', SubmitAnswerView.as_view(), name='submit-answer'),
]