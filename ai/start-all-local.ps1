# ============================================================
# VietTune AI Services - Start All (Local)
# ============================================================
# Chay: .\start-all-local.ps1
# Moi service se mo trong 1 terminal rieng
# ============================================================

$BASE_DIR = $PSScriptRoot

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  VietTune AI Services - Starting All       " -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# --- Helper: Build command string for each service ---
function Start-Service {
    param(
        [string]$ServiceName,
        [string]$Folder,
        [string]$EntryPoint,
        [int]$Port
    )

    $svcDir = Join-Path $BASE_DIR $Folder
    $cmd = "Set-Location '$svcDir'; "
    $cmd += "if (Test-Path '.\.venv\Scripts\Activate.ps1') { .\.venv\Scripts\Activate.ps1 } "
    $cmd += "elseif (Test-Path '.\venv\Scripts\Activate.ps1') { .\venv\Scripts\Activate.ps1 }; "
    $cmd += "Write-Host 'Starting $ServiceName on port $Port...' -ForegroundColor Green; "
    $cmd += "uvicorn ${EntryPoint} --host 0.0.0.0 --port $Port"

    Write-Host "  Starting $ServiceName (port $Port)..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $cmd
}

# 1. Embedding Service
Start-Service -ServiceName "Embedding" -Folder "viettune-embedding-service" -EntryPoint "app:app" -Port 8000
Start-Sleep -Seconds 2

# 2. RAG Service
Start-Service -ServiceName "RAG" -Folder "viettune-rag-service" -EntryPoint "main:app" -Port 8001
Start-Sleep -Seconds 2

# 3. Whisper Service
Start-Service -ServiceName "Whisper" -Folder "viettune-whisper-service" -EntryPoint "main:app" -Port 8002

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  All services starting!                    " -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Embedding:  http://localhost:8000/health" -ForegroundColor White
Write-Host "  RAG:        http://localhost:8001/health" -ForegroundColor White
Write-Host "  Whisper:    http://localhost:8002/health" -ForegroundColor White
Write-Host ""
Write-Host "Waiting 10s then checking health..." -ForegroundColor Gray

Start-Sleep -Seconds 10

# Health check
Write-Host ""
Write-Host "--- Health Check ---" -ForegroundColor Cyan

$endpoints = @(
    @{ Name = "Embedding"; Url = "http://localhost:8000/health" },
    @{ Name = "RAG";       Url = "http://localhost:8001/health" },
    @{ Name = "Whisper";   Url = "http://localhost:8002/health" }
)

foreach ($svc in $endpoints) {
    try {
        $null = Invoke-RestMethod -Uri $svc.Url -TimeoutSec 5 -ErrorAction Stop
        Write-Host "  [OK]   $($svc.Name) - $($svc.Url)" -ForegroundColor Green
    }
    catch {
        Write-Host "  [WAIT] $($svc.Name) - $($svc.Url) (may still be loading...)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Done! Close each terminal window to stop its service." -ForegroundColor Gray
