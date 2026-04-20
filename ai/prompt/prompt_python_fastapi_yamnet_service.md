thực# PROMPT CHO AI AGENT: Tạo Python FastAPI Service — YAMNet Embedding Extraction

> **Mục đích**: Tạo 1 Python FastAPI service nhỏ nhận file audio,
> chạy YAMNet extract embeddings 1024-d, trả về cho .NET qua HTTP.
>
> **Service này chạy cạnh .NET API** (cùng server hoặc cùng Docker Compose).
> .NET gửi audio → Python trả embeddings → .NET chạy ONNX classifier.

---

## TỔNG QUAN

```
.NET API
  ↓ POST /extract-embeddings (gửi file audio)
Python FastAPI (port 8000)
  ↓ YAMNet: audio → embeddings (N, 1024)
  ↓ Response JSON: { embeddings: [[...1024 floats...], [...], ...] }
.NET API
  ↓ Với mỗi embedding → ONNX classifier → scores
  ↓ Aggregate → danh sách nhạc cụ
```

---

## CẤU TRÚC FILES

```
viettune-embedding-service/
├── app.py                  ← FastAPI service (file chính, ~80 dòng)
├── requirements.txt        ← Dependencies
├── Dockerfile              ← Docker deployment
└── README.md
```

---

## TẠO FILE: requirements.txt

```
fastapi==0.115.6
uvicorn==0.34.0
python-multipart==0.0.20
tensorflow==2.15.1
tf-keras==2.15.1
tensorflow-hub==0.16.1
numpy==1.26.4
librosa==0.10.2
soundfile==0.12.1
resampy==0.4.3
```

---

## TẠO FILE: app.py

Đây là file duy nhất quan trọng. Viết CHÍNH XÁC như sau:

```python
"""
YAMNet Embedding Extraction Service.

Nhận file audio → YAMNet extract embeddings 1024-d → trả JSON.

Chạy:
    uvicorn app:app --host 0.0.0.0 --port 8000

Test:
    curl -X POST http://localhost:8000/extract-embeddings \
      -F "file=@test.wav"
"""

import io
import numpy as np
import librosa
import tensorflow_hub as hub
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
import logging

# ============================================================
# CONFIG
# ============================================================
SAMPLE_RATE = 16000            # YAMNet yêu cầu 16kHz
YAMNET_URL = "https://tfhub.dev/google/yamnet/1"

# ============================================================
# STARTUP: Load YAMNet 1 lần duy nhất
# ============================================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("yamnet-service")

logger.info("Loading YAMNet from TF Hub...")
yamnet_model = hub.load(YAMNET_URL)
logger.info("YAMNet loaded successfully!")

# ============================================================
# FASTAPI APP
# ============================================================
app = FastAPI(
    title="VietTune YAMNet Embedding Service",
    description="Extract 1024-d audio embeddings using YAMNet",
    version="1.0.0",
)


@app.get("/health")
def health_check():
    """Health check endpoint cho Docker/load balancer."""
    return {"status": "ok", "model": "yamnet_v1"}


@app.post("/extract-embeddings")
async def extract_embeddings(file: UploadFile = File(...)):
    """
    Nhận file audio → trả về YAMNet embeddings.

    Input:
        file: audio file (.wav, .mp3, .flac, .ogg)

    Output JSON:
        {
            "embeddings": [[...1024 floats...], [...], ...],
            "num_frames": 373,
            "duration_seconds": 180.0,
            "sample_rate": 16000
        }

    Mỗi embedding = 1 frame 0.96 giây audio.
    File 3 phút → ~373 embeddings.
    """
    # Validate file
    if not file.filename:
        raise HTTPException(400, "No filename provided")

    allowed_ext = {".wav", ".mp3", ".flac", ".ogg"}
    ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in allowed_ext:
        raise HTTPException(400, f"Unsupported format '{ext}'. Use: {allowed_ext}")

    try:
        # Đọc file vào memory
        audio_bytes = await file.read()
        audio_buffer = io.BytesIO(audio_bytes)

        # Librosa load: auto resample 16kHz mono
        waveform, sr = librosa.load(audio_buffer, sr=SAMPLE_RATE, mono=True)
        waveform = waveform.astype(np.float32)
        duration = len(waveform) / SAMPLE_RATE

        logger.info(f"Audio: {file.filename} | {duration:.1f}s | {len(waveform)} samples")

        # YAMNet inference
        # Returns: scores (N,521), embeddings (N,1024), spectrogram
        scores, embeddings, spectrogram = yamnet_model(waveform)
        embeddings_np = embeddings.numpy()

        logger.info(f"Extracted {embeddings_np.shape[0]} embeddings")

        return JSONResponse({
            "embeddings": embeddings_np.tolist(),
            "num_frames": int(embeddings_np.shape[0]),
            "duration_seconds": round(duration, 2),
            "sample_rate": SAMPLE_RATE,
        })

    except Exception as e:
        logger.error(f"Error processing {file.filename}: {e}")
        raise HTTPException(500, f"Error processing audio: {str(e)}")


@app.post("/extract-embeddings-chunked")
async def extract_embeddings_chunked(file: UploadFile = File(...)):
    """
    Giống /extract-embeddings nhưng trả thêm mean embedding.
    Tiện cho trường hợp .NET chỉ cần 1 embedding trung bình.

    Output JSON:
        {
            "mean_embedding": [...1024 floats...],
            "frame_embeddings": [[...], [...]...],
            "num_frames": 373,
            "duration_seconds": 180.0
        }
    """
    if not file.filename:
        raise HTTPException(400, "No filename")

    try:
        audio_bytes = await file.read()
        audio_buffer = io.BytesIO(audio_bytes)

        waveform, sr = librosa.load(audio_buffer, sr=SAMPLE_RATE, mono=True)
        waveform = waveform.astype(np.float32)
        duration = len(waveform) / SAMPLE_RATE

        scores, embeddings, spectrogram = yamnet_model(waveform)
        embeddings_np = embeddings.numpy()

        # Mean embedding (trung bình tất cả frames)
        mean_emb = np.mean(embeddings_np, axis=0)

        return JSONResponse({
            "mean_embedding": mean_emb.tolist(),
            "frame_embeddings": embeddings_np.tolist(),
            "num_frames": int(embeddings_np.shape[0]),
            "duration_seconds": round(duration, 2),
        })

    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(500, f"Error: {str(e)}")
```

---

## TẠO FILE: Dockerfile

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download YAMNet model (cache vào image, không tải mỗi lần start)
RUN python -c "import tensorflow_hub as hub; hub.load('https://tfhub.dev/google/yamnet/1'); print('YAMNet cached')"

# App code
COPY app.py .

# Run
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## TẠO FILE: README.md

```markdown
# VietTune YAMNet Embedding Service

Python FastAPI service: nhận audio → YAMNet → trả embedding 1024-d.

## Chạy local

    pip install -r requirements.txt
    uvicorn app:app --host 0.0.0.0 --port 8000

## Chạy Docker

    docker build -t viettune-yamnet .
    docker run -p 8000:8000 viettune-yamnet

## Test

    curl -X POST http://localhost:8000/extract-embeddings -F "file=@test.wav"

## Endpoints

| Method | Path | Input | Output |
|--------|------|-------|--------|
| GET | /health | — | { status: "ok" } |
| POST | /extract-embeddings | audio file | { embeddings: [[1024]...], num_frames, duration } |
| POST | /extract-embeddings-chunked | audio file | { mean_embedding: [1024], frame_embeddings, ... } |
```

---

## TẠO FILE: docker-compose.yml (nếu deploy cùng .NET)

```yaml
version: '3.8'
services:
  viettune-api:
    build: ./path-to-dotnet-project
    ports:
      - "5000:5000"
    environment:
      - YAMNET_SERVICE_URL=http://yamnet-service:8000
    depends_on:
      - yamnet-service

  yamnet-service:
    build: ./viettune-embedding-service
    ports:
      - "8000:8000"
    restart: unless-stopped
```

---

## KIỂM TRA

```bash
# 1. Chạy service
uvicorn app:app --host 0.0.0.0 --port 8000

# 2. Test health
curl http://localhost:8000/health
# → {"status":"ok","model":"yamnet_v1"}

# 3. Test extract embeddings
curl -X POST http://localhost:8000/extract-embeddings \
  -F "file=@data/raw/dan_bau/dan_bau_1.mp3"
# → {"embeddings":[[0.23,-0.87,...1024 values...],[...]],"num_frames":373,...}

# 4. Test chunked (có mean embedding)
curl -X POST http://localhost:8000/extract-embeddings-chunked \
  -F "file=@data/raw/dan_bau/dan_bau_1.mp3"
# → {"mean_embedding":[...1024...],"frame_embeddings":[...],...}
```

---

## QUY TẮC

1. YAMNet load 1 lần lúc startup (global variable), KHÔNG load mỗi request
2. Librosa đọc mọi format audio (wav, mp3, flac, ogg), tự resample 16kHz
3. Response là JSON thuần (list of lists), .NET parse bằng System.Text.Json
4. Service stateless — không lưu gì, chỉ nhận audio → trả embedding
5. Port mặc định 8000, .NET kết nối qua http://localhost:8000 (hoặc Docker service name)
