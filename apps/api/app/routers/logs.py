from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.auth import require_user
from app.db import get_db
from app.models import PeakLog
from app.schemas import PeakLogBody, PutLogsBody, SessionUser, parse_completed_on

router = APIRouter(tags=["logs"])


def row_to_log(row: PeakLog) -> dict[str, Any]:
    return {
        "peakId": row.peak_id,
        "done": row.done,
        "date": row.completed_on.isoformat() if row.completed_on else "",
        "notes": row.notes,
        "imageUrl": row.image_url or None,
        "peakName": row.peak_name or None,
        "areaSlug": row.area_slug or None,
        "areaName": row.area_name or None,
        "height": row.height if row.height is not None else None,
    }


def log_values(user_id: Any, peak_id: str, parsed: PeakLogBody) -> dict[str, Any]:
    return {
        "user_id": user_id,
        "peak_id": peak_id,
        "done": parsed.done,
        "completed_on": parse_completed_on(parsed.date),
        "notes": parsed.notes,
        "image_url": parsed.image_url,
        "peak_name": parsed.peak_name,
        "area_slug": parsed.area_slug,
        "area_name": parsed.area_name,
        "height": parsed.height,
        "updated_at": datetime.now(UTC),
    }


@router.get("/me/logs")
def get_logs(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser, Depends(require_user)],
) -> dict[str, Any]:
    rows = db.execute(select(PeakLog).where(PeakLog.user_id == user.id)).scalars().all()
    logs = {row.peak_id: row_to_log(row) for row in rows}
    # Drop null optionals to match previous JSON style lightly
    cleaned: dict[str, Any] = {}
    for peak_id, log in logs.items():
        cleaned[peak_id] = {k: v for k, v in log.items() if v is not None or k in {"peakId", "done", "date", "notes"}}
    return {"logs": cleaned}


@router.put("/me/logs")
def put_logs(
    body: PutLogsBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser, Depends(require_user)],
) -> dict[str, Any]:
    for peak_id, log in body.logs.items():
        values = log_values(user.id, peak_id, log)
        stmt = insert(PeakLog).values(**values)
        stmt = stmt.on_conflict_do_update(
            index_elements=["user_id", "peak_id"],
            set_={
                "done": values["done"],
                "completed_on": values["completed_on"],
                "notes": values["notes"],
                "image_url": values["image_url"],
                "peak_name": values["peak_name"],
                "area_slug": values["area_slug"],
                "area_name": values["area_name"],
                "height": values["height"],
                "updated_at": values["updated_at"],
            },
        )
        db.execute(stmt)
    db.commit()
    return {"ok": True, "count": len(body.logs)}


@router.put("/me/logs/{peak_id}")
def put_log(
    peak_id: str,
    body: PeakLogBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser, Depends(require_user)],
) -> dict[str, Any]:
    values = log_values(user.id, peak_id, body)
    stmt = insert(PeakLog).values(**values)
    stmt = stmt.on_conflict_do_update(
        index_elements=["user_id", "peak_id"],
        set_={
            "done": values["done"],
            "completed_on": values["completed_on"],
            "notes": values["notes"],
            "image_url": values["image_url"],
            "peak_name": values["peak_name"],
            "area_slug": values["area_slug"],
            "area_name": values["area_name"],
            "height": values["height"],
            "updated_at": values["updated_at"],
        },
    )
    db.execute(stmt)
    db.commit()
    return {
        "log": {
            "peakId": peak_id,
            "done": body.done,
            "date": body.date,
            "notes": body.notes,
            "imageUrl": body.image_url,
            "peakName": body.peak_name,
            "areaSlug": body.area_slug,
            "areaName": body.area_name,
            "height": body.height,
        }
    }


@router.delete("/me/logs/{peak_id}")
def delete_log(
    peak_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser, Depends(require_user)],
) -> dict[str, Any]:
    row = db.execute(
        select(PeakLog).where(PeakLog.user_id == user.id, PeakLog.peak_id == peak_id)
    ).scalar_one_or_none()
    if row:
        db.delete(row)
        db.commit()
    return {"ok": True}
