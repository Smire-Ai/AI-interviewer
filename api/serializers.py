# api/serializers.py
from rest_framework import serializers
from .models import UserProfile, JobDescription, Interview, InterviewTurn

class JobDescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobDescription
        fields = ['id', 'title', 'description']

class InterviewTurnSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewTurn
        fields = ['turn_number', 'question_text', 'candidate_answer', 'ai_feedback']

class InterviewSerializer(serializers.ModelSerializer):
    turns = InterviewTurnSerializer(many=True, read_only=True)
    job_description = JobDescriptionSerializer(read_only=True)

    class Meta:
        model = Interview
        fields = ['id', 'status', 'started_at', 'job_description', 'turns']