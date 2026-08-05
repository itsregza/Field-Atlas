import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  fetchPeakWeather,
  formatForecastDay,
  formatForecastHour,
  groupHourlyByDay,
  summarizeDayHours,
  type HourlyForecast,
  type PeakWeatherForecast,
} from '../data/weather'
import { loadUser } from '../data/auth'
import { AccountRequiredLock } from './AccountRequiredLock'
import { WeatherIcon } from './WeatherIcon'

type PeakWeatherProps = {
  name: string
  coords: [number, number]
  elevation: number
  peakId?: string
  compact?: boolean
}

function HourlyTable({ hours }: { hours: HourlyForecast[] }) {
  if (!hours.length) {
    return (
      <p className="peak-weather__hourly-empty">
        No hourly detail available for this day.
      </p>
    )
  }

  return (
    <div className="peak-weather__hourly-scroll">
      <table>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Wx</th>
            <th scope="col">Temp</th>
            <th scope="col">Wind</th>
            <th scope="col">Cover</th>
            <th scope="col">Cloud base</th>
            <th scope="col">Summit</th>
          </tr>
        </thead>
        <tbody>
          {hours.map((hour) => (
            <tr key={hour.time} className={`is-cloud-${hour.cloudBase.status}`}>
              <th scope="row">
                <strong>{formatForecastHour(hour.time)}</strong>
              </th>
              <td>
                <span className={`peak-weather__icon is-${hour.kind}`}>
                  <WeatherIcon kind={hour.kind} title={hour.label} />
                </span>
                <small>{hour.label}</small>
              </td>
              <td>
                {hour.temperature}°
                <small>Td {hour.dewPoint}°</small>
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
                  {hour.visibilityKm != null
                    ? `vis ${hour.visibilityKm} km`
                    : `${hour.humidity}% rh`}
                </small>
              </td>
              <td>
                <span
                  className={`peak-weather__summit-pill is-${hour.cloudBase.status}`}
                >
                  {hour.cloudBase.shortLabel}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ForecastPanel({
  name,
  forecast,
  peakId,
  onClose,
}: {
  name: string
  forecast: PeakWeatherForecast
  peakId?: string
  onClose?: () => void
}) {
  const { current, hourly, daily } = forecast
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const signedIn = Boolean(loadUser())
  const returnTo = peakId
    ? `/forecasts?peak=${encodeURIComponent(peakId)}`
    : '/forecasts'

  const hoursByDay = useMemo(() => {
    const map = new Map<string, HourlyForecast[]>()
    for (const group of groupHourlyByDay(hourly)) {
      map.set(group.date, group.hours)
    }
    return map
  }, [hourly])

  const selectedHours = selectedDay ? (hoursByDay.get(selectedDay) ?? []) : []
  const selectedSummary = summarizeDayHours(selectedHours)

  const toggleDay = (date: string) => {
    if (!signedIn) return
    setSelectedDay((currentDay) => (currentDay === date ? null : date))
  }

  return (
    <div className="peak-weather__panel">
      <header>
        <div>
          <span className="eyebrow">Mountain forecast</span>
          <strong>{name}</strong>
          <small>
            Summit {forecast.summitElevation} m · model elev.{' '}
            {Math.round(forecast.elevation)} m
          </small>
        </div>
        {onClose && (
          <button
            className="peak-weather__close"
            type="button"
            aria-label="Close forecast"
            onClick={onClose}
          >
            ×
          </button>
        )}
      </header>

      <section className="peak-weather__now" aria-label="Current conditions">
        <h3>Now</h3>
        <dl className="peak-weather__metrics">
          <div>
            <dt>Temperature</dt>
            <dd>
              {current.temperature}°C
              <small>{current.label}</small>
            </dd>
          </div>
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
                Gusts {current.windGusts} mph · {current.windDirection}°
              </small>
            </dd>
          </div>
          <div className={`is-${current.cloudBase.status}`}>
            <dt>Cloud base</dt>
            <dd>
              {current.cloudBase.metresAmsl} m
              <small>{current.cloudBase.label}</small>
            </dd>
          </div>
        </dl>
      </section>

      <AccountRequiredLock returnTo={returnTo} unlocked={signedIn}>
        <section className="peak-weather__daily" aria-label="Daily outlook">
          <h3>Daily outlook</h3>
          <p className="peak-weather__daily-hint">
            Select a day for hourly cloud base and conditions.
          </p>
          <ul>
            {daily.map((day) => {
              const dayHours = hoursByDay.get(day.date) ?? []
              const summary = summarizeDayHours(dayHours)
              const active = selectedDay === day.date
              const hasHourly = dayHours.length > 0

              return (
                <li key={day.date} className={active ? 'is-open' : ''}>
                  <button
                    type="button"
                    className={`peak-weather__day-btn ${active ? 'is-active' : ''}`}
                    aria-expanded={active}
                    disabled={!hasHourly || !signedIn}
                    onClick={() => toggleDay(day.date)}
                  >
                    <span className={`peak-weather__icon is-${day.kind}`}>
                      <WeatherIcon kind={day.kind} title={day.label} />
                    </span>
                    <span className="peak-weather__day-copy">
                      <strong>{formatForecastDay(day.date)}</strong>
                      <small>{day.label}</small>
                    </span>
                    <span className="peak-weather__temps">
                      <strong>
                        {day.tempMax}° / {day.tempMin}°
                      </strong>
                      <small>
                        {day.precipitation > 0
                          ? `${day.precipitation.toFixed(1)} mm`
                          : 'Dry'}
                        {' · '}
                        {day.windMax} mph
                      </small>
                      {hasHourly && (
                        <small className={`is-${summary.worstCloud}`}>
                          {summary.inCloudHours > 0
                            ? `${summary.inCloudHours}h in cloud`
                            : summary.nearHours > 0
                              ? `${summary.nearHours}h near`
                              : 'Summit clear'}
                        </small>
                      )}
                    </span>
                    <span className="peak-weather__day-chevron" aria-hidden="true">
                      {active ? '−' : '+'}
                    </span>
                  </button>

                  {active && (
                    <div className="peak-weather__day-hourly">
                      <div className="peak-weather__day-hourly-head">
                        <strong>Hourly · {formatForecastDay(day.date)}</strong>
                        {selectedHours.length > 0 && (
                          <span>
                            {selectedSummary.tempMax}° / {selectedSummary.tempMin}
                            ° · wind to {selectedSummary.windMax} mph
                            {selectedSummary.precipSum > 0
                              ? ` · ${selectedSummary.precipSum} mm`
                              : ' · dry'}
                          </span>
                        )}
                      </div>
                      <HourlyTable hours={selectedHours} />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        {peakId && (
          <p className="peak-weather__full-link">
            <a href={`/forecasts?peak=${encodeURIComponent(peakId)}`}>
              Full week forecast →
            </a>
          </p>
        )}
      </AccountRequiredLock>

     

      <p className="peak-weather__credit">
        Summit-adjusted forecast via {forecast.attribution}. Conditions on the
        hill can change quickly—always check a mountain-specific forecast before
        you go.
      </p>
    </div>
  )
}

function portalHost() {
  return (
    document.querySelector('.uk-map-panel, .map-panel, .uk-map-wrap, .map-wrap') ??
    document.body
  )
}

export function PeakWeather({
  name,
  coords,
  elevation,
  peakId,
  compact = false,
}: PeakWeatherProps) {
  const [forecast, setForecast] = useState<PeakWeatherForecast | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const [lng, lat] = coords

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setForecast(null)
    setOpen(false)

    fetchPeakWeather([lng, lat], elevation, {
      forecastDays: 5,
      maxHours: 120,
    })
      .then((data) => {
        if (!cancelled) setForecast(data)
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
  }, [lng, lat, elevation])

  useEffect(() => {
    if (!open || compact) return
    const root = rootRef.current
    if (!root) return

    const scroller = root.closest(
      '.explore-sidebar, .peak-card, .peak-panel',
    )
    if (scroller instanceof HTMLElement) {
      const top = root.offsetTop - 20
      scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
      return
    }

    root.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [open, compact])

  if (loading) {
    return (
      <div className={`peak-weather ${compact ? 'is-compact' : ''}`}>
        <div className="peak-weather__chip is-loading" aria-busy="true">
          <span className="peak-weather__icon-slot" aria-hidden="true" />
          <span>Loading summit weather…</span>
        </div>
      </div>
    )
  }

  if (error || !forecast) {
    return (
      <div className={`peak-weather ${compact ? 'is-compact' : ''}`}>
        <div className="peak-weather__chip is-error" role="status">
          <span>{error || 'Forecast unavailable right now.'}</span>
        </div>
      </div>
    )
  }

  const { current } = forecast

  const sheet =
    open &&
    compact &&
    createPortal(
      <div
        className="peak-weather-sheet"
        role="dialog"
        aria-label={`${name} forecast`}
      >
        <button
          className="peak-weather-sheet__backdrop"
          type="button"
          aria-label="Close forecast"
          onClick={() => setOpen(false)}
        />
        <div className="peak-weather-sheet__card">
          <ForecastPanel
            name={name}
            forecast={forecast}
            peakId={peakId}
            onClose={() => setOpen(false)}
          />
        </div>
      </div>,
      portalHost(),
    )

  return (
    <div
      ref={rootRef}
      className={`peak-weather ${compact ? 'is-compact' : ''} ${open ? 'is-open' : ''}`}
    >
      <button
        className="peak-weather__chip"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={`peak-weather__icon is-${current.kind}`}>
          <WeatherIcon kind={current.kind} title={current.label} />
        </span>
        <span className="peak-weather__summary">
          <strong>
            {current.label} · {current.temperature}°C
          </strong>
          <small>
            {current.windCompass} {current.windSpeed} mph
            {current.windGusts > current.windSpeed
              ? `, gusts ${current.windGusts}`
              : ''}
          </small>
          <small
            className={`peak-weather__cloudbase is-${current.cloudBase.status}`}
          >
            {current.cloudBase.label}
            {current.cloudCover > 0 ? ` · ${current.cloudCover}% cover` : ''}
          </small>
        </span>
        <span className="peak-weather__action">
          {open ? 'Hide' : 'Forecast'}
        </span>
      </button>

      {open && !compact && (
        <ForecastPanel name={name} forecast={forecast} peakId={peakId} />
      )}

      {sheet}
    </div>
  )
}
