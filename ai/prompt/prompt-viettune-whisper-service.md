# PROMPT: Tạo viettune-whisper-service — FastAPI Whisper Transcription Microservice

## Bối cảnh

Bạn đang xây dựng một **Python FastAPI microservice** chạy local, cung cấp API transcription cho hệ thống **VietTune Archive** — nền tảng lưu trữ âm nhạc truyền thống Việt Nam.

Service này sử dụng **OpenAI Whisper open-source** (chạy local, MIỄN PHÍ, không cần API key) để transcribe audio thành text. Backend chính (.NET C#) sẽ gọi HTTP đến service này.

### Môi trường máy chủ
- CPU: Intel i3-10105F
- RAM: 16GB
- GPU: NVIDIA GTX 1660 Ti (6GB VRAM)
- OS: Windows (chạy native, không Docker)
- Service sẽ được expose ra ngoài qua **ngrok** hoặc **Cloudflare Tunnel**

### Hệ thống hiện có
Máy chủ này **đã chạy sẵn** một FastAPI service khác cho audio analysis (embedding, phân tích metadata) với các dependencies:
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
onnxruntime==1.17.1
```

**QUAN TRỌNG:** TensorFlow (embedding service) và Whisper (transcription service) sẽ tranh nhau GPU VRAM. Giải pháp:
- **TensorFlow chạy CPU** — embedding không cần GPU nhiều
- **Whisper chạy GPU** — cần VRAM cho transcription nhanh

---

## YÊU CẦU: Tạo project `viettune-whisper-service`

### Cấu trúc thư mục

```
viettune-whisper-service/
├── main.py                 # FastAPI app + endpoints
├── config.py               # Cấu hình (model size, API key, etc.)
├── services/
│   └── whisper_service.py  # Whisper model loading + transcription logic
├── models/
│   └── schemas.py          # Pydantic models (request/response DTOs)
├── middleware/
│   └── auth.py             # API key authentication middleware
├── requirements.txt        # Dependencies
├── .env.example            # Template environment variables
└── README.md               # Hướng dẫn setup & chạy
```

### 1. Dependencies (`requirements.txt`)

```
fastapi==0.115.6
uvicorn==0.34.0
python-multipart==0.0.20
openai-whisper==20240930
torch>=2.0.0
python-dotenv==1.0.1
```

**Lưu ý:** KHÔNG include tensorflow trong service này. Whisper dùng PyTorch, service embedding dùng TensorFlow — chạy ở 2 process riêng.

### 2. Config (`config.py`)

Đọc từ `.env` file hoặc environment variables:

```
WHISPER_MODEL=medium          # tiny / base / small / medium
API_KEY=viettune-whisper-secret-2026
HOST=0.0.0.0
PORT=8001
```

- `WHISPER_MODEL`: mặc định `medium` (5GB VRAM, chất lượng tốt cho tiếng Việt)
- `API_KEY`: bắt buộc — dùng để authenticate request từ .NET backend
- `HOST`: mặc định `0.0.0.0` để tunnel có thể truy cập
- `PORT`: mặc định `8001` (tránh trùng port service khác)

### 3. Whisper Service (`services/whisper_service.py`)

**Load model 1 lần khi khởi động, dùng lại cho mọi request:**

```python
# Pseudocode — implement đầy đủ
import whisper
import torch

class WhisperService:
    def __init__(self, model_name: str = "medium"):
        # Kiểm tra GPU
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        print(f"Loading Whisper model '{model_name}' on {self.device}...")
        self.model = whisper.load_model(model_name, device=self.device)
        print(f"Model loaded successfully on {self.device}")

    async def transcribe(self, audio_path: str, language: str = "vi") -> dict:
        # Gọi whisper.transcribe()
        # Trả về dict với: text, language, duration, segments
        pass
```

**Yêu cầu chi tiết cho method `transcribe`:**
- Nhận path file audio tạm (đã save từ upload)
- Gọi `self.model.transcribe(audio_path, language=language, verbose=False)`
- Parse kết quả, trả về dict gồm:
  - `text` (str): full transcript
  - `language` (str): ngôn ngữ phát hiện
  - `duration` (float): tổng thời lượng audio (giây)
  - `segments` (list): danh sách `{start, end, text}` cho từng đoạn
- Đo và log thời gian xử lý
- Xử lý exception: file corrupt, format không hỗ trợ

### 4. Pydantic Models (`models/schemas.py`)

```python
# TranscriptionSegment
class TranscriptionSegment(BaseModel):
    start: float      # Thời điểm bắt đầu (giây)
    end: float        # Thời điểm kết thúc (giây)
    text: str         # Text của đoạn này

# TranscriptionResponse
class TranscriptionResponse(BaseModel):
    text: str                              # Full transcript
    language: str                          # Ngôn ngữ phát hiện (vd: "vi")
    duration: float | None                 # Thời lượng audio (giây)
    segments: list[TranscriptionSegment]   # Danh sách segments
    processing_time: float                 # Thời gian xử lý (giây)
    model_used: str                        # Model đã dùng (vd: "medium")

# HealthResponse
class HealthResponse(BaseModel):
    status: str           # "healthy" / "unhealthy"
    model_loaded: bool    # Whisper model đã load chưa
    model_name: str       # Tên model đang dùng
    device: str           # "cuda" / "cpu"
    gpu_name: str | None  # Tên GPU (nếu có)
    gpu_memory_mb: int | None  # VRAM đang dùng (MB)

# ErrorResponse
class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None
```

### 5. API Key Auth Middleware (`middleware/auth.py`)

- Kiểm tra header `X-API-Key` trong mỗi request (trừ `/health` và `/docs`)
- So sánh với `API_KEY` từ config
- Trả 401 Unauthorized nếu thiếu hoặc sai key
- Endpoint `/health` KHÔNG cần auth (để monitor)

```python
# Pseudocode
async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != settings.API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
```

### 6. FastAPI Endpoints (`main.py`)

#### `POST /transcribe` — Transcribe audio file

**Input:** `multipart/form-data`
- `file`: UploadFile (bắt buộc) — file audio
- `language`: str (optional, default `"vi"`) — ngôn ngữ hint

**Logic:**
1. Validate API key (qua dependency)
2. Validate file extension: cho phép `.flac`, `.wav`, `.mp3`, `.m4a`, `.ogg`, `.webm`, `.mp4`
3. Validate file size: tối đa **100MB** (local không bị giới hạn 25MB như cloud API)
4. Save file tạm vào thư mục temp
5. Gọi `whisper_service.transcribe()`
6. Xóa file tạm sau khi xử lý xong (dùng `finally` block)
7. Trả về `TranscriptionResponse`

**Response 200:**
```json
{
  "text": "Trời ơi trời ơi, hoa nở trên đồi...",
  "language": "vi",
  "duration": 245.6,
  "segments": [
    {"start": 0.0, "end": 3.5, "text": "Trời ơi trời ơi"},
    {"start": 3.5, "end": 8.2, "text": "hoa nở trên đồi"}
  ],
  "processing_time": 12.34,
  "model_used": "medium"
}
```

**Error responses:**
- 400: File format không hợp lệ / file quá lớn
- 401: API key sai hoặc thiếu
- 500: Whisper xử lý lỗi
- 503: Model chưa load xong

#### `GET /health` — Health check (KHÔNG cần auth)

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_name": "medium",
  "device": "cuda",
  "gpu_name": "NVIDIA GeForce GTX 1660 Ti",
  "gpu_memory_mb": 4892
}
```

#### `GET /docs` — Swagger UI (tự động bởi FastAPI, KHÔNG cần auth)

### 7. Startup & Shutdown Events

**Khi khởi động (`lifespan` hoặc `on_event("startup")`):**
1. Load config từ `.env`
2. Khởi tạo `WhisperService` — load model vào GPU (mất ~10-30 giây lần đầu, model được download và cache tại `~/.cache/whisper/`)
3. Log thông tin: model name, device, VRAM usage

**Khi shutdown:**
1. Giải phóng GPU memory
2. Xóa file tạm còn sót (nếu có)

### 8. CORS Configuration

Cho phép .NET backend và FE gọi vào:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Dev mode — production thì restrict lại
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 9. `.env.example`

```env
# Whisper Configuration
WHISPER_MODEL=medium

# Security
API_KEY=viettune-whisper-secret-2026

# Server
HOST=0.0.0.0
PORT=8001
```

### 10. `README.md`

Viết hướng dẫn ngắn gọn bao gồm:
- Yêu cầu: Python 3.10+, NVIDIA GPU (optional nhưng recommended), ffmpeg
- Cài đặt: `pip install -r requirements.txt`
- Cài ffmpeg (Whisper cần): `choco install ffmpeg` hoặc tải manual
- Copy `.env.example` → `.env`, sửa API_KEY
- Chạy: `uvicorn main:app --host 0.0.0.0 --port 8001`
- Lần đầu chạy sẽ tải model Whisper (~1.5GB cho medium)
- Test: `curl -X POST http://localhost:8001/transcribe -H "X-API-Key: viettune-whisper-secret-2026" -F "file=@test.mp3"`
- Expose qua tunnel: `ngrok http 8001`

---

## Tích hợp với .NET Backend (VietTuneArchive)

Sau khi service Python chạy xong, bên .NET backend cần sửa `GeminiTranscriptionService` (hoặc tạo mới `LocalWhisperTranscriptionService`) để gọi vào service này thay vì gọi Gemini/OpenAI API.

**Endpoint .NET gọi:** `POST http://localhost:8001/transcribe` (hoặc URL tunnel nếu chạy remote)
**Headers:** `X-API-Key: viettune-whisper-secret-2026`
**Body:** `multipart/form-data` với field `file`

Cấu hình trong `appsettings.json` .NET:
```json
{
  "WhisperService": {
    "BaseUrl": "http://localhost:8001",
    "ApiKey": "viettune-whisper-secret-2026"
  }
}
```

---

## Lưu ý quan trọng

1. **GPU Memory:** Whisper model `medium` dùng ~5GB VRAM. GTX 1660 Ti có 6GB — đủ chạy nhưng KHÔNG mở thêm app nặng GPU khi service đang chạy.

2. **TensorFlow conflict:** Nếu máy cũng chạy embedding service (TensorFlow), đảm bảo TensorFlow KHÔNG chiếm GPU. Trong embedding service, thêm trước khi import TF:
   ```python
   import os
   os.environ["CUDA_VISIBLE_DEVICES"] = ""  # Force TF dùng CPU
   ```

3. **Concurrent requests:** Whisper xử lý tuần tự trên GPU (1 file tại 1 thời điểm). Nếu có nhiều request đồng thời, chúng sẽ queue lại. Với use case VietTune (upload từng bản ghi), điều này không phải vấn đề.

4. **File tạm:** LUÔN xóa file tạm sau khi transcribe xong. Dùng `try/finally` hoặc `tempfile.NamedTemporaryFile(delete=True)`.

5. **ffmpeg bắt buộc:** Whisper cần ffmpeg để đọc audio. Phải cài trước khi chạy service. Kiểm tra: `ffmpeg -version`.

6. **Lần đầu chạy chậm:** Model `medium` (~1.5GB) sẽ được download lần đầu. Các lần sau load từ cache (~10-20 giây).

7. **Log:** Log đầy đủ mỗi request: file name, file size, thời gian xử lý, ngôn ngữ phát hiện. Giúp debug và monitor performance.

---

## Tóm tắt files cần tạo

| File | Mô tả |
|------|-------|
| `main.py` | FastAPI app, endpoints `/transcribe`, `/health`, CORS, lifespan |
| `config.py` | Đọc `.env`, class Settings |
| `services/whisper_service.py` | Load Whisper model, method transcribe |
| `models/schemas.py` | Pydantic models: TranscriptionResponse, HealthResponse, ErrorResponse, TranscriptionSegment |
| `middleware/auth.py` | API key verification dependency |
| `requirements.txt` | Dependencies |
| `.env.example` | Template biến môi trường |
| `README.md` | Hướng dẫn setup & chạy |
