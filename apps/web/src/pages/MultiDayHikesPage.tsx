import { useMemo, useState } from 'react'
import { SiteHeader } from '../components/SiteHeader'
import {
  formatDurationDays,
  multiDayRoutes,
  routeAreas,
  searchMultiDayRoutes,
} from '../data/multiDayRoutes'

export function MultiDayHikesPage() {
  const [query, setQuery] = useState('')
  const [nation, setNation] = useState('all')

  const nations = useMemo(() => {
    const set = new Set(multiDayRoutes.map((route) => route.nation))
    return [...set].sort((a, b) => a.localeCompare(b))
  }, [])

  const routes = useMemo(() => {
    const searched = searchMultiDayRoutes(query)
    if (nation === 'all') return searched
    return searched.filter((route) => route.nation === nation)
  }, [query, nation])

  return (
    <main className="soft-page">
      <SiteHeader />
      <div className="soft-shell soft-shell--wide">
        <header className="soft-hero">
          <p className="soft-kicker">Multi-day hikes</p>
          <h1>Long trails across Britain</h1>
          <p>
            Classic multi-day routes with distance, typical days, the areas they
            cross, and the line on the map.
          </p>
        </header>

        <div className="md-route-toolbar">
          <label className="md-route-search">
            <span>Search</span>
            <input
              type="search"
              value={query}
              placeholder="West Highland Way, Coast to Coast…"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="md-route-filter">
            <span>Nation</span>
            <select
              value={nation}
              onChange={(event) => setNation(event.target.value)}
            >
              <option value="all">All</option>
              {nations.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <ul className="md-route-grid">
          {routes.map((route) => {
            const areas = routeAreas(route)
            return (
              <li key={route.id}>
                <a
                  className="md-route-card"
                  href={`/hikes/multi-day/${encodeURIComponent(route.id)}`}
                >
                  <p className="soft-kicker">
                    {route.nation} · {formatDurationDays(route)}
                  </p>
                  <strong>{route.name}</strong>
                  <p>{route.summary}</p>
                  <dl className="md-route-card__stats">
                    <div>
                      <dt>Distance</dt>
                      <dd>{route.distanceKm} km</dd>
                    </div>
                    <div>
                      <dt>Time</dt>
                      <dd>{formatDurationDays(route)}</dd>
                    </div>
                    <div>
                      <dt>From / to</dt>
                      <dd>
                        {route.start} → {route.finish}
                      </dd>
                    </div>
                  </dl>
                  {areas.length ? (
                    <span className="md-route-card__areas">
                      {areas.map((area) => area.name).join(' · ')}
                    </span>
                  ) : null}
                </a>
              </li>
            )
          })}
        </ul>

        {!routes.length ? (
          <p className="account-muted">No multi-day routes match that search.</p>
        ) : null}
      </div>
    </main>
  )
}
