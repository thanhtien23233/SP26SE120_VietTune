import os
import shutil
import tempfile
import time
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings
from services.whisper_service import WhisperService
from models.schemas import TranscriptionResponse, HealthResponse, ErrorResponse
from middleware.auth import verify_api_key

# Global Whisper service instance
whisper_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global whisper_service
    try:
        whisper_service = WhisperService(model_name=settings.WHISPER_MODEL)
    except Exception as e:
        print(f"CRITICAL: Failed to load Whisper model: {e}")
    
    yield
    
    # Shutdown
    if whisper_service and whisper_service.device == "cuda":
        import torch
        torch.cuda.empty_cache()
        print("Cleared GPU cache")

app = FastAPI(
    title="VietTune Whisper Service",
    description="Local Whisper Transcription Microservice for VietTune Archive",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/transcribe", response_model=TranscriptionResponse, status_code=200)
async def transcribe_audio(
    file: UploadFile = File(...),
    language: str = "vi",
    api_key: str = Depends(verify_api_key)
):
    if not whisper_service or not whisper_service.is_loaded:
        raise HTTPException(status_code=503, detail="Whisper model is not loaded or initialization failed")

    # Validate file extension
    allowed_extensions = {".flac", ".wav", ".mp3", ".m4a", ".ogg", ".webm", ".mp4"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Unsupported file format: {ext}")

    # Validate file size (100MB)
    MAX_SIZE = 100 * 1024 * 1024
    # Note: file.size might not be available in all FastAPI versions or without reading, 
    # but we can check it if we read a bit or if SpooledTemporaryFile is used.
    # We can also check after saving if needed.

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
    try:
        # Save uploaded file to temp file
        shutil.copyfileobj(file.file, temp_file)
        temp_file.close()

        # Check size after saving
        if os.path.getsize(temp_file.name) > MAX_SIZE:
            raise HTTPException(status_code=400, detail="File too large (max 100MB)")

        # Perform transcription
        result = await whisper_service.transcribe(temp_file.name, language=language)
        return result

    except Exception as e:
        print(f"Transcription error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Whisper processing failed: {str(e)}")
    finally:
        # Always cleanup
        if os.path.exists(temp_file.name):
            os.remove(temp_file.name)

@app.get("/health", response_model=HealthResponse)
async def health_check():
    if not whisper_service:
        return HealthResponse(
            status="unhealthy",
            model_loaded=False,
            model_name=settings.WHISPER_MODEL,
            device="unknown"
        )
    
    gpu_name, gpu_mem = whisper_service.get_gpu_info()
    
    return HealthResponse(
        status="healthy" if whisper_service.is_loaded else "unhealthy",
        model_loaded=whisper_service.is_loaded,
        model_name=whisper_service.model_name,
        device=whisper_service.device,
        gpu_name=gpu_name,
        gpu_memory_mb=gpu_mem
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
