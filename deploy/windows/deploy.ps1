# Field Atlas - Windows server (same pattern as Pingster)
#
# Internet -> IIS (HTTPS) -> http://127.0.0.1:8787 -> Python (API + website + uploads)
# SQLite file DB (no Docker required)
#
# Assumed path: C:\apps\FieldAtlas
# Domain: fieldatlas.co.uk

$ErrorActionPreference = "Stop"

function Assert-LastExitCode([string]$Step) {
  if ($LASTEXITCODE -ne 0) {
    throw "$Step failed (exit $LASTEXITCODE)."
  }
}

if ($PSScriptRoot) {
  $Root = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
} else {
  $Root = "C:\apps\FieldAtlas"
}
$Api = Join-Path $Root "apps\api"
$Web = Join-Path $Root "apps\web"

Write-Host "Repo: $Root"

# 1) JS deps + shared package
Set-Location $Root
npm ci
Assert-LastExitCode "npm ci"
npm run build -w @field-atlas/shared
Assert-LastExitCode "shared build"

# 2) API venv
Set-Location $Api
if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
  if (Get-Command python -ErrorAction SilentlyContinue) {
    python -m venv .venv
  } elseif (Get-Command py -ErrorAction SilentlyContinue) {
    py -3 -m venv .venv
  } else {
    throw "Python not found. Install Python 3.12+ and re-run."
  }
}
.\.venv\Scripts\python -m pip install -U pip
Assert-LastExitCode "pip upgrade"
.\.venv\Scripts\python -m pip install -e .
Assert-LastExitCode "api install"

New-Item -ItemType Directory -Force -Path (Join-Path $Api "uploads") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Api "data") | Out-Null

# 3) Production .env (create once)
$EnvFile = Join-Path $Api ".env"
if (-not (Test-Path $EnvFile)) {
  @(
    "PORT=8787"
    "HOST=127.0.0.1"
    "ENVIRONMENT=production"
    "WEB_ORIGIN=https://fieldatlas.co.uk,https://www.fieldatlas.co.uk"
    "DATABASE_URL=sqlite:///./data/fieldatlas.db"
  ) | Set-Content -Path $EnvFile -Encoding utf8
  Write-Host "Created apps\api\.env"
}

# 4) Build website (same-origin /api - FastAPI strips the prefix)
Set-Location $Root
if (-not $env:VITE_API_URL) { $env:VITE_API_URL = "/api" }

# Load MapTiler key from apps/web/.env* if not already set in the shell
if (-not $env:VITE_MAPTILER_KEY) {
  foreach ($name in @(".env.production.local", ".env.local", ".env.production", ".env")) {
    $candidate = Join-Path $Web $name
    if (-not (Test-Path $candidate)) { continue }
    Get-Content $candidate | ForEach-Object {
      if ($_ -match '^\s*VITE_MAPTILER_KEY\s*=\s*(.+)\s*$') {
        $env:VITE_MAPTILER_KEY = $Matches[1].Trim().Trim('"').Trim("'")
      }
    }
    if ($env:VITE_MAPTILER_KEY) { break }
  }
}

if (-not $env:VITE_MAPTILER_KEY) {
  Write-Host "WARNING: VITE_MAPTILER_KEY not set - maps may fail."
  Write-Host "Put it in apps\web\.env or run: `$env:VITE_MAPTILER_KEY = 'your_key'"
}

npm run build -w web
Assert-LastExitCode "web build"

Write-Host ""
Write-Host "Build done."
Write-Host "Start API:  powershell -ExecutionPolicy Bypass -File .\deploy\windows\start-api.ps1"
Write-Host "Point IIS at this site with deploy\windows\web.config (proxy to 127.0.0.1:8787)"
