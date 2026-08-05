from __future__ import annotations

import re
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi import Cookie, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models import Profile, Session as DbSession, User
from app.schemas import SessionUser

SESSION_COOKIE = "fa_session"
SESSION_DAYS = 30
password_hasher = PasswordHasher()


def new_user_id() -> uuid.UUID:
    return uuid.uuid4()


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return password_hasher.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def slugify_handle(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.strip().lower())
    slug = re.sub(r"^-+|-+$", "", slug)
    return slug[:32]


def create_session(db: Session, user_id: uuid.UUID, response: Response) -> None:
    settings = get_settings()
    token = secrets.token_hex(32)
    expires_at = datetime.now(UTC) + timedelta(days=SESSION_DAYS)
    db.add(DbSession(id=token, user_id=user_id, expires_at=expires_at))
    db.commit()
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        path="/",
        httponly=True,
        samesite="lax",
        secure=settings.is_production,
        max_age=SESSION_DAYS * 24 * 60 * 60,
    )


def destroy_session(
    db: Session,
    response: Response,
    token: str | None,
) -> None:
    if token:
        row = db.get(DbSession, token)
        if row:
            db.delete(row)
            db.commit()
    response.delete_cookie(SESSION_COOKIE, path="/")


def load_session_user(
    db: Session,
    token: str | None,
) -> SessionUser | None:
    if not token:
        return None

    row = db.execute(
        select(User, DbSession.expires_at)
        .join(DbSession, DbSession.user_id == User.id)
        .where(DbSession.id == token)
    ).first()
    if not row:
        return None

    user, expires_at = row
    expires = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=UTC)
    if expires < datetime.now(UTC):
        session_row = db.get(DbSession, token)
        if session_row:
            db.delete(session_row)
            db.commit()
        return None

    return SessionUser(
        id=user.id,
        email=user.email,
        name=user.name,
        provider="google" if user.provider == "google" else "email",
    )


def ensure_profile(
    db: Session,
    user_id: uuid.UUID,
    name: str,
    email: str,
    preferred_handle: str | None = None,
) -> Profile:
    existing = db.get(Profile, user_id)
    if existing:
        return existing

    handle = (
        slugify_handle(preferred_handle or "")
        or slugify_handle(name)
        or slugify_handle(email.split("@")[0] or "walker")
    )
    if len(handle) < 3:
        handle = f"walker-{str(user_id)[:6]}"

    clash = db.execute(select(Profile).where(Profile.handle == handle)).scalar_one_or_none()
    if clash:
        handle = f"{handle}-{str(user_id)[:4]}"

    profile = Profile(
        user_id=user_id,
        handle=handle,
        status="",
        is_public=False,
        share_notes=True,
        share_photos=True,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def handle_available(db: Session, handle: str) -> bool:
    normalized = slugify_handle(handle)
    if len(normalized) < 3:
        return False
    clash = db.execute(
        select(Profile).where(Profile.handle == normalized)
    ).scalar_one_or_none()
    return clash is None


def find_user_by_login(db: Session, login: str) -> User | None:
    value = login.strip().lower()
    if "@" in value:
        return db.execute(select(User).where(User.email == value)).scalar_one_or_none()

    handle = slugify_handle(value)
    row = db.execute(
        select(User)
        .join(Profile, Profile.user_id == User.id)
        .where(Profile.handle == handle)
    ).scalar_one_or_none()
    return row


def get_optional_user(
    db: Annotated[Session, Depends(get_db)],
    fa_session: Annotated[str | None, Cookie(alias=SESSION_COOKIE)] = None,
) -> SessionUser | None:
    return load_session_user(db, fa_session)


def require_user(
    user: Annotated[SessionUser | None, Depends(get_optional_user)],
) -> SessionUser:
    if user is None:
        raise HTTPException(status_code=401, detail={"error": "Sign in required"})
    return user
