# Field Atlas

Field Atlas is a desktop-first web app for people who walk and camp in the UK's
uplands. It combines interactive 3D terrain, regional summit directories and
personal peak-bagging trackers without trying to replace specialist route
providers such as OS Maps or AllTrails.

The product is intended to answer three practical questions:

1. Which recognised summits have I already completed?
2. What area, hill list or walk should I explore next?
3. How can camping tools be useful without publishing fragile wild-camping
   locations?

## Current build

- UK-wide MapTiler 3D terrain map with clustered summit locations.
- Coloured region outlines from peak hulls, with land outside the UK dimmed.
- Regional trackers locked to each area.
- Sixteen regional trackers covering Wainwrights, Ethels, Nuttalls, Hewitts,
  Humps, Munros, Corbetts, Grahams, Donalds and Dillons.
- Summit weather from Open-Meteo on peak details and map popups.
- Peak completion records with dates, notes and photographs.
- Account dashboard, public walker profiles (opt-in), and region % on trackers.
- FastAPI (Python) API with HTTP-only sessions, peak logs, posts and social.
- Postgres required (Docker Compose or local install).

## Repository layout

```
apps/web          React + Vite frontend
apps/api          FastAPI + SQLAlchemy (Python / uv)
packages/shared   Shared Zod schemas / types (web)
docker-compose.yml  Postgres 16
```

## Windows Server (production)

Start/stop and service setup: [`deploy/windows/RUNNING.md`](deploy/windows/RUNNING.md)  
First-time IIS + DNS setup: [`deploy/windows/README.md`](deploy/windows/README.md)

## Running locally

Requirements:

- Node.js 20.19+, 22.13+ or 24+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- Postgres 16 (Docker Compose **or** Homebrew — see below)
- A MapTiler browser API key

From the repo root:

```bash
npm install
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
cd apps/api && uv sync && cd ../..
```

Then start Postgres (pick one):

```bash
# Option A — Docker Desktop
docker compose up -d

# Option B — Homebrew (no Docker)
brew services start postgresql@16
```

If you used Homebrew for the first time, create the DB user once:

```bash
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
createuser -s fieldatlas 2>/dev/null || true
psql -d postgres -c "ALTER USER fieldatlas WITH PASSWORD 'fieldatlas';" 2>/dev/null || true
createdb -O fieldatlas fieldatlas 2>/dev/null || true
```

Add your MapTiler key to `apps/web/.env.local`:

```env
VITE_MAPTILER_KEY=your_key_here
VITE_API_URL=http://localhost:8787
```

Start the API and web app in two terminals:

```bash
npm run dev:api
npm run dev:web
```

- Web: http://localhost:5173
- API health: http://127.0.0.1:8787/health

Without `VITE_API_URL`, the web app still runs in localStorage prototype mode.

### Postgres

Docker Compose (if you have Docker Desktop):

```bash
docker compose up -d
```

Or use a local Postgres install (Homebrew):

```bash
brew services start postgresql@16
createuser -s fieldatlas 2>/dev/null || true
psql -d postgres -c "ALTER USER fieldatlas WITH PASSWORD 'fieldatlas';" 2>/dev/null || true
createdb -O fieldatlas fieldatlas 2>/dev/null || true
```

`apps/api/.env` should include:

```env
DATABASE_URL=postgresql+psycopg://fieldatlas:fieldatlas@127.0.0.1:5432/fieldatlas
```

Schema tables are created automatically on API startup. **Docker is optional** — you only need a reachable Postgres.
## API surface (early)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/health` | Liveness |
| POST | `/auth/register` | Email + password |
| POST | `/auth/login` | Email + password |
| POST | `/auth/demo-google` | Demo Google until OAuth is wired |
| POST | `/auth/logout` | Clears session cookie |
| GET | `/auth/me` | Current user + profile settings |
| GET/PUT | `/me/logs` | Peak completion map |
| PUT | `/me/logs/:peakId` | Single peak upsert |
| GET/PUT | `/me/profile` | Sharing settings |
| GET | `/profiles` | Public profiles |
| GET | `/profiles/:handle` | One public profile |

Sessions use an HTTP-only `fa_session` cookie.

## Main routes

- `/` — product homepage
- `/map` — UK terrain and summit map
- `/hikes` — hike generator
- `/trackers` — summit trackers by mountain area
- `/trackers/:area` — tracker for one mountain area
- `/walkers` — public field records
- `/u/:handle` — public profile
- `/login` — sign in
- `/account` — account dashboard + sharing controls

## Summit data and licensing

Summit data is derived from:

- The Database of British and Irish Hills, licensed under CC BY 4.0.
- The Wikipedia List of Ethels, licensed under CC BY-SA.

Further attribution and transformation notes are documented in
`apps/web/src/data/README.md`.

Map data and terrain are supplied by MapTiler and their underlying data
providers under the terms shown in the map attribution control.

## Product principles

- Curated discovery rather than automatically invented routes.
- Explain why a walk is recommended.
- Keep private records private by default.
- Strip photo metadata before future server uploads.
- Describe overnight terrain without implying permission to camp.
- Never create a public database of exact wild-camping pitches.

## Planned work

- Real Google OAuth (replace demo Google path).
- Hosted Postgres + object storage for summit photographs.
- Enrich public profile feeds with peak names / areas from shared data.
- Deploy web + API (Fly, Railway, or similar).
- Explainable hike recommendations.
- Camping gear lists and responsible overnight guidance.

## Status

Field Atlas is an early private prototype. Interfaces, summit coverage and data
models are still evolving and should not yet be relied on for navigation or
safety decisions.
