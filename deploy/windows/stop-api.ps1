# Stop the Field Atlas API (manual / foreground run, or orphaned process on 8787)
$ErrorActionPreference = "Stop"

$ServiceName = "FieldAtlasAPI"
$service = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($service -and $service.Status -eq "Running") {
  Stop-Service -Name $ServiceName -Force
  Write-Host "Stopped Windows service $ServiceName."
  exit 0
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
} else {
  Write-Host "Port 8787 is in use but the owning process could not be found."
  exit 1
}
