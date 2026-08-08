from __future__ import annotations

import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile

UPLOAD_ROOT = Path(__file__).resolve().parent.parent / "uploads"

IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
VIDEO_TYPES = {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
}

MAX_IMAGE_BYTES = 4_000_000
MAX_VIDEO_BYTES = 25_000_000

_SAFE_UPLOAD = re.compile(
    r"^/uploads/[0-9a-fA-F-]{36}/[0-9a-fA-F]{32}\.(jpg|png|webp|gif|mp4|webm|mov)$"
)


def ensure_upload_root() -> None:
    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)


def media_kind(content_type: str | None) -> tuple[str, str]:
    ctype = (content_type or "").split(";")[0].strip().lower()
    if ctype in IMAGE_TYPES:
        return "image", IMAGE_TYPES[ctype]
    if ctype in VIDEO_TYPES:
        return "video", VIDEO_TYPES[ctype]
    raise HTTPException(
        status_code=400,
        detail={"error": "Use a JPEG/PNG/WebP photo or an MP4/WebM/MOV video."},
    )


async def save_upload(user_id: uuid.UUID, file: UploadFile) -> dict[str, str]:
    kind, ext = media_kind(file.content_type)
    data = await file.read()
    limit = MAX_IMAGE_BYTES if kind == "image" else MAX_VIDEO_BYTES
    if not data:
        raise HTTPException(status_code=400, detail={"error": "Empty file."})
    if len(data) > limit:
        mb = limit // 1_000_000
        raise HTTPException(
            status_code=400,
            detail={
                "error": f"{'Photo' if kind == 'image' else 'Video'} must be under {mb} MB."
            },
        )

    ensure_upload_root()
    user_dir = UPLOAD_ROOT / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    path = user_dir / name
    path.write_bytes(data)
    return {"type": kind, "url": f"/uploads/{user_id}/{name}"}


def is_upload_url(url: str) -> bool:
    return bool(_SAFE_UPLOAD.match(url))
