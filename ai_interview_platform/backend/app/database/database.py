# File: backend/app/database/database.py

import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from the .env file in the project root
load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise ValueError("Supabase URL and Key must be set in the .env file.")

# --- THIS IS THE FIX ---
# We create the client and name it 'supabase'
# This is the object that has the .table() method.
supabase: Client = create_client(url, key)