type MapLike = {
  getStyle: () =>
    | { layers?: Array<{ id: string; type: string; 'source-layer'?: string }> }
    | undefined
  getLayer: (id: string) => unknown
  isStyleLoaded?: () => boolean
}

export type FilterMap = MapLike & {
  getZoom?: () => number
  setLayoutProperty: (
    layerId: string,
    name: string,
    value: string | number | number[],
  ) => void
  setPaintProperty: (layerId: string, name: string, value: unknown) => void
  setLayerZoomRange?: (layerId: string, minzoom: number, maxzoom: number) => void
  getSource: (id: string) => { setData?: (data: object) => void } | undefined
  addSource: (id: string, source: object) => void
  addLayer: (layer: object, beforeId?: string) => void
  moveLayer?: (layerId: string, beforeId?: string) => void
  removeLayer?: (id: string) => void
}

export const waterSourceSourceId = 'fa-water-sources'
export const waterSourceLayerId = 'fa-water-source-points'
export const pathOverlaySourceId = 'fa-path-overlay'
export const pathOverlayLayerId = 'fa-path-overlay-lines'

const EMPTY_GEOJSON = { type: 'FeatureCollection' as const, features: [] }

const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
]

const PATH_LINE_WIDTH: unknown = [
  'interpolate',
  ['linear'],
  ['zoom'],
  4,
  1.35,
  6,
  1.7,
  8,
  2.05,
  11,
  2.4,
  14,
  2.9,
  17,
  3.4,
]

function isTrailBasemapLayer(layer: {
  id: string
  type: string
  'source-layer'?: string
}) {
  if (layer['source-layer'] === 'trail' || layer['source-layer'] === 'pathway') {
    return true
  }
  const lower = layer.id.toLowerCase()
  return (
    /^(path|track|steps|pedestrian|via ferrata|other trails|longdistance trail|bicycle longdistance|yellow trail|green trail|blue trail|brown trail|black trail|purple trail|orange trail|red trail|tunnel path)/.test(
      lower,
    ) &&
    (layer.type === 'line' || layer.type === 'symbol')
  )
}

function styleReady(map: FilterMap) {
  const hasLayers = Boolean(map.getStyle()?.layers?.length)
  if (!hasLayers) return false
  if (typeof map.isStyleLoaded === 'function') {
    try {
      return map.isStyleLoaded() || hasLayers
    } catch {
      return hasLayers
    }
  }
  return hasLayers
}

function hideLayer(map: FilterMap, layerId: string, type?: string) {
  if (!map.getLayer(layerId)) return
  try {
    map.setLayoutProperty(layerId, 'visibility', 'none')
  } catch {
  }
  if (type === 'line') {
    try {
      map.setPaintProperty(layerId, 'line-opacity', 0)
    } catch {
    }
  }
  if (type === 'fill') {
    try {
      map.setPaintProperty(layerId, 'fill-opacity', 0)
    } catch {
    }
  }
  if (type === 'symbol') {
    try {
      map.setPaintProperty(layerId, 'icon-opacity', 0)
      map.setPaintProperty(layerId, 'text-opacity', 0)
    } catch {
    }
  }
}

function showLayer(map: FilterMap, layerId: string, type?: string) {
  if (!map.getLayer(layerId)) return
  map.setLayoutProperty(layerId, 'visibility', 'visible')
  if (type === 'line') {
    try {
      map.setPaintProperty(layerId, 'line-opacity', 1)
    } catch {
    }
  }
  if (type === 'fill') {
    try {
      map.setPaintProperty(layerId, 'fill-opacity', 1)
    } catch {
    }
  }
  if (type === 'symbol') {
    try {
      map.setPaintProperty(layerId, 'icon-opacity', 1)
      map.setPaintProperty(layerId, 'text-opacity', 1)
    } catch {
    }
  }
}

function setLayerVisible(map: FilterMap, layerId: string, visible: boolean) {
  if (!map.getLayer(layerId)) return
  map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
}

function raiseOverlayLayers(map: FilterMap) {
  if (!map.moveLayer) return
  if (map.getLayer(waterSourceLayerId)) map.moveLayer(waterSourceLayerId)
}

function isBasemapWaterLayer(layer: {
  id: string
  type: string
  'source-layer'?: string
}) {
  const sourceLayer = layer['source-layer']
  if (
    sourceLayer === 'water' ||
    sourceLayer === 'waterway' ||
    sourceLayer === 'water_label' ||
    sourceLayer === 'water_centroid'
  ) {
    return true
  }
  if (layer.id === 'Outdoor water symbol' || layer.id === 'Outdoor water') {
    return true
  }
  if (sourceLayer === 'outdoor_poi' && /water/i.test(layer.id)) return true
  return /^(water|reef|river|stream|lake labels|pond labels|ocean labels|bay labels|sea labels)/i.test(
    layer.id,
  )
}

export function setBasemapWaterVisible(map: FilterMap, visible: boolean) {
  if (!styleReady(map)) return
  for (const layer of map.getStyle()?.layers ?? []) {
    if (!isBasemapWaterLayer(layer)) continue
    if (visible) showLayer(map, layer.id, layer.type)
    else hideLayer(map, layer.id, layer.type)
  }
}

export function setBasemapPathsVisible(map: FilterMap, visible: boolean) {
  if (!styleReady(map)) return
  for (const layer of map.getStyle()?.layers ?? []) {
    if (!isTrailBasemapLayer(layer)) continue
    if (!visible) {
      hideLayer(map, layer.id, layer.type)
      continue
    }

    showLayer(map, layer.id, layer.type)
    if (map.setLayerZoomRange) {
      try {
        // Allow paths at overview zooms; MapLibre will overzoom tiles if needed.
        map.setLayerZoomRange(layer.id, 0, 24)
      } catch {
      }
    }
    if (layer.type !== 'line') continue
    try {
      map.setPaintProperty(layer.id, 'line-color', '#9a3412')
      map.setPaintProperty(layer.id, 'line-opacity', 0.95)
      map.setPaintProperty(layer.id, 'line-width', PATH_LINE_WIDTH)
    } catch {
    }
  }
}

export type WaterSourceFeature = {
  type: 'Feature'
  geometry: { type: 'Point'; coordinates: [number, number] }
  properties: { name: string; kind: string }
}

async function queryOverpass<T>(query: string): Promise<T | null> {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        body: query,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
      if (!res.ok) continue
      return (await res.json()) as T
    } catch {
    }
  }
  return null
}

export async function fetchWaterSourcesInBbox(
  south: number,
  west: number,
  north: number,
  east: number,
) {
  const query = `
    [out:json][timeout:25];
    (
      node["amenity"="drinking_water"](${south},${west},${north},${east});
      node["natural"="spring"](${south},${west},${north},${east});
      node["man_made"="water_well"](${south},${west},${north},${east});
    );
    out body;
  `

  const data = await queryOverpass<{
    elements?: Array<{
      lat: number
      lon: number
      tags?: Record<string, string>
    }>
  }>(query)

  if (!data?.elements?.length) return EMPTY_GEOJSON

  const features: WaterSourceFeature[] = data.elements.map((el) => ({
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [el.lon, el.lat],
    },
    properties: {
      name: el.tags?.name ?? 'Water source',
      kind:
        el.tags?.amenity === 'drinking_water'
          ? 'Tap'
          : el.tags?.natural === 'spring'
            ? 'Spring'
            : 'Well',
    },
  }))

  return { type: 'FeatureCollection' as const, features }
}

function ensureWaterOverlayLayer(map: FilterMap) {
  if (!map.getSource(waterSourceSourceId)) {
    map.addSource(waterSourceSourceId, {
      type: 'geojson',
      data: EMPTY_GEOJSON,
    })
  }

  if (!map.getLayer(waterSourceLayerId)) {
    map.addLayer({
      id: waterSourceLayerId,
      type: 'circle',
      source: waterSourceSourceId,
      layout: {
        visibility: 'none',
      },
      paint: {
        'circle-color': '#0d6e9a',
        'circle-radius': [
          'interpolate',
          ['linear'],
          ['zoom'],
          9,
          6,
          13,
          10,
          15,
          12,
        ],
        'circle-stroke-color': '#fffdf4',
        'circle-stroke-width': 2,
        'circle-opacity': 1,
      },
    })
  }
}

export function clearPathOverlay(map: FilterMap) {
  if (map.getLayer(pathOverlayLayerId) && map.removeLayer) {
    map.removeLayer(pathOverlayLayerId)
  }
  map.getSource(pathOverlaySourceId)?.setData?.(EMPTY_GEOJSON)
}

export function clearWaterOverlay(map: FilterMap) {
  map.getSource(waterSourceSourceId)?.setData?.(EMPTY_GEOJSON)
}

export function syncMapFilters(
  map: FilterMap,
  showPaths: boolean,
  showWater: boolean,
) {
  if (!styleReady(map)) return

  setBasemapWaterVisible(map, showWater)
  setBasemapPathsVisible(map, showPaths)
  ensureWaterOverlayLayer(map)

  if (showWater) {
    setLayerVisible(map, waterSourceLayerId, true)
  } else {
    setLayerVisible(map, waterSourceLayerId, false)
    clearWaterOverlay(map)
  }

  raiseOverlayLayers(map)
}
