import { useEffect, useMemo, useState } from 'react'
import type { PeakFilter } from '../components/LakeMap'
import { PeakDetails } from '../components/PeakDetails'
import {
  SharePostModal,
  type SharePostDefaults,
} from '../components/SharePostModal'
import { SiteHeader } from '../components/SiteHeader'
import { TrackerMap } from '../components/TrackerMap'
import {
  formatPeakLists,
  getAreaPeaks,
  peakHasList,
  type TrackedPeak,
} from '../data/areaPeaks'
import type { Area } from '../data/areas'
import { loadUser } from '../data/auth'
import {
  hydrateLogsFromApi,
  loadLogs,
  prepareImage,
  saveLogs,
  type PeakLog,
} from '../data/logs'
import { apiEnabled } from '../data/api'
import { syncPublicProfile } from '../data/profiles'

export function TrackerPage({ area }: { area: Area }) {
  const [user] = useState(loadUser)
  const basePeaks = useMemo(() => getAreaPeaks(area.slug), [area.slug])
  const lists = useMemo(
    () => [...new Set(basePeaks.flatMap((peak) => peak.lists))].sort(),
    [basePeaks],
  )
  const [filter, setFilter] = useState<PeakFilter>('all')
  const [list, setList] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('list')
    return requested && lists.includes(requested) ? requested : 'all'
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [logs, setLogs] = useState(() => (user ? loadLogs() : {}))
  const [imageError, setImageError] = useState('')
  const [hydrated, setHydrated] = useState(!apiEnabled() || !user)
  const [shareDefaults, setShareDefaults] = useState<SharePostDefaults | null>(
    null,
  )

  useEffect(() => {
    if (!user || !apiEnabled()) {
      setHydrated(true)
      return
    }

    let cancelled = false
    void hydrateLogsFromApi()
      .then((next) => {
        if (!cancelled) {
          setLogs(next)
          setHydrated(true)
        }
      })
      .catch(() => {
        if (!cancelled) setHydrated(true)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  const trackedPeaks: TrackedPeak[] = useMemo(
    () =>
      basePeaks.map((peak) => ({
        ...peak,
        done: user ? (logs[peak.id]?.done ?? false) : false,
      })),
    [basePeaks, logs, user],
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
  const selectedLog: PeakLog | null = selected
    ? (logs[selected.id] ?? {
        done: selected.done,
        date: '',
        notes: '',
      })
    : null

  useEffect(() => {
    if (!user || !hydrated) return
    try {
      saveLogs(logs)
      syncPublicProfile(user, logs)
    } catch {
      setImageError('Local storage is full. Remove a photo and try again.')
    }
  }, [logs, user, hydrated])

  const updateLog = (changes: Partial<PeakLog>) => {
    if (!selected || !user) return
    setImageError('')
    setLogs((current) => {
      const previous = current[selected.id] ?? {
        done: selected.done,
        date: '',
        notes: '',
      }

      return {
        ...current,
        [selected.id]: {
          ...previous,
          ...changes,
        },
      }
    })
  }

  const addImage = async (file: File) => {
    setImageError('')
    try {
      updateLog({ image: await prepareImage(file) })
    } catch (error) {
      setImageError(
        error instanceof Error ? error.message : 'The image could not be added.',
      )
    }
  }

  const progress = listPeaks.length ? (done / listPeaks.length) * 100 : 0
  const scopeName = list === 'all' ? `${area.name} summits` : list
  const loginReturnTo =
    window.location.pathname + window.location.search

  return (
    <main className="app-shell">
      <SiteHeader />

      <section className="workspace">
        <aside className="peak-panel">
          <div className="panel-intro">
            <a className="back-link" href="/checklists">
              ← All checklists
            </a>
            <span className="eyebrow">
              {area.nation} · {area.kind}
            </span>
            <h1>{area.name}</h1>
            <p>{area.summary}</p>
            <div className="tracker-meta">
              <span>{basePeaks.length} mapped peaks</span>
              <a href={`/map?area=${area.slug}`}>View on UK map →</a>
            </div>
            {area.lists.length > 0 && (
              <div className="tracker-list-chips" aria-label="Recognised lists">
                {area.lists.map((name) => {
                  const count = basePeaks.filter((peak) =>
                    peakHasList(peak, name),
                  ).length
                  if (!count) {
                    return (
                      <span
                        key={name}
                        className="is-planned"
                        title="Coverage planned"
                      >
                        {name}
                      </span>
                    )
                  }
                  return (
                    <button
                      key={name}
                      type="button"
                      className={list === name ? 'is-active' : 'is-mapped'}
                      title={`${count} mapped peaks`}
                      onClick={() => {
                        setList(name)
                        setSelectedId(null)
                      }}
                    >
                      {name} · {count}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="progress-card">
            <div>
              <strong>{done}</strong>
              <span>
                of {listPeaks.length} {scopeName}
              </span>
            </div>
            <span>{Math.round(progress)}%</span>
            <div className="progress-track" aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>

          {lists.length > 1 && (
            <label className="list-filter">
              <span>Summit list</span>
              <select
                value={list}
                onChange={(event) => {
                  setList(event.target.value)
                  setSelectedId(null)
                }}
              >
                <option value="all">All mapped lists</option>
                {lists.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="peak-search">
            <span>Find a summit</span>
            <input
              type="search"
              value={search}
              placeholder={`Search ${area.name}…`}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <div className="filter-row" aria-label="Filter peaks">
            {(['all', 'todo', 'done'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={filter === value ? 'is-active' : ''}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {value === 'all'
                  ? 'All'
                  : value === 'todo'
                    ? 'To climb'
                    : 'Complete'}
              </button>
            ))}
          </div>

          <div className="peak-list">
            <div className="list-heading">
              <span>{visible.length} peaks</span>
              <span>Height</span>
            </div>
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

          <p className="data-credit">
            Summit data from the{' '}
            <a
              href="https://www.hills-database.co.uk/"
              target="_blank"
              rel="noreferrer"
            >
              Database of British and Irish Hills
            </a>
            , licensed CC BY 4.0.
          </p>
        </aside>

        <div className="map-panel">
          <TrackerMap
            area={area}
            peaks={searchedPeaks}
            filter={filter}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />

          {selected && selectedLog && (
            <PeakDetails
              peak={selected}
              log={selectedLog}
              imageError={imageError}
              onChange={updateLog}
              onImage={addImage}
              onClose={() => setSelectedId(null)}
              onShare={
                user && apiEnabled()
                  ? () =>
                      setShareDefaults({
                        peakId: selected.id,
                        peakName: selected.name,
                        areaSlug: area.slug,
                        areaName: area.name,
                        height: selected.height,
                        imageUrl: selectedLog.image,
                        body: selectedLog.notes,
                      })
                  : undefined
              }
              readOnly={!user}
              returnTo={loginReturnTo}
            />
          )}

          <SharePostModal
            open={Boolean(shareDefaults)}
            defaults={shareDefaults ?? undefined}
            onClose={() => setShareDefaults(null)}
          />

          <div className="map-note">
            {user ? (
              <>
                <span className="status-dot is-done" />
                Complete
                <span className="status-dot" />
                To climb
              </>
            ) : (
              <>
                <span className="status-dot" />
                Log in to record progress
              </>
            )}
            <span className="sample-note">
              {listPeaks.length} summit locations
            </span>
          </div>
        </div>
      </section>
    </main>
  )
}
