import { useMemo } from 'react'
import { MultiDayRouteMap } from '../components/MultiDayRouteMap'
import { SiteHeader } from '../components/SiteHeader'
import {
  formatDurationDays,
  getMultiDayRoute,
  routeAreas,
  routePeaks,
} from '../data/multiDayRoutes'

export function MultiDayDetailPage({ routeId }: { routeId: string }) {
  const route = getMultiDayRoute(routeId)
  const areas = useMemo(() => (route ? routeAreas(route) : []), [route])
  const highlights = useMemo(() => (route ? routePeaks(route) : []), [route])
  // Only curated summits on the map — nearby auto-picks clutter lowland trails.
  const mapPeaks = highlights

  if (!route) {
    return (
      <main className="soft-page">
        <SiteHeader />
        <div className="soft-shell">
          <div className="account-card account-card--center">
            <h1>Route not found</h1>
            <p className="account-muted">
              That multi-day trail is missing or the link is out of date.
            </p>
            <a className="account-pill-btn" href="/hikes/multi-day">
              Back to multi-day hikes
            </a>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="explore-page md-route-page">
      <SiteHeader />
      <section className="explore-layout">
        <aside className="explore-sidebar">
          <a className="settings-back" href="/hikes/multi-day">
            ← Multi-day hikes
          </a>

          <span className="eyebrow">{route.nation}</span>
          <h1>{route.name}</h1>
          <p>{route.summary}</p>

          <dl className="md-route-stats peak-focus-facts">
            <div>
              <dt>Distance</dt>
              <dd>{route.distanceKm} km</dd>
            </div>
            <div>
              <dt>Typical time</dt>
              <dd>{formatDurationDays(route)}</dd>
            </div>
            {route.ascentM ? (
              <div>
                <dt>Ascent</dt>
                <dd>{route.ascentM.toLocaleString()} m</dd>
              </div>
            ) : null}
            <div>
              <dt>Start</dt>
              <dd>{route.start}</dd>
            </div>
            <div>
              <dt>Finish</dt>
              <dd>{route.finish}</dd>
            </div>
          </dl>

          <p className="md-route-note">
            The map line follows the OpenStreetMap hiking route (real paths on
            the ground). Still take an OS map or guidebook on the hill.
          </p>

          {route.places?.length ? (
            <section className="md-route-section">
              <h2>Along the way</h2>
              <ul className="md-route-places">
                {route.places.map((place) => (
                  <li key={place.name}>
                    <strong>{place.name}</strong>
                    {place.note ? <span>{place.note}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {areas.length ? (
            <section className="md-route-section">
              <h2>Areas</h2>
              <ul className="md-route-chips">
                {areas.map((area) => (
                  <li key={area.slug}>
                    <a href={`/map?area=${encodeURIComponent(area.slug)}`}>
                      {area.name}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {highlights.length ? (
            <section className="md-route-section">
              <h2>Summits along the way</h2>
              <ul className="md-route-peaks">
                {highlights.map((peak) => (
                  <li key={peak.id}>
                    <a
                      href={`/map?area=${encodeURIComponent(peak.area)}&peak=${encodeURIComponent(peak.id)}`}
                    >
                      <strong>{peak.name}</strong>
                      <span>{peak.height} m</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {route.links?.length ? (
            <section className="md-route-section">
              <h2>More info</h2>
              <ul className="md-route-links">
                {route.links.map((link) => (
                  <li key={link.url}>
                    <a href={link.url} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>

        <MultiDayRouteMap route={route} peaks={mapPeaks} />
      </section>
    </main>
  )
}
