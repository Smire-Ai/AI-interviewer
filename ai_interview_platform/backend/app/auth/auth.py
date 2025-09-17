# File: backend/app/auth/auth.py

import os
import json
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, auth # <--- CRITICAL FIX: Ensure 'auth' is imported here
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# Load environment variables
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


# This tells FastAPI how to find the token in the request header
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_firebase_token(token: str = Depends(oauth2_scheme)):
    """
    Verifies the ID token received from Firebase. Works with FastAPI's dependency injection.
    """
    try:
        # The token from the header will be "Bearer <token>", we need to get just the token part
        if " " in token:
            token = token.split(" ")[-1]

        decoded_token = auth.verify_id_token(token)
        return decoded_token
    except Exception as e:
        print(f"Firebase token verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Firebase authentication credentials: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )