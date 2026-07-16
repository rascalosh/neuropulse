from supabase import create_client, Client
from app.config import settings

# Initialize Supabase client
supabase: Client = None

if settings.is_supabase_configured:
    try:
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        print("Supabase client initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize Supabase client: {e}")
else:
    print("Supabase client not initialized: Missing or default credentials in .env")
