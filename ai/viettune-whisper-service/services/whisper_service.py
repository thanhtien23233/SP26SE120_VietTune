import whisper
import torch
import time
import os

class WhisperService:
    def __init__(self, model_name: str = "medium"):
        self.model_name = model_name
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Loading Whisper model '{model_name}' on {self.device}...")
        
        # In case we fail to load on CUDA (e.g. out of memory), we can fallback or handle it
        try:
            self.model = whisper.load_model(model_name, device=self.device)
            self.is_loaded = True
            print(f"Model loaded successfully on {self.device}")
        except Exception as e:
            print(f"Error loading model on {self.device}: {str(e)}")
            if self.device == "cuda":
                print("Falling back to CPU...")
                self.device = "cpu"
                self.model = whisper.load_model(model_name, device=self.device)
                self.is_loaded = True
            else:
                self.is_loaded = False
                raise e

    async def transcribe(self, audio_path: str, language: str = "vi") -> dict:
        if not self.is_loaded:
            raise Exception("Whisper model is not loaded")
            
        start_time = time.time()
        
        # Run transcription
        # Note: whisper.transcribe is a blocking call, but it's relatively heavy.
        # For better concurrency in FastAPI, we might want to use run_in_threadpool, 
        # but the prompt implies sequential processing is fine on GPU.
        result = self.model.transcribe(audio_path, language=language, verbose=False)
        
        end_time = time.time()
        processing_time = end_time - start_time
        
        # Map segments to our schema
        segments = []
        for segment in result.get("segments", []):
            segments.append({
                "start": float(segment["start"]),
                "end": float(segment["end"]),
                "text": segment["text"].strip()
            })
            
        # Get duration from result or metadata if possible
        # Whisper's transcribe output doesn't directly give overall duration easily without librosa/ffprobe
        # but usually the last segment end time is a good proxy.
        duration = segments[-1]["end"] if segments else 0.0
        
        return {
            "text": result["text"].strip(),
            "language": result.get("language", language),
            "duration": duration,
            "segments": segments,
            "processing_time": round(processing_time, 2),
            "model_used": self.model_name
        }

    def get_gpu_info(self):
        if self.device != "cuda":
            return None, None
        
        try:
            gpu_name = torch.cuda.get_device_name(0)
            gpu_memory = torch.cuda.memory_allocated(0) / 1024 / 1024  # MB
            return gpu_name, int(gpu_memory)
        except:
            return "Unknown GPU", 0
