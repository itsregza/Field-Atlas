import type { ChangeEvent } from 'react'
import { formatPeakLists, type TrackedPeak } from '../data/areaPeaks'
import type { PeakLog } from '../data/logs'
import { FieldAtlasRating } from './FieldAtlasRating'
import { PeakWeather } from './PeakWeather'
import { useAuthModal } from './AuthModal'

type PeakDetailsProps = {
  peak: TrackedPeak
  log: PeakLog
  imageError: string
  onChange: (changes: Partial<PeakLog>) => void
  onImage: (file: File) => void
  onClose: () => void
  onShare?: () => void
  readOnly?: boolean
  returnTo?: string
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function PeakDetails({
  peak,
  log,
  imageError,
  onChange,
  onImage,
  onClose,
  onShare,
  readOnly = false,
  returnTo = typeof window !== 'undefined'
    ? window.location.pathname + window.location.search
    : '/account',
}: PeakDetailsProps) {
  const { openAuth } = useAuthModal()
  const toggleDone = () => {
    onChange({
      done: !peak.done,
      date: !peak.done && !log.date ? today() : log.date,
    })
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
          <dt>Steepness</dt>
          <dd>Route dependent</dd>
        </div>
        <div>
          <dt>Pitchability</dt>
          <dd>Not assessed</dd>
        </div>
      </dl>

      <PeakWeather
        name={peak.name}
        coords={peak.coords}
        elevation={peak.height}
        peakId={peak.id}
        compact
      />

      <FieldAtlasRating
        entityType="peak"
        entityId={peak.id}
        canRate={!readOnly && peak.done}
        returnTo={returnTo}
      />

      {readOnly ? (
        <div className="peak-login-gate">
          <strong>Want to mark this summit complete?</strong>
          <span>Sign in to save dates, notes and photographs.</span>
          <button type="button" onClick={() => openAuth('login', returnTo)}>
            Log in to Field Atlas →
          </button>
        </div>
      ) : (
        <>
          <button
            className={`complete-button ${peak.done ? 'is-done' : ''}`}
            type="button"
            onClick={toggleDone}
          >
            {peak.done ? 'Mark as not completed' : 'Mark as completed'}
          </button>

          {peak.done && onShare ? (
            <button
              className="share-button"
              type="button"
              onClick={onShare}
            >
              Share to feed
            </button>
          ) : null}

          <div className="completion-form">
            <label>
              Completion date
              <input
                type="date"
                value={log.date}
                max={today()}
                onChange={(event) => onChange({ date: event.target.value })}
              />
            </label>

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

      <p className="terrain-note">
        Overnight terrain notes describe physical ground only and never imply
        permission to camp.
      </p>
    </article>
  )
}
