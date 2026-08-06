# Stop Field Atlas scheduled task + anything still on port 8787
$ErrorActionPreference = "Stop"

$TaskName = "FieldAtlasAPI"
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
  Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
  Write-Host "Stopped scheduled task $TaskName."
}

$conn = Get-NetTCPConnection -LocalPort 8787 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1

if (-not $conn) {
  Write-Host "Nothing listening on port 8787."
  exit 0
}

$proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
if ($proc) {
  Stop-Process -Id $proc.Id -Force
  Write-Host "Stopped $($proc.ProcessName) (PID $($proc.Id)) on port 8787."
}
