from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.supabase_client import supabase

app = FastAPI(
    title="NeuroPulse API",
    description="ADHD Companion Backend API with FastAPI and Supabase",
    version="1.0.0"
)

# Configure CORS for Next.js frontend (typically port 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "message": "Welcome to the NeuroPulse API!",
        "status": "online",
        "supabase_connected": supabase is not None
    }

@app.get("/health")
def health_check():
    supabase_status = "not_configured"
    if settings.is_supabase_configured:
        supabase_status = "connected" if supabase is not None else "connection_error"
        
    return {
        "status": "healthy",
        "supabase": supabase_status,
        "config": {
            "supabase_url_set": bool(settings.SUPABASE_URL),
            "supabase_key_set": bool(settings.SUPABASE_KEY),
        }
    }
