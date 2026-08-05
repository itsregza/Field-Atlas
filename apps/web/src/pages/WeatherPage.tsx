import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AccountRequiredLock } from '../components/AccountRequiredLock'
import { SiteHeader } from '../components/SiteHeader'
import { WeatherIcon } from '../components/WeatherIcon'
import { areas } from '../data/areas'
import {
  getAllAreaPeaks,
  getPeakById,
  type AreaPeak,
} from '../data/areaPeaks'
import { loadUser } from '../data/auth'
import {
  fetchPeakWeather,
  formatForecastDay,
  formatForecastHour,
  groupHourlyByDay,
  summarizeDayHours,
  type PeakWeatherForecast,
} from '../data/weather'

function readPeakParam() {
  return new URLSearchParams(window.location.search).get('peak') ?? ''
}

function areaName(slug: string) {
  return areas.find((area) => area.slug === slug)?.name ?? slug
}

function setPeakUrl(peakId: string) {
  const url = new URL(window.location.href)
  if (peakId) url.searchParams.set('peak', peakId)
  else url.searchParams.delete('peak')
  window.history.replaceState({}, '', `${url.pathname}${url.search}`)
}

const SUGGESTED_IDS = [
  'dobih-2359', // Scafell Pike
  'dobih-2515', // Helvellyn
  'dobih-1963', // Snowdon - Yr Wyddfa
  'dobih-518', // Ben Macdui
  'ethel-001', // Kinder Scout
  'dobih-2783', // Pen-y-ghent
  'dobih-1977', // Tryfan
]

function PeakPicker({
  selectedId,
  onSelect,
}: {
  selectedId: string
  onSelect: (peak: AreaPeak) => void
}) {
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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (q.length < 1) return []
    return getAllAreaPeaks()
      .filter((peak) => peak.name.toLowerCase().includes(q))
      .sort(
        (a, b) =>
          Number(b.name.toLowerCase().startsWith(q)) -
            Number(a.name.toLowerCase().startsWith(q)) ||
          b.height - a.height ||
          a.name.localeCompare(b.name),
      )
      .slice(0, 10)
  }, [query])

  useEffect(() => {
    setActive(0)
  }, [query])

  const suggestions = useMemo(() => {
    const fromIds = SUGGESTED_IDS.map((id) => getPeakById(id)).filter(
      (peak): peak is AreaPeak => Boolean(peak),
    )
    if (fromIds.length >= 4) return fromIds
    return getAllAreaPeaks().slice(0, 8)
  }, [])

  const pickPeak = (peak: AreaPeak) => {
    onSelect(peak)
    setQuery('')
    setOpen(false)
  }

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
      const peak = results[active]
      if (peak) pickPeak(peak)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="weather-search" ref={rootRef}>
      <div className="weather-search__field-wrap">
        <label className="weather-search__field" htmlFor={inputId}>
          <span>Search summits</span>
          <input
            id={inputId}
            type="search"
            value={query}
            placeholder="Scafell Pike, Tryfan, Ben Nevis…"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={open && results.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            onChange={(event) => {
              setQuery(event.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
          />
        </label>

        {open && query.trim().length >= 1 ? (
          <ul className="weather-search__results" id={listId} role="listbox">
            {results.length === 0 ? (
              <li className="weather-search__empty">No peaks match that name.</li>
            ) : (
              results.map((peak, index) => (
                <li key={peak.id} role="option">
                  <button
                    type="button"
                    className={
                      peak.id === selectedId
                        ? 'is-active is-current'
                        : index === active
                          ? 'is-active'
                          : undefined
                    }
                    onMouseEnter={() => setActive(index)}
                    onClick={() => pickPeak(peak)}
                  >
                    <strong>{peak.name}</strong>
                    <span>
                      {areaName(peak.area)} · {peak.height} m · {peak.gridRef}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        ) : null}
      </div>

      {query.trim().length < 1 ? (
        <div className="weather-search__classics">
          <span>Classic summits</span>
          <div className="weather-search__classics-row">
            {suggestions.map((peak) => (
              <button
                key={peak.id}
                type="button"
                className={peak.id === selectedId ? 'is-active' : ''}
                onClick={() => pickPeak(peak)}
              >
                {peak.name}
                <small>{peak.height} m</small>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function WeatherDetail({ peak }: { peak: AreaPeak }) {
  const [forecast, setForecast] = useState<PeakWeatherForecast | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [dayKey, setDayKey] = useState('')
  const signedIn = Boolean(loadUser())
  const returnTo = `/forecasts?peak=${encodeURIComponent(peak.id)}`

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setForecast(null)
    setDayKey('')

    fetchPeakWeather(peak.coords, peak.height, {
      forecastDays: 7,
      maxHours: 168,
    })
      .then((data) => {
        if (cancelled) return
        setForecast(data)
        const groups = groupHourlyByDay(data.hourly)
        setDayKey(groups[0]?.date ?? '')
      })
      .catch(() => {
        if (!cancelled) setError('Forecast unavailable right now.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [peak.id, peak.coords[0], peak.coords[1], peak.height])

  const dayGroups = useMemo(
    () => (forecast ? groupHourlyByDay(forecast.hourly) : []),
    [forecast],
  )
  const activeHours =
    dayGroups.find((group) => group.date === dayKey)?.hours ?? []
  const daySummary = summarizeDayHours(activeHours)
  const current = forecast?.current

  if (loading) {
    return (
      <div className="weather-detail is-loading" aria-busy="true">
        Loading week forecast for {peak.name}…
      </div>
    )
  }

  if (error || !forecast || !current) {
    return (
      <div className="weather-detail is-error" role="status">
        {error || 'Forecast unavailable right now.'}
      </div>
    )
  }

  return (
    <div className="weather-detail weather-detail--compact">
      <aside className="weather-detail__side">
        <span className="eyebrow">{areaName(peak.area)}</span>
        <h2>{peak.name}</h2>
        <p className="weather-detail__meta">
          {peak.height} m · {peak.gridRef}
          {peak.lists.length ? ` · ${peak.lists.join(' · ')}` : ''}
        </p>

        <div className="weather-detail__now-strip">
          <span className={`peak-weather__icon is-${current.kind}`}>
            <WeatherIcon kind={current.kind} title={current.label} />
          </span>
          <div>
            <strong>{current.temperature}°C</strong>
            <small className={`is-${current.cloudBase.status}`}>
              {current.label} · {current.cloudBase.label}
            </small>
          </div>
        </div>

        <div className="weather-detail__actions">
          <a
            href={`/map?area=${encodeURIComponent(peak.area)}&peak=${encodeURIComponent(peak.id)}`}
          >
            Open on map
          </a>
          <a href={`/checklists/${encodeURIComponent(peak.area)}`}>Checklist</a>
        </div>

        <AccountRequiredLock returnTo={returnTo} unlocked={signedIn}>
          <ul className="weather-detail__week" role="tablist" aria-label="Forecast day">
            {dayGroups.map((group) => {
              const summary = summarizeDayHours(group.hours)
              const active = group.date === dayKey
              return (
                <li key={group.date}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`weather-detail__week-btn is-${summary.worstCloud} ${active ? 'is-active' : ''}`}
                    onClick={() => {
                      if (signedIn) setDayKey(group.date)
                    }}
                  >
                    <strong>{formatForecastDay(group.date)}</strong>
                    <span>
                      {summary.tempMax}° / {summary.tempMin}°
                    </span>
                    <small>
                      {summary.inCloudHours > 0
                        ? `${summary.inCloudHours}h in cloud`
                        : summary.nearHours > 0
                          ? `${summary.nearHours}h near cloud`
                          : 'Summit clear'}
                    </small>
                  </button>
                </li>
              )
            })}
          </ul>
        </AccountRequiredLock>
      </aside>

      <div className="weather-detail__panel">
        <dl className="peak-weather__metrics weather-detail__metrics">
          <div>
            <dt>Dew point</dt>
            <dd>
              {current.dewPoint}°C
              <small>{current.humidity}% humidity</small>
            </dd>
          </div>
          <div>
            <dt>Wind</dt>
            <dd>
              {current.windCompass} {current.windSpeed} mph
              <small>
                Gusts {current.windGusts} · {current.windDirection}°
              </small>
            </dd>
          </div>
          <div>
            <dt>Cloud cover</dt>
            <dd>
              {current.cloudCover}%
              <small>
                L {current.cloudCoverLow}% · M {current.cloudCoverMid}% · H{' '}
                {current.cloudCoverHigh}%
              </small>
            </dd>
          </div>
          <div className={`is-${current.cloudBase.status}`}>
            <dt>Cloud base</dt>
            <dd>
              {current.cloudBase.metresAmsl} m
              <small>
                {current.cloudBase.metresAboveSummit > 0
                  ? `${current.cloudBase.metresAboveSummit} m above summit`
                  : `${Math.abs(current.cloudBase.metresAboveSummit)} m below summit`}
              </small>
            </dd>
          </div>
          <div>
            <dt>Visibility</dt>
            <dd>
              {current.visibilityKm != null
                ? `${current.visibilityKm} km`
                : '—'}
              <small>
                {current.pressureHpa != null
                  ? `${current.pressureHpa} hPa`
                  : 'Pressure n/a'}
              </small>
            </dd>
          </div>
          <div>
            <dt>Precipitation</dt>
            <dd>
              {current.precipitation > 0
                ? `${current.precipitation.toFixed(1)} mm`
                : 'Dry'}
              <small>Current interval</small>
            </dd>
          </div>
        </dl>

        <AccountRequiredLock returnTo={returnTo} unlocked={signedIn}>
          <section aria-label={`Hourly for ${formatForecastDay(dayKey)}`}>
            <div className="weather-hourly__head">
              <h3>Hourly · {formatForecastDay(dayKey)}</h3>
              <p>
                {daySummary.tempMax}° / {daySummary.tempMin}° · wind to{' '}
                {daySummary.windMax} mph
                {daySummary.precipSum > 0
                  ? ` · ${daySummary.precipSum} mm rain`
                  : ' · dry'}
              </p>
            </div>

            <div className="weather-hourly__scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Time</th>
                    <th scope="col">Weather</th>
                    <th scope="col">Temp / Td</th>
                    <th scope="col">Wind</th>
                    <th scope="col">Cover</th>
                    <th scope="col">Cloud base</th>
                    <th scope="col">Summit</th>
                    <th scope="col">Vis / RH</th>
                  </tr>
                </thead>
                <tbody>
                  {activeHours.map((hour) => (
                    <tr
                      key={hour.time}
                      className={`is-cloud-${hour.cloudBase.status}`}
                    >
                      <th scope="row">{formatForecastHour(hour.time)}</th>
                      <td>
                        <span className={`peak-weather__icon is-${hour.kind}`}>
                          <WeatherIcon kind={hour.kind} title={hour.label} />
                        </span>
                        {hour.label}
                        {hour.precipitation > 0
                          ? ` · ${hour.precipitation.toFixed(1)} mm`
                          : ''}
                      </td>
                      <td>
                        {hour.temperature}° / {hour.dewPoint}°
                      </td>
                      <td>
                        {hour.windCompass} {hour.windSpeed}
                        <small>g {hour.windGusts}</small>
                      </td>
                      <td>
                        {hour.cloudCover}%
                        <small>low {hour.cloudCoverLow}%</small>
                      </td>
                      <td>
                        <strong>{hour.cloudBase.metresAmsl} m</strong>
                        <small>
                          {hour.cloudBase.metresAboveSummit > 0
                            ? `+${hour.cloudBase.metresAboveSummit} m`
                            : `${hour.cloudBase.metresAboveSummit} m`}
                        </small>
                      </td>
                      <td>
                        <span
                          className={`peak-weather__summit-pill is-${hour.cloudBase.status}`}
                        >
                          {hour.cloudBase.shortLabel}
                        </span>
                      </td>
                      <td>
                        {hour.visibilityKm != null
                          ? `${hour.visibilityKm} km`
                          : '—'}
                        <small>{hour.humidity}% rh</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </AccountRequiredLock>

        <p className="weather-detail__note">
          Cloud base is estimated from (temperature − dew point) × 125 m above the
          model elevation — a hillwalker rule of thumb via {forecast.attribution}.
          Always cross-check with a mountain-specific forecast before you go.
        </p>
      </div>
    </div>
  )
}

export function WeatherPage() {
  const [selected, setSelected] = useState<AreaPeak | null>(() => {
    const id = readPeakParam()
    return id ? getPeakById(id) : null
  })

  const selectPeak = (peak: AreaPeak) => {
    setSelected(peak)
    setPeakUrl(peak.id)
  }

  return (
    <main className="soft-page">
      <SiteHeader />

      <div className="soft-shell soft-shell--forecast">
        <header className="soft-hero">
          <p className="soft-kicker">Summit weather</p>
          <h1>Peak conditions</h1>
          <p>
            Check the weather for any summit in the UK. Hour by hour for the
            week ahead.
          </p>
        </header>

        <section className="weather-page__bar">
          <PeakPicker selectedId={selected?.id ?? ''} onSelect={selectPeak} />
        </section>

        <section className="weather-page__body">
          {selected ? (
            <WeatherDetail peak={selected} />
          ) : (
            <div className="account-card account-card--center">
              <strong>Choose a peak</strong>
              <span className="account-muted">
                Search above or pick a classic summit.
              </span>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
