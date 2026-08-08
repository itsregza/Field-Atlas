from __future__ import annotations

from datetime import date
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class SessionUser(BaseModel):
    id: UUID
    email: str
    name: str
    provider: Literal["email", "google"]


class RegisterBody(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    first_name: str = Field(alias="firstName", min_length=1, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=16)
    password: str = Field(min_length=8, max_length=200)

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("username")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        from app.validation import normalize_username, username_is_blocked

        handle = normalize_username(value)
        reason = username_is_blocked(handle)
        if reason:
            raise ValueError(reason)
        return handle

    @field_validator("first_name")
    @classmethod
    def strip_first_name(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("First name is required")
        return stripped

    @field_validator("phone")
    @classmethod
    def normalize_phone(cls, value: str) -> str:
        from app.validation import normalize_uk_phone

        return normalize_uk_phone(value)


class LoginBody(BaseModel):
    # Email or username
    user: str = Field(min_length=1, max_length=200, alias="email")
    password: str = Field(min_length=8, max_length=200)

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("user")
    @classmethod
    def strip_user(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Email or username is required")
        return stripped


class DemoLoginBody(BaseModel):
    provider: Literal["google"] = "google"


class PeakLogBody(BaseModel):
    peak_id: str | None = Field(default=None, alias="peakId", max_length=80)
    done: bool
    date: str = Field(default="", max_length=32)
    notes: str = Field(default="", max_length=500)
    image_url: str | None = Field(default=None, alias="imageUrl", max_length=2_500_000)
    peak_name: str | None = Field(default=None, alias="peakName", max_length=200)
    area_slug: str | None = Field(default=None, alias="areaSlug", max_length=80)
    area_name: str | None = Field(default=None, alias="areaName", max_length=120)
    height: int | None = Field(default=None, ge=0)

    model_config = ConfigDict(populate_by_name=True)


class PutLogsBody(BaseModel):
    logs: dict[str, PeakLogBody]


class ProfileUpdateBody(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    status: str = Field(default="", max_length=160)
    avatar_url: str | None = Field(default=None, alias="avatarUrl", max_length=2_500_000)
    is_public: bool = Field(alias="isPublic")
    share_notes: bool = Field(alias="shareNotes")
    share_photos: bool = Field(alias="sharePhotos")

    model_config = ConfigDict(populate_by_name=True)


class CreatePostBody(BaseModel):
    body: str = Field(min_length=1, max_length=1000)
    image_url: str = Field(alias="imageUrl", min_length=1, max_length=500_000)
    media: list[dict[str, str]] | None = None
    route_url: str | None = Field(default=None, alias="routeUrl", max_length=2000)
    route_label: str | None = Field(default=None, alias="routeLabel", max_length=120)
    activity: str = Field(min_length=1, max_length=20)
    peak_id: str | None = Field(default=None, alias="peakId", max_length=80)
    peak_name: str | None = Field(default=None, alias="peakName", max_length=200)
    area_slug: str | None = Field(default=None, alias="areaSlug", max_length=80)
    area_name: str | None = Field(default=None, alias="areaName", max_length=120)
    height: int | None = Field(default=None, ge=0)
    hike_id: str | None = Field(default=None, alias="hikeId", max_length=80)
    hike_name: str | None = Field(default=None, alias="hikeName", max_length=200)

    model_config = ConfigDict(populate_by_name=True)

    @field_validator("body")
    @classmethod
    def strip_body(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("body must not be empty")
        return stripped

    @field_validator("activity")
    @classmethod
    def validate_activity(cls, value: str) -> str:
        cleaned = value.strip().lower()
        if cleaned not in {"hiking", "camping"}:
            raise ValueError("activity must be hiking or camping")
        return cleaned

    @field_validator("media")
    @classmethod
    def validate_media(cls, value: list[dict[str, str]] | None) -> list[dict[str, str]] | None:
        if value is None:
            return value
        if not (1 <= len(value) <= 10):
            raise ValueError("Add between 1 and 10 photos or videos.")
        cleaned: list[dict[str, str]] = []
        for item in value:
            kind = str(item.get("type") or "").strip().lower()
            url = str(item.get("url") or "").strip()
            if kind not in {"image", "video"} or not url:
                raise ValueError("Each media item needs a type and url.")
            cleaned.append({"type": kind, "url": url})
        return cleaned


class UpdatePostBody(BaseModel):
    hidden: bool


class CreateCommentBody(BaseModel):
    body: str = Field(min_length=1, max_length=500)

    @field_validator("body")
    @classmethod
    def strip_body(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("body must not be empty")
        return stripped


def parse_completed_on(value: str) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value)
