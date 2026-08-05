import { useEffect, useMemo, useState } from 'react'
import type { PeakFilter } from '../components/LakeMap'
import { SiteHeader } from '../components/SiteHeader'
import { TrackerMap } from '../components/TrackerMap'
import {
  formatPeakLists,
  getAreaPeaks,
  peakHasList,
  type TrackedPeak,
} from '../data/areaPeaks'
import { areas } from '../data/areas'
import { apiEnabled, apiGetProfileLogs } from '../data/api'

export function PublicChecklistPage({
  handle,
  areaSlug,
}: {
  handle: string
  areaSlug: string
}) {
  const area = areas.find((entry) => entry.slug === areaSlug)
  const basePeaks = useMemo(
    () => (area ? getAreaPeaks(area.slug) : []),
    [area],
  )
  const lists = useMemo(
    () => [...new Set(basePeaks.flatMap((peak) => peak.lists))].sort(),
    [basePeaks],
  )
  const [filter, setFilter] = useState<PeakFilter>('all')
  const [list, setList] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())
  const [owner, setOwner] = useState<{
    handle: string
    name: string
    avatarUrl?: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!area || !apiEnabled()) {
      setLoading(false)
      setError(area ? 'API required to view shared checklists.' : 'Area not found.')
      return
    }
    let cancelled = false
    setLoading(true)
    void apiGetProfileLogs(handle, area.slug)
      .then((result) => {
        if (cancelled) return
        setOwner({
          handle: result.handle,
          name: result.name,
          avatarUrl: result.avatarUrl,
        })
        setDoneIds(new Set(Object.keys(result.logs)))
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Could not load checklist.')
        setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [handle, area])

  const trackedPeaks: TrackedPeak[] = useMemo(
    () =>
      basePeaks.map((peak) => ({
        ...peak,
        done: doneIds.has(peak.id),
      })),
    [basePeaks, doneIds],
  )
  const listPeaks = useMemo(
    () =>
      list === 'all'
        ? trackedPeaks
        : trackedPeaks.filter((peak) => peakHasList(peak, list)),
    [list, trackedPeaks],
  )
  const searchedPeaks = useMemo(() => {
    const query = search.trim().toLowerCase()
    return query
      ? listPeaks.filter((peak) => peak.name.toLowerCase().includes(query))
      : listPeaks
  }, [listPeaks, search])
  const done = listPeaks.filter((peak) => peak.done).length
  const selected = trackedPeaks.find((peak) => peak.id === selectedId)
  const visible = useMemo(
    () =>
      searchedPeaks.filter(
        (peak) =>
          filter === 'all' ||
          (filter === 'done' && peak.done) ||
          (filter === 'todo' && !peak.done),
      ),
    [filter, searchedPeaks],
  )

  if (!area) {
    return (
      <main className="explore-page">
        <SiteHeader />
        <p className="account-muted" style={{ padding: 24 }}>
          Area not found.
        </p>
      </main>
    )
  }

  const initial = (owner?.name || handle).trim().charAt(0).toUpperCase() || '○'

  return (
    <main className="app-shell">
      <SiteHeader />
      <section className="workspace">
        <aside className="peak-panel">
          <div className="panel-intro">
            <a className="back-link" href={`/u/${handle}/stats`}>
              ← {owner?.name || `@${handle}`} stats
            </a>
            <h1>{area.name}</h1>
            <p>
              Read-only view of @{handle}&apos;s ticks. Browse the map — nothing
              here is editable.
            </p>
          </div>
          {loading ? (
            <p className="account-muted">Loading shared checklist…</p>
          ) : error ? (
            <p className="account-muted" style={{ color: 'var(--rust)' }}>
              {error}
            </p>
          ) : (
            <>
              <div className="progress-card">
                <div>
                  <strong>{done}</strong>
                  <span>of {listPeaks.length} complete</span>
                </div>
                <span>
                  {listPeaks.length
                    ? Math.round((done / listPeaks.length) * 100)
                    : 0}
                  %
                </span>
                <div className="progress-track" aria-hidden="true">
                  <span
                    style={{
                      width: `${
                        listPeaks.length
                          ? Math.round((done / listPeaks.length) * 100)
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <label className="list-filter">
                <span>Search</span>
                <input
                  type="search"
                  value={search}
                  placeholder="Search peaks…"
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
              <div className="filter-row" aria-label="Filter peaks">
                {(['all', 'todo', 'done'] as PeakFilter[]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={filter === value ? 'is-active' : ''}
                    onClick={() => setFilter(value)}
                  >
                    {value === 'all' ? 'All' : value === 'todo' ? 'To do' : 'Done'}
                  </button>
                ))}
              </div>
              {lists.length > 1 ? (
                <label className="list-filter">
                  <span>Summit list</span>
                  <select
                    value={list}
                    onChange={(event) => setList(event.target.value)}
                  >
                    <option value="all">All mapped lists</option>
                    {lists.map((entry) => (
                      <option key={entry} value={entry}>
                        {entry}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <div className="peak-list">
                {visible.map((peak) => (
                  <button
                    key={peak.id}
                    type="button"
                    className={`peak-row ${selected?.id === peak.id ? 'is-selected' : ''}`}
                    onClick={() => setSelectedId(peak.id)}
                  >
                    <span
                      className={`status-dot ${peak.done ? 'is-done' : ''}`}
                      aria-label={peak.done ? 'Completed' : 'Not completed'}
                    />
                    <span className="peak-name">
                      <strong>{peak.name}</strong>
                      <small>{formatPeakLists(peak.lists)}</small>
                    </span>
                    <span className="peak-height">{peak.height} m</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>

        <div className="map-panel">
          <TrackerMap
            area={area}
            peaks={searchedPeaks}
            filter={filter}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          {owner ? (
            <a className="public-tracker-card" href={`/u/${owner.handle}`}>
              <span className="public-tracker-card__avatar" aria-hidden="true">
                {owner.avatarUrl ? (
                  <img src={owner.avatarUrl} alt="" />
                ) : (
                  initial
                )}
              </span>
              <span>
                <strong>{owner.name}</strong>
                <small>
                  @{owner.handle} · {area.name}
                </small>
              </span>
            </a>
          ) : null}
          {selected ? (
            <div className="peak-card public-tracker-peak">
              <strong>{selected.name}</strong>
              <span>
                {selected.height} m · {formatPeakLists(selected.lists)}
              </span>
              <span>{selected.done ? 'Completed' : 'Not completed'}</span>
              <button type="button" onClick={() => setSelectedId(null)}>
                Close
              </button>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  )
}
