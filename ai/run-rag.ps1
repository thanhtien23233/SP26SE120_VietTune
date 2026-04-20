Write-Host "Starting RAG Service (Port 8001)..." -ForegroundColor Green
cd "$PSScriptRoot\viettune-rag-service"
.\venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8001
