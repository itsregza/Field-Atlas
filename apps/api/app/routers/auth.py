from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Cookie, Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import (
    SESSION_COOKIE,
    create_session,
    destroy_session,
    ensure_profile,
    find_user_by_login,
    get_optional_user,
    handle_available,
    hash_password,
    new_user_id,
    verify_password,
)
from app.db import get_db
from app.models import User
from app.schemas import DemoLoginBody, LoginBody, RegisterBody, SessionUser
from app.validation import normalize_username, username_is_blocked

router = APIRouter(tags=["auth"])


def _profile_payload(profile: Any, name: str) -> dict[str, Any]:
    return {
        "handle": profile.handle,
        "status": profile.status,
        "avatarUrl": profile.avatar_url,
        "isPublic": profile.is_public,
        "shareNotes": profile.share_notes,
        "sharePhotos": profile.share_photos,
        "name": name,
    }


@router.get("/auth/me")
def auth_me(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser | None, Depends(get_optional_user)],
) -> dict[str, Any]:
    if not user:
        return {"user": None}
    profile = ensure_profile(db, user.id, user.name, user.email)
    return {"user": user.model_dump(mode="json"), "profile": _profile_payload(profile, user.name)}


@router.get("/auth/username-available")
def username_available(
    db: Annotated[Session, Depends(get_db)],
    username: Annotated[str, Query(min_length=1, max_length=32)],
) -> dict[str, Any]:
    handle = normalize_username(username)
    blocked = username_is_blocked(handle)
    if blocked:
        return {
            "username": handle,
            "available": False,
            "reason": blocked,
        }
    available = handle_available(db, handle)
    return {
        "username": handle,
        "available": available,
        "reason": None if available else "That username is taken",
    }


@router.post("/auth/register")
def register(
    body: RegisterBody,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, Any]:
    email = str(body.email).lower()
    existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail={"error": "An account with that email exists"})

    if not handle_available(db, body.username):
        raise HTTPException(status_code=409, detail={"error": "That username is taken"})

    user = User(
        id=new_user_id(),
        email=email,
        name=body.first_name.strip(),
        phone=body.phone,
        password_hash=hash_password(body.password),
        provider="email",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    ensure_profile(db, user.id, user.name, user.email, preferred_handle=body.username)
    create_session(db, user.id, response)

    return {
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "provider": "email",
        }
    }


@router.post("/auth/login")
def login(
    body: LoginBody,
    response: Response,
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, Any]:
    user = find_user_by_login(db, body.user)

    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail={"error": "Invalid username/email or password"})
    if not verify_password(user.password_hash, body.password):
        raise HTTPException(status_code=401, detail={"error": "Invalid username/email or password"})

    ensure_profile(db, user.id, user.name, user.email)
    create_session(db, user.id, response)

    return {
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "provider": "google" if user.provider == "google" else "email",
        }
    }


@router.post("/auth/demo-google")
def demo_google(
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    body: DemoLoginBody | None = None,
) -> dict[str, Any]:
    _ = body or DemoLoginBody()
    email = "walker@example.com"
    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if not user:
        user = User(
            id=new_user_id(),
            email=email,
            name="Demo Walker",
            provider="google",
            google_id="demo-google",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    ensure_profile(db, user.id, user.name, user.email)
    create_session(db, user.id, response)

    return {
        "user": {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "provider": "google",
        }
    }


@router.post("/auth/logout")
def logout(
    response: Response,
    db: Annotated[Session, Depends(get_db)],
    fa_session: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> dict[str, Any]:
    destroy_session(db, response, fa_session)
    return {"ok": True}
