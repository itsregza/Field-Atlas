import { MapStyle } from '@maptiler/sdk'
import type { StyleSpecification } from 'maplibre-gl'

export type BasemapId = 'map' | 'satellite'

/** Shared camera limits for every Field Atlas map. */
export const MAP_MIN_ZOOM = 4
export const MAP_MAX_ZOOM = 18

export const ukMaxBounds: [[number, number], [number, number]] = [
  [-16.5, 48.0],
  [7.5, 62.5],
]

type StyleLayer = {
  id: string
  type: string
  layout?: Record<string, unknown>
  paint?: Record<string, unknown>
  'source-layer'?: string
}

type StyleSpec = {
  layers: StyleLayer[]
  [key: string]: unknown
}

const OUTDOOR_STYLE_URL = 'https://api.maptiler.com/maps/outdoor-v4/style.json'

let outdoorStylePromise: Promise<StyleSpec> | null = null
let outdoorStyleKey: string | null = null

export function resetOutdoorStyleCache() {
  outdoorStylePromise = null
  outdoorStyleKey = null
}

function shouldHideBasemapLayer(layer: StyleLayer) {
  const { id, type } = layer
  if (/^fa-/.test(id)) return false
  if (id === 'Outdoor water symbol' || id === 'Outdoor water') return true
  if (
    layer['source-layer'] === 'water' ||
    layer['source-layer'] === 'waterway' ||
    layer['source-layer'] === 'water_label' ||
    layer['source-layer'] === 'water_centroid'
  ) {
    return true
  }
  if (layer['source-layer'] === 'trail' || layer['source-layer'] === 'pathway') {
    return true
  }

  const lower = id.toLowerCase()
  if (/^(water|reef|river|stream|lake labels|pond labels|ocean labels|bay labels|sea labels)/.test(lower)) {
    return true
  }
  if (type !== 'line' && type !== 'symbol') return false

  return (
    /path|foot|trail|track|walk|bridle|steps|pedestrian|ferrata|pathway/.test(
      lower,
    ) &&
    !/motorway|trunk|primary|secondary|tertiary|road|street|railway|\brail\b|waterway|river|contour|boundary|admin|building|area-|uk-|pitching-|region|peak|slope|mask/.test(
      lower,
    )
  )
}

function patchOutdoorStyle(style: StyleSpec): StyleSpec {
  return {
    ...style,
    layers: style.layers.map((layer) => {
      const hide = shouldHideBasemapLayer(layer)
      const isTrail =
        layer['source-layer'] === 'trail' ||
        layer['source-layer'] === 'pathway' ||
        (/path|foot|trail|track|walk|bridle|steps|pedestrian|ferrata|pathway/.test(
          layer.id.toLowerCase(),
        ) &&
          (layer.type === 'line' || layer.type === 'symbol'))

      // Keep trail layers drawable when zoomed out (style defaults often hide them early).
      const base = isTrail ? { ...layer, minzoom: 0 } : { ...layer }
      if (!hide) return base

      const paint = { ...(base.paint ?? {}) }
      if (base.type === 'line') paint['line-opacity'] = 0
      if (base.type === 'fill') paint['fill-opacity'] = 0
      if (base.type === 'symbol') {
        paint['icon-opacity'] = 0
        paint['text-opacity'] = 0
      }

      return {
        ...base,
        layout: { ...(base.layout ?? {}), visibility: 'none' },
        paint,
      }
    }),
  }
}

/** Sync style for MapTiler presets (tracker / satellite swap helpers). */
export function basemapStyle(basemap: BasemapId) {
  return basemap === 'satellite'
    ? MapStyle.HYBRID.DEFAULT
    : MapStyle.OUTDOOR.DEFAULT
}

export async function resolveBasemapStyle(
  basemap: BasemapId,
  apiKey: string,
): Promise<ReturnType<typeof basemapStyle> | StyleSpecification> {
  if (basemap === 'satellite') {
    return MapStyle.HYBRID.DEFAULT
  }

  if (outdoorStyleKey !== apiKey) {
    resetOutdoorStyleCache()
    outdoorStyleKey = apiKey
  }

  if (!outdoorStylePromise) {
    outdoorStylePromise = fetch(`${OUTDOOR_STYLE_URL}?key=${apiKey}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load outdoor map style')
        return res.json() as Promise<StyleSpec>
      })
      .then(patchOutdoorStyle)
  }

  return outdoorStylePromise.then(
    (style) => JSON.parse(JSON.stringify(style)) as StyleSpecification,
  )
}
