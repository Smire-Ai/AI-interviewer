# backend/wsgi.py
import os
from django.core.wsgi import get_wsgi_application
from .firebase_config import initialize_firebase_admin

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

initialize_firebase_admin()

app = get_wsgi_application() # Changed 'application' to 'app'