import { useEffect, useState, type ChangeEvent } from 'react'
import { formatPeakLists, type TrackedPeak } from '../data/areaPeaks'
import type { PeakLog } from '../data/logs'
import {
  getPitchability,
  setPitchability,
  type RatingSummary,
} from '../data/ratings'
import { PeakWeather } from './PeakWeather'
import { useAuthModal } from './AuthModal'

type PeakDetailsProps = {
  peak: TrackedPeak
  log: PeakLog
  imageError: string
  onChange: (changes: Partial<PeakLog>) => void
  onImage: (file: File) => void
  onClose: () => void
  readOnly?: boolean
  returnTo?: string
}

function PitchStars({
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
            aria-label={`Rate pitchability ${score} out of 5`}
            onClick={() => onPick(score)}
          >
            ★
          </button>
        )
      })}
    </span>
  )
}

export function PeakDetails({
  peak,
  log,
  imageError,
  onChange,
  onImage,
  onClose,
  readOnly = false,
  returnTo = typeof window !== 'undefined'
    ? window.location.pathname + window.location.search
    : '/account',
}: PeakDetailsProps) {
  const { openAuth } = useAuthModal()
  const [pitch, setPitch] = useState<RatingSummary>(() =>
    getPitchability(peak.id),
  )
  const [awaitingPitch, setAwaitingPitch] = useState(false)

  useEffect(() => {
    setPitch(getPitchability(peak.id))
    setAwaitingPitch(false)
  }, [peak.id])

  const applyPitch = (score: number) => {
    const next = setPitchability(peak.id, score)
    setPitch(next)
    return next
  }

  const toggleDone = () => {
    if (peak.done) {
      setAwaitingPitch(false)
      onChange({ done: false })
      return
    }
    if (pitch.myScore != null) {
      setAwaitingPitch(false)
      onChange({ done: true })
      return
    }
    setAwaitingPitch(true)
  }

  const confirmPitchAndComplete = (score: number) => {
    applyPitch(score)
    setAwaitingPitch(false)
    onChange({ done: true })
  }

  const pickImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onImage(file)
    event.target.value = ''
  }

  return (
    <article className="peak-card" aria-live="polite">
      <div className="peak-card__heading">
        <div>
          <span className="eyebrow">
            {peak.gridRef} · {formatPeakLists(peak.lists)}
          </span>
          <h2>{peak.name}</h2>
        </div>
        <button
          className="close-details"
          type="button"
          aria-label="Close summit details"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <dl>
        <div>
          <dt>Summit</dt>
          <dd>{peak.height} m</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{peak.done ? 'Completed' : 'Still to climb'}</dd>
        </div>
        <div>
          <dt>Pitchability</dt>
          <dd>
            {pitch.count > 0
              ? `${pitch.average.toFixed(1)} / 5 · ${pitch.count} rating${
                  pitch.count === 1 ? '' : 's'
                }`
              : 'Not assessed'}
          </dd>
        </div>
      </dl>

      <PeakWeather
        name={peak.name}
        coords={peak.coords}
        elevation={peak.height}
        peakId={peak.id}
        compact
      />

      {readOnly ? (
        <div className="peak-login-gate">
          <strong>Want to mark this summit complete?</strong>
          <span>Sign in to save progress, notes and photographs.</span>
          <button type="button" onClick={() => openAuth('login', returnTo)}>
            Log in to Field Atlas →
          </button>
        </div>
      ) : (
        <>
          {awaitingPitch ? (
            <div className="pitch-rate" role="group" aria-labelledby="pitch-rate-title">
              <strong id="pitch-rate-title">How pitchable is this peak?</strong>
              <p>Rate the summit ground for an overnight pitch before you tick it off.</p>
              <PitchStars
                value={pitch.myScore ?? 0}
                interactive
                onPick={confirmPitchAndComplete}
              />
              <button
                type="button"
                className="account-text-link"
                onClick={() => setAwaitingPitch(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              className={`complete-button ${peak.done ? 'is-done' : ''}`}
              type="button"
              onClick={toggleDone}
            >
              {peak.done ? 'Mark as not completed' : 'Mark as completed'}
            </button>
          )}

          {peak.done ? (
            <div className="pitch-rate pitch-rate--done">
              <span>Your pitchability rating</span>
              <PitchStars
                value={pitch.myScore ?? 0}
                interactive
                onPick={(score) => {
                  applyPitch(score)
                }}
              />
            </div>
          ) : null}

          <div className="completion-form">
            <label>
              Notes
              <textarea
                value={log.notes}
                maxLength={500}
                rows={3}
                placeholder="Weather, route or a memory from the day…"
                onChange={(event) => onChange({ notes: event.target.value })}
              />
            </label>

            {log.image && (
              <div className="completion-photo">
                <img src={log.image} alt={`Your completion of ${peak.name}`} />
                <button
                  type="button"
                  onClick={() => onChange({ image: undefined })}
                >
                  Remove photo
                </button>
              </div>
            )}

            <label className="photo-button">
              {log.image ? 'Replace photo' : 'Add completion photo'}
              <input type="file" accept="image/*" onChange={pickImage} />
            </label>
            {imageError && <p className="image-error">{imageError}</p>}
          </div>
        </>
      )}
    </article>
  )
}
