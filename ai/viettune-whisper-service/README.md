# VietTune Whisper Transcription Service

A local FastAPI microservice for audio transcription using OpenAI's Whisper model (open-source). Optimized for Vietnamese music archive processing.

## Requirements

- Python 3.10+
- **ffmpeg** installed on the system (required by Whisper)
- (Recommended) NVIDIA GPU with at least 6GB VRAM for `medium` model

## Setup

1. **Install ffmpeg:**
   - Windows: `choco install ffmpeg` or download from [ffmpeg.org](https://ffmpeg.org/download.html)
   - Mac: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg`

2. **Create Virtual Environment:**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Linux/Mac
   .venv\Scripts\activate     # Windows
   ```

3. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configuration:**
   - Copy `.env.example` to `.env`
   - Update `API_KEY` and `WHISPER_MODEL` if necessary

## Running the Service

```bash
python main.py
```
Or using uvicorn:
```bash
uvicorn main:app --host 0.0.0.0 --port 8001
```

*Note: The first time you run the service, it will download the Whisper model (~1.5GB for medium), which might take some time.*

## API Endpoints

### 1. Transcribe Audio
- **URL:** `POST /transcribe`
- **Auth:** `X-API-Key` header
- **Body:** `multipart/form-data`
  - `file`: Audio file
  - `language`: (Optional) Language code (default: `vi`)

### 2. Health Check
- **URL:** `GET /health`
- **Auth:** None

## Integration with .NET Backend

Configure the service URL and API key in `appsettings.json`:

```json
{
  "WhisperService": {
    "BaseUrl": "http://localhost:8001",
    "ApiKey": "viettune-whisper-secret-2026"
  }
}
```
