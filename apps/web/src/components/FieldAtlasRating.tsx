import { useState } from 'react'
import {
  getRatingSummary,
  setMyRating,
  type RatingEntityType,
  type RatingSummary,
} from '../data/ratings'
import { loadUser } from '../data/auth'
import { useAuthModal } from './AuthModal'

type FieldAtlasRatingProps = {
  entityType: RatingEntityType
  entityId: string
  /** Allow the signed-in user to set a score (after complete, etc.). */
  canRate?: boolean
  returnTo?: string
  compact?: boolean
}

function Stars({
  value,
  interactive,
  onPick,
}: {
  value: number
  interactive?: boolean
  onPick?: (score: number) => void
}) {
  return (
    <span
      className={`fa-rating__stars ${interactive ? 'is-interactive' : ''}`}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={`${value} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((score) => {
        const filled = score <= Math.round(value)
        if (!interactive || !onPick) {
          return (
            <span
              key={score}
              className={`fa-rating__star ${filled ? 'is-on' : ''}`}
              aria-hidden="true"
            >
              ★
            </span>
          )
        }
        return (
          <button
            key={score}
            type="button"
            className={`fa-rating__star ${filled ? 'is-on' : ''}`}
            aria-label={`Rate ${score} out of 5`}
            onClick={() => onPick(score)}
          >
            ★
          </button>
        )
      })}
    </span>
  )
}

export function FieldAtlasRating({
  entityType,
  entityId,
  canRate = false,
  returnTo = typeof window !== 'undefined'
    ? window.location.pathname + window.location.search
    : '/account',
  compact = false,
}: FieldAtlasRatingProps) {
  const user = loadUser()
  const { openAuth } = useAuthModal()
  const [summary, setSummary] = useState<RatingSummary>(() =>
    getRatingSummary(entityType, entityId),
  )

  const rate = (score: number) => {
    if (!user) {
      openAuth('login', returnTo)
      return
    }
    setSummary(setMyRating(entityType, entityId, score))
  }

  return (
    <div className={`fa-rating ${compact ? 'is-compact' : ''}`}>
      <div className="fa-rating__row">
        <span className="fa-rating__label">Field Atlas rating</span>
        <Stars value={summary.average} />
        <strong className="fa-rating__avg">{summary.average.toFixed(1)}</strong>
        <span className="fa-rating__count">/5 · {summary.count} ratings</span>
      </div>
      {canRate ? (
        <div className="fa-rating__mine">
          <span>{user ? 'Your rating' : 'Sign in to rate'}</span>
          <Stars
            value={summary.myScore ?? 0}
            interactive={Boolean(user)}
            onPick={rate}
          />
          {!user ? (
            <button
              className="text-link"
              type="button"
              onClick={() => openAuth('login', returnTo)}
            >
              Log in →
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
