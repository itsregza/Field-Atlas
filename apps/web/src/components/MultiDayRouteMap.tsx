import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Map as TilerMap,
  Popup,
  config,
  type GeoJSONSource,
} from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import type { AreaPeak } from '../data/areaPeaks'
import {
  type BasemapId,
  basemapStyle,
  resolveBasemapStyle,
  ukMaxBounds,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
} from '../data/mapBasemap'
import { addUkMaskLayer } from '../data/ukMask'
import type { MultiDayRoute } from '../data/multiDayRoutes'
import { syncMapFilters, type FilterMap } from '../data/mapLayers'
import { fetchOsmTrailGeometry } from '../data/osmTrailGeometry'
import type { RouteCoord } from '../data/multiDayRouteGeometry'

type MultiDayRouteMapProps = {
  route: MultiDayRoute
  peaks: AreaPeak[]
}

const routeSourceId = 'md-route'
const peaksSourceId = 'md-peaks'
const endsSourceId = 'md-ends'

function routeBounds(
  coords: RouteCoord[],
): [[number, number], [number, number]] {
  let minLng = Infinity
  let minLat = Infinity
  let maxLng = -Infinity
  let maxLat = -Infinity
  for (const [lng, lat] of coords) {
    if (lng < minLng) minLng = lng
    if (lat < minLat) minLat = lat
    if (lng > maxLng) maxLng = lng
    if (lat > maxLat) maxLat = lat
  }
  const padLng = Math.max((maxLng - minLng) * 0.06, 0.04)
  const padLat = Math.max((maxLat - minLat) * 0.35, 0.08)
  return [
    [minLng - padLng, minLat - padLat],
    [maxLng + padLng, maxLat + padLat],
  ]
}

function endsCollection(
  coords: RouteCoord[],
  startLabel: string,
  finishLabel: string,
) {
  if (coords.length < 2) {
    return { type: 'FeatureCollection' as const, features: [] }
  }
  const start = coords[0]!
  const end = coords[coords.length - 1]!
  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: start },
        properties: { kind: 'start', label: startLabel },
      },
      {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: end },
        properties: { kind: 'end', label: finishLabel },
      },
    ],
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

export function MultiDayRouteMap({ route, peaks }: MultiDayRouteMapProps) {
  const [basemap, setBasemap] = useState<BasemapId>('map')
  const [lineCoords, setLineCoords] = useState<RouteCoord[]>(route.route)
  const [pathStatus, setPathStatus] = useState<'loading' | 'ready' | 'fallback'>(
    route.osmRelationId ? 'loading' : 'fallback',
  )
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<TilerMap | null>(null)
  const routeRef = useRef(route)
  const peaksRef = useRef(peaks)
  const lineRef = useRef(lineCoords)
  const rebuildOverlays = useRef<(() => void) | null>(null)
  const skipBasemapSwap = useRef(true)
  const apiKey = import.meta.env.VITE_MAPTILER_KEY?.trim()

  routeRef.current = route
  peaksRef.current = peaks
  lineRef.current = lineCoords

  useEffect(() => {
    setLineCoords(route.route)
    if (!route.osmRelationId) {
      setPathStatus('fallback')
      return
    }
    // Skye already ships OSM geometry locally — treat as ready.
    if (route.id === 'skye-trail' && route.route.length > 40) {
      setPathStatus('ready')
    } else {
      setPathStatus('loading')
    }
    let cancelled = false
    void fetchOsmTrailGeometry(route.osmRelationId)
      .then((coords) => {
        if (cancelled || coords.length < 2) return
        setLineCoords(coords)
        setPathStatus('ready')
      })
      .catch(() => {
        if (!cancelled) setPathStatus('fallback')
      })
    return () => {
      cancelled = true
    }
  }, [route.id, route.osmRelationId, route.route])

  const peakCollection = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: peaks.map((peak) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: peak.coords,
        },
        properties: {
          id: peak.id,
          name: peak.name,
          height: peak.height,
          highlight: route.peakIds.includes(peak.id) ? 1 : 0,
        },
      })),
    }),
    [peaks, route.peakIds],
  )

  const routeFeature = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: { id: route.id, name: route.name },
      geometry: {
        type: 'LineString' as const,
        coordinates: lineCoords,
      },
    }),
    [route.id, route.name, lineCoords],
  )

  useEffect(() => {
    if (!container.current || !apiKey) return

    config.apiKey = apiKey
    let cancelled = false
    let map: TilerMap | null = null
    let popup: Popup | null = null

    const clearPopup = () => {
      popup?.remove()
      popup = null
    }

    void resolveBasemapStyle('map', apiKey).then((style) => {
      if (cancelled || !container.current) return

      map = new TilerMap({
        container: container.current,
        style,
        bounds: routeBounds(lineRef.current),
        fitBoundsOptions: { padding: 56, maxZoom: 10 },
        maxBounds: ukMaxBounds,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_MAX_ZOOM,
        navigationControl: true,
        geolocateControl: false,
        terrainControl: false,
        scaleControl: true,
      })
      mapRef.current = map

      const paintOverlays = () => {
        if (!map) return
        const currentRoute = routeRef.current
        const currentPeaks = peaksRef.current
        const currentLine = lineRef.current

        // Keep basemap walking paths off so they don't clash with the route line.
        syncMapFilters(map as FilterMap, false, false)

        if (!map.getSource(routeSourceId)) {
          map.addSource(routeSourceId, {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: { id: currentRoute.id, name: currentRoute.name },
                  geometry: {
                    type: 'LineString',
                    coordinates: currentLine,
                  },
                },
              ],
            },
          })
          map.addLayer({
            id: 'md-route-halo',
            type: 'line',
            source: routeSourceId,
            paint: {
              'line-color': '#fffdf4',
              'line-width': 7,
              'line-opacity': 0.9,
            },
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
            },
          })
          map.addLayer({
            id: 'md-route-line',
            type: 'line',
            source: routeSourceId,
            paint: {
              'line-color': '#8b3a2a',
              'line-width': 3.25,
              'line-opacity': 1,
            },
            layout: {
              'line-cap': 'round',
              'line-join': 'round',
            },
          })
        }

        if (!map.getSource(endsSourceId)) {
          map.addSource(endsSourceId, {
            type: 'geojson',
            data: endsCollection(
              currentLine,
              currentRoute.start,
              currentRoute.finish,
            ),
          })
          map.addLayer({
            id: 'md-ends-circles',
            type: 'circle',
            source: endsSourceId,
            paint: {
              'circle-radius': 7,
              'circle-color': [
                'match',
                ['get', 'kind'],
                'start',
                '#3d5a4c',
                '#8b3a2a',
              ],
              'circle-stroke-width': 2,
              'circle-stroke-color': '#fffdf4',
            },
          })
          map.addLayer({
            id: 'md-ends-labels',
            type: 'symbol',
            source: endsSourceId,
            layout: {
              'text-field': ['get', 'label'],
              'text-size': 12,
              'text-offset': [0, 1.35],
              'text-anchor': 'top',
              'text-max-width': 10,
            },
            paint: {
              'text-color': '#1f2418',
              'text-halo-color': '#fffdf4',
              'text-halo-width': 1.6,
            },
          })
        }

        if (!map.getSource(peaksSourceId)) {
          map.addSource(peaksSourceId, {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: currentPeaks.map((peak) => ({
                type: 'Feature' as const,
                geometry: {
                  type: 'Point' as const,
                  coordinates: peak.coords,
                },
                properties: {
                  id: peak.id,
                  name: peak.name,
                  height: peak.height,
                  highlight: currentRoute.peakIds.includes(peak.id) ? 1 : 0,
                },
              })),
            },
          })
          map.addLayer({
            id: 'md-peak-circles',
            type: 'circle',
            source: peaksSourceId,
            paint: {
              'circle-radius': [
                'case',
                ['==', ['get', 'highlight'], 1],
                7,
                4.5,
              ],
              'circle-color': [
                'case',
                ['==', ['get', 'highlight'], 1],
                '#8b3a2a',
                '#3d5a4c',
              ],
              'circle-stroke-width': 1.5,
              'circle-stroke-color': '#fffdf4',
            },
          })
          map.addLayer({
            id: 'md-peak-labels',
            type: 'symbol',
            source: peaksSourceId,
            filter: ['==', ['get', 'highlight'], 1],
            layout: {
              'text-field': ['get', 'name'],
              'text-size': 11,
              'text-offset': [0, 1.2],
              'text-anchor': 'top',
            },
            paint: {
              'text-color': '#1f2418',
              'text-halo-color': '#fffdf4',
              'text-halo-width': 1.4,
            },
          })
        }

        addUkMaskLayer(map)
      }

      rebuildOverlays.current = paintOverlays

      map.on('load', () => {
        paintOverlays()
        map?.on('click', 'md-peak-circles', (event) => {
          const feature = event.features?.[0]
          if (!feature || !map) return
          const geometry = feature.geometry
          if (!geometry || geometry.type !== 'Point') return
          const coords = geometry.coordinates as [number, number]
          const name = String(feature.properties?.name ?? 'Peak')
          const height = feature.properties?.height
          clearPopup()
          popup = new Popup({ offset: 12, closeButton: true })
            .setLngLat(coords)
            .setHTML(
              `<div class="md-route-popup"><strong>${escapeHtml(name)}</strong>${
                height ? `<small>${escapeHtml(String(height))} m</small>` : ''
              }</div>`,
            )
            .addTo(map)
        })
        map?.on('mouseenter', 'md-peak-circles', () => {
          if (map) map.getCanvas().style.cursor = 'pointer'
        })
        map?.on('mouseleave', 'md-peak-circles', () => {
          if (map) map.getCanvas().style.cursor = ''
        })
      })
    })

    return () => {
      cancelled = true
      clearPopup()
      mapRef.current?.remove()
      mapRef.current = null
      rebuildOverlays.current = null
    }
  }, [apiKey])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.getSource(routeSourceId)) return
    ;(map.getSource(routeSourceId) as GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: [routeFeature],
    })
    if (map.getSource(endsSourceId)) {
      ;(map.getSource(endsSourceId) as GeoJSONSource).setData(
        endsCollection(lineCoords, route.start, route.finish),
      )
    }
    if (map.getSource(peaksSourceId)) {
      ;(map.getSource(peaksSourceId) as GeoJSONSource).setData(peakCollection)
    }
    if (lineCoords.length >= 2) {
      map.fitBounds(routeBounds(lineCoords), {
        padding: 56,
        maxZoom: 10,
        duration: 700,
      })
    }
  }, [routeFeature, peakCollection, lineCoords, route.start, route.finish])

  useEffect(() => {
    if (skipBasemapSwap.current) {
      skipBasemapSwap.current = false
      return
    }
    const map = mapRef.current
    if (!map || !apiKey) return
    let cancelled = false
    void (basemap === 'satellite'
      ? Promise.resolve(basemapStyle('satellite'))
      : resolveBasemapStyle('map', apiKey)
    ).then((style) => {
      if (cancelled || !mapRef.current) return
      mapRef.current.setStyle(style)
      mapRef.current.once('styledata', () => {
        rebuildOverlays.current?.()
      })
    })
    return () => {
      cancelled = true
    }
  }, [basemap, apiKey])

  if (!apiKey) {
    return (
      <div className="uk-map-panel">
        <p className="map-missing-key">
          Add a MapTiler key to <code>.env.local</code> to load the route map.
        </p>
      </div>
    )
  }

  return (
    <div className="uk-map-panel">
      <div className="uk-map-wrap">
        <div ref={container} className="uk-map" />
        <div className="map-hud">
          <div className="map-basemap" role="group" aria-label="Basemap">
            <button
              type="button"
              className={basemap === 'map' ? 'is-active' : ''}
              aria-pressed={basemap === 'map'}
              onClick={() => setBasemap('map')}
            >
              Map
            </button>
            <button
              type="button"
              className={basemap === 'satellite' ? 'is-active' : ''}
              aria-pressed={basemap === 'satellite'}
              onClick={() => setBasemap('satellite')}
            >
              Satellite
            </button>
          </div>
        </div>
        <div className="md-route-map-legend" aria-label="Route legend">
          <span className="md-route-map-legend__item is-route">
            <span className="md-route-map-legend__swatch" aria-hidden="true" />
            {pathStatus === 'loading'
              ? 'Loading path…'
              : pathStatus === 'ready'
                ? 'OSM path'
                : 'Route'}
          </span>
          <span className="md-route-map-legend__item is-start">
            <span className="md-route-map-legend__swatch" aria-hidden="true" />
            Start
          </span>
          <span className="md-route-map-legend__item is-end">
            <span className="md-route-map-legend__swatch" aria-hidden="true" />
            Finish
          </span>
        </div>
      </div>
    </div>
  )
}
