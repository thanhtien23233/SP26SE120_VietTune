# ============================================================
# VietTune AI Services — Stop All (Local)
# ============================================================
# Dừng tất cả uvicorn processes đang chạy trên port 8000-8002
# Chạy: .\stop-all-local.ps1
# ============================================================

Write-Host ""
Write-Host "============================================" -ForegroundColor Red
Write-Host "  VietTune AI Services — Stopping All      " -ForegroundColor Red
Write-Host "============================================" -ForegroundColor Red
Write-Host ""

$ports = @(8000, 8001, 8002)
$names = @("Embedding", "RAG", "Whisper")

for ($i = 0; $i -lt $ports.Count; $i++) {
    $port = $ports[$i]
    $name = $names[$i]
    
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | 
                   Where-Object { $_.State -eq "Listen" }
    
    if ($connections) {
        foreach ($conn in $connections) {
            $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  Stopping $name (PID: $($proc.Id), Port: $port)..." -ForegroundColor Yellow
                Stop-Process -Id $proc.Id -Force
                Write-Host "  [STOPPED] $name" -ForegroundColor Green
            }
        }
    } else {
        Write-Host "  [SKIP] $name — not running on port $port" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "All services stopped." -ForegroundColor Green
