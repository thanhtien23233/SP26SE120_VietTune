# 🚀 VietTune AI Services — Hướng dẫn chạy

> Tổng hợp lệnh chạy 3 service: **Embedding**, **RAG**, **Whisper**
> Hỗ trợ cả **Docker** và **Local (Python venv)**

---

## 📋 Tổng quan Service

| Service | Port | Mô tả | GPU? |
|---------|------|--------|------|
| **viettune-embedding-service** | `8000` | Nhận diện nhạc cụ truyền thống (YAMNet + ONNX) | Không bắt buộc |
| **viettune-rag-service** | `8001` | RAG Chatbot (Embedding + Ollama LLM) | Không (Ollama dùng GPU riêng) |
| **viettune-whisper-service** | `8002` | Chuyển đổi giọng nói → text (OpenAI Whisper) | **Khuyến nghị CUDA** |

---

## 🐳 CÁCH 1: Docker

### Yêu cầu
- Docker Desktop đang chạy
- (Tùy chọn) NVIDIA Container Toolkit nếu dùng GPU cho Whisper
- Ollama đang chạy trên host nếu dùng RAG service

### Chạy tất cả cùng lúc

```powershell
# Từ thư mục AI/
cd d:\Non-Entertain\SEP490\AI

# Build & chạy tất cả
docker compose up -d --build

# Xem trạng thái
docker compose ps

# Xem logs realtime
docker compose logs -f

# Dừng tất cả
docker compose down
```

### Chạy từng service riêng lẻ

#### 1️⃣ Embedding Service (Port 8000)

```powershell
# Dùng image có sẵn trên Docker Hub
docker run -d --name viettune-embedding -p 8000:8000 --restart unless-stopped thanhtien23233/viettune-embedding:1.1

# HOẶC build từ source
cd d:\Non-Entertain\SEP490\AI\viettune-embedding-service
docker build -t viettune-embedding:latest .
docker run -d --name viettune-embedding -p 8000:8000 --restart unless-stopped viettune-embedding:latest

# Test
curl http://localhost:8000/health
```

#### 2️⃣ RAG Service (Port 8001)

```powershell
# ⚠️ QUAN TRỌNG: Ollama phải đang chạy trên host trước!
# Đảm bảo biến môi trường OLLAMA_HOST=0.0.0.0 đã được set cho Ollama

# Build & chạy
cd d:\Non-Entertain\SEP490\AI\viettune-rag-service
docker build -t viettune-rag:latest .
docker run -d --name viettune-rag -p 8001:8001 `
  -e OLLAMA_URL=http://host.docker.internal:11434 `
  -e LLM_MODEL=gemma3:4b `
  --add-host=host.docker.internal:host-gateway `
  --restart unless-stopped `
  viettune-rag:latest

# Test
curl http://localhost:8001/health
```

#### 3️⃣ Whisper Service (Port 8002)

```powershell
# Build & chạy (CPU only)
cd d:\Non-Entertain\SEP490\AI\viettune-whisper-service
docker build -t viettune-whisper:latest .
docker run -d --name viettune-whisper -p 8002:8002 `
  --env-file .env `
  --restart unless-stopped `
  viettune-whisper:latest

# Build & chạy (GPU — cần NVIDIA Container Toolkit)
docker run -d --name viettune-whisper -p 8002:8002 `
  --env-file .env `
  --gpus all `
  --restart unless-stopped `
  viettune-whisper:latest

# Test
curl http://localhost:8002/health
```

### Quản lý Docker

```powershell
# Xem logs 1 service
docker logs -f viettune-embedding
docker logs -f viettune-rag
docker logs -f viettune-whisper

# Restart 1 service
docker restart viettune-embedding

# Xóa container
docker rm -f viettune-embedding viettune-rag viettune-whisper

# Dọn dẹp image cũ
docker image prune -f
```

---

## 💻 CÁCH 2: Chạy Local (Python venv)

### Yêu cầu chung
- Python 3.11+
- (Whisper) CUDA Toolkit nếu có NVIDIA GPU
- (RAG) Ollama đang chạy: `ollama serve`

---

### 1️⃣ Embedding Service (Port 8000)

```powershell
cd d:\Non-Entertain\SEP490\AI\viettune-embedding-service

# Tạo virtual environment (lần đầu)
python -m venv .venv

# Kích hoạt venv
.\.venv\Scripts\Activate.ps1

# Cài dependencies (lần đầu)
pip install -r requirements.txt

# Chạy
uvicorn app:app --host 0.0.0.0 --port 8000 --reload

# Test (mở terminal khác)
curl http://localhost:8000/health
```

---

### 2️⃣ RAG Service (Port 8001)

```powershell
# ⚠️ Đảm bảo Ollama đang chạy trước:
#    ollama serve
#    ollama pull gemma3:4b

cd d:\Non-Entertain\SEP490\AI\viettune-rag-service

# Tạo virtual environment (lần đầu)
python -m venv venv

# Kích hoạt venv
.\venv\Scripts\Activate.ps1

# Cài dependencies (lần đầu)
pip install -r requirements.txt

# Chạy
uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# Hoặc chạy với custom Ollama URL
$env:OLLAMA_URL="http://localhost:11434"
$env:LLM_MODEL="gemma3:4b"
uvicorn main:app --host 0.0.0.0 --port 8001 --reload

# Test
curl http://localhost:8001/health
```

---

### 3️⃣ Whisper Service (Port 8002)

```powershell
cd d:\Non-Entertain\SEP490\AI\viettune-whisper-service

# Tạo virtual environment (lần đầu)
python -m venv .venv

# Kích hoạt venv
.\.venv\Scripts\Activate.ps1

# Cài dependencies (lần đầu)
pip install -r requirements.txt

# ⚠️ Cài PyTorch với CUDA (nếu có GPU NVIDIA)
# Kiểm tra phiên bản CUDA: nvidia-smi
# Sau đó vào https://pytorch.org/get-started/locally/ chọn đúng version
# Ví dụ CUDA 12.1:
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Tạo file .env (lần đầu — copy từ example)
copy .env.example .env
# Sửa API_KEY trong .env thành giá trị bí mật của bạn

# Chạy
uvicorn main:app --host 0.0.0.0 --port 8002 --reload

# HOẶC chạy trực tiếp
python main.py

# Test
curl http://localhost:8002/health
```

---

## 🔥 Chạy tất cả cùng lúc (Local — PowerShell)

Mở **3 terminal** riêng biệt hoặc dùng script dưới đây:

```powershell
# === start-all-services.ps1 ===
# Chạy từ thư mục AI/

Write-Host "Starting all VietTune AI services..." -ForegroundColor Cyan

# Terminal 1: Embedding Service
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
  "cd 'd:\Non-Entertain\SEP490\AI\viettune-embedding-service'; .\.venv\Scripts\Activate.ps1; uvicorn app:app --host 0.0.0.0 --port 8000"

# Terminal 2: RAG Service
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
  "cd 'd:\Non-Entertain\SEP490\AI\viettune-rag-service'; .\venv\Scripts\Activate.ps1; uvicorn main:app --host 0.0.0.0 --port 8001"

# Terminal 3: Whisper Service
Start-Process powershell -ArgumentList "-NoExit", "-Command", `
  "cd 'd:\Non-Entertain\SEP490\AI\viettune-whisper-service'; .\.venv\Scripts\Activate.ps1; uvicorn main:app --host 0.0.0.0 --port 8002"

Write-Host "`nAll services starting in separate windows!" -ForegroundColor Green
Write-Host "  Embedding: http://localhost:8000/health" -ForegroundColor Yellow
Write-Host "  RAG:       http://localhost:8001/health" -ForegroundColor Yellow
Write-Host "  Whisper:   http://localhost:8002/health" -ForegroundColor Yellow
```

---

## ✅ Kiểm tra tất cả service

```powershell
# Health check tất cả
Write-Host "=== Checking all services ===" -ForegroundColor Cyan

@("http://localhost:8000/health", "http://localhost:8001/health", "http://localhost:8002/health") | ForEach-Object {
    try {
        $response = Invoke-RestMethod -Uri $_ -TimeoutSec 5
        Write-Host "[OK] $_ " -ForegroundColor Green
    } catch {
        Write-Host "[FAIL] $_ " -ForegroundColor Red
    }
}
```

---

## 📌 API Endpoints nhanh

### Embedding Service (:8000)
```powershell
# Health check
curl http://localhost:8000/health

# Phân tích nhạc cụ
curl -X POST http://localhost:8000/analyze -F "file=@audio.mp3"

# Phân tích kèm timeline
curl -X POST "http://localhost:8000/analyze?include_timeline=true" -F "file=@audio.mp3"
```

### RAG Service (:8001)
```powershell
# Health check
curl http://localhost:8001/health

# Tạo embedding
curl -X POST http://localhost:8001/embed -H "Content-Type: application/json" -d '{"text": "Đàn bầu là nhạc cụ truyền thống"}'

# Chat với LLM
curl -X POST http://localhost:8001/generate -H "Content-Type: application/json" -d '{"system_prompt": "You are a helpful assistant", "user_prompt": "Hello"}'
```

### Whisper Service (:8002)
```powershell
# Health check
curl http://localhost:8002/health

# Transcribe audio
curl -X POST http://localhost:8002/transcribe -H "X-API-Key: your-api-key" -F "file=@audio.wav" -F "language=vi"
```
