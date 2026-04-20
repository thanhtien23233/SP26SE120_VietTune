Write-Host "Starting Whisper Service (Port 8002)..." -ForegroundColor Yellow
cd "$PSScriptRoot\viettune-whisper-service"
.\.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8002
