# backend/firebase_config.py
import firebase_admin
from firebase_admin import credentials
import os
import json # Import the json library

# Get the base directory of the Django project
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Construct the path to the service account key for local development
SERVICE_ACCOUNT_KEY_PATH = os.path.join(BASE_DIR, 'firebase-service-account.json')

def initialize_firebase_admin():
    """
    Initializes the Firebase Admin SDK using a JSON file for local dev
    and environment variables for production (Vercel).
    """
    if not firebase_admin._apps:
        try:
            # Check if running on Vercel
            if 'VERCEL' in os.environ:
                print("Running on Vercel. Initializing Firebase from environment variable.")
                # Get the base64 encoded string from the environment variable
                firebase_creds_json_str = os.getenv('FIREBASE_SERVICE_ACCOUNT_CREDENTIALS')
                if not firebase_creds_json_str:
                    raise ValueError("FIREBASE_SERVICE_ACCOUNT_CREDENTIALS environment variable is not set.")
                
                # Decode the json string into a dictionary
                firebase_creds_dict = json.loads(firebase_creds_json_str)
                
                cred = credentials.Certificate(firebase_creds_dict)
            else:
                # Local development: use the JSON file
                print("Running locally. Initializing Firebase from JSON file.")
                if not os.path.exists(SERVICE_ACCOUNT_KEY_PATH):
                     raise FileNotFoundError(f"Firebase service account key not found at {SERVICE_ACCOUNT_KEY_PATH}")
                cred = credentials.Certificate(SERVICE_ACCOUNT_KEY_PATH)

            firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized successfully.")

        except Exception as e:
            print(f"CRITICAL: Error initializing Firebase Admin SDK: {e}")