import type { RouteCoord } from './multiDayRouteGeometry'

function mercatorToLngLat(x: number, y: number): RouteCoord {
  const lng = (x / 20037508.34) * 180
  let lat = (y / 20037508.34) * 180
  lat =
    (180 / Math.PI) *
    (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2)
  return [lng, lat]
}

function distM(a: RouteCoord, b: RouteCoord) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b[1] - a[1])
  const dLng = toRad(b[0] - a[0])
  const la1 = toRad(a[1])
  const la2 = toRad(b[1])
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

function simplify(coords: RouteCoord[], minM: number): RouteCoord[] {
  if (coords.length < 3) return coords
  const out: RouteCoord[] = [coords[0]!]
  for (let i = 1; i < coords.length - 1; i++) {
    if (distM(out[out.length - 1]!, coords[i]!) >= minM) out.push(coords[i]!)
  }
  const last = coords[coords.length - 1]!
  if (distM(out[out.length - 1]!, last) > 1) out.push(last)
  else out[out.length - 1] = last
  return out
}

function collectMercatorCoords(node: unknown, out: RouteCoord[]) {
  if (!node || typeof node !== 'object') return
  const obj = node as Record<string, unknown>

  const coordinates = obj.coordinates
  if (
    Array.isArray(coordinates) &&
    coordinates.length > 0 &&
    Array.isArray(coordinates[0]) &&
    typeof (coordinates[0] as unknown[])[0] === 'number'
  ) {
    for (const c of coordinates as number[][]) {
      if (c.length >= 2) out.push(mercatorToLngLat(c[0]!, c[1]!))
    }
  }

  if (Array.isArray(obj.ways)) {
    for (const way of obj.ways) {
      const w = way as Record<string, unknown>
      collectMercatorCoords(w.geometry ?? w, out)
    }
  }
  if (Array.isArray(obj.main)) {
    for (const part of obj.main) collectMercatorCoords(part, out)
  }
  if (Array.isArray(obj.segments)) {
    for (const part of obj.segments) collectMercatorCoords(part, out)
  }
  if (obj.geometry) collectMercatorCoords(obj.geometry, out)
  if (obj.route) collectMercatorCoords(obj.route, out)
}

function dedupe(coords: RouteCoord[]): RouteCoord[] {
  const out: RouteCoord[] = []
  for (const p of coords) {
    const prev = out[out.length - 1]
    if (!prev || prev[0] !== p[0] || prev[1] !== p[1]) out.push(p)
  }
  return out
}

const cache = new Map<number, Promise<RouteCoord[]>>()

async function fetchFromWaymarked(relationId: number): Promise<RouteCoord[]> {
  const url = `https://hiking.waymarkedtrails.org/api/v1/details/relation/${relationId}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Waymarked HTTP ${res.status}`)
  const data = await res.json()
  const raw: RouteCoord[] = []
  collectMercatorCoords(data, raw)
  const unique = dedupe(raw)
  if (unique.length < 2) throw new Error('Waymarked geometry empty')
  return unique
}

/** Overpass fallback — returns way geometries (may be unordered vs Waymarked). */
async function fetchFromOverpass(relationId: number): Promise<RouteCoord[]> {
  const query = `[out:json][timeout:90];relation(${relationId});>>;way._;out geom;`
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`)
  const data = (await res.json()) as {
    elements?: Array<{
      type: string
      geometry?: Array<{ lon: number; lat: number }>
    }>
  }
  const raw: RouteCoord[] = []
  for (const el of data.elements ?? []) {
    if (el.type !== 'way' || !el.geometry?.length) continue
    for (const node of el.geometry) raw.push([node.lon, node.lat])
  }
  const unique = dedupe(raw)
  if (unique.length < 2) throw new Error('Overpass geometry empty')
  return unique
}

/**
 * Load real OSM hiking-route geometry (follows paths).
 * Runs in the browser — no Cursor network prompt.
 */
export function fetchOsmTrailGeometry(relationId: number): Promise<RouteCoord[]> {
  const existing = cache.get(relationId)
  if (existing) return existing

  const promise = (async () => {
    let unique: RouteCoord[]
    try {
      unique = await fetchFromWaymarked(relationId)
    } catch {
      unique = await fetchFromOverpass(relationId)
    }

    let minM = 600
    let simplified = simplify(unique, minM)
    if (simplified.length > 260) simplified = simplify(unique, 1100)
    if (simplified.length < 50 && unique.length > 50) {
      simplified = simplify(unique, 350)
    }
    return simplified
  })()

  cache.set(relationId, promise)
  return promise
}
