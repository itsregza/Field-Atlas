import { useMemo, useState } from 'react'
import { LoginPrompt } from '../components/LoginPrompt'
import { FieldAtlasRating } from '../components/FieldAtlasRating'
import { PeakWeather } from '../components/PeakWeather'
import { SiteHeader } from '../components/SiteHeader'
import { UKAreaMap } from '../components/UKAreaMap'
import { areas } from '../data/areas'
import {
  formatPeakLists,
  getAllAreaPeaks,
  getAreaPeaks,
  type AreaPeak,
} from '../data/areaPeaks'
import { loadUser } from '../data/auth'

function readMapParams() {
  const params = new URLSearchParams(window.location.search)
  return {
    areaSlug: params.get('area'),
    peakId: params.get('peak'),
  }
}

function writeMapParams(areaSlug: string | null, peakId: string | null) {
  const url = new URL(window.location.href)
  if (areaSlug) url.searchParams.set('area', areaSlug)
  else url.searchParams.delete('area')
  if (peakId) url.searchParams.set('peak', peakId)
  else url.searchParams.delete('peak')
  window.history.replaceState({}, '', `${url.pathname}${url.search}`)
}

export function MapPage() {
  const user = loadUser()
  const initial = readMapParams()
  const [areaSlug, setAreaSlug] = useState(initial.areaSlug)
  const [peakId, setPeakId] = useState(initial.peakId)

  const focusPeak = useMemo(
    () =>
      peakId != null
        ? getAllAreaPeaks().find((peak) => peak.id === peakId)
        : undefined,
    [peakId],
  )
  const area = areas.find((entry) => entry.slug === areaSlug)
  const peakRange = focusPeak
    ? areas.find((entry) => entry.slug === focusPeak.area)
    : undefined
  const sidebarRange = area ?? peakRange
  const peaks = area ? getAreaPeaks(area.slug) : []
  const mapPeaks = area ? peaks : getAllAreaPeaks()
  const peakLists = [...new Set(peaks.flatMap((peak) => peak.lists))]

  const selectPeak = (peak: AreaPeak) => {
    setPeakId(peak.id)
    writeMapParams(areaSlug, peak.id)
  }

  return (
    <main className="explore-page">
      <SiteHeader />
      <section className="explore-layout">
        <aside className="explore-sidebar">
          {focusPeak ? (
            <>
              <span className="eyebrow">
                {sidebarRange?.nation ?? 'Summit'} ·{' '}
                {formatPeakLists(focusPeak.lists)}
              </span>
              <h1>{focusPeak.name}</h1>

              <dl className="peak-focus-facts">
                <div>
                  <dt>Height</dt>
                  <dd>
                    <strong>{focusPeak.height}</strong>
                    <span> metres</span>
                  </dd>
                </div>
                <div>
                  <dt>Range</dt>
                  <dd>{sidebarRange?.name ?? focusPeak.area}</dd>
                </div>
                <div>
                  <dt>Lists</dt>
                  <dd>{formatPeakLists(focusPeak.lists) || '—'}</dd>
                </div>
              </dl>

              <FieldAtlasRating
                entityType="peak"
                entityId={focusPeak.id}
                canRate={false}
              />

              <PeakWeather
                key={focusPeak.id}
                name={focusPeak.name}
                coords={focusPeak.coords}
                elevation={focusPeak.height}
                peakId={focusPeak.id}
                compact
              />

              {!user && (
                <LoginPrompt
                  className="map-auth-gate"
                  returnTo={`/checklists/${focusPeak.area}`}
                  title="Exploring as a guest"
                  description="Sign in to mark this summit complete on your checklist."
                />
              )}

              <div className="map-sidebar-actions">
                <a
                  className="primary-link"
                  href={`/checklists/${focusPeak.area}`}
                >
                  Open summit checklist
                </a>
                <a
                  className="text-link"
                  href={`/map?area=${focusPeak.area}`}
                  onClick={(event) => {
                    event.preventDefault()
                    setPeakId(null)
                    setAreaSlug(focusPeak.area)
                    writeMapParams(focusPeak.area, null)
                  }}
                >
                  Whole range map →
                </a>
              </div>
            </>
          ) : (
            <>
              <span className="eyebrow">
                {area ? area.nation : 'Explore Britain'}
              </span>
              <h1>{area?.name ?? 'Scout out your next adventure'}</h1>
              <p>
                {area?.summary ??
                  ''}
              </p>
              {!user && (
                <LoginPrompt
                  className="map-auth-gate"
                  returnTo="/map"
                  title="Start saving your progress"
                  description="Sign in to save completed summits across every range and view in depth details on each peak."
                />
              )}
              {area ? (
                <>
                  <div className="map-sidebar-actions">
                    <a className="primary-link" href={`/checklists/${area.slug}`}>
                      Open summit checklist
                    </a>
                  </div>
                  <div className="area-map-stats">
                    <div>
                      <strong>{peaks.length || '—'}</strong>
                      <span>Mapped peaks</span>
                    </div>
                    <div>
                      <strong>{peakLists.length || '—'}</strong>
                      <span>Available lists</span>
                    </div>
                  </div>
                  {!peaks.length && (
                    <p className="coverage-note">
                      This area is ready for its licensed summit dataset.
                    </p>
                  )}
                </>
              ) : (
                <a className="area-directory-link" href="/checklists">
                  Browse all {areas.length} checklists →
                </a>
              )}
            </>
          )}

          
        </aside>
        <div className="uk-map-panel">
          <UKAreaMap
            area={area}
            peaks={mapPeaks}
            focusPeakId={focusPeak?.id}
            onPeakSelect={selectPeak}
          />
          <div className="map-note area-map-note">
            {focusPeak ? (
              <>
                <span className="status-dot is-done" />
                {focusPeak.name}
                <span className="sample-note">{focusPeak.height} m</span>
              </>
            ) : area && peaks.length ? (
              <>
                <span className="status-dot is-done" />
                {peakLists.join(' + ')}
                <span className="sample-note">{peaks.length} peaks</span>
              </>
            ) : (
              <>
                <span className="status-dot is-done" />
                Checklist available
                <span className="status-dot" />
                Zoom in for peaks
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}
