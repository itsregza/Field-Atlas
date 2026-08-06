from __future__ import annotations

from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.auth import get_optional_user, require_user
from app.db import get_db
from app.models import PeakRating
from app.schemas import SessionUser

router = APIRouter(tags=["ratings"])


class PitchBody(BaseModel):
    score: int = Field(ge=1, le=5)


def _summary(
    db: Session, peak_id: str, kind: str, user_id: Any | None
) -> dict[str, Any]:
    rows = (
        db.execute(
            select(PeakRating.score).where(
                PeakRating.peak_id == peak_id,
                PeakRating.kind == kind,
            )
        )
        .scalars()
        .all()
    )
    my_score = None
    if user_id is not None:
        mine = db.execute(
            select(PeakRating.score).where(
                PeakRating.user_id == user_id,
                PeakRating.peak_id == peak_id,
                PeakRating.kind == kind,
            )
        ).scalar_one_or_none()
        my_score = int(mine) if mine is not None else None

    if not rows:
        return {"average": 0, "count": 0, "myScore": my_score}

    average = round(sum(int(score) for score in rows) / len(rows), 1)
    return {"average": average, "count": len(rows), "myScore": my_score}


def _put_rating(
    db: Session,
    peak_id: str,
    kind: str,
    score: int,
    user_id: Any,
) -> dict[str, Any]:
    cleaned = peak_id.strip()
    if not cleaned or len(cleaned) > 80:
        raise HTTPException(status_code=400, detail={"error": "Invalid peak id"})

    existing = db.execute(
        select(PeakRating).where(
            and_(
                PeakRating.user_id == user_id,
                PeakRating.peak_id == cleaned,
                PeakRating.kind == kind,
            )
        )
    ).scalar_one_or_none()

    if existing:
        existing.score = score
    else:
        db.add(
            PeakRating(
                user_id=user_id,
                peak_id=cleaned,
                kind=kind,
                score=score,
            )
        )
    db.commit()
    return _summary(db, cleaned, kind, user_id)


@router.get("/peaks/{peak_id}/pitchability")
def get_pitchability(
    peak_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser | None, Depends(get_optional_user)],
) -> dict[str, Any]:
    return _summary(db, peak_id, "pitch", user.id if user else None)


@router.put("/me/ratings/pitch/{peak_id}")
def put_pitchability(
    peak_id: str,
    body: PitchBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser, Depends(require_user)],
) -> dict[str, Any]:
    return _put_rating(db, peak_id, "pitch", body.score, user.id)


@router.get("/peaks/{peak_id}/rating")
def get_peak_rating(
    peak_id: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser | None, Depends(get_optional_user)],
) -> dict[str, Any]:
    return _summary(db, peak_id, "peak", user.id if user else None)


@router.put("/me/ratings/peak/{peak_id}")
def put_peak_rating(
    peak_id: str,
    body: PitchBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser, Depends(require_user)],
) -> dict[str, Any]:
    return _put_rating(db, peak_id, "peak", body.score, user.id)
