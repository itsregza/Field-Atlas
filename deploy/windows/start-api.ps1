# Start Field Atlas API (bind localhost; Caddy proxies public HTTPS)
$ErrorActionPreference = "Stop"
$Api = Resolve-Path (Join-Path $PSScriptRoot "..\..\apps\api")
Set-Location $Api

$Python = Join-Path $Api ".venv\Scripts\python.exe"
if (-not (Test-Path $Python)) {
  throw "Missing venv at apps\api\.venv — run deploy.ps1 first."
}

& $Python -m uvicorn app.main:app --host 127.0.0.1 --port 8787
