import type { FeatureCollection } from 'geojson'
import { areas, type Area } from './areas'
import { areaPeaks, type AreaPeak } from './areaPeaks'

type LngLat = [number, number]

const maskExterior: LngLat[] = [
  [-25, 40],
  [15, 40],
  [15, 66],
  [-25, 66],
  [-25, 40],
]

export type AreaBoundaryProperties = {
  slug: string
  name: string
  nation: Area['nation']
  kind: Area['kind']
  color: string
  summary: string
}

export type AreaBoundaryFeature = {
  type: 'Feature'
  properties: AreaBoundaryProperties
  geometry: {
    type: 'Polygon'
    coordinates: LngLat[][]
  }
}

export type AreaBoundaryCollection = {
  type: 'FeatureCollection'
  features: AreaBoundaryFeature[]
}

function cross(o: LngLat, a: LngLat, b: LngLat) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
}

function convexHull(points: LngLat[]): LngLat[] {
  const unique = Array.from(
    new Map(points.map((point) => [`${point[0]},${point[1]}`, point])).values(),
  )

  if (unique.length === 1) {
    const [lng, lat] = unique[0]
    const pad = 0.12
    return [
      [lng - pad, lat - pad],
      [lng + pad, lat - pad],
      [lng + pad, lat + pad],
      [lng - pad, lat + pad],
      [lng - pad, lat - pad],
    ]
  }

  if (unique.length === 2) {
    const [a, b] = unique
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const len = Math.hypot(dx, dy) || 1
    const px = (-dy / len) * 0.1
    const py = (dx / len) * 0.1
    return [
      [a[0] + px, a[1] + py],
      [b[0] + px, b[1] + py],
      [b[0] - px, b[1] - py],
      [a[0] - px, a[1] - py],
      [a[0] + px, a[1] + py],
    ]
  }

  const sorted = [...unique].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const lower: LngLat[] = []
  for (const point of sorted) {
    while (
      lower.length >= 2 &&
      cross(lower[lower.length - 2], lower[lower.length - 1], point) <= 0
    ) {
      lower.pop()
    }
    lower.push(point)
  }

  const upper: LngLat[] = []
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    const point = sorted[i]
    while (
      upper.length >= 2 &&
      cross(upper[upper.length - 2], upper[upper.length - 1], point) <= 0
    ) {
      upper.pop()
    }
    upper.push(point)
  }

  lower.pop()
  upper.pop()
  const hull = [...lower, ...upper]
  return [...hull, hull[0]]
}

function expandRing(ring: LngLat[], pad: number): LngLat[] {
  const open = ring.slice(0, -1)
  if (!open.length) return ring

  let cx = 0
  let cy = 0
  for (const [lng, lat] of open) {
    cx += lng
    cy += lat
  }
  cx /= open.length
  cy /= open.length

  const expanded = open.map(([lng, lat]) => {
    const dx = lng - cx
    const dy = lat - cy
    const dist = Math.hypot(dx, dy) || 0.01
    const scale = (dist + pad) / dist
    return [cx + dx * scale, cy + dy * scale] as LngLat
  })

  return [...expanded, expanded[0]]
}

function padForPeaks(peaks: AreaPeak[]) {
  if (peaks.length < 8) return 0.14
  if (peaks.length < 40) return 0.1
  return 0.07
}

function boundaryForArea(area: Area, peaks: AreaPeak[]): AreaBoundaryFeature | null {
  if (!peaks.length) return null

  const hull = expandRing(
    convexHull(peaks.map((peak) => peak.coords)),
    padForPeaks(peaks),
  )

  return {
    type: 'Feature',
    properties: {
      slug: area.slug,
      name: area.name,
      nation: area.nation,
      kind: area.kind,
      color: area.color,
      summary: area.summary,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [hull],
    },
  }
}

export function getAreaBoundaryCollection(
  peaks: AreaPeak[],
  onlySlug?: string,
): AreaBoundaryCollection {
  const byArea = new Map<string, AreaPeak[]>()
  for (const peak of peaks) {
    const list = byArea.get(peak.area) ?? []
    list.push(peak)
    byArea.set(peak.area, list)
  }

  const features = areas
    .filter((area) => !onlySlug || area.slug === onlySlug)
    .map((area) => {
      const localPeaks = byArea.get(area.slug) ?? areaPeaks[area.slug] ?? []
      return boundaryForArea(area, localPeaks)
    })
    .filter((feature): feature is AreaBoundaryFeature => feature !== null)

  features.sort((a, b) => {
    const aSize = bboxArea(a.geometry.coordinates[0])
    const bSize = bboxArea(b.geometry.coordinates[0])
    return bSize - aSize
  })

  return {
    type: 'FeatureCollection',
    features,
  }
}

function bboxArea(ring: LngLat[]) {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const [x, y] of ring) {
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  return (maxX - minX) * (maxY - minY)
}

export function getAreaBoundaryFeature(
  area: Area,
  peaks: AreaPeak[],
): AreaBoundaryFeature | null {
  return boundaryForArea(area, peaks)
}

export function getAreaCameraBounds(
  peaks: AreaPeak[],
  pad = 0.2,
): [[number, number], [number, number]] | null {
  if (!peaks.length) return null

  const longitudes = peaks.map((peak) => peak.coords[0])
  const latitudes = peaks.map((peak) => peak.coords[1])
  const minLng = Math.min(...longitudes)
  const maxLng = Math.max(...longitudes)
  const minLat = Math.min(...latitudes)
  const maxLat = Math.max(...latitudes)
  const spanPad = Math.max(pad, (maxLng - minLng) * 0.12, (maxLat - minLat) * 0.12)

  return [
    [minLng - spanPad, minLat - spanPad],
    [maxLng + spanPad, maxLat + spanPad],
  ]
}

export function getAreaOutsideMask(
  boundary: AreaBoundaryFeature,
): FeatureCollection {
  const ring = boundary.geometry.coordinates[0]
  const hole = [...ring].reverse()
  if (
    hole[0][0] !== hole[hole.length - 1][0] ||
    hole[0][1] !== hole[hole.length - 1][1]
  ) {
    hole.push(hole[0])
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { id: `${boundary.properties.slug}-outside` },
        geometry: {
          type: 'Polygon',
          coordinates: [maskExterior, hole],
        },
      },
    ],
  }
}
