import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { SiteHeader } from '../components/SiteHeader'
import { areas } from '../data/areas'
import { getPeakById } from '../data/areaPeaks'
import { getHikesForPeak, searchHikes } from '../data/hikes'

function readPeakParam() {
  return new URLSearchParams(window.location.search).get('peak') ?? ''
}

function areaName(slug: string) {
  return areas.find((area) => area.slug === slug)?.name ?? slug
}

function HikeSearch() {
  const rootRef = useRef<HTMLDivElement>(null)
  const inputId = useId()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onPointer)
    return () => window.removeEventListener('mousedown', onPointer)
  }, [])

  const results = useMemo(() => searchHikes(query), [query])

  useEffect(() => {
    setActive(0)
  }, [query])

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!results.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive((index) => (index + 1) % results.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActive((index) => (index - 1 + results.length) % results.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const hike = results[active]
      if (hike) window.location.href = `/hikes/${encodeURIComponent(hike.id)}`
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="soft-search" ref={rootRef}>
      <label className="soft-search__field" htmlFor={inputId}>
        <span>Search hikes</span>
        <input
          id={inputId}
          type="search"
          value={query}
          placeholder="Helvellyn horseshoe, Cat Bells, Pen-y-ghent…"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
      </label>

      {open && query.trim().length >= 1 ? (
        <ul className="soft-search__results" id={listId} role="listbox">
          {results.length === 0 ? (
            <li className="soft-search__empty">No hikes match that search.</li>
          ) : (
            results.map((hike, index) => (
              <li key={hike.id}>
                <a
                  href={`/hikes/${encodeURIComponent(hike.id)}`}
                  role="option"
                  aria-selected={index === active}
                  className={index === active ? 'is-active' : ''}
                  onMouseEnter={() => setActive(index)}
                >
                  <strong>{hike.name}</strong>
                  <span>
                    {areaName(hike.areaSlug)} · {hike.difficulty} · {hike.hours}
                    h
                  </span>
                </a>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  )
}

function PeakHikeList({ peakId }: { peakId: string }) {
  const peak = getPeakById(peakId)
  const peakHikes = useMemo(() => getHikesForPeak(peakId), [peakId])
  if (!peak || !peakHikes.length) return null

  return (
    <section className="account-card">
      <div className="account-card__head">
        <h2>Routes for {peak.name}</h2>
      </div>
      <ul className="account-link-list">
        {peakHikes.map((hike) => (
          <li key={hike.id}>
            <a href={`/hikes/${encodeURIComponent(hike.id)}`}>
              <strong>{hike.name}</strong>
              <small>
                {areaName(hike.areaSlug)} · {hike.difficulty} · {hike.hours}h ·{' '}
                {hike.distanceKm} km
              </small>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function HikesHubPage() {
  const [peakId] = useState(readPeakParam)

  return (
    <main className="soft-page">
      <SiteHeader />
      <div className="soft-shell soft-shell--wide">
        <header className="soft-hero">
          <p className="soft-kicker">Hikes</p>
          <h1>Find your next adventure</h1>
          <p>
            Search a classic route, or let Field Atlas pick something from your
            unfinished list.
          </p>
        </header>

        <HikeSearch />

        {peakId ? <PeakHikeList peakId={peakId} /> : null}

        <div className="soft-hub-grid">
          <a className="account-card soft-hub-card" href="/hikes/generator">
            <p className="soft-kicker">Surprise me</p>
            <strong>Random hike generator</strong>
            <span>You choose the region, we choose the hike.</span>
          </a>
          <a className="account-card soft-hub-card" href="/hikes/unfinished">
            <p className="soft-kicker">Tick the list</p>
            <strong>Unfinished peaks</strong>
            <span>
              Routes that cover summits you still need to complete.
            </span>
          </a>
        </div>
      </div>
    </main>
  )
}
