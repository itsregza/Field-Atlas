# Starting and stopping Field Atlas on Windows Server

This guide is for the production server (`C:\apps\FieldAtlas` or wherever you cloned the repo).
One-time setup (DNS, IIS, first build) is in [README.md](./README.md).

Traffic flow:

```
Internet → IIS (HTTPS, port 443) → http://127.0.0.1:8787 → Python (API + built website)
```

IIS stays running as a Windows service. You mainly start and stop the Python API on port **8787**.

---

## Before you start (first time only)

From the repo root, after cloning and setting your MapTiler key:

```powershell
cd C:\apps\FieldAtlas
$env:VITE_MAPTILER_KEY = "YOUR_MAPTILER_BROWSER_KEY"
powershell -ExecutionPolicy Bypass -File .\deploy\windows\deploy.ps1
```

Copy `deploy\windows\web.config` into your IIS site folder (e.g. `C:\inetpub\fieldatlas`) if you have not already.

---

## Start the site

Pick **one** of these. Do not run both at the same time.

### Option A — PowerShell window (quick test)

```powershell
cd C:\apps\FieldAtlas
powershell -ExecutionPolicy Bypass -File .\deploy\windows\start-api.ps1
```

Leave the window open. Closing it stops the API.

### Option B — Windows service (recommended for production)

Install once (elevated PowerShell, needs [NSSM](https://nssm.cc/download) — put `nssm.exe` in `deploy\windows\`):

```powershell
cd C:\apps\FieldAtlas
powershell -ExecutionPolicy Bypass -File .\deploy\windows\install-service.ps1
```

After that, start on boot or by hand:

```powershell
Start-Service FieldAtlasAPI
```

Or with NSSM:

```powershell
.\deploy\windows\nssm.exe start FieldAtlasAPI
```

---

## Check it is running

On the server:

```powershell
Invoke-WebRequest http://127.0.0.1:8787/health -UseBasicParsing
```

In a browser:

- http://127.0.0.1:8787/health
- https://fieldatlas.co.uk/health
- https://fieldatlas.co.uk

Service status:

```powershell
Get-Service FieldAtlasAPI
```

---

## Stop the site

### If you used Option A (PowerShell window)

Press **Ctrl+C** in that window, or run from another PowerShell session:

```powershell
cd C:\apps\FieldAtlas
powershell -ExecutionPolicy Bypass -File .\deploy\windows\stop-api.ps1
```

### If you used Option B (Windows service)

```powershell
Stop-Service FieldAtlasAPI
```

Or:

```powershell
.\deploy\windows\nssm.exe stop FieldAtlasAPI
```

The public site will return errors until you start the API again. IIS itself keeps running.

---

## Restart after a code update

```powershell
cd C:\apps\FieldAtlas
git pull
$env:VITE_MAPTILER_KEY = "YOUR_MAPTILER_BROWSER_KEY"
powershell -ExecutionPolicy Bypass -File .\deploy\windows\deploy.ps1
```

Then restart the API:

**Service:**

```powershell
Restart-Service FieldAtlasAPI
```

**Manual window:** stop with Ctrl+C or `stop-api.ps1`, then run `start-api.ps1` again.

---

## Logs and data

| Path | What |
|------|------|
| `apps\api\data\fieldatlas.db` | SQLite database — back up regularly |
| `apps\api\uploads` | Uploaded photos — back up regularly |
| `apps\api\data\service-stdout.log` | Service stdout (NSSM) |
| `apps\api\data\service-stderr.log` | Service stderr (NSSM) |

---

## Troubleshooting

**Port 8787 already in use**

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\windows\stop-api.ps1
```

Then start again.

**Site loads but maps are blank**

Rebuild with `VITE_MAPTILER_KEY` set, then restart the API.

**HTTPS works locally but not from the internet**

Check IIS bindings, certificate, and firewall rules for ports 80 and 443. Port 8787 must stay closed to the public.
