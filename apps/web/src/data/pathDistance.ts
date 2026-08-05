/** Haversine distance in metres. */
export function distanceMeters(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number,
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(a))
}

function distPointToSegment(
  lng: number,
  lat: number,
  a: [number, number],
  b: [number, number],
) {
  // Equirectangular local projection for short segments.
  const cosLat = Math.cos((lat * Math.PI) / 180)
  const x = lng * cosLat
  const y = lat
  const ax = a[0] * cosLat
  const ay = a[1]
  const bx = b[0] * cosLat
  const by = b[1]
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  if (len2 < 1e-18) return distanceMeters(lng, lat, a[0], a[1])
  let t = ((x - ax) * dx + (y - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const px = ax + t * dx
  const py = ay + t * dy
  return distanceMeters(lng, lat, px / cosLat, py)
}

function distPointToLineString(
  lng: number,
  lat: number,
  coords: [number, number][],
) {
  let best = Infinity
  for (let i = 0; i < coords.length - 1; i++) {
    best = Math.min(best, distPointToSegment(lng, lat, coords[i], coords[i + 1]))
  }
  return best
}

type MapLike = {
  getStyle: () => { layers?: Array<{ id: string; type: string }> } | undefined
  getLayer: (id: string) => unknown
  project: (lngLat: [number, number]) => { x: number; y: number }
  // Compatible with MapLibre/MapTiler Map; params intentionally loose for assignability.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryRenderedFeatures: (...args: any[]) => Array<{
    geometry?: {
      type?: string
      coordinates?: unknown
    } | null
  }>
}

function pathLayerIds(map: MapLike) {
  const layers = map.getStyle()?.layers ?? []
  return layers
    .filter((layer) => {
      if (layer.type !== 'line') return false
      if (!map.getLayer(layer.id)) return false
      return /path|track|foot|bridle|trail|walk|right.?of.?way|cycle/i.test(
        layer.id,
      )
    })
    .map((layer) => layer.id)
}

function collectLineCoords(geometry: {
  type?: string
  coordinates?: unknown
} | null): [number, number][][] {
  if (!geometry?.type || geometry.coordinates == null) return []
  if (geometry.type === 'LineString') {
    return [geometry.coordinates as [number, number][]]
  }
  if (geometry.type === 'MultiLineString') {
    return geometry.coordinates as [number, number][][]
  }
  return []
}

/** Nearest path distance using rendered MapTiler outdoor path/track layers. */
export function distanceToRenderedPathMeters(
  map: MapLike,
  lng: number,
  lat: number,
): number | null {
  const layers = pathLayerIds(map)
  if (!layers.length) return null

  const point = map.project([lng, lat])
  let best = Infinity

  for (const radius of [24, 60, 120, 240, 480]) {
    const features = map.queryRenderedFeatures(
      [
        [point.x - radius, point.y - radius],
        [point.x + radius, point.y + radius],
      ],
      { layers },
    )
    for (const feature of features) {
      if (!feature.geometry) continue
      for (const line of collectLineCoords(feature.geometry)) {
        best = Math.min(best, distPointToLineString(lng, lat, line))
      }
    }
    if (best < Infinity && best < radius * 1.5) break
  }

  return best < Infinity ? best : null
}

/** Overpass fallback when the style has no usable path layers in view. */
export async function distanceToOsmPathMeters(
  lng: number,
  lat: number,
  searchRadiusM = 1500,
): Promise<number | null> {
  const query = `
    [out:json][timeout:20];
    way["highway"~"^(path|footway|bridleway|track|steps)$"](around:${searchRadiusM},${lat},${lng});
    out geom;
  `
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  if (!res.ok) return null
  const data = (await res.json()) as {
    elements?: Array<{ geometry?: Array<{ lat: number; lon: number }> }>
  }
  let best = Infinity
  for (const el of data.elements ?? []) {
    const coords = (el.geometry ?? []).map(
      (node) => [node.lon, node.lat] as [number, number],
    )
    if (coords.length < 2) continue
    best = Math.min(best, distPointToLineString(lng, lat, coords))
  }
  return best < Infinity ? best : null
}

export async function measurePathDistanceMeters(
  map: MapLike,
  lng: number,
  lat: number,
): Promise<number | null> {
  const rendered = distanceToRenderedPathMeters(map, lng, lat)
  if (rendered != null) return rendered
  try {
    return await distanceToOsmPathMeters(lng, lat)
  } catch {
    return null
  }
}

export function formatPathDistance(meters: number | null | undefined) {
  if (meters == null || Number.isNaN(meters)) return 'Unknown'
  if (meters < 10) return 'On / beside path'
  if (meters < 1000) return `${Math.round(meters)} m from path`
  return `${(meters / 1000).toFixed(1)} km from path`
}
