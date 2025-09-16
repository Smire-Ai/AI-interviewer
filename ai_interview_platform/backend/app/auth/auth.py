# File: backend/app/auth/auth.py

import os
import jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, status
import firebase_admin
from firebase_admin import auth, credentials
from dotenv import load_dotenv
import json

# Load environment variables from the .env file in the project root
load_dotenv()

# --- Initialize Firebase Admin SDK ---
try:
    firebase_creds_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
    if not firebase_creds_json:
        raise ValueError("FIREBASE_SERVICE_ACCOUNT_JSON is not set in the .env file.")

    firebase_creds_dict = json.loads(firebase_creds_json)
    cred = credentials.Certificate(firebase_creds_dict)

    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
except Exception as e:
    print(f"CRITICAL FIREBASE INIT ERROR: {e}")
    # This will prevent the app from starting if Firebase is not configured.

# --- JWT Configuration ---
JWT_SECRET = os.environ.get("JWT_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

def create_access_token(data: dict):
    """Generates a new JWT for our application."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=ALGORITHM)
    return encoded_jwt

def verify_firebase_token(id_token: str):
    """Verifies the ID token received from Firebase (Google Sign-In)."""
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        # If the token is invalid, raise an error
        print(f"Firebase token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Firebase authentication credentials: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )