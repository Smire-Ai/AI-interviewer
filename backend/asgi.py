# backend/asgi.py
import os
from django.core.asgi import get_asgi_application
from .firebase_config import initialize_firebase_admin # Add this import

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

initialize_firebase_admin() # Add this line

application = get_asgi_application()