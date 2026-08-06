# Start Field Atlas via scheduled task, or run uvicorn directly if no task exists
$ErrorActionPreference = "Stop"

$TaskName = "FieldAtlasAPI"
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "Started scheduled task $TaskName."
  exit 0
}

$Api = Resolve-Path (Join-Path $PSScriptRoot "..\..\apps\api")
Set-Location $Api

$Python = Join-Path $Api ".venv\Scripts\python.exe"
if (-not (Test-Path $Python)) {
  throw "Missing venv at apps\api\.venv - run deploy.ps1 first."
}

& $Python -m uvicorn app.main:app --host 127.0.0.1 --port 8787
