# Field Atlas on Windows + IIS (same idea as Pingster)
#
# Pingster:  IIS → http://127.0.0.1:8001 → Python
# Field Atlas: IIS → http://127.0.0.1:8787 → Python (API + built website)

## 1. Namecheap DNS (fieldatlas.co.uk → Advanced DNS)

Delete parking / redirect records for `@` and `www`.

Add:

| Type | Host | Value                        | TTL  |
|------|------|------------------------------|------|
| A    | @    | YOUR_SERVER_PUBLIC_IP        | Automatic |
| A    | www  | YOUR_SERVER_PUBLIC_IP        | Automatic |

No `api.` subdomain needed — site and API share one domain.

## 2. On the Windows server (once)

Install:
- Git
- Node 20+
- Python 3.12
- IIS + **URL Rewrite** + **Application Request Routing (ARR)**
  - In ARR → Server Proxy Settings → enable **proxy**
- Bind your IIS site to HTTPS (certificate for fieldatlas.co.uk / www)

Firewall: allow **80** and **443** inbound. Do **not** open 8787 publicly.

## 3. Clone + build

```
mkdir C:\apps
cd C:\apps
git clone https://github.com/itsregza/Field-Atlas.git FieldAtlas
cd FieldAtlas
```

Set your MapTiler key (needed for maps), then deploy:

```
$env:VITE_MAPTILER_KEY = "YOUR_MAPTILER_BROWSER_KEY"
powershell -ExecutionPolicy Bypass -File .\deploy\windows\deploy.ps1
```

## 4. Start Python (same role as Pingster’s uvicorn on 8001)

```
powershell -ExecutionPolicy Bypass -File .\deploy\windows\start-api.ps1
```

Check: http://127.0.0.1:8787/health  
You should also see the site at http://127.0.0.1:8787/

Leave this running (or install as a Windows service later with NSSM).

## 5. IIS site (copy Pingster’s pattern)

1. Create/use an IIS site for **fieldatlas.co.uk** (and www).
2. Physical path can be anything empty, e.g. `C:\inetpub\fieldatlas`
3. Copy `deploy\windows\web.config` into that folder
4. HTTPS binding for the domain
5. Confirm ARR proxy is enabled

IIS sends all traffic to `http://127.0.0.1:8787/...` — Python serves the React app, `/api`, and `/uploads`.

## 6. Smoke test

1. https://fieldatlas.co.uk/health
2. https://fieldatlas.co.uk
3. Register / log in
4. New post with a photo
5. Explore

## 7. Later updates

```
cd C:\apps\FieldAtlas
git pull
$env:VITE_MAPTILER_KEY = "YOUR_MAPTILER_BROWSER_KEY"
powershell -ExecutionPolicy Bypass -File .\deploy\windows\deploy.ps1
```

Then restart the API window / service.

## Notes

- DB file: `apps\api\data\fieldatlas.db` — back this up
- Uploads: `apps\api\uploads` — back this up
- Local PC: keep using `npm run dev` + `npm run dev:api` as now
- Owner ops panel: set matching `ADMIN_PATH` / `ADMIN_EMAILS` in `apps\api\.env`
  and `VITE_OPS_PATH` in `apps\web\.env.local`, rebuild, bookmark the secret URL.
  Docs/OpenAPI are disabled (`/docs`, `/openapi.json` return nothing useful).
