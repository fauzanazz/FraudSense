from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
from typing import Iterator

from .models import TextRequest, TextPredictionResponse, AudioPredictionResponse, HealthResponse, ErrorResponse
from .clients import fraud_clients
from .config import settings
from .utils import AudioFileProcessor, validate_audio_file

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="FraudSense API",
    description="FastAPI server for fraud detection using ML models hosted on Vast.ai",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# Global exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return {
        "detail": exc.detail,
        "error_type": "HTTP_ERROR"
    }

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    return {
        "detail": f"Validation error: {str(exc)}",
        "error_type": "VALIDATION_ERROR"
    }

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    return {
        "detail": "Internal server error",
        "error_type": "INTERNAL_ERROR"
    }

# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint to verify API and model status"""
    try:
        model_status = await fraud_clients.health_check()
        
        overall_status = "healthy"
        if any(status["status"] != "healthy" for status in model_status.values()):
            overall_status = "degraded"
        
        return HealthResponse(
            status=overall_status,
            message="FraudSense API is running",
            models=model_status
        )
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=503, detail="Service unavailable")

# Text prediction endpoint
@app.post("/predict/text", response_model=TextPredictionResponse)
async def predict_text(request: TextRequest):
    """
    Predict fraud likelihood for text input using Sailor2 model
    Returns: 1 (Normal conversation) or 2 (Telecom fraud)
    """
    try:
        logger.info(f"Processing text prediction request: {request.text[:50]}...")
        
        prediction = fraud_clients.get_text_prediction(request.text)
        
        logger.info(f"Text prediction result: {prediction}")
        return TextPredictionResponse(prediction=prediction)
        
    except Exception as e:
        logger.error(f"Text prediction error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Error processing text prediction: {str(e)}"
        )

# Audio prediction endpoint with streaming
@app.post("/predict/audio")
async def predict_audio(file: UploadFile = File(...)):
    """
    Predict fraud likelihood for audio input using Qwen2 model with streaming response
    Supports: FLAC and OPUS formats, max 50MB
    Returns: Streaming response with analysis and final prediction (0=Normal, 1=Telecom scam)
    """
    try:
        logger.info(f"Processing audio prediction request: {file.filename}")
        
        # Validate audio file
        is_valid, error_msg = validate_audio_file(file)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Read audio file content
        audio_content = await file.read()
        
        # Get streaming prediction
        def generate_streaming_response() -> Iterator[str]:
            try:
                for chunk in fraud_clients.get_audio_prediction_stream(
                    audio_content, 
                    file.filename or "audio_file"
                ):
                    # Format as server-sent events
                    yield f"data: {chunk}\n\n"
                
                # End the stream
                yield "data: [DONE]\n\n"
                
            except Exception as e:
                logger.error(f"Streaming error: {str(e)}")
                yield f"data: Error: {str(e)}\n\n"
                yield "data: [DONE]\n\n"
        
        logger.info(f"Starting audio streaming response for: {file.filename}")
        
        return StreamingResponse(
            generate_streaming_response(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Content-Type": "text/plain; charset=utf-8"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Audio prediction error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing audio prediction: {str(e)}"
        )

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "FraudSense API - Fraud Detection with ML Models",
        "version": "0.1.0",
        "endpoints": {
            "health": "/health",
            "text_prediction": "/predict/text (1=Normal, 2=Fraud)",
            "audio_prediction": "/predict/audio (0=Normal, 1=Scam)",
            "documentation": "/docs"
        },
        "supported_audio_formats": settings.ALLOWED_AUDIO_EXTENSIONS,
        "max_audio_size_mb": settings.MAX_AUDIO_FILE_SIZE / (1024 * 1024)
    }

# Startup event
@app.on_event("startup") 
async def startup_event():
    """Initialize application on startup"""
    logger.info("Starting FraudSense API...")
    logger.info(f"Sailor2 endpoint: {settings.SAILOR2_BASE_URL}")
    logger.info(f"Qwen2 endpoint: {settings.QWEN2_BASE_URL}")
    logger.info("FraudSense API started successfully")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down FraudSense API...")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )