from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import get_settings
from app.db import ensure_schema
from app.routers import auth, logs, posts, profiles, ratings, social
from app.routers.ops import build_ops_router
from app.storage import UPLOAD_ROOT, ensure_upload_root

# apps/api/app/main.py → apps/web/dist
WEB_DIST = Path(__file__).resolve().parents[2] / "web" / "dist"


class StripApiPrefixMiddleware(BaseHTTPMiddleware):
    """Allow the Vite-built site to call /api/* against this same process."""

    async def dispatch(self, request: Request, call_next):
        path = request.scope.get("path") or ""
        if path == "/api":
            request.scope["path"] = "/"
        elif path.startswith("/api/"):
            request.scope["path"] = path[4:]
        return await call_next(request)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    ensure_schema()
    ensure_upload_root()
    yield


settings = get_settings()
app = FastAPI(
    title="Field Atlas API",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.add_middleware(StripApiPrefixMiddleware)
app.add_middleware(
    CORSMiddleware,
    # Dev / mobile tunnels (Expo web, Cloudflare) send varying Origins.
    # Bearer auth does not need cookies; reflecting any origin keeps login working.
    allow_origins=["*"] if not settings.is_production else settings.cors_origins,
    allow_credentials=False if not settings.is_production else True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _error_payload(detail: Any) -> dict[str, Any]:
    if isinstance(detail, dict) and "error" in detail:
        return detail
    if isinstance(detail, str):
        return {"error": detail}
    return {"error": "Request failed", "details": detail}


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(_request: Request, exc: StarletteHTTPException):
    return JSONResponse(status_code=exc.status_code, content=_error_payload(exc.detail))


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError):
    message = "Invalid request"
    try:
        for item in exc.errors():
            err_msg = item.get("msg")
            if err_msg is None:
                continue
            text = str(err_msg).removeprefix("Value error, ").strip()
            if text:
                message = text
                break
    except Exception:
        message = "Invalid request"
    return JSONResponse(status_code=400, content={"error": message})


@app.get("/health")
def health() -> dict[str, Any]:
    db_kind = "sqlite" if settings.database_url.startswith("sqlite") else "postgres"
    return {"ok": True, "service": "field-atlas-api", "db": db_kind}


app.include_router(auth.router)
app.include_router(logs.router)
app.include_router(profiles.router)
app.include_router(posts.router)
app.include_router(social.router)
app.include_router(ratings.router)

ops_router = build_ops_router()
if ops_router is not None:
    app.include_router(ops_router)

ensure_upload_root()
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")

if WEB_DIST.is_dir() and (WEB_DIST / "index.html").is_file():
    assets_dir = WEB_DIST / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="web-assets")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        # Prefer real files in dist (favicon, robots, etc.)
        candidate = WEB_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(WEB_DIST / "index.html")
