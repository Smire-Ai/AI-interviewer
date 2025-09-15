import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from the .env file
load_dotenv()

# Get Supabase credentials from environment variables
supabase_url: str = os.environ.get("SUPABASE_URL")
supabase_key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Check if the credentials are provided
if not supabase_url or not supabase_key:
    raise ValueError("Supabase URL and Key must be set in the .env file.")

# Create a single, reusable Supabase client
supabase: Client = create_client(supabase_url, supabase_key)