export type WeatherKind =
  | 'clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'storm'

export type CloudBaseInfo = {
  /** Approximate cloud base above sea level (metres). */
  metresAmsl: number
  /** Metres above the summit. Negative = summit likely in cloud. */
  metresAboveSummit: number
  /** Plain-language status for the summit. */
  status: 'clear' | 'near' | 'in-cloud'
  label: string
  shortLabel: string
}

export type CurrentWeather = {
  time: string
  temperature: number
  weatherCode: number
  kind: WeatherKind
  label: string
  windSpeed: number
  windGusts: number
  windDirection: number
  windCompass: string
  precipitation: number
  dewPoint: number
  humidity: number
  cloudCover: number
  cloudCoverLow: number
  cloudCoverMid: number
  cloudCoverHigh: number
  visibilityKm: number | null
  pressureHpa: number | null
  cloudBase: CloudBaseInfo
}

export type HourlyForecast = {
  time: string
  temperature: number
  weatherCode: number
  kind: WeatherKind
  label: string
  windSpeed: number
  windGusts: number
  windDirection: number
  windCompass: string
  precipitation: number
  dewPoint: number
  humidity: number
  cloudCover: number
  cloudCoverLow: number
  visibilityKm: number | null
  cloudBase: CloudBaseInfo
}

export type DailyForecast = {
  date: string
  weatherCode: number
  kind: WeatherKind
  label: string
  tempMax: number
  tempMin: number
  precipitation: number
  windMax: number
  windGusts: number
}

export type PeakWeatherForecast = {
  elevation: number
  summitElevation: number
  current: CurrentWeather
  hourly: HourlyForecast[]
  daily: DailyForecast[]
  attribution: string
}

type OpenMeteoResponse = {
  elevation?: number
  current?: {
    time: string
    temperature_2m: number
    weather_code: number
    wind_speed_10m: number
    wind_gusts_10m: number
    wind_direction_10m: number
    precipitation: number
    dew_point_2m: number
    relative_humidity_2m: number
    cloud_cover: number
    cloud_cover_low: number
    cloud_cover_mid: number
    cloud_cover_high: number
    visibility?: number
    surface_pressure?: number
  }
  hourly?: {
    time: string[]
    temperature_2m: number[]
    weather_code: number[]
    wind_speed_10m: number[]
    wind_gusts_10m: number[]
    wind_direction_10m: number[]
    precipitation: number[]
    dew_point_2m: number[]
    relative_humidity_2m: number[]
    cloud_cover: number[]
    cloud_cover_low: number[]
    visibility?: number[]
  }
  daily?: {
    time: string[]
    weather_code: number[]
    temperature_2m_max: number[]
    temperature_2m_min: number[]
    precipitation_sum: number[]
    wind_speed_10m_max: number[]
    wind_gusts_10m_max: number[]
  }
}

const cache = new Map<string, { at: number; data: PeakWeatherForecast }>()
const CACHE_MS = 15 * 60 * 1000

const COMPASS = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
] as const

export function windCompass(degrees: number) {
  const index = Math.round((((degrees % 360) + 360) % 360) / 22.5) % 16
  return COMPASS[index]
}

export function weatherKind(code: number): WeatherKind {
  if (code === 0) return 'clear'
  if (code <= 2) return 'partly-cloudy'
  if (code === 3) return 'cloudy'
  if (code === 45 || code === 48) return 'fog'
  if (code >= 51 && code <= 57) return 'drizzle'
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain'
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow'
  if (code >= 95) return 'storm'
  return 'cloudy'
}

export function weatherLabel(code: number): string {
  switch (weatherKind(code)) {
    case 'clear':
      return 'Clear'
    case 'partly-cloudy':
      return code === 1 ? 'Mainly clear' : 'Partly cloudy'
    case 'cloudy':
      return 'Overcast'
    case 'fog':
      return 'Fog'
    case 'drizzle':
      return 'Drizzle'
    case 'rain':
      return code >= 80 ? 'Showers' : 'Rain'
    case 'snow':
      return 'Snow'
    case 'storm':
      return 'Thunderstorm'
  }
}

/**
 * Approximate cloud-base height (AMSL) from temperature / dew point.
 * Rule of thumb: base AGL ≈ (T − Td) × 125 m, added to model elevation.
 */
export function estimateCloudBase(
  temperatureC: number,
  dewPointC: number,
  modelElevationM: number,
  summitElevationM: number,
): CloudBaseInfo {
  const spread = Math.max(0, temperatureC - dewPointC)
  const metresAgl = Math.round(spread * 125)
  const metresAmsl = Math.round(modelElevationM + metresAgl)
  const metresAboveSummit = metresAmsl - Math.round(summitElevationM)

  if (metresAboveSummit <= 0) {
    return {
      metresAmsl,
      metresAboveSummit,
      status: 'in-cloud',
      label: 'Summit likely in cloud',
      shortLabel: 'In cloud',
    }
  }
  if (metresAboveSummit <= 150) {
    return {
      metresAmsl,
      metresAboveSummit,
      status: 'near',
      label: `Cloud base near summit (~${metresAboveSummit} m above)`,
      shortLabel: `~${metresAboveSummit} m clear`,
    }
  }
  return {
    metresAmsl,
    metresAboveSummit,
    status: 'clear',
    label: `Cloud base ~${metresAmsl} m (${metresAboveSummit} m above summit)`,
    shortLabel: `${metresAmsl} m`,
  }
}

export type FetchPeakWeatherOptions = {
  /** Open-Meteo forecast length (1–16). Default 5. */
  forecastDays?: number
  /** Cap on returned hourly rows from “now”. Default 36. */
  maxHours?: number
}

function cacheKey(
  lat: number,
  lng: number,
  elevation: number,
  options: Required<FetchPeakWeatherOptions>,
) {
  return `v4:${lat.toFixed(3)},${lng.toFixed(3)},${Math.round(elevation)}:${options.forecastDays}:${options.maxHours}`
}

function metresFromVisibility(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return Math.round((value / 1000) * 10) / 10
}

export async function fetchPeakWeather(
  coords: [number, number],
  elevation: number,
  options: FetchPeakWeatherOptions = {},
): Promise<PeakWeatherForecast> {
  const forecastDays = Math.min(16, Math.max(1, options.forecastDays ?? 5))
  const maxHours = Math.max(1, options.maxHours ?? 36)
  const resolved = { forecastDays, maxHours }

  const [lng, lat] = coords
  const key = cacheKey(lat, lng, elevation, resolved)
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data

  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    elevation: String(Math.round(elevation)),
    timezone: 'Europe/London',
    forecast_days: String(forecastDays),
    wind_speed_unit: 'mph',
    current: [
      'temperature_2m',
      'weather_code',
      'wind_speed_10m',
      'wind_gusts_10m',
      'wind_direction_10m',
      'precipitation',
      'dew_point_2m',
      'relative_humidity_2m',
      'cloud_cover',
      'cloud_cover_low',
      'cloud_cover_mid',
      'cloud_cover_high',
      'visibility',
      'surface_pressure',
    ].join(','),
    hourly: [
      'temperature_2m',
      'weather_code',
      'wind_speed_10m',
      'wind_gusts_10m',
      'wind_direction_10m',
      'precipitation',
      'dew_point_2m',
      'relative_humidity_2m',
      'cloud_cover',
      'cloud_cover_low',
      'visibility',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
    ].join(','),
  })

  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`,
  )
  if (!response.ok) {
    throw new Error(`Weather request failed (${response.status})`)
  }

  const payload = (await response.json()) as OpenMeteoResponse
  if (!payload.current || !payload.daily || !payload.hourly) {
    throw new Error('Weather response incomplete')
  }

  const currentCode = payload.current.weather_code
  const modelElevation = payload.elevation ?? elevation
  const cloudBase = estimateCloudBase(
    payload.current.temperature_2m,
    payload.current.dew_point_2m,
    modelElevation,
    elevation,
  )

  const now = Date.now()
  const hourly: HourlyForecast[] = []
  for (let index = 0; index < payload.hourly.time.length; index += 1) {
    const time = payload.hourly.time[index]
    const stamp = new Date(time).getTime()
    if (Number.isNaN(stamp) || stamp < now - 60 * 60 * 1000) continue
    if (hourly.length >= maxHours) break

    const code = payload.hourly.weather_code[index]
    const temp = payload.hourly.temperature_2m[index]
    const dew = payload.hourly.dew_point_2m[index]
    const windDirection = payload.hourly.wind_direction_10m[index]
    hourly.push({
      time,
      temperature: Math.round(temp),
      weatherCode: code,
      kind: weatherKind(code),
      label: weatherLabel(code),
      windSpeed: Math.round(payload.hourly.wind_speed_10m[index]),
      windGusts: Math.round(payload.hourly.wind_gusts_10m[index]),
      windDirection: Math.round(windDirection),
      windCompass: windCompass(windDirection),
      precipitation: payload.hourly.precipitation[index],
      dewPoint: Math.round(dew),
      humidity: Math.round(payload.hourly.relative_humidity_2m[index]),
      cloudCover: Math.round(payload.hourly.cloud_cover[index]),
      cloudCoverLow: Math.round(payload.hourly.cloud_cover_low[index]),
      visibilityKm: metresFromVisibility(payload.hourly.visibility?.[index]),
      cloudBase: estimateCloudBase(temp, dew, modelElevation, elevation),
    })
  }

  const data: PeakWeatherForecast = {
    elevation: modelElevation,
    summitElevation: Math.round(elevation),
    current: {
      time: payload.current.time,
      temperature: Math.round(payload.current.temperature_2m),
      weatherCode: currentCode,
      kind: weatherKind(currentCode),
      label: weatherLabel(currentCode),
      windSpeed: Math.round(payload.current.wind_speed_10m),
      windGusts: Math.round(payload.current.wind_gusts_10m),
      windDirection: Math.round(payload.current.wind_direction_10m),
      windCompass: windCompass(payload.current.wind_direction_10m),
      precipitation: payload.current.precipitation,
      dewPoint: Math.round(payload.current.dew_point_2m),
      humidity: Math.round(payload.current.relative_humidity_2m),
      cloudCover: Math.round(payload.current.cloud_cover),
      cloudCoverLow: Math.round(payload.current.cloud_cover_low),
      cloudCoverMid: Math.round(payload.current.cloud_cover_mid),
      cloudCoverHigh: Math.round(payload.current.cloud_cover_high),
      visibilityKm: metresFromVisibility(payload.current.visibility),
      pressureHpa:
        typeof payload.current.surface_pressure === 'number'
          ? Math.round(payload.current.surface_pressure)
          : null,
      cloudBase,
    },
    hourly,
    daily: payload.daily.time.map((date, index) => {
      const code = payload.daily!.weather_code[index]
      return {
        date,
        weatherCode: code,
        kind: weatherKind(code),
        label: weatherLabel(code),
        tempMax: Math.round(payload.daily!.temperature_2m_max[index]),
        tempMin: Math.round(payload.daily!.temperature_2m_min[index]),
        precipitation: payload.daily!.precipitation_sum[index],
        windMax: Math.round(payload.daily!.wind_speed_10m_max[index]),
        windGusts: Math.round(payload.daily!.wind_gusts_10m_max[index]),
      }
    }),
    attribution: 'Open-Meteo',
  }

  cache.set(key, { at: Date.now(), data })
  return data
}

export function formatForecastDay(date: string) {
  const value = new Date(`${date}T12:00:00`)
  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)

  if (value.toDateString() === today.toDateString()) return 'Today'
  if (value.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return value.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })
}

export function formatForecastHour(iso: string) {
  const value = new Date(iso)
  return value.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatForecastHourDay(iso: string) {
  const value = new Date(iso)
  const today = new Date()
  if (value.toDateString() === today.toDateString()) return 'Today'
  return value.toLocaleDateString('en-GB', { weekday: 'short' })
}

/** Calendar date key in Europe/London local wall time (YYYY-MM-DD). */
export function forecastDayKey(iso: string) {
  const value = new Date(iso)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value)
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}`
}

export function groupHourlyByDay(hourly: HourlyForecast[]) {
  const groups: Array<{ date: string; hours: HourlyForecast[] }> = []
  for (const hour of hourly) {
    const date = forecastDayKey(hour.time)
    const last = groups[groups.length - 1]
    if (last && last.date === date) {
      last.hours.push(hour)
    } else {
      groups.push({ date, hours: [hour] })
    }
  }
  return groups
}

export function summarizeDayHours(hours: HourlyForecast[]) {
  if (!hours.length) {
    return {
      tempMax: 0,
      tempMin: 0,
      windMax: 0,
      precipSum: 0,
      inCloudHours: 0,
      nearHours: 0,
      worstCloud: 'clear' as CloudBaseInfo['status'],
    }
  }

  let tempMax = -Infinity
  let tempMin = Infinity
  let windMax = 0
  let precipSum = 0
  let inCloudHours = 0
  let nearHours = 0

  for (const hour of hours) {
    tempMax = Math.max(tempMax, hour.temperature)
    tempMin = Math.min(tempMin, hour.temperature)
    windMax = Math.max(windMax, hour.windGusts, hour.windSpeed)
    precipSum += hour.precipitation
    if (hour.cloudBase.status === 'in-cloud') inCloudHours += 1
    if (hour.cloudBase.status === 'near') nearHours += 1
  }

  const worstCloud: CloudBaseInfo['status'] =
    inCloudHours > 0 ? 'in-cloud' : nearHours > 0 ? 'near' : 'clear'

  return {
    tempMax,
    tempMin,
    windMax,
    precipSum: Math.round(precipSum * 10) / 10,
    inCloudHours,
    nearHours,
    worstCloud,
  }
}
