Write-Host "Starting Embedding Service (Port 8000)..." -ForegroundColor Cyan
cd "$PSScriptRoot\viettune-embedding-service"
.\.venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8000
