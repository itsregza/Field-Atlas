import { useState } from 'react'
import { FieldAtlasRating } from '../components/FieldAtlasRating'
import { SiteHeader } from '../components/SiteHeader'
import { useAuthModal } from '../components/AuthModal'
import { areas } from '../data/areas'
import { getAllAreaPeaks } from '../data/areaPeaks'
import { loadUser } from '../data/auth'
import {
  isHikeCompleted,
  isHikeSaved,
  loadHikeLibrary,
  markHikeCompleted,
  toggleSavedHike,
  unmarkHikeCompleted,
} from '../data/hikeLibrary'
import { hikes, providerLinks } from '../data/hikes'
import { loadLogs } from '../data/logs'

export function HikeDetailPage({ hikeId }: { hikeId: string }) {
  const hike = hikes.find((entry) => entry.id === hikeId)
  const area = hike
    ? areas.find((entry) => entry.slug === hike.areaSlug)
    : undefined
  const peakNames = hike
    ? hike.peakIds
        .map(
          (id) => getAllAreaPeaks().find((peak) => peak.id === id)?.name ?? null,
        )
        .filter((name): name is string => Boolean(name))
    : []

  const user = loadUser()
  const { openAuth } = useAuthModal()
  const [library, setLibrary] = useState(loadHikeLibrary)
  const [notice, setNotice] = useState('')

  if (!hike) {
    return (
      <main className="soft-page">
        <SiteHeader />
        <div className="soft-shell">
          <div className="account-card account-card--center">
            <h1>Hike not found</h1>
            <p className="account-muted">
              That route is missing or the link is out of date.
            </p>
            <a className="account-pill-btn" href="/hikes">
              Back to hikes
            </a>
          </div>
        </div>
      </main>
    )
  }

  const links = providerLinks(hike)
  const saved = isHikeSaved(hike.id, library)
  const completed = isHikeCompleted(hike.id, library)

  const requireAccount = () => {
    if (user) return true
    openAuth('login', `/hikes/${hike.id}`)
    return false
  }

  const onToggleSave = () => {
    if (!requireAccount()) return
    setLibrary(toggleSavedHike(hike.id))
    setNotice(saved ? 'Removed from saved hikes.' : 'Saved to your account.')
  }

  const onToggleComplete = () => {
    if (!requireAccount()) return
    if (completed) {
      setLibrary(unmarkHikeCompleted(hike.id))
      setNotice('Route unmarked as completed.')
      return
    }
    const result = markHikeCompleted(hike, loadLogs())
    setLibrary(result.library)
    setNotice(
      hike.peakIds.length
        ? 'Route marked complete — summit ticks updated on your checklist.'
        : 'Route marked complete.',
    )
  }

  return (
    <main className="soft-page">
      <SiteHeader />
      <div className="soft-shell">
        <a className="settings-back" href="/hikes">
          ← All hikes
        </a>
        <article className="account-card hike-feature-card">
          <header className="soft-hero soft-hero--left">
            <p className="soft-kicker">
              {area?.name ?? hike.areaSlug} · {hike.difficulty}
              {hike.source === 'curated' ? ' · classic' : ' · summit day'}
            </p>
            <h1>{hike.name}</h1>
            <p>{hike.summary}</p>
          </header>

          <dl className="soft-stat-dl">
            <div>
              <dt>Time</dt>
              <dd>{hike.hours} h</dd>
            </div>
            <div>
              <dt>Ascent</dt>
              <dd>{hike.ascent} m</dd>
            </div>
            <div>
              <dt>Distance</dt>
              <dd>{hike.distanceKm} km</dd>
            </div>
            <div>
              <dt>Shape</dt>
              <dd>{hike.shape}</dd>
            </div>
          </dl>

          <FieldAtlasRating
            entityType="hike"
            entityId={hike.id}
            canRate={completed}
            returnTo={`/hikes/${hike.id}`}
          />

          {peakNames.length > 0 ? (
            <p className="account-muted">Peaks: {peakNames.join(', ')}</p>
          ) : null}

          <div className="hike-library-actions">
            <button
              type="button"
              className={`account-pill-btn ${saved ? '' : 'account-pill-btn--ghost'}`}
              aria-pressed={saved}
              onClick={onToggleSave}
            >
              {saved ? 'Saved' : 'Save hike'}
            </button>
            <button
              type="button"
              className={`account-pill-btn ${completed ? '' : 'account-pill-btn--ghost'}`}
              aria-pressed={completed}
              onClick={onToggleComplete}
            >
              {completed ? 'Completed' : 'Mark completed'}
            </button>
          </div>
          {notice ? <p className="account-muted">{notice}</p> : null}

          <div className="hike-card__actions">
            {links.allTrails ? (
              <a
                className="provider-btn provider-btn--alltrails"
                href={links.allTrails.url}
                target="_blank"
                rel="noreferrer"
              >
                AllTrails
              </a>
            ) : null}
            {links.osMaps ? (
              <a
                className="provider-btn provider-btn--osmaps"
                href={links.osMaps.url}
                target="_blank"
                rel="noreferrer"
              >
                OS Maps
              </a>
            ) : null}
            {links.other ? (
              <a
                className="provider-btn provider-btn--other"
                href={links.other.url}
                target="_blank"
                rel="noreferrer"
              >
                {links.other.label}
              </a>
            ) : null}
            <a className="account-text-link" href={`/map?area=${hike.areaSlug}`}>
              Open on map
            </a>
            <a
              className="account-text-link"
              href={`/checklists/${hike.areaSlug}`}
            >
              Open checklist
            </a>
          </div>
        </article>
      </div>
    </main>
  )
}
