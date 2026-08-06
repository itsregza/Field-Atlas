$ErrorActionPreference = "Stop"

$Root = if ($PSScriptRoot) {
  (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
} else {
  "C:\Users\Administrator\Desktop\Field-Atlas-main"
}

Set-Location $Root

if (-not (Test-Path (Join-Path $Root ".git"))) {
  throw "Not a git repo. Do the one-time setup in deploy\windows\RUNNING.md first."
}

git pull
if ($LASTEXITCODE -ne 0) { throw "git pull failed." }

powershell -ExecutionPolicy Bypass -File (Join-Path $PSScriptRoot "deploy.ps1")

Stop-ScheduledTask -TaskName "FieldAtlasAPI" -ErrorAction SilentlyContinue
Start-ScheduledTask -TaskName "FieldAtlasAPI"

Write-Host "Update done."
