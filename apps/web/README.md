# Field Atlas web app

React + MapTiler prototype for exploring UK upland regions, summit lists and
personal peak tracking.

## Setup

```sh
npm install
cp .env.example .env.local
npm run dev
```

Add a domain-restricted MapTiler browser key to `.env.local`:

```text
VITE_MAPTILER_KEY=your_browser_key
```

The interface shows a setup panel when no key is configured.

## Checks

```sh
npm run lint
npm run build
npm audit --omit=dev
```

Summit data sources and licences are documented in `src/data/README.md`.
