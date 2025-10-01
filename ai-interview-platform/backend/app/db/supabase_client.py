# backend/app/db/supabase_client.py (SIMPLIFIED AND ROBUST)

from supabase import create_client, Client
from app.core.config import SUPABASE_URL, SUPABASE_KEY

# Reverting to the simplest initialization.
# The latest versions of supabase-py have improved stability by default.
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)