import { useMemo, useState } from 'react'
import { BothiesMap } from '../components/BothiesMap'
import { FieldAtlasRating } from '../components/FieldAtlasRating'
import { SiteHeader } from '../components/SiteHeader'
import { loadUser } from '../data/auth'
import {
  bothies,
  bothyRegions,
  filterBothies,
  formatBothyCoords,
  getBothiesByRegion,
  getBothyById,
  type Bothy,
  type BothyOperatorFilter,
} from '../data/bothies'

function readParams() {
  const params = new URLSearchParams(window.location.search)
  const kind = params.get('kind')
  return {
    region: params.get('region'),
    bothyId: params.get('bothy'),
    kind: (kind === 'mba' || kind === 'other' ? kind : 'all') as BothyOperatorFilter,
  }
}

function writeParams(
  region: string | null,
  bothyId: string | null,
  kind: BothyOperatorFilter,
) {
  const url = new URL(window.location.href)
  url.pathname = '/bothies'
  if (region) url.searchParams.set('region', region)
  else url.searchParams.delete('region')
  if (bothyId) url.searchParams.set('bothy', bothyId)
  else url.searchParams.delete('bothy')
  if (kind !== 'all') url.searchParams.set('kind', kind)
  else url.searchParams.delete('kind')
  window.history.replaceState({}, '', `${url.pathname}${url.search}`)
}

export function BothiesPage() {
  const initial = readParams()
  const [region, setRegion] = useState<string | null>(
    initial.region && bothyRegions.includes(initial.region)
      ? initial.region
      : null,
  )
  const [kind, setKind] = useState<BothyOperatorFilter>(initial.kind)
  const [bothyId, setBothyId] = useState(initial.bothyId)
  const [listQuery, setListQuery] = useState('')
  const user = loadUser()

  const focusBothy = useMemo(
    () => (bothyId ? getBothyById(bothyId) : undefined),
    [bothyId],
  )

  const filteredBothies = useMemo(() => {
    const byRegion = getBothiesByRegion(region)
    return filterBothies(byRegion, kind)
  }, [region, kind])

  const listBothies = useMemo(() => {
    const q = listQuery.trim().toLowerCase()
    if (!q) return filteredBothies
    return filteredBothies.filter(
      (bothy) =>
        bothy.name.toLowerCase().includes(q) ||
        bothy.region.toLowerCase().includes(q) ||
        bothy.operator.toLowerCase().includes(q),
    )
  }, [filteredBothies, listQuery])

  const mbaCount = useMemo(
    () => getBothiesByRegion(region).filter((bothy) => bothy.mba).length,
    [region],
  )
  const otherCount = useMemo(
    () => getBothiesByRegion(region).filter((bothy) => !bothy.mba).length,
    [region],
  )

  const clearBothy = () => {
    setBothyId(null)
    writeParams(region, null, kind)
  }

  const selectBothy = (bothy: Bothy) => {
    setBothyId(bothy.id)
    writeParams(region, bothy.id, kind)
  }

  const selectRegion = (next: string | null) => {
    setRegion(next)
    setBothyId(null)
    writeParams(next, null, kind)
  }

  const selectKind = (next: BothyOperatorFilter) => {
    setKind(next)
    setBothyId(null)
    writeParams(region, null, next)
  }

  return (
    <main className="explore-page bothies-page">
      <SiteHeader />
      <section className="explore-layout">
        <aside className="explore-sidebar">
          {focusBothy ? (
            <>
              <button
                type="button"
                className="bothies-back"
                onClick={clearBothy}
              >
                ← All bothies
              </button>
              <span className="eyebrow">{focusBothy.region}</span>
              <h1>{focusBothy.name}</h1>
              <p
                className={`bothies-badge ${
                  focusBothy.mba ? 'is-mba' : 'is-other'
                }`}
              >
                {focusBothy.mba
                  ? 'Mountain Bothies Association'
                  : 'Other shelter (not MBA)'}
              </p>

              {focusBothy.image ? (
                <figure className="bothies-preview">
                  <img
                    src={focusBothy.image}
                    alt={focusBothy.name}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <figcaption>
                    Photo from the Mountain Bothies Association
                  </figcaption>
                </figure>
              ) : null}

              {focusBothy.mba ? (
                <p>
                  Check the Mountain Bothies Association before visiting for
                  access, closures, and bothy etiquette.
                </p>
              ) : null}

              <FieldAtlasRating
                entityType="bothy"
                entityId={focusBothy.id}
                canRate={Boolean(user)}
                returnTo={`/bothies?bothy=${focusBothy.id}`}
              />

              <dl className="peak-focus-facts">
                <div>
                  <dt>Coordinates</dt>
                  <dd>
                    <code>{formatBothyCoords(focusBothy.coords)}</code>
                  </dd>
                </div>
                {focusBothy.operator ? (
                  <div>
                    <dt>Operator</dt>
                    <dd>{focusBothy.operator}</dd>
                  </div>
                ) : null}
                {focusBothy.ele != null ? (
                  <div>
                    <dt>Elevation</dt>
                    <dd>
                      <strong>{focusBothy.ele}</strong>
                      <span> metres</span>
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="map-sidebar-actions">
                {focusBothy.mba && focusBothy.website ? (
                  <a
                    className="primary-link"
                    href={focusBothy.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    MBA bothy page
                  </a>
                ) : null}
                <button
                  type="button"
                  className="bothies-back bothies-back--inline"
                  onClick={clearBothy}
                >
                  Back to list
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="eyebrow">UK shelters</span>
              <h1>{region ?? 'Bothies'}</h1>
              <p>
                {filteredBothies.length} shown
                {region ? ` in ${region}` : ''}. Orange houses are MBA; teal
                are other shelters.
              </p>

              <div
                className="bothies-kind-filter"
                role="group"
                aria-label="Bothy type"
              >
                <button
                  type="button"
                  className={kind === 'all' ? 'is-active' : ''}
                  onClick={() => selectKind('all')}
                >
                  All ({mbaCount + otherCount})
                </button>
                <button
                  type="button"
                  className={kind === 'mba' ? 'is-active is-mba' : ''}
                  onClick={() => selectKind('mba')}
                >
                  MBA ({mbaCount})
                </button>
                <button
                  type="button"
                  className={kind === 'other' ? 'is-active is-other' : ''}
                  onClick={() => selectKind('other')}
                >
                  Other ({otherCount})
                </button>
              </div>

              <label className="bothies-filter">
                <span className="bothies-filter__label">Region</span>
                <select
                  value={region ?? ''}
                  onChange={(event) =>
                    selectRegion(event.target.value || null)
                  }
                >
                  <option value="">All regions</option>
                  {bothyRegions.map((item) => (
                    <option key={item} value={item}>
                      {item} (
                      {bothies.filter((bothy) => bothy.region === item).length})
                    </option>
                  ))}
                </select>
              </label>

              <label className="bothies-filter">
                <span className="bothies-filter__label">Search</span>
                <input
                  type="search"
                  value={listQuery}
                  onChange={(event) => setListQuery(event.target.value)}
                  placeholder="Name or operator"
                />
              </label>

              <ul className="bothies-list">
                {listBothies.map((bothy) => (
                  <li key={bothy.id}>
                    <button
                      type="button"
                      className="bothies-list__item"
                      onClick={() => selectBothy(bothy)}
                    >
                      <span className="bothies-list__row">
                        <strong>{bothy.name}</strong>
                        <span
                          className={`bothies-list__tag ${
                            bothy.mba ? 'is-mba' : 'is-other'
                          }`}
                        >
                          {bothy.mba ? 'MBA' : 'Other'}
                        </span>
                      </span>
                      <span>{bothy.region}</span>
                    </button>
                  </li>
                ))}
                {!listBothies.length ? (
                  <li className="bothies-list__empty">No bothies match.</li>
                ) : null}
              </ul>
            </>
          )}
        </aside>

        <BothiesMap
          bothies={filteredBothies}
          focusBothyId={bothyId}
          onBothySelect={selectBothy}
          onBothyClear={clearBothy}
        />
      </section>
    </main>
  )
}
