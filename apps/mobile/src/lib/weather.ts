export type CompactForecast = {
  temperature: number
  windSpeed: number
  windGusts: number
  weatherCode: number
  cloudCover: number
}

export async function fetchCompactForecast(
  coords: [number, number],
  elevation: number,
): Promise<CompactForecast> {
  const [lng, lat] = coords
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    elevation: String(Math.round(elevation)),
    timezone: 'Europe/London',
    wind_speed_unit: 'mph',
    current: [
      'temperature_2m',
      'weather_code',
      'wind_speed_10m',
      'wind_gusts_10m',
      'cloud_cover',
    ].join(','),
  })
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?${params}`,
  )
  if (!response.ok) throw new Error('Weather unavailable')
  const data = (await response.json()) as {
    current?: {
      temperature_2m?: number
      weather_code?: number
      wind_speed_10m?: number
      wind_gusts_10m?: number
      cloud_cover?: number
    }
  }
  const current = data.current
  if (!current) throw new Error('Weather unavailable')
  return {
    temperature: Math.round(current.temperature_2m ?? 0),
    windSpeed: Math.round(current.wind_speed_10m ?? 0),
    windGusts: Math.round(current.wind_gusts_10m ?? 0),
    weatherCode: current.weather_code ?? 0,
    cloudCover: Math.round(current.cloud_cover ?? 0),
  }
}

export function weatherLabel(code: number) {
  if (code === 0) return 'Clear'
  if (code <= 3) return 'Partly cloudy'
  if (code <= 48) return 'Fog'
  if (code <= 67) return 'Rain'
  if (code <= 77) return 'Snow'
  if (code <= 82) return 'Showers'
  if (code <= 99) return 'Thunder'
  return 'Mixed'
}
