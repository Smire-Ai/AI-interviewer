from django.contrib import admin
from .models import UserProfile, JobDescription, Interview, InterviewTurn

admin.site.register(UserProfile)
admin.site.register(JobDescription)
admin.site.register(Interview)
admin.site.register(InterviewTurn)