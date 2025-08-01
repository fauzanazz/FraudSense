from pydantic import BaseModel, Field, validator
from typing import Literal, Optional
from fastapi import UploadFile

class TextRequest(BaseModel):
    """Request model for text-based fraud prediction"""
    text: str = Field(..., min_length=1, max_length=10000, description="Text to analyze for fraud detection")
    
    @validator('text')
    def validate_text(cls, v):
        if not v.strip():
            raise ValueError('Text cannot be empty or only whitespace')
        return v.strip()

class TextPredictionResponse(BaseModel):
    """Response model for text-based fraud predictions (Sailor2)"""
    prediction: Literal[1, 2] = Field(..., description="Fraud prediction: 1=Normal conversation, 2=Telecom fraud")

class AudioPredictionResponse(BaseModel):
    """Response model for audio-based fraud predictions (Qwen2)"""
    prediction: Literal[0, 1] = Field(..., description="Fraud prediction: 0=Normal conversation, 1=Telecom scam")

# Keep backward compatibility
PredictionResponse = TextPredictionResponse
    
class HealthResponse(BaseModel):
    """Response model for health check endpoint"""
    status: str = Field(..., description="API status")
    message: str = Field(..., description="Health check message")
    models: dict = Field(..., description="Model endpoint status")

class ErrorResponse(BaseModel):
    """Error response model"""
    detail: str = Field(..., description="Error message")
    error_type: Optional[str] = Field(None, description="Type of error")

class AudioUploadRequest(BaseModel):
    """Audio upload validation helper"""
    file: UploadFile
    
    class Config:
        arbitrary_types_allowed = True