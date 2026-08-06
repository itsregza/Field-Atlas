from __future__ import annotations

from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.auth import new_user_id, require_user
from app.db import get_db
from app.models import Follow, Post, PostComment, PostLike, Profile, User
from app.schemas import CreateCommentBody, SessionUser

router = APIRouter(tags=["social"])


def map_post_base(row: dict[str, Any]) -> dict[str, Any]:
    media = row.get("media") or []
    if not media and row.get("image_url"):
        media = [{"type": "image", "url": row["image_url"]}]
    return {
        "id": str(row["id"]),
        "body": row["body"],
        "imageUrl": row["image_url"],
        "media": media,
        "routeUrl": row.get("route_url") or None,
        "routeLabel": row.get("route_label") or None,
        "activity": row.get("activity") or None,
        "peakId": row["peak_id"] or None,
        "peakName": row["peak_name"] or None,
        "areaSlug": row["area_slug"] or None,
        "areaName": row["area_name"] or None,
        "height": row["height"] if row["height"] is not None else None,
        "hikeId": row["hike_id"] or None,
        "hikeName": row["hike_name"] or None,
        "createdAt": row["created_at"].isoformat(),
        "author": {
            "userId": str(row["user_id"]),
            "handle": row["handle"],
            "name": row["name"],
            "avatarUrl": row.get("avatar_url") or None,
        },
        "likeCount": 0,
        "likedByMe": False,
        "commentCount": 0,
    }


def enrich_posts(
    db: Session,
    rows: list[dict[str, Any]],
    viewer_id: UUID | None,
) -> list[dict[str, Any]]:
    mapped = [map_post_base(row) for row in rows]
    if not rows:
        return mapped

    ids = [row["id"] for row in rows]

    like_rows = db.execute(
        select(PostLike.post_id, func.count().label("total"))
        .where(PostLike.post_id.in_(ids))
        .group_by(PostLike.post_id)
    ).all()
    comment_rows = db.execute(
        select(PostComment.post_id, func.count().label("total"))
        .where(PostComment.post_id.in_(ids))
        .group_by(PostComment.post_id)
    ).all()

    liked_mine: list[UUID] = []
    if viewer_id is not None:
        liked_mine = list(
            db.execute(
                select(PostLike.post_id).where(
                    and_(PostLike.user_id == viewer_id, PostLike.post_id.in_(ids))
                )
            )
            .scalars()
            .all()
        )

    like_map = {row.post_id: int(row.total) for row in like_rows}
    comment_map = {row.post_id: int(row.total) for row in comment_rows}
    liked_set = set(liked_mine)

    result = []
    for post in mapped:
        post_id = UUID(post["id"])
        cleaned = {k: v for k, v in post.items() if v is not None}
        cleaned["likeCount"] = like_map.get(post_id, 0)
        cleaned["likedByMe"] = post_id in liked_set
        cleaned["commentCount"] = comment_map.get(post_id, 0)
        # Keep required keys even if None-stripped
        for key in ("id", "body", "imageUrl", "createdAt", "author"):
            cleaned[key] = post[key]
        result.append(cleaned)
    return result


@router.post("/posts/{post_id}/like")
def like_post(
    post_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser, Depends(require_user)],
) -> dict[str, Any]:
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail={"error": "Post not found"})

    stmt = insert(PostLike).values(user_id=user.id, post_id=post_id).on_conflict_do_nothing()
    db.execute(stmt)
    db.commit()

    total = db.execute(
        select(func.count()).select_from(PostLike).where(PostLike.post_id == post_id)
    ).scalar_one()
    return {"liked": True, "likeCount": int(total)}


@router.delete("/posts/{post_id}/like")
def unlike_post(
    post_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser, Depends(require_user)],
) -> dict[str, Any]:
    row = db.execute(
        select(PostLike).where(and_(PostLike.post_id == post_id, PostLike.user_id == user.id))
    ).scalar_one_or_none()
    if row:
        db.delete(row)
        db.commit()

    total = db.execute(
        select(func.count()).select_from(PostLike).where(PostLike.post_id == post_id)
    ).scalar_one()
    return {"liked": False, "likeCount": int(total)}


@router.get("/posts/{post_id}/comments")
def list_comments(
    post_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser, Depends(require_user)],
) -> dict[str, Any]:
    _ = user
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail={"error": "Post not found"})

    rows = db.execute(
        select(PostComment, User, Profile)
        .join(User, PostComment.user_id == User.id)
        .join(Profile, Profile.user_id == User.id)
        .where(PostComment.post_id == post_id)
        .order_by(PostComment.created_at.asc())
        .limit(100)
    ).all()

    return {
        "comments": [
            {
                "id": str(comment.id),
                "postId": str(comment.post_id),
                "body": comment.body,
                "createdAt": comment.created_at.isoformat(),
                "author": {
                    "userId": str(user_row.id),
                    "handle": profile.handle,
                    "name": user_row.name,
                    "avatarUrl": profile.avatar_url,
                },
            }
            for comment, user_row, profile in rows
        ]
    }


@router.post("/posts/{post_id}/comments")
def create_comment(
    post_id: UUID,
    body: CreateCommentBody,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser, Depends(require_user)],
) -> dict[str, Any]:
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail={"error": "Post not found"})

    profile = db.get(Profile, user.id)
    if not profile or not profile.is_public:
        raise HTTPException(
            status_code=403,
            detail={"error": "Turn on a public profile before commenting."},
        )

    comment = PostComment(
        id=new_user_id(),
        post_id=post_id,
        user_id=user.id,
        body=body.body,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    total = db.execute(
        select(func.count()).select_from(PostComment).where(PostComment.post_id == post_id)
    ).scalar_one()

    return {
        "comment": {
            "id": str(comment.id),
            "postId": str(comment.post_id),
            "body": comment.body,
            "createdAt": comment.created_at.isoformat(),
            "author": {
                "userId": str(user.id),
                "handle": profile.handle,
                "name": user.name,
                "avatarUrl": profile.avatar_url,
            },
        },
        "commentCount": int(total),
    }


@router.delete("/posts/{post_id}/comments/{comment_id}")
def delete_comment(
    post_id: UUID,
    comment_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser, Depends(require_user)],
) -> dict[str, Any]:
    existing = db.execute(
        select(PostComment).where(
            and_(PostComment.id == comment_id, PostComment.post_id == post_id)
        )
    ).scalar_one_or_none()

    if not existing or existing.user_id != user.id:
        raise HTTPException(status_code=404, detail={"error": "Comment not found"})

    db.delete(existing)
    db.commit()

    total = db.execute(
        select(func.count()).select_from(PostComment).where(PostComment.post_id == post_id)
    ).scalar_one()
    return {"ok": True, "commentCount": int(total)}


@router.post("/profiles/{handle}/follow")
def follow_profile(
    handle: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser, Depends(require_user)],
) -> dict[str, Any]:
    handle = handle.strip().lower()
    target = db.execute(
        select(Profile.user_id, Profile.is_public).where(Profile.handle == handle)
    ).first()

    if not target or not target.is_public:
        raise HTTPException(status_code=404, detail={"error": "Profile not found"})
    if target.user_id == user.id:
        raise HTTPException(status_code=400, detail={"error": "You cannot follow yourself"})

    stmt = (
        insert(Follow)
        .values(follower_id=user.id, following_id=target.user_id)
        .on_conflict_do_nothing()
    )
    db.execute(stmt)
    db.commit()

    total = db.execute(
        select(func.count()).select_from(Follow).where(Follow.following_id == target.user_id)
    ).scalar_one()
    return {"following": True, "followerCount": int(total)}


@router.delete("/profiles/{handle}/follow")
def unfollow_profile(
    handle: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[SessionUser, Depends(require_user)],
) -> dict[str, Any]:
    handle = handle.strip().lower()
    target = db.execute(
        select(Profile.user_id).where(Profile.handle == handle)
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail={"error": "Profile not found"})

    row = db.execute(
        select(Follow).where(
            and_(Follow.follower_id == user.id, Follow.following_id == target.user_id)
        )
    ).scalar_one_or_none()
    if row:
        db.delete(row)
        db.commit()

    total = db.execute(
        select(func.count()).select_from(Follow).where(Follow.following_id == target.user_id)
    ).scalar_one()
    return {"following": False, "followerCount": int(total)}
