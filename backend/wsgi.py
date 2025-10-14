# backend/wsgi.py
import os
from django.core.wsgi import get_wsgi_application
from .firebase_config import initialize_firebase_admin

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

initialize_firebase_admin()

# For local 'runserver'
application = get_wsgi_application()

# For Vercel deployment
app = application