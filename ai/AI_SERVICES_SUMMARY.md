# 📋 VietTune AI Services — Tổng Hợp

> Tài liệu tóm tắt tất cả service/module trong thư mục `AI/`, bao gồm chức năng, thư viện, cấu hình, cách chạy và API endpoints.

---

## Mục Lục

| # | Service | Port | Mô tả ngắn |
|---|---------|------|-------------|
| 1 | [viettune-embedding-service](#1-viettune-embedding-service) | `8000` | Nhận diện nhạc cụ truyền thống VN từ audio (YAMNet + ONNX) |
| 2 | [viettune-rag-service](#2-viettune-rag-service) | `8001` | Embedding text (MiniLM) + LLM generation (Ollama) cho RAG chatbot |
| 3 | [viettune-whisper-service](#3-viettune-whisper-service) | `8002` | Chuyển audio thành text bằng OpenAI Whisper |
| 4 | [viettune-ai-training](#4-viettune-ai-training) | — | Pipeline training model nhận diện nhạc cụ (YAMNet fine-tune → ONNX) |

---

## 1. viettune-embedding-service

### Chức năng
Standalone service nhận file audio → phát hiện nhạc cụ truyền thống Việt Nam (đàn bầu, đàn tranh, …).

**Pipeline xử lý:**
```
Audio file → Librosa load (16kHz) → YAMNet embeddings (1024-dim) → ONNX classifier → Kết quả nhạc cụ + timeline
```

### Thư viện chính

| Thư viện | Phiên bản | Mục đích |
|----------|-----------|----------|
| `fastapi` | 0.115.6 | Web framework |
| `uvicorn` | 0.34.0 | ASGI server |
| `tensorflow` | 2.15.1 | Backend cho YAMNet |
| `tensorflow-hub` | 0.16.1 | Load YAMNet pretrained model |
| `onnxruntime` | 1.17.1 | Inference ONNX classifier |
| `librosa` | 0.10.2 | Xử lý audio (load, resample) |
| `numpy` | 1.26.4 | Xử lý mảng số |
| `soundfile` | 0.12.1 | Đọc/ghi file audio |
| `python-multipart` | 0.0.20 | Xử lý file upload |

### Cấu hình

| Hằng số | Giá trị | Mô tả |
|---------|---------|-------|
| `SAMPLE_RATE` | 16000 | Tần số lấy mẫu audio |
| `YAMNET_URL` | `https://tfhub.dev/google/yamnet/1` | URL model pretrained |
| `DETECTION_THRESHOLD` | 0.10 | Nhạc cụ phải xuất hiện >10% frames |
| `FRAME_DURATION` | 0.96s | Mỗi frame YAMNet |
| `FRAME_HOP` | 0.48s | Overlap 50% giữa 2 frames |

### Cấu trúc thư mục

```
viettune-embedding-service/
├── app.py                    # FastAPI app chính (409 dòng)
├── requirements.txt
├── Dockerfile
├── docker-compose.yml
├── README.md
└── models/
    ├── instrument_detector.onnx   # ONNX classifier đã train
    └── class_names.txt            # Danh sách class: background, dan_bau, dan_tranh, ...
```

### API Endpoints

| Method | Path | Auth | Input | Output |
|--------|------|------|-------|--------|
| `GET` | `/health` | Không | — | Status + loaded classes |
| `POST` | `/analyze` | Không | `file` (audio), `include_timeline` (bool), `max_duration` (float) | Instruments detected + confidence + timeline |
| `POST` | `/extract-embeddings` | Không | `file` (audio), `max_duration` (float) | Raw YAMNet embeddings (backward compatible) |

**Supported audio formats:** `.wav`, `.mp3`, `.flac`, `.ogg`

### Cách chạy

```bash
# Local
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000

# Docker
docker build -t viettune-embedding .
docker run -d -p 8000:8000 viettune-embedding

# Docker Hub (pre-built)
docker pull thanhtien23233/viettune-embedding:1.1
docker run -d -p 8000:8000 thanhtien23233/viettune-embedding:1.1
```

### Response mẫu (`POST /analyze`)

```json
{
  "success": true,
  "data": {
    "instruments": [
      {
        "instrument": "dan_bau",
        "confidence": 0.8923,
        "max_confidence": 0.9512,
        "overall_average": 0.7234,
        "frame_ratio": 0.65,
        "dominant_frames": 81,
        "total_frames": 124
      }
    ],
    "timeline": [
      {
        "instrument": "dan_bau",
        "start_seconds": 0.96,
        "end_seconds": 15.84,
        "num_frames": 30
      }
    ],
    "audio_info": {
      "filename": "test.mp3",
      "duration_seconds": 180.0,
      "analyzed_duration": 60.0,
      "num_frames": 124,
      "sample_rate": 16000
    }
  }
}
```

---

## 2. viettune-rag-service

### Chức năng
Microservice phục vụ RAG (Retrieval-Augmented Generation) chatbot, cung cấp 2 khả năng:
1. **Embedding text** → vector 384 chiều (dùng cho semantic search)
2. **LLM text generation** → proxy request tới Ollama local

### Thư viện chính

| Thư viện | Phiên bản | Mục đích |
|----------|-----------|----------|
| `fastapi` | 0.115.* | Web framework |
| `uvicorn` | 0.34.* | ASGI server |
| `sentence-transformers` | 3.4.* | Model embedding `all-MiniLM-L6-v2` (384-dim) |
| `httpx` | 0.28.* | HTTP client async (gọi Ollama) |
| `pydantic` | ≥2.0.0 | Data validation |

### Cấu hình (Environment Variables)

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `OLLAMA_URL` | `http://localhost:11434` | URL Ollama instance |
| `LLM_MODEL` | `gemma3:4b` | Model LLM dùng cho generation |

> **Lưu ý Docker:** Khi chạy trong Docker trên Windows/macOS, set `OLLAMA_URL=http://host.docker.internal:11434` và đảm bảo Ollama host đã set `OLLAMA_HOST=0.0.0.0`.

### Cấu trúc thư mục

```
viettune-rag-service/
├── main.py              # FastAPI app (99 dòng)
├── requirements.txt
├── Dockerfile
└── README.md
```

### API Endpoints

| Method | Path | Auth | Input | Output |
|--------|------|------|-------|--------|
| `GET` | `/health` | Không | — | Status + Ollama connection + available models |
| `POST` | `/embed` | Không | `{ "text": "..." }` | `{ "embedding": [float...] }` (384-dim vector) |
| `POST` | `/generate` | Không | `{ "system_prompt": "...", "user_prompt": "...", "history": [...] }` | `{ "content": "..." }` |

**Embedding model:** `all-MiniLM-L6-v2` — output 384 chiều, load 1 lần khi startup.

**LLM options:** `temperature=0.3`, `num_predict=1024`, `timeout=180s`.

### Cách chạy

```bash
# Yêu cầu: Cài Ollama + pull model
ollama pull gemma3:4b

# Docker (khuyến nghị)
docker build -t viettune-rag-service .
docker run --name rag-service -p 8001:8001 \
  -e OLLAMA_URL="http://host.docker.internal:11434" \
  viettune-rag-service

# Local
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8001
```

---

## 3. viettune-whisper-service

### Chức năng
Microservice chuyển đổi audio thành text (Speech-to-Text) sử dụng OpenAI Whisper open-source. Tối ưu cho tiếng Việt, phục vụ digitize nhạc cụ truyền thống.

### Thư viện chính

| Thư viện | Phiên bản | Mục đích |
|----------|-----------|----------|
| `fastapi` | 0.115.6 | Web framework |
| `uvicorn` | 0.34.0 | ASGI server |
| `openai-whisper` | git (latest) | Model Whisper open-source |
| `torch` | ≥2.0.0 | PyTorch backend (GPU/CPU) |
| `python-dotenv` | 1.0.1 | Load `.env` file |
| `pydantic-settings` | 2.7.0 | Settings management |
| `python-multipart` | 0.0.20 | Xử lý file upload |

### Yêu cầu hệ thống
- Python 3.10+
- **ffmpeg** phải được cài trên hệ thống (Whisper yêu cầu)
- (Khuyến nghị) NVIDIA GPU với ≥6GB VRAM cho model `medium`

### Cấu hình (`.env`)

| Biến | Mặc định | Mô tả |
|------|----------|-------|
| `WHISPER_MODEL` | `medium` | Model Whisper: `tiny`, `base`, `small`, `medium`, `large` |
| `API_KEY` | `viettune-whisper-secret-2026` | API key xác thực |
| `HOST` | `0.0.0.0` | Host lắng nghe |
| `PORT` | `8001` | Port *(trong .env.example là 8001, config mặc định code là 8002)* |

### Cấu trúc thư mục

```
viettune-whisper-service/
├── main.py              # FastAPI app + endpoints (117 dòng)
├── config.py            # Pydantic Settings (17 dòng)
├── requirements.txt
├── .env.example
├── README.md
├── middleware/
│   └── auth.py          # API Key authentication (X-API-Key header)
├── models/
│   └── schemas.py       # Pydantic response models
└── services/
    └── whisper_service.py  # Whisper model wrapper (76 dòng)
```

### API Endpoints

| Method | Path | Auth | Input | Output |
|--------|------|------|-------|--------|
| `GET` | `/health` | Không | — | Status, model info, GPU info |
| `POST` | `/transcribe` | `X-API-Key` header | `file` (audio), `language` (mặc định `vi`) | Full transcript + segments + timing |

**Supported audio formats:** `.flac`, `.wav`, `.mp3`, `.m4a`, `.ogg`, `.webm`, `.mp4`

**Giới hạn file:** Max 100MB.

**Tính năng đặc biệt:**
- Auto-detect GPU, fallback sang CPU nếu CUDA lỗi
- Giải phóng GPU cache khi shutdown
- Trả về segments với timestamp (start/end) cho từng đoạn

### Cách chạy

```bash
# 1. Cài ffmpeg
choco install ffmpeg          # Windows
brew install ffmpeg           # Mac
sudo apt install ffmpeg       # Linux

# 2. Setup
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt

# 3. Cấu hình
copy .env.example .env        # Sửa API_KEY nếu cần

# 4. Chạy
python main.py
# hoặc
uvicorn main:app --host 0.0.0.0 --port 8001
```

> **Lưu ý:** Lần đầu chạy sẽ download model Whisper (~1.5GB cho `medium`).

### Response mẫu (`POST /transcribe`)

```json
{
  "text": "Bài hát này được sáng tác vào năm 1960...",
  "language": "vi",
  "duration": 125.5,
  "segments": [
    {
      "start": 0.0,
      "end": 5.2,
      "text": "Bài hát này được sáng tác"
    },
    {
      "start": 5.2,
      "end": 10.8,
      "text": "vào năm 1960..."
    }
  ],
  "processing_time": 23.45,
  "model_used": "medium"
}
```

### Tích hợp với .NET Backend

```json
// appsettings.json
{
  "WhisperService": {
    "BaseUrl": "http://localhost:8001",
    "ApiKey": "viettune-whisper-secret-2026"
  }
}
```

---

## 4. viettune-ai-training

### Chức năng
Pipeline training model nhận diện nhạc cụ truyền thống Việt Nam. **Đây không phải service chạy runtime**, mà là bộ script huấn luyện để tạo ra model `.onnx` dùng cho `viettune-embedding-service`.

**Pipeline:**
```
Audio files (data/raw/) → YAMNet embeddings → Train classifier (Keras) → Export ONNX → Deploy vào embedding-service
```

### Thư viện chính

| Thư viện | Mục đích |
|----------|----------|
| `tensorflow` | Framework ML chính |
| `tensorflow-hub` | Load YAMNet pretrained |
| `librosa` | Xử lý audio |
| `soundfile` | Đọc file audio |
| `resampy` | Resample audio |
| `numpy` | Xử lý mảng số |
| `scikit-learn` | Train/test split, metrics, confusion matrix |
| `tf2onnx` | Convert Keras → ONNX |
| `onnx` | Đọc/ghi ONNX format |
| `onnxruntime` | Verify ONNX model |
| `matplotlib` | Vẽ biểu đồ training |

### Yêu cầu hệ thống
- Python 3.10 hoặc 3.11 (TensorFlow 2.15 chưa hỗ trợ 3.12+)
- RAM: tối thiểu 8GB
- GPU: **KHÔNG bắt buộc** (CPU đủ)
- Disk: ~2GB

### Cấu hình (Hyperparameters trong `src/config.py`)

| Tham số | Giá trị | Mô tả |
|---------|---------|-------|
| `SAMPLE_RATE` | 16000 | Tần số audio |
| `EMBEDDING_DIM` | 1024 | Chiều embedding YAMNet |
| `TEST_SIZE` | 0.2 | 20% data test |
| `BATCH_SIZE` | 32 | Batch size training |
| `EPOCHS` | 50 | Max epochs |
| `LEARNING_RATE` | 0.001 | Learning rate (Adam) |
| `EARLY_STOPPING_PATIENCE` | 5 | Dừng nếu 5 epoch không cải thiện |
| `AUGMENT_NOISE_FACTOR` | 0.005 | Gaussian noise 0.5% |
| `AUGMENT_PITCH_RANGE` | (-2, 2) | Dịch pitch ±2 semitones |
| `AUGMENT_SPEED_RANGE` | (0.9, 1.1) | Đổi tốc độ ±10% |

### Cấu trúc thư mục

```
viettune-ai-training/
├── requirements.txt
├── README.md
├── data/
│   ├── raw/                        # Audio gốc, chia theo thư mục class
│   │   ├── dan_bau/                # .wav đàn bầu
│   │   ├── dan_tranh/              # .wav đàn tranh
│   │   └── background/             # .wav tiếng ồn, giọng hát
│   └── processed/                  # Embeddings đã extract (auto-generated)
│       ├── embeddings.npy
│       ├── labels.npy
│       └── class_names.txt
├── models/                         # Output models
│   ├── best_model.keras            # Keras model
│   ├── instrument_detector.onnx    # ONNX model (→ copy sang embedding-service)
│   ├── class_names.txt             # Class list (→ copy sang embedding-service)
│   └── training_history.png        # Biểu đồ training
├── src/
│   ├── config.py                   # Cấu hình chung
│   ├── preprocess.py               # Load audio, normalize, augmentation
│   ├── extract_embeddings.py       # YAMNet → embeddings .npy
│   ├── build_model.py              # Xây dựng classifier model (Keras)
│   ├── train.py                    # Training loop + evaluate
│   ├── export_onnx.py              # Keras → ONNX + verify
│   └── export_yamnet_backbone.py   # Export YAMNet backbone (optional)
└── notebooks/                      # (trống — dùng cho thử nghiệm)
```

### Cách chạy (3 bước)

```bash
# 0. Setup
python -m venv venv
venv\Scripts\activate       # Windows
pip install -r requirements.txt

# 1. Chuẩn bị data: đặt file .wav vào data/raw/<tên_nhạc_cụ>/

# 2. Extract YAMNet embeddings (~5-10 phút)
python src/extract_embeddings.py

# 3. Train classifier (~2-5 phút)
python src/train.py

# 4. Export sang ONNX (~30 giây)
python src/export_onnx.py
```

### Output sau training

| File | Dùng cho |
|------|----------|
| `models/best_model.keras` | Inference trong Python |
| `models/instrument_detector.onnx` | Inference trong C#/.NET hoặc `viettune-embedding-service` |
| `models/class_names.txt` | Mapping index → tên nhạc cụ |
| `models/training_history.png` | Biểu đồ loss/accuracy |

### Thêm nhạc cụ mới

1. Tạo thư mục mới trong `data/raw/` (ví dụ: `data/raw/dan_nguyet/`)
2. Đưa file audio vào thư mục đó
3. Chạy lại Pipeline (bước 2 → 4)
4. Code tự động detect class mới từ tên thư mục

---

## Sơ Đồ Kiến Trúc Tổng Quan

```
┌─────────────────────────────────────────────────────────────────┐
│                      .NET Backend (C#)                          │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐    │
│  │ AI Analysis  │  │ RAG Chatbot  │  │ Whisper Transcript │    │
│  │ Controller   │  │ Controller   │  │ Service            │    │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘    │
│         │                 │                    │                │
└─────────┼─────────────────┼────────────────────┼────────────────┘
          │ HTTP            │ HTTP               │ HTTP
          ▼                 ▼                    ▼
  ┌───────────────┐ ┌───────────────┐ ┌──────────────────┐
  │  embedding-   │ │  rag-service  │ │ whisper-service  │
  │  service      │ │               │ │                  │
  │  :8000        │ │  :8001        │ │  :8002           │
  │               │ │               │ │                  │
  │  YAMNet +     │ │  MiniLM +     │ │  OpenAI Whisper  │
  │  ONNX         │ │  Ollama LLM   │ │  (medium)        │
  └───────────────┘ └───────┬───────┘ └──────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │    Ollama     │
                    │  (gemma3:4b)  │
                    │  :11434       │
                    └───────────────┘

  ┌─────────────────────────────────────┐
  │  viettune-ai-training (offline)     │
  │  Audio → YAMNet → Train → ONNX     │
  │  Output → models/ cho embedding-   │
  │           service                   │
  └─────────────────────────────────────┘
```

---

## Quick Reference — Chạy tất cả services

```bash
# 1. Embedding Service (nhận diện nhạc cụ)
cd viettune-embedding-service
docker run -d -p 8000:8000 thanhtien23233/viettune-embedding:1.1

# 2. RAG Service (chatbot)
cd viettune-rag-service
ollama pull gemma3:4b
docker run -d -p 8001:8001 -e OLLAMA_URL="http://host.docker.internal:11434" viettune-rag-service

# 3. Whisper Service (transcription)
cd viettune-whisper-service
pip install -r requirements.txt
python main.py
```

---

*Tài liệu được tạo tự động — cập nhật lần cuối: 2026-04-10*
