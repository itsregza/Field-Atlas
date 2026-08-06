from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from app.auth import get_optional_user, require_user
from app.db import get_db
from app.models import Follow, PeakLog, Profile, User
from app.schemas import ProfileUpdateBody, SessionUser

router = APIRouter(tags=["profiles"])


def serialize_profile(row: Profile, name: str | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "handle": row.handle,
        "status": row.status,
        "avatarUrl": row.avatar_url,
        "isPublic": row.is_public,
        "shareNotes": row.share_notes,
        "sharePhotos": row.share_photos,
    }
    if name is not None:
        payload["name"] = name
    return payload


def follow_stats(db: Session, user_id: UUID, viewer_id: UUID | None) -> dict[str, Any]:
    followers = db.execute(
        select(func.count()).select_from(Follow).where(Follow.following_id == user_id)
    ).scalar_one()
    following = db.execute(
        select(func.count()).select_from(Follow).where(Follow.follower_id == user_id)
    ).scalar_one()

    followed_by_me = False
    if viewer_id and viewer_id != user_id:
        mine = db.execute(
            select(Follow).where(
                and_(Follow.follower_id == viewer_id, Follow.following_id == user_id)
            )
        ).scalar_one_or_none()
        followed_by_me = mine is not None

    return {
        "followerCount": int(followers),
        "followingCount": int(following),
        "followedByMe": followed_by_me,
    }


def build_public_profile(
    row: Any,
    logs: list[PeakLog],
    social: dict[str, Any],
) -> dict[str, Any]:
    completed = sum(1 for log in logs if log.done)
    areas_started = len(
        {log.area_slug for log in logs if log.done and log.area_slug}
    )

    done_logs = [log for log in logs if log.done]
    done_logs.sort(
        key=lambda log: (
            log.completed_on.isoformat() if log.completed_on else "",
            log.updated_at.timestamp() if log.updated_at else 0,
        ),
        reverse=True,
    )

    recent = []
    for log in done_logs[:12]:
        item: dict[str, Any] = {
            "peakId": log.peak_id,
            "peakName": log.peak_name or log.peak_id,
            "areaSlug": log.area_slug or "",
            "areaName": log.area_name or log.area_slug or "",
            "height": log.height or 0,
            "date": log.completed_on.isoformat() if log.completed_on else "",
        }
        if row.share_notes and log.notes.strip():
            item["notes"] = log.notes
        if row.share_photos and log.image_url:
            item["imageUrl"] = log.image_url
        recent.append(item)

    area_progress: dict[str, dict[str, Any]] = {}
    for log in done_logs:
        slug = (log.area_slug or "").strip()
        if not slug:
            continue
        entry = area_progress.get(slug)
        if entry is None:
            area_progress[slug] = {
                "areaSlug": slug,
                "areaName": log.area_name or slug,
                "done": 1,
            }
        else:
            entry["done"] += 1

    areas = sorted(
        area_progress.values(),
        key=lambda item: (-int(item["done"]), str(item["areaName"])),
    )

    return {
        "handle": row.handle,
        "userId": str(row.user_id),
        "name": row.name,
        "status": row.status,
        "avatarUrl": row.avatar_url,
        "shareNotes": row.share_notes,
        "sharePhotos": row.share_photos,
        "completed": completed,
        "areasStarted": areas_started,
        "followerCount": social["followerCount"],
        "followingCount": social["followingCount"],
        "followedByMe": social["followedByMe"],
        "updatedAt": row.updated_at.isoformat(),
        "recent": recent,
        "areas": areas,
    }


@router.get("/me/profile")
def get_my_profile(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser, Depends(require_user)],
) -> dict[str, Any]:
    row = db.get(Profile, user.id)
    if not row:
        raise HTTPException(status_code=404, detail={"error": "Profile not found"})
    return {"profile": serialize_profile(row, user.name)}


@router.put("/me/profile")
def update_my_profile(
    body: ProfileUpdateBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser, Depends(require_user)],
) -> dict[str, Any]:
    existing = db.get(Profile, user.id)
    if not existing:
        raise HTTPException(status_code=404, detail={"error": "Profile not found"})

    next_name = user.name
    if body.name is not None:
        trimmed = body.name.strip()
        if not trimmed:
            raise HTTPException(status_code=400, detail={"error": "Name is required"})
        db_user = db.get(User, user.id)
        if db_user:
            db_user.name = trimmed
            next_name = trimmed

    if "avatar_url" in body.model_fields_set or "avatarUrl" in body.model_fields_set:
        existing.avatar_url = body.avatar_url

    existing.status = body.status
    existing.is_public = body.is_public
    existing.share_notes = body.share_notes
    existing.share_photos = body.share_photos
    existing.updated_at = datetime.now(UTC)
    db.commit()
    db.refresh(existing)

    return {"profile": serialize_profile(existing, next_name)}


@router.get("/profiles/search")
def search_profiles(
    db: Annotated[Session, Depends(get_db)],
    q: Annotated[str, Query(max_length=100)] = "",
    limit: Annotated[int, Query(ge=1, le=20)] = 10,
) -> dict[str, Any]:
    term = q.strip().lower()
    if len(term) < 2:
        return {"profiles": []}

    pattern = f"%{term}%"
    rows = db.execute(
        select(Profile.handle, User.name, Profile.avatar_url)
        .join(User, Profile.user_id == User.id)
        .where(Profile.is_public.is_(True))
        .where(
            or_(
                func.lower(Profile.handle).like(pattern),
                func.lower(User.name).like(pattern),
            )
        )
        .order_by(Profile.updated_at.desc())
        .limit(limit)
    ).all()

    return {
        "profiles": [
            {
                "handle": row.handle,
                "name": row.name,
                "avatarUrl": row.avatar_url,
            }
            for row in rows
        ]
    }


@router.get("/profiles/{handle}")
def get_profile(
    handle: str,
    db: Annotated[Session, Depends(get_db)],
    viewer: Annotated[SessionUser | None, Depends(get_optional_user)],
) -> dict[str, Any]:
    handle = handle.strip().lower()
    row = db.execute(
        select(
            Profile.handle,
            Profile.user_id,
            User.name,
            Profile.status,
            Profile.avatar_url,
            Profile.share_notes,
            Profile.share_photos,
            Profile.is_public,
            Profile.updated_at,
        )
        .join(User, Profile.user_id == User.id)
        .where(Profile.handle == handle)
    ).first()

    if not row or not row.is_public:
        raise HTTPException(status_code=404, detail={"error": "Profile not found"})

    logs = (
        db.execute(
            select(PeakLog)
            .where(and_(PeakLog.user_id == row.user_id, PeakLog.done.is_(True)))
            .order_by(PeakLog.updated_at.desc())
        )
        .scalars()
        .all()
    )
    social = follow_stats(db, row.user_id, viewer.id if viewer else None)
    return {"profile": build_public_profile(row, list(logs), social)}


@router.get("/profiles/{handle}/logs")
def profile_logs(
    handle: str,
    db: Annotated[Session, Depends(get_db)],
    viewer: Annotated[SessionUser | None, Depends(get_optional_user)],
    area: Annotated[str | None, Query()] = None,
) -> dict[str, Any]:
    _ = viewer
    handle = handle.strip().lower()
    row = db.execute(
        select(Profile.user_id, Profile.is_public, Profile.handle, User.name, Profile.avatar_url)
        .join(User, Profile.user_id == User.id)
        .where(Profile.handle == handle)
    ).first()
    if not row or not row.is_public:
        raise HTTPException(status_code=404, detail={"error": "Profile not found"})

    query = select(PeakLog).where(
        and_(PeakLog.user_id == row.user_id, PeakLog.done.is_(True))
    )
    if area:
        query = query.where(PeakLog.area_slug == area.strip())
    logs = db.execute(query.order_by(PeakLog.updated_at.desc())).scalars().all()

    return {
        "handle": row.handle,
        "name": row.name,
        "avatarUrl": row.avatar_url,
        "logs": {
            log.peak_id: {
                "done": True,
                "completedOn": log.completed_on.isoformat() if log.completed_on else None,
                "notes": log.notes or "",
                "imageUrl": log.image_url,
                "peakName": log.peak_name,
                "areaSlug": log.area_slug,
                "areaName": log.area_name,
                "height": log.height,
            }
            for log in logs
        },
    }
