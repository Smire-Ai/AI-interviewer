# backend/wsgi.py
import os
from django.core.wsgi import get_wsgi_application
from .firebase_config import initialize_firebase_admin

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

initialize_firebase_admin()

# This is for the local 'runserver' command
application = get_wsgi_application()

# This is for Vercel deployment
app = application