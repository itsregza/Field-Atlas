# Install Field Atlas API as a Windows service using NSSM.
# 1) Download NSSM: https://nssm.cc/download  (win64\nssm.exe)
# 2) Run this in an elevated PowerShell from the repo root:
#      powershell -ExecutionPolicy Bypass -File .\deploy\windows\install-service.ps1
#
# Or skip this file and run the commands in the README by hand.

$ErrorActionPreference = "Stop"

$Root = if ($PSScriptRoot) {
  (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
} else {
  "C:\Users\Administrator\Desktop\Field-Atlas-main"
}

$Api = Join-Path $Root "apps\api"
$Python = Join-Path $Api ".venv\Scripts\python.exe"
$Nssm = $null

foreach ($candidate in @(
  (Join-Path $Root "deploy\windows\nssm.exe"),
  "C:\Tools\nssm\nssm.exe",
  "C:\nssm\nssm.exe"
)) {
  if (Test-Path $candidate) { $Nssm = $candidate; break }
}

if (-not (Get-Command nssm -ErrorAction SilentlyContinue) -and -not $Nssm) {
  throw "nssm.exe not found. Download from https://nssm.cc/download and put nssm.exe in deploy\windows\"
}

if (-not $Nssm) { $Nssm = (Get-Command nssm).Source }

if (-not (Test-Path $Python)) {
  throw "Missing $Python - run deploy.ps1 first."
}

$ServiceName = "FieldAtlasAPI"

& $Nssm stop $ServiceName 2>$null
& $Nssm remove $ServiceName confirm 2>$null

& $Nssm install $ServiceName $Python "-m" "uvicorn" "app.main:app" "--host" "127.0.0.1" "--port" "8787"
& $Nssm set $ServiceName AppDirectory $Api
& $Nssm set $ServiceName DisplayName "Field Atlas API"
& $Nssm set $ServiceName Start SERVICE_AUTO_START
& $Nssm set $ServiceName AppStdout (Join-Path $Api "data\service-stdout.log")
& $Nssm set $ServiceName AppStderr (Join-Path $Api "data\service-stderr.log")
& $Nssm set $ServiceName AppRotateFiles 1

New-Item -ItemType Directory -Force -Path (Join-Path $Api "data") | Out-Null

& $Nssm start $ServiceName
Write-Host "Service $ServiceName installed and started."
Write-Host "Check: http://127.0.0.1:8787/health"
