import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  apiCreateComment,
  apiDeleteComment,
  apiEnabled,
  apiGetComments,
  apiLikePost,
  apiUnlikePost,
  type ApiFeedPost,
  type ApiPostComment,
} from '../data/api'
import { loadUser } from '../data/auth'
import { formatProfileDate } from '../data/profiles'
import { PostActivityBadge, isPostActivity } from './PostActivity'

function formatWhen(iso: string) {
  const day = iso.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return formatProfileDate(day)
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return day
  }
}

function postMedia(post: ApiFeedPost) {
  if (post.media?.length) return post.media
  return post.imageUrl ? [{ type: 'image' as const, url: post.imageUrl }] : []
}

export function FeedPostCard({
  post: initial,
  compact = false,
  expandComments = false,
}: {
  post: ApiFeedPost
  compact?: boolean
  expandComments?: boolean
}) {
  const user = loadUser()
  const [post, setPost] = useState<ApiFeedPost>(initial)
  const media = useMemo(() => postMedia(post), [post])
  const [slide, setSlide] = useState(0)
  const [commentsOpen, setCommentsOpen] = useState(expandComments)
  const [commentsExpanded, setCommentsExpanded] = useState(expandComments)
  const [comments, setComments] = useState<ApiPostComment[]>([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setPost(initial)
    setSlide(0)
  }, [initial.id, initial.likeCount, initial.likedByMe, initial.commentCount])

  useEffect(() => {
    if (!expandComments || !apiEnabled()) return
    setCommentsLoading(true)
    void apiGetComments(post.id)
      .then((result) => setComments(result.comments))
      .catch(() => undefined)
      .finally(() => setCommentsLoading(false))
  }, [expandComments, post.id])

  const loadComments = () => {
    if (!apiEnabled() || comments.length) return
    setCommentsLoading(true)
    void apiGetComments(post.id)
      .then((result) => setComments(result.comments))
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : 'Could not load comments.',
        )
      })
      .finally(() => setCommentsLoading(false))
  }

  const toggleLike = () => {
    if (!user || !apiEnabled() || busy) return
    setBusy(true)
    setError('')
    const action = post.likedByMe ? apiUnlikePost(post.id) : apiLikePost(post.id)
    void action
      .then((result) => {
        setPost((current) => ({
          ...current,
          likedByMe: result.liked,
          likeCount: result.likeCount,
        }))
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not update like.')
      })
      .finally(() => setBusy(false))
  }

  const openComments = () => {
    const next = !commentsOpen
    setCommentsOpen(next)
    if (next) loadComments()
  }

  const viewAllComments = () => {
    setCommentsOpen(true)
    setCommentsExpanded(true)
    loadComments()
  }

  const submitComment = (event: FormEvent) => {
    event.preventDefault()
    const body = draft.trim()
    if (!body || !user || busy) return
    setBusy(true)
    setError('')
    void apiCreateComment(post.id, { body })
      .then((result) => {
        setComments((current) => [...current, result.comment])
        setPost((current) => ({
          ...current,
          commentCount: result.commentCount,
        }))
        setDraft('')
        setCommentsOpen(true)
        setCommentsExpanded(true)
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : 'Could not post comment.',
        )
      })
      .finally(() => setBusy(false))
  }

  const removeComment = (commentId: string) => {
    if (busy) return
    setBusy(true)
    void apiDeleteComment(post.id, commentId)
      .then((result) => {
        setComments((current) =>
          current.filter((comment) => comment.id !== commentId),
        )
        setPost((current) => ({
          ...current,
          commentCount: result.commentCount,
        }))
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : 'Could not delete comment.',
        )
      })
      .finally(() => setBusy(false))
  }

  const authorInitial = (post.author.name || post.author.handle || '?')
    .trim()
    .charAt(0)
    .toUpperCase()
  const visibleComments = commentsExpanded ? comments : comments.slice(0, 3)
  const current = media[slide] ?? media[0]

  return (
    <article className={`feed-card ${compact ? 'is-compact' : ''}`}>
      <header className="feed-card__header">
        <a className="feed-card__author" href={`/u/${post.author.handle}`}>
          <span className="feed-card__avatar" aria-hidden="true">
            {post.author.avatarUrl ? (
              <img src={post.author.avatarUrl} alt="" />
            ) : (
              authorInitial
            )}
          </span>
          <span>
            <strong>{post.author.name}</strong>
            <span>@{post.author.handle}</span>
          </span>
        </a>
        <div className="feed-card__header-meta">
          {isPostActivity(post.activity) ? (
            <PostActivityBadge activity={post.activity} />
          ) : null}
          <time dateTime={post.createdAt}>{formatWhen(post.createdAt)}</time>
        </div>
      </header>

      <figure className="feed-card__photo">
        {current ? (
          current.type === 'video' ? (
            <video src={current.url} controls playsInline />
          ) : (
            <a href={`/posts/${post.id}`}>
              <img
                src={current.url}
                alt={
                  post.peakName
                    ? `Shared photograph from ${post.peakName}`
                    : 'Shared photograph'
                }
              />
            </a>
          )
        ) : null}
        {media.length > 1 ? (
          <>
            <button
              type="button"
              className="feed-card__nav is-prev"
              aria-label="Previous media"
              onClick={() =>
                setSlide((value) => (value - 1 + media.length) % media.length)
              }
            >
              ‹
            </button>
            <button
              type="button"
              className="feed-card__nav is-next"
              aria-label="Next media"
              onClick={() => setSlide((value) => (value + 1) % media.length)}
            >
              ›
            </button>
            <div className="feed-card__dots" aria-hidden="true">
              {media.map((item, index) => (
                <button
                  key={`${item.url}-${index}`}
                  type="button"
                  className={index === slide ? 'is-active' : ''}
                  onClick={() => setSlide(index)}
                />
              ))}
            </div>
          </>
        ) : null}
      </figure>

      <div className="feed-card__body">
        {(post.peakName || post.hikeName) && (
          <h2>
            <a className="feed-card__title-link" href={`/posts/${post.id}`}>
              {post.peakName || post.hikeName}
              {post.height ? <span> · {post.height} m</span> : null}
            </a>
          </h2>
        )}
        {post.areaName ? (
          <p className="feed-card__meta">{post.areaName}</p>
        ) : null}
        {post.routeUrl ? (
          <p className="feed-card__meta">
            <a href={post.routeUrl} target="_blank" rel="noreferrer">
              {post.routeLabel || 'Route link'}
            </a>
          </p>
        ) : null}
        {post.body ? <p className="feed-card__caption">{post.body}</p> : null}

        <div className="feed-card__actions">
          <button
            type="button"
            className={`feed-like ${post.likedByMe ? 'is-active' : ''}`}
            disabled={!user || busy}
            aria-pressed={post.likedByMe}
            onClick={toggleLike}
          >
            <span aria-hidden="true">🥾</span>
            <strong>{post.likedByMe ? 'Liked' : 'Like'}</strong>
            <span>{post.likeCount}</span>
          </button>
          <button
            type="button"
            className={`feed-action ${commentsOpen ? 'is-active' : ''}`}
            onClick={openComments}
          >
            Comments · {post.commentCount}
          </button>
          {post.areaSlug ? (
            <a className="text-link" href={`/checklists/${post.areaSlug}`}>
              Checklist →
            </a>
          ) : null}
        </div>

        {error ? <p className="feed-card__error">{error}</p> : null}

        {commentsOpen || post.commentCount > 0 ? (
          <div className="feed-comments">
            {!commentsOpen && post.commentCount > 0 ? (
              <button
                type="button"
                className="feed-comments__more"
                onClick={viewAllComments}
              >
                View comments ({post.commentCount})
              </button>
            ) : null}

            {commentsOpen ? (
              <>
                {commentsLoading ? (
                  <p className="feed-comments__empty">Loading comments…</p>
                ) : comments.length === 0 ? (
                  <p className="feed-comments__empty">No comments yet.</p>
                ) : (
                  <ul>
                    {visibleComments.map((comment) => (
                      <li key={comment.id}>
                        <a href={`/u/${comment.author.handle}`}>
                          @{comment.author.handle}
                        </a>
                        <span>{comment.body}</span>
                        {user?.id === comment.author.userId ? (
                          <button
                            type="button"
                            className="feed-comments__delete"
                            onClick={() => removeComment(comment.id)}
                          >
                            Delete
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}

                {!commentsExpanded && comments.length > 3 ? (
                  <button
                    type="button"
                    className="feed-comments__more"
                    onClick={() => setCommentsExpanded(true)}
                  >
                    View all {comments.length} comments
                  </button>
                ) : null}

                {user ? (
                  <form className="feed-comments__form" onSubmit={submitComment}>
                    <label>
                      <span className="sr-only">Add a comment</span>
                      <input
                        type="text"
                        value={draft}
                        maxLength={500}
                        placeholder="Add a comment…"
                        disabled={busy}
                        onChange={(event) => setDraft(event.target.value)}
                      />
                    </label>
                    <button
                      type="submit"
                      className="settings-btn"
                      disabled={busy || !draft.trim()}
                    >
                      Post
                    </button>
                  </form>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}
