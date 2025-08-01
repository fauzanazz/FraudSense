import os
from typing import Optional

class Settings:
    # Vast.ai model endpoints
    SAILOR2_BASE_URL: str = os.getenv("SAILOR2_BASE_URL", "http://localhost:8000")
    QWEN2_BASE_URL: str = os.getenv("QWEN2_BASE_URL", "http://localhost:8001")
    
    # Model names (as configured in Vast.ai instances)
    SAILOR2_MODEL_NAME: str = "fauzanazz/sailor2-fraud-indo-8b-merged"
    QWEN2_MODEL_NAME: str = "fauzanazz/qwen2-audio-indo-fraud-7b-merged"
    
    # API settings
    MAX_AUDIO_FILE_SIZE: int = 50 * 1024 * 1024  # 50MB in bytes
    ALLOWED_AUDIO_FORMATS: list[str] = ["audio/flac", "audio/ogg"]  # FLAC and OPUS
    ALLOWED_AUDIO_EXTENSIONS: list[str] = [".flac", ".opus", ".ogg"]
    
    # CORS settings
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",  # Next.js dev server
        "http://localhost:8000",  # FastAPI dev server
        "*"  # Allow all origins (adjust for production)
    ]
    
    # Timeout settings
    REQUEST_TIMEOUT: int = 60  # seconds
    
    @classmethod
    def validate_required_env_vars(cls) -> None:
        """Validate that required environment variables are set"""
        required_vars = {
            "SAILOR2_BASE_URL": cls.SAILOR2_BASE_URL,
            "QWEN2_BASE_URL": cls.QWEN2_BASE_URL
        }
        
        missing_vars = []
        for var_name, var_value in required_vars.items():
            if var_value.startswith("http://localhost"):
                missing_vars.append(var_name)
        
        if missing_vars:
            print(f"Warning: Using localhost defaults for: {', '.join(missing_vars)}")
            print("Set environment variables for production deployment")

settings = Settings()

# Validate environment variables on import
settings.validate_required_env_vars()