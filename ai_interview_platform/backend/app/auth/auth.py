import os
import jwt
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import firebase_admin
from firebase_admin import auth, credentials
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

# --- Initialize Firebase Admin SDK ---
# Get the Firebase service account credentials from environment variables
firebase_creds_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_JSON")
if not firebase_creds_json:
    raise ValueError("FIREBASE_SERVICE_ACCOUNT_JSON is not set in the .env file.")

# Parse the JSON string into a dictionary
firebase_creds_dict = json.loads(firebase_creds_json)
cred = credentials.Certificate(firebase_creds_dict)

# Initialize the Firebase app if it hasn't been already
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

# --- JWT Configuration ---
JWT_SECRET = os.environ.get("JWT_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# This helps FastAPI understand how to extract the token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Firebase authentication credentials: {e}",
            headers={"WWW-Authenticate": "Bearer"},
        )