import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")

    @property
    def is_supabase_configured(self) -> bool:
        return bool(self.SUPABASE_URL) and not self.SUPABASE_URL.startswith("https://your-project-id")

settings = Settings()
