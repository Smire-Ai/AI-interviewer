# File: admin_panel/core/admin.py
from django.contrib import admin
from .models import Users, Candidates, CandidateResumes

# This tells Django to show these tables in the admin interface
admin.site.register(Users)
admin.site.register(Candidates)
admin.site.register(CandidateResumes)