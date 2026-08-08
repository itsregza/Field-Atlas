import { useEffect, useRef, useState } from 'react'
import {
  Map as TilerMap,
  Marker,
  Popup,
  config,
  type GeoJSONSource,
} from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import { areas } from '../data/areas'
import { formatPeakLists, getAreaPeaks, type AreaPeak } from '../data/areaPeaks'
import { getHikesForPeak } from '../data/hikes'
import { MapLayerFilters } from './MapLayerFilters'
import { getAreaCameraBounds } from '../data/areaBoundaries'
import { basemapStyle, resolveBasemapStyle, ukMaxBounds, MAP_MAX_ZOOM, type BasemapId } from '../data/mapBasemap'
import {
  clearWaterOverlay,
  fetchWaterSourcesInBbox,
  syncMapFilters,
  waterSourceSourceId,
  type FilterMap,
} from '../data/mapLayers'
import { prepareImage } from '../data/logs'
import { measurePathDistanceMeters } from '../data/pathDistance'
import {
  deletePrivatePitchPin,
  loadPrivatePitchPins,
  type PrivatePitchPin,
  upsertPrivatePitchPin,
} from '../data/privatePitchPins'
import { buildSlopeOverlay, type SlopeOverlayResult } from '../data/slopeOverlay'

const SLOPE_SOURCE = 'pitching-slope'
const SLOPE_LAYER = 'pitching-slope-layer'
const SLOPE_OPACITY = 0.9
const PEAK_SOURCE = 'pitching-peaks'
const PEAK_LAYERS = [
  'pitching-peak-clusters',
  'pitching-peak-cluster-count',
  'pitching-peak-points',
  'pitching-peak-labels',
] as const

export type PendingPitchDrop = {
  lng: number
  lat: number
  pathDistanceM: number | null
  measuring: boolean
}

type PitchingMapProps = {
  areaSlug: string
  onPinsChange?: (pins: PrivatePitchPin[]) => void
  selectedPinId?: string | null
  onSelectPin?: (pin: PrivatePitchPin | null) => void
  dropMode: boolean
  pendingDrop: PendingPitchDrop | null
  onPendingDrop: (drop: PendingPitchDrop | null) => void
  /** When false, private pins are hidden and cannot be placed. */
  pinsEnabled?: boolean
}

function peakCollection(peaks: AreaPeak[]) {
  return {
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
        list: formatPeakLists(peak.lists),
      },
    })),
  }
}

function fitToPeaks(map: TilerMap, peaks: AreaPeak[], duration = 800) {
  if (!peaks.length) return
  const longitudes = peaks.map((peak) => peak.coords[0])
  const latitudes = peaks.map((peak) => peak.coords[1])
  map.fitBounds(
    [
      [Math.min(...longitudes), Math.min(...latitudes)],
      [Math.max(...longitudes), Math.max(...latitudes)],
    ],
    { padding: 64, maxZoom: 10.8, duration, pitch: 48, bearing: -12 },
  )
}

export function PitchingMap({
  areaSlug,
  onPinsChange,
  selectedPinId,
  onSelectPin,
  dropMode,
  pendingDrop,
  onPendingDrop,
  pinsEnabled = true,
}: PitchingMapProps) {
  const area = areas.find((item) => item.slug === areaSlug) ?? areas[0]
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<TilerMap | null>(null)
  const markersRef = useRef<Marker[]>([])
  const pendingMarkerRef = useRef<Marker | null>(null)
  const dropModeRef = useRef(dropMode)
  const pinsEnabledRef = useRef(pinsEnabled)
  const onPendingDropRef = useRef(onPendingDrop)
  const onPinsChangeRef = useRef(onPinsChange)
  const onSelectPinRef = useRef(onSelectPin)
  const selectedPinIdRef = useRef(selectedPinId)
  const basemapRef = useRef<BasemapId>('map')
  const showPathsRef = useRef(false)
  const showWaterRef = useRef(false)
  const applyLayerFilters = useRef<(() => void) | null>(null)
  const refreshWaterSources = useRef<((immediate?: boolean) => void) | null>(null)
  const scheduleSlopeRef = useRef<(() => void) | null>(null)
  const rebuildAfterStyleRef = useRef<(() => void) | null>(null)
  const skipBasemapSwap = useRef(true)
  const [ready, setReady] = useState(false)
  const [basemap, setBasemap] = useState<BasemapId>('map')
  const [showPaths, setShowPaths] = useState(false)
  const [showWater, setShowWater] = useState(false)
  const [waterLoading, setWaterLoading] = useState(false)
  const [slopeBusy, setSlopeBusy] = useState(false)
  const [slopeError, setSlopeError] = useState('')
  const apiKey = import.meta.env.VITE_MAPTILER_KEY?.trim()

  dropModeRef.current = dropMode
  pinsEnabledRef.current = pinsEnabled
  onPendingDropRef.current = onPendingDrop
  onPinsChangeRef.current = onPinsChange
  onSelectPinRef.current = onSelectPin
  selectedPinIdRef.current = selectedPinId
  basemapRef.current = basemap
  showPathsRef.current = showPaths
  showWaterRef.current = showWater

  const applyMapFilters = (paths: boolean, water: boolean) => {
    showPathsRef.current = paths
    showWaterRef.current = water
    const map = mapRef.current
    if (!map) return
    syncMapFilters(map as unknown as FilterMap, paths, water)
    if (water) {
      refreshWaterSources.current?.(true)
    } else {
      setWaterLoading(false)
      clearWaterOverlay(map as unknown as FilterMap)
    }
  }

  const areaSlugRef = useRef(areaSlug)
  areaSlugRef.current = areaSlug
  const slopeBlobRef = useRef<string | null>(null)

  const refreshMarkers = (map: TilerMap) => {
    for (const marker of markersRef.current) marker.remove()
    markersRef.current = []
    if (!pinsEnabledRef.current) {
      onPinsChangeRef.current?.([])
      return
    }
    const pins = loadPrivatePitchPins()
    onPinsChangeRef.current?.(pins)
    for (const pin of pins) {
      const el = document.createElement('button')
      el.type = 'button'
      el.className =
        pin.id === selectedPinIdRef.current
          ? 'pitch-pin-marker is-selected'
          : 'pitch-pin-marker'
      el.title = pin.label
      el.setAttribute('aria-label', pin.label)
      el.addEventListener('click', (event) => {
        event.stopPropagation()
        onSelectPinRef.current?.(pin)
      })
      markersRef.current.push(
        new Marker({ element: el }).setLngLat([pin.lng, pin.lat]).addTo(map),
      )
    }
  }

  const syncPeaks = (map: TilerMap, nextPeaks: AreaPeak[]) => {
    if (!map.getStyle()) return
    const data = peakCollection(nextPeaks)
    if (!map.getSource(PEAK_SOURCE)) {
      map.addSource(PEAK_SOURCE, {
        type: 'geojson',
        cluster: true,
        clusterMaxZoom: 11,
        clusterRadius: 42,
        data,
      })
    } else {
      ;(map.getSource(PEAK_SOURCE) as GeoJSONSource).setData(data)
    }

    if (!map.getLayer('pitching-peak-clusters')) {
      map.addLayer({
        id: 'pitching-peak-clusters',
        type: 'circle',
        source: PEAK_SOURCE,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#3a4654',
          'circle-radius': ['step', ['get', 'point_count'], 18, 20, 22, 60, 26],
          'circle-stroke-color': '#faf6e9',
          'circle-stroke-width': 3,
          'circle-pitch-alignment': 'viewport',
        },
      })
    }
    if (!map.getLayer('pitching-peak-cluster-count')) {
      map.addLayer({
        id: 'pitching-peak-cluster-count',
        type: 'symbol',
        source: PEAK_SOURCE,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 12,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#fffdf4' },
      })
    }
    if (!map.getLayer('pitching-peak-points')) {
      map.addLayer({
        id: 'pitching-peak-points',
        type: 'circle',
        source: PEAK_SOURCE,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#a3472d',
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            8,
            5,
            12,
            8,
          ],
          'circle-stroke-color': '#fffdf4',
          'circle-stroke-width': 2.5,
          'circle-pitch-alignment': 'viewport',
        },
      })
    }
    if (!map.getLayer('pitching-peak-labels')) {
      map.addLayer({
        id: 'pitching-peak-labels',
        type: 'symbol',
        source: PEAK_SOURCE,
        minzoom: 10.2,
        filter: ['!', ['has', 'point_count']],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 11,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-optional': true,
        },
        paint: {
          'text-color': '#292a21',
          'text-halo-color': '#faf6e9',
          'text-halo-width': 1.5,
        },
      })
    }

    for (const layerId of PEAK_LAYERS) {
      if (map.getLayer(layerId)) map.moveLayer(layerId)
    }
  }

  // Create the map once — region changes only update data/camera.
  useEffect(() => {
    if (!container.current || !apiKey) return

    config.apiKey = apiKey
    setReady(false)

    let cancelled = false
    const initialPeaks = getAreaPeaks(areaSlugRef.current)
    const initialBounds = getAreaCameraBounds(initialPeaks) ?? ukMaxBounds
    let map: TilerMap | null = null

    void (basemapRef.current === 'satellite'
      ? Promise.resolve(basemapStyle('satellite'))
      : resolveBasemapStyle('map', apiKey)
    ).then((style) => {
      if (cancelled || !container.current) return
      map = new TilerMap({
      container: container.current,
      style,
      center: area.coords,
      zoom: 10.4,
      pitch: 48,
      bearing: -12,
      terrain: true,
      terrainExaggeration: 1.08,
      navigationControl: true,
      terrainControl: true,
      scaleControl: true,
      minZoom: 7,
      maxZoom: MAP_MAX_ZOOM,
      maxBounds: initialBounds,
      fadeDuration: 0,
      renderWorldCopies: false,
    })
    mapRef.current = map
    bindPitchingMap(map)
    })

    function bindPitchingMap(map: TilerMap) {

    let slopeTimer = 0
    let waterTimer = 0
    let revealFallback = 0
    let slopeAbort: AbortController | null = null
    let peakPopup: Popup | null = null
    let slopeGeneration = 0
    let bootstrapping = true
    let waterFetchId = 0

    const syncStyleLayers = () => {
      syncMapFilters(
        map as unknown as FilterMap,
        showPathsRef.current,
        showWaterRef.current,
      )
    }

    applyLayerFilters.current = syncStyleLayers

    const loadWaterSources = (immediate = false) => {
      if (!showWaterRef.current) return
      window.clearTimeout(waterTimer)
      const runFetch = () => {
        const fetchId = ++waterFetchId
        const bounds = map.getBounds()
        setWaterLoading(true)
        void fetchWaterSourcesInBbox(
          bounds.getSouth(),
          bounds.getWest(),
          bounds.getNorth(),
          bounds.getEast(),
        )
          .then((data) => {
            if (fetchId !== waterFetchId || !mapRef.current) return
            const source = map.getSource(waterSourceSourceId) as
              | GeoJSONSource
              | undefined
            source?.setData(data)
            syncStyleLayers()
          })
          .finally(() => {
            if (fetchId === waterFetchId) setWaterLoading(false)
          })
      }
      if (immediate) {
        runFetch()
        return
      }
      waterTimer = window.setTimeout(runFetch, 500)
    }

    refreshWaterSources.current = loadWaterSources

    const paintSlope = (overlay: SlopeOverlayResult) => {
      const existing = map.getSource(SLOPE_SOURCE) as
        | {
            updateImage?: (opts: {
              url: string
              coordinates: SlopeOverlayResult['coordinates']
            }) => void
          }
        | undefined
      if (existing?.updateImage && map.getLayer(SLOPE_LAYER)) {
        existing.updateImage({
          url: overlay.blobUrl,
          coordinates: overlay.coordinates,
        })
      } else {
        if (map.getLayer(SLOPE_LAYER)) map.removeLayer(SLOPE_LAYER)
        if (map.getSource(SLOPE_SOURCE)) map.removeSource(SLOPE_SOURCE)
        map.addSource(SLOPE_SOURCE, {
          type: 'image',
          url: overlay.blobUrl,
          coordinates: overlay.coordinates,
        })
        const beforeId = map.getLayer('pitching-peak-clusters')
          ? 'pitching-peak-clusters'
          : undefined
        map.addLayer(
          {
            id: SLOPE_LAYER,
            type: 'raster',
            source: SLOPE_SOURCE,
            paint: {
              'raster-opacity': SLOPE_OPACITY,
              'raster-fade-duration': 0,
            },
          },
          beforeId,
        )
      }

      const previousBlob = slopeBlobRef.current
      slopeBlobRef.current = overlay.blobUrl
      if (previousBlob && previousBlob !== overlay.blobUrl) {
        URL.revokeObjectURL(previousBlob)
      }
    }

    const applySlope = async (options?: { reveal?: boolean }) => {
      if (cancelled || !map.isStyleLoaded()) return false
      slopeAbort?.abort()
      const abort = new AbortController()
      slopeAbort = abort
      const generation = ++slopeGeneration
      if (!options?.reveal) setSlopeBusy(true)
      setSlopeError('')
      try {
        const overlay = await buildSlopeOverlay(
          apiKey,
          map.getBounds(),
          map.getZoom(),
          abort.signal,
        )
        if (
          cancelled ||
          abort.signal.aborted ||
          generation !== slopeGeneration ||
          !map.getStyle()
        ) {
          if (overlay?.blobUrl) URL.revokeObjectURL(overlay.blobUrl)
          return false
        }
        if (!overlay) {
          setSlopeError('Could not load terrain tiles for slope.')
          return false
        }

        paintSlope(overlay)
        syncPeaks(map, getAreaPeaks(areaSlugRef.current))
        return true
      } catch (error) {
        if (cancelled || abort.signal.aborted || generation !== slopeGeneration) {
          return false
        }
        setSlopeError(
          error instanceof Error ? error.message : 'Slope overlay failed.',
        )
        return false
      } finally {
        if (!cancelled && generation === slopeGeneration && !options?.reveal) {
          setSlopeBusy(false)
        }
      }
    }

    const scheduleSlope = () => {
      if (bootstrapping) return
      window.clearTimeout(slopeTimer)
      slopeTimer = window.setTimeout(() => {
        void applySlope()
      }, 320)
    }
    scheduleSlopeRef.current = scheduleSlope

    const hideBasePeaks = () => {
      for (const layerId of ['Peak labels', 'Peak labels (US)']) {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'none')
        }
      }
    }

    const rebuildAfterStyle = () => {
      if (!map.getStyle()) return
      try {
        hideBasePeaks()
        if (!map.hasTerrain()) map.enableTerrain(1.08)
        syncPeaks(map, getAreaPeaks(areaSlugRef.current))
        refreshMarkers(map)
        syncStyleLayers()
        if (showWaterRef.current) loadWaterSources(true)
        if (!bootstrapping) {
          window.clearTimeout(slopeTimer)
          slopeTimer = window.setTimeout(() => {
            void applySlope()
          }, 200)
        }
      } catch {
      }
    }
    rebuildAfterStyleRef.current = rebuildAfterStyle

    const finishBootstrap = () => {
      if (cancelled || !bootstrapping) return
      bootstrapping = false
      syncPeaks(map, getAreaPeaks(areaSlugRef.current))
      map.once('idle', () => {
        if (cancelled) return
        syncPeaks(map, getAreaPeaks(areaSlugRef.current))
        syncStyleLayers()
      })
      setReady(true)
      setSlopeBusy(false)
    }

    map.on('load', () => {
      if (cancelled) return
      hideBasePeaks()
      if (!map.hasTerrain()) map.enableTerrain(1.08)
      const peaks = getAreaPeaks(areaSlugRef.current)
      syncPeaks(map, peaks)
      refreshMarkers(map)
      fitToPeaks(map, peaks, 0)
      syncStyleLayers()

      let revealStarted = false
      const reveal = () => {
        if (cancelled || revealStarted) return
        revealStarted = true
        window.clearTimeout(revealFallback)
        void (async () => {
          const ok = await applySlope({ reveal: true })
          if (cancelled) return
          syncPeaks(map, getAreaPeaks(areaSlugRef.current))
          if (!ok) {
            setSlopeError((current) =>
              current || 'Could not load terrain tiles for slope.',
            )
          }
          finishBootstrap()
        })()
      }

      revealFallback = window.setTimeout(reveal, 4000)
      map.once('idle', reveal)
    })

    // Terrain enable can reshuffle layers — reassert peaks.
    map.on('terrain', () => {
      if (cancelled || !map.isStyleLoaded()) return
      syncPeaks(map, getAreaPeaks(areaSlugRef.current))
      syncStyleLayers()
    })

    map.on('style.load', () => {
      if (cancelled) return
      window.requestAnimationFrame(() => {
        rebuildAfterStyle()
      })
    })

    map.on('moveend', () => {
      scheduleSlope()
      loadWaterSources()
    })

    map.on('click', 'pitching-peak-points', (event) => {
      const feature = event.features?.[0]
      if (!feature?.properties) return
      const geometry = feature.geometry
      if (!geometry || geometry.type !== 'Point') return
      const coordinates = geometry.coordinates.slice() as [number, number]
      peakPopup?.remove()
      peakPopup = new Popup({ offset: 12, maxWidth: '240px' })
        .setLngLat(coordinates)
        .setHTML(
          (() => {
            const peakHikes = getHikesForPeak(String(feature.properties.id ?? ''))
            const hikesLink = peakHikes.length
              ? `<a class="pitch-peak-popup__hikes" href="/hikes?peak=${encodeURIComponent(String(feature.properties.id ?? ''))}">${peakHikes.length === 1 ? 'View hike route' : `View ${peakHikes.length} hike routes`}</a>`
              : ''
            return `<strong>${feature.properties.name}</strong><div>${feature.properties.height} m · ${feature.properties.list || 'Summit'}</div>${hikesLink}`
          })(),
        )
        .addTo(map)
    })
    map.on('mouseenter', 'pitching-peak-points', () => {
      map.getCanvas().style.cursor = 'pointer'
    })
    map.on('mouseleave', 'pitching-peak-points', () => {
      map.getCanvas().style.cursor = dropModeRef.current ? 'crosshair' : ''
    })

    map.on('click', (event) => {
      if (!dropModeRef.current || !pinsEnabledRef.current) return
      const peakHits = map.queryRenderedFeatures(event.point, {
        layers: [...PEAK_LAYERS],
      })
      if (peakHits.length) return

      const { lng, lat } = event.lngLat
      onPendingDropRef.current({
        lng,
        lat,
        pathDistanceM: null,
        measuring: true,
      })

      void (async () => {
        const pathDistanceM = await measurePathDistanceMeters(map, lng, lat)
        if (cancelled) return
        onPendingDropRef.current({
          lng,
          lat,
          pathDistanceM,
          measuring: false,
        })
      })()
    })
    }

    return () => {
      cancelled = true
      applyLayerFilters.current = null
      refreshWaterSources.current = null
      scheduleSlopeRef.current = null
      rebuildAfterStyleRef.current = null
      pendingMarkerRef.current?.remove()
      pendingMarkerRef.current = null
      for (const marker of markersRef.current) marker.remove()
      markersRef.current = []
      const active = mapRef.current
      mapRef.current = null
      active?.remove()
      setReady(false)
    }
    // Mount once per api key — region updates handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    const applyRegion = () => {
      if (!map.getStyle() || !map.isStyleLoaded()) return false
      const nextPeaks = getAreaPeaks(area.slug)
      const nextBounds = getAreaCameraBounds(nextPeaks) ?? ukMaxBounds
      map.setMaxBounds(nextBounds)
      syncPeaks(map, nextPeaks)
      applyLayerFilters.current?.()
      if (nextPeaks.length) {
        fitToPeaks(map, nextPeaks)
      } else {
        map.flyTo({
          center: area.coords,
          zoom: 10.4,
          pitch: 48,
          bearing: -12,
          essential: true,
        })
      }
      return true
    }

    if (applyRegion()) return

    const onIdle = () => {
      applyRegion()
    }
    map.once('idle', onIdle)
    return () => {
      map.off('idle', onIdle)
    }
  }, [area.slug, area.coords, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    refreshMarkers(map)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPinId, ready, pinsEnabled])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    map.getCanvas().style.cursor = dropMode ? 'crosshair' : ''
  }, [dropMode, ready])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    pendingMarkerRef.current?.remove()
    pendingMarkerRef.current = null
    if (!pendingDrop) return
    const el = document.createElement('div')
    el.className = 'pitch-pin-marker is-pending'
    pendingMarkerRef.current = new Marker({ element: el })
      .setLngLat([pendingDrop.lng, pendingDrop.lat])
      .addTo(map)
  }, [pendingDrop, ready])

  useEffect(() => {
    if (!ready) return
    applyMapFilters(showPaths, showWater)
  }, [showPaths, showWater, ready])

  useEffect(() => {
    if (skipBasemapSwap.current) {
      skipBasemapSwap.current = false
      return
    }

    const map = mapRef.current
    if (!map || !apiKey) return

    const camera = {
      center: map.getCenter(),
      zoom: map.getZoom(),
      pitch: map.getPitch(),
      bearing: map.getBearing(),
    }

    void (basemap === 'satellite'
      ? Promise.resolve(basemapStyle('satellite'))
      : resolveBasemapStyle('map', apiKey)
    ).then((style) => {
      if (!mapRef.current) return
      map.setStyle(style, { diff: false })
      const restore = () => {
        map.jumpTo(camera)
        rebuildAfterStyleRef.current?.()
      }
      map.once('style.load', () => {
        restore()
        map.once('idle', restore)
        window.setTimeout(restore, 400)
      })
    })
  }, [basemap, apiKey])

  if (!apiKey) {
    return (
      <div className="pitching-map pitching-map--empty">
        <p>Add a MapTiler key to load the pitching map.</p>
      </div>
    )
  }

  return (
    <div className="pitching-map">
      <div ref={container} className="pitching-map__canvas" />
      {!ready && (
        <div className="map-loading" role="status" aria-live="polite">
          <div className="map-loading__rings" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="eyebrow">{area.name} pitching</span>
          <strong>Reading the ground</strong>
          <small>Loading all regions and map data…</small>
        </div>
      )}
      {ready ? (
        <>
          <div className="pitching-map__controls">
            <MapLayerFilters
              showPaths={showPaths}
              showWater={showWater}
              waterLoading={waterLoading}
              onPathsChange={(value) => {
                setShowPaths(value)
                applyMapFilters(value, showWater)
              }}
              onWaterChange={(value) => {
                setShowWater(value)
                applyMapFilters(showPaths, value)
              }}
            />
            <div className="map-basemap" role="group" aria-label="Map basemap">
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
          <div className="pitching-map__footer">
            <div className="pitching-legend" aria-hidden="true">
              <span className="pitching-legend__gradient" title="Flat to steep" />
              Flat
              <span className="pitching-legend__arrow" aria-hidden="true">
                →
              </span>
              Steep
              <span className="pitching-legend__swatch pitching-legend__swatch--peak" />
              Peak
            </div>
            {slopeBusy ? (
              <span className="pitching-map__status">Updating slope…</span>
            ) : null}
            {slopeError ? (
              <span className="pitching-map__status is-error">{slopeError}</span>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  )
}

export function usePitchPinEditor(
  pin: PrivatePitchPin | null,
  onChange: (pins: PrivatePitchPin[]) => void,
) {
  const [draft, setDraft] = useState<PrivatePitchPin | null>(pin)
  const [imageError, setImageError] = useState('')

  useEffect(() => {
    setDraft(pin)
    setImageError('')
  }, [pin])

  const save = () => {
    if (!draft) return
    if (!draft.label.trim()) return
    upsertPrivatePitchPin(draft)
    onChange(loadPrivatePitchPins())
  }

  const remove = () => {
    if (!draft) return
    deletePrivatePitchPin(draft.id)
    onChange(loadPrivatePitchPins())
  }

  const onImage = async (file: File) => {
    if (!draft) return
    try {
      const imageDataUrl = await prepareImage(file)
      setDraft({ ...draft, imageDataUrl })
      setImageError('')
    } catch (error) {
      setImageError(
        error instanceof Error ? error.message : 'Could not read that image.',
      )
    }
  }

  return { draft, setDraft, save, remove, onImage, imageError }
}
