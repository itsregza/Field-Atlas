from __future__ import annotations

import uuid
from datetime import UTC
from typing import Annotated, Any

from fastapi import APIRouter, Cookie, Depends, HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.auth import SESSION_COOKIE, load_session_user
from app.config import get_settings
from app.db import get_db
from app.models import Post, PostComment, PostLike, Profile, User
from app.schemas import SessionUser


def _not_found() -> HTTPException:
    return HTTPException(status_code=404, detail={"error": "Not found"})


def require_ops_owner(
    db: Annotated[Session, Depends(get_db)],
    fa_session: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> SessionUser:
    settings = get_settings()
    if not settings.ops_path or not settings.owner_emails:
        raise _not_found()

    user = load_session_user(db, fa_session)
    if user is None or user.email.lower() not in settings.owner_emails:
        raise _not_found()
    return user


def build_ops_router() -> APIRouter | None:
    settings = get_settings()
    path = settings.ops_path
    if not path or not settings.owner_emails:
        return None

    router = APIRouter(prefix=f"/{path}")

    @router.get("/summary")
    def summary(
        _owner: Annotated[SessionUser, Depends(require_ops_owner)],
        db: Annotated[Session, Depends(get_db)],
    ) -> dict[str, Any]:
        users = db.scalar(select(func.count()).select_from(User)) or 0
        posts = db.scalar(select(func.count()).select_from(Post)) or 0
        likes = db.scalar(select(func.count()).select_from(PostLike)) or 0
        comments = db.scalar(select(func.count()).select_from(PostComment)) or 0
        public_profiles = (
            db.scalar(
                select(func.count()).select_from(Profile).where(Profile.is_public.is_(True))
            )
            or 0
        )
        return {
            "users": int(users),
            "posts": int(posts),
            "likes": int(likes),
            "comments": int(comments),
            "publicProfiles": int(public_profiles),
        }

    @router.get("/users")
    def list_users(
        _owner: Annotated[SessionUser, Depends(require_ops_owner)],
        db: Annotated[Session, Depends(get_db)],
    ) -> dict[str, Any]:
        rows = db.execute(
            select(User, Profile)
            .outerjoin(Profile, Profile.user_id == User.id)
            .order_by(User.created_at.desc())
            .limit(500)
        ).all()

        users: list[dict[str, Any]] = []
        for user, profile in rows:
            created = user.created_at
            if created and created.tzinfo is None:
                created = created.replace(tzinfo=UTC)
            users.append(
                {
                    "id": str(user.id),
                    "email": user.email,
                    "name": user.name,
                    "handle": profile.handle if profile else None,
                    "isPublic": bool(profile.is_public) if profile else False,
                    "createdAt": created.isoformat() if created else None,
                }
            )
        return {"users": users}

    @router.get("/posts")
    def list_posts(
        _owner: Annotated[SessionUser, Depends(require_ops_owner)],
        db: Annotated[Session, Depends(get_db)],
    ) -> dict[str, Any]:
        rows = db.execute(
            select(Post, User, Profile)
            .join(User, Post.user_id == User.id)
            .outerjoin(Profile, Profile.user_id == User.id)
            .order_by(Post.created_at.desc())
            .limit(200)
        ).all()

        posts: list[dict[str, Any]] = []
        for post, user, profile in rows:
            created = post.created_at
            if created and created.tzinfo is None:
                created = created.replace(tzinfo=UTC)
            posts.append(
                {
                    "id": str(post.id),
                    "body": post.body,
                    "imageUrl": post.image_url,
                    "peakName": post.peak_name,
                    "authorName": user.name,
                    "authorHandle": profile.handle if profile else None,
                    "authorEmail": user.email,
                    "createdAt": created.isoformat() if created else None,
                }
            )
        return {"posts": posts}

    @router.delete("/posts/{post_id}")
    def delete_post(
        post_id: uuid.UUID,
        _owner: Annotated[SessionUser, Depends(require_ops_owner)],
        db: Annotated[Session, Depends(get_db)],
    ) -> dict[str, Any]:
        existing = db.get(Post, post_id)
        if not existing:
            raise _not_found()

        db.execute(delete(PostLike).where(PostLike.post_id == post_id))
        db.execute(delete(PostComment).where(PostComment.post_id == post_id))
        db.delete(existing)
        db.commit()
        return {"ok": True}

    return router
