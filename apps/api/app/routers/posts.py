from __future__ import annotations

import json
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.auth import get_optional_user, new_user_id, require_user
from app.db import get_db
from app.models import Follow, Post, Profile, User
from app.routers.social import enrich_posts
from app.schemas import CreatePostBody, SessionUser, UpdatePostBody
from app.storage import ensure_upload_root, is_upload_url, save_upload

router = APIRouter(tags=["posts"])


def _parse_media(raw: str | None, image_url: str) -> list[dict[str, str]]:
    if raw:
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list) and parsed:
                out: list[dict[str, str]] = []
                for item in parsed:
                    if not isinstance(item, dict):
                        continue
                    kind = str(item.get("type") or "").strip().lower()
                    url = str(item.get("url") or "").strip()
                    if kind in {"image", "video"} and url:
                        out.append({"type": kind, "url": url})
                if out:
                    return out
        except json.JSONDecodeError:
            pass
    return [{"type": "image", "url": image_url}] if image_url else []


def _post_row_dict(
    post: Post,
    *,
    user_id: UUID,
    handle: str,
    name: str,
    avatar_url: str | None = None,
) -> dict[str, Any]:
    return {
        "id": post.id,
        "body": post.body,
        "image_url": post.image_url,
        "media": _parse_media(post.media_json, post.image_url),
        "route_url": post.route_url,
        "route_label": post.route_label,
        "activity": post.activity,
        "peak_id": post.peak_id,
        "peak_name": post.peak_name,
        "area_slug": post.area_slug,
        "area_name": post.area_name,
        "height": post.height,
        "hike_id": post.hike_id,
        "hike_name": post.hike_name,
        "is_hidden": post.is_hidden,
        "created_at": post.created_at,
        "user_id": user_id,
        "handle": handle,
        "name": name,
        "avatar_url": avatar_url,
    }


@router.post("/me/uploads")
async def upload_media(
    user: Annotated[SessionUser, Depends(require_user)],
    file: Annotated[UploadFile, File()],
) -> dict[str, Any]:
    ensure_upload_root()
    item = await save_upload(user.id, file)
    return {"media": item}


@router.get("/feed")
def feed(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser, Depends(require_user)],
    limit: Annotated[int, Query(ge=1, le=40)] = 20,
    scope: Annotated[str, Query()] = "all",
) -> dict[str, Any]:
    scope_value = "following" if scope == "following" else "all"
    author_filter: list[UUID] | None = None

    if scope_value == "following":
        following = (
            db.execute(select(Follow.following_id).where(Follow.follower_id == user.id))
            .scalars()
            .all()
        )
        author_filter = list(following)
        if not author_filter:
            return {"posts": [], "scope": scope_value}

    query = (
        select(Post, User, Profile)
        .join(User, Post.user_id == User.id)
        .join(Profile, Profile.user_id == User.id)
        .where(Profile.is_public.is_(True))
        .where(or_(Post.is_hidden.is_(False), Post.user_id == user.id))
        .order_by(Post.created_at.desc())
        .limit(limit)
    )
    if author_filter is not None:
        query = query.where(Post.user_id.in_(author_filter))

    rows = db.execute(query).all()
    shaped = [
        _post_row_dict(
            post,
            user_id=user_row.id,
            handle=profile.handle,
            name=user_row.name,
            avatar_url=profile.avatar_url,
        )
        for post, user_row, profile in rows
    ]
    return {"posts": enrich_posts(db, shaped, user.id), "scope": scope_value}


@router.get("/me/posts")
def my_posts(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser, Depends(require_user)],
) -> dict[str, Any]:
    profile = db.get(Profile, user.id)
    rows = (
        db.execute(
            select(Post).where(Post.user_id == user.id).order_by(Post.created_at.desc()).limit(40)
        )
        .scalars()
        .all()
    )
    shaped = [
        _post_row_dict(
            post,
            user_id=user.id,
            handle=profile.handle if profile else "you",
            name=user.name,
            avatar_url=profile.avatar_url if profile else None,
        )
        for post in rows
    ]
    return {"posts": enrich_posts(db, shaped, user.id)}


@router.post("/me/posts")
def create_post(
    body: CreatePostBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser, Depends(require_user)],
) -> dict[str, Any]:
    profile = db.get(Profile, user.id)
    if not profile or not profile.is_public:
        raise HTTPException(
            status_code=403,
            detail={"error": "Turn on a public profile before sharing a post."},
        )

    media = body.media
    if not media:
        media = [{"type": "image", "url": body.image_url}]
    if not (1 <= len(media) <= 10):
        raise HTTPException(
            status_code=400,
            detail={"error": "Add between 1 and 10 photos or videos."},
        )
    for item in media:
        url = item["url"]
        if url.startswith("data:"):
            raise HTTPException(
                status_code=400,
                detail={"error": "Upload photos and videos with /me/uploads first."},
            )
        if url.startswith("/uploads/") and not is_upload_url(url):
            raise HTTPException(status_code=400, detail={"error": "Invalid media URL."})

    image_url = next(
        (item["url"] for item in media if item["type"] == "image"),
        media[0]["url"],
    )

    post = Post(
        id=new_user_id(),
        user_id=user.id,
        body=body.body,
        image_url=image_url,
        media_json=json.dumps(media),
        route_url=body.route_url,
        route_label=body.route_label,
        activity=body.activity,
        peak_id=body.peak_id,
        peak_name=body.peak_name,
        area_slug=body.area_slug,
        area_name=body.area_name,
        height=body.height,
        hike_id=body.hike_id,
        hike_name=body.hike_name,
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    shaped = [
        _post_row_dict(
            post,
            user_id=user.id,
            handle=profile.handle,
            name=user.name,
            avatar_url=profile.avatar_url,
        )
    ]
    enriched = enrich_posts(db, shaped, user.id)
    return {"post": enriched[0]}


@router.get("/posts/{post_id}")
def get_post(
    post_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    viewer: Annotated[SessionUser | None, Depends(get_optional_user)],
) -> dict[str, Any]:
    row = db.execute(
        select(Post, User, Profile)
        .join(User, Post.user_id == User.id)
        .join(Profile, Profile.user_id == User.id)
        .where(Post.id == post_id)
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail={"error": "Post not found"})

    post, user_row, profile = row
    is_owner = viewer is not None and viewer.id == post.user_id
    if post.is_hidden and not is_owner:
        raise HTTPException(status_code=404, detail={"error": "Post not found"})
    if not profile.is_public and not is_owner:
        raise HTTPException(status_code=404, detail={"error": "Post not found"})

    shaped = [
        _post_row_dict(
            post,
            user_id=user_row.id,
            handle=profile.handle,
            name=user_row.name,
            avatar_url=profile.avatar_url,
        )
    ]
    return {"post": enrich_posts(db, shaped, viewer.id if viewer else None)[0]}


@router.patch("/me/posts/{post_id}")
def update_post(
    post_id: UUID,
    body: UpdatePostBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser, Depends(require_user)],
) -> dict[str, Any]:
    existing = db.get(Post, post_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail={"error": "Post not found"})
    existing.is_hidden = body.hidden
    db.commit()
    db.refresh(existing)

    profile = db.get(Profile, user.id)
    shaped = [
        _post_row_dict(
            existing,
            user_id=user.id,
            handle=profile.handle if profile else "you",
            name=user.name,
            avatar_url=profile.avatar_url if profile else None,
        )
    ]
    return {"post": enrich_posts(db, shaped, user.id)[0]}


@router.delete("/me/posts/{post_id}")
def delete_post(
    post_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser, Depends(require_user)],
) -> dict[str, Any]:
    existing = db.get(Post, post_id)
    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail={"error": "Post not found"})
    db.delete(existing)
    db.commit()
    return {"ok": True}


@router.get("/profiles/{handle}/posts")
def profile_posts(
    handle: str,
    db: Annotated[Session, Depends(get_db)],
    viewer: Annotated[SessionUser | None, Depends(get_optional_user)],
) -> dict[str, Any]:
    handle = handle.strip().lower()
    profile_row = db.execute(
        select(Profile.user_id, Profile.handle, Profile.is_public, User.name)
        .join(User, Profile.user_id == User.id)
        .where(Profile.handle == handle)
    ).first()

    if not profile_row or not profile_row.is_public:
        raise HTTPException(status_code=404, detail={"error": "Profile not found"})

    is_owner = viewer is not None and viewer.id == profile_row.user_id

    query = (
        select(Post, User, Profile)
        .join(User, Post.user_id == User.id)
        .join(Profile, Profile.user_id == User.id)
        .where(Post.user_id == profile_row.user_id)
        .order_by(Post.created_at.desc())
        .limit(40)
    )
    if not is_owner:
        query = query.where(Post.is_hidden.is_(False))

    rows = db.execute(query).all()

    shaped = [
        _post_row_dict(
            post,
            user_id=user_row.id,
            handle=profile.handle,
            name=user_row.name,
            avatar_url=profile.avatar_url,
        )
        for post, user_row, profile in rows
    ]
    return {"posts": enrich_posts(db, shaped, viewer.id if viewer else None)}
