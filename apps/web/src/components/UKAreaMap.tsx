import { useEffect, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  Map as TilerMap,
  Marker,
  Popup,
  config,
  type GeoJSONSource,
} from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import { getAreaBoundaryCollection } from '../data/areaBoundaries'
import { areas, type Area } from '../data/areas'
import { formatPeakLists, type AreaPeak } from '../data/areaPeaks'
import { getHikesForPeak } from '../data/hikes'
import {
  type BasemapId,
  basemapStyle,
  resolveBasemapStyle,
  ukMaxBounds,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
} from '../data/mapBasemap'
import { addUkMaskLayer } from '../data/ukMask'
import { PeakWeather } from './PeakWeather'
import { MapLayerFilters } from './MapLayerFilters'
import {
  clearWaterOverlay,
  fetchWaterSourcesInBbox,
  syncMapFilters,
  waterSourceSourceId,
  type FilterMap,
} from '../data/mapLayers'

type UKAreaMapProps = {
  area?: Area
  peaks: AreaPeak[]
  focusPeakId?: string | null
  onPeakSelect?: (peak: AreaPeak) => void
}

const peakSourceId = 'area-peaks'
const regionSourceId = 'area-regions'
const regionFillId = 'area-region-fill'
const regionOutlineId = 'area-region-outline'
const peakHitLayers = ['area-peak-clusters', 'area-peak-points']

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
        gridRef: peak.gridRef,
        list: formatPeakLists(peak.lists),
      },
    })),
  }
}

export function UKAreaMap({
  area,
  peaks,
  focusPeakId,
  onPeakSelect,
}: UKAreaMapProps) {
  const [ready, setReady] = useState(false)
  const [basemap, setBasemap] = useState<BasemapId>('map')
  const [showPaths, setShowPaths] = useState(false)
  const [showWater, setShowWater] = useState(false)
  const [waterLoading, setWaterLoading] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<TilerMap | null>(null)
  const basemapRef = useRef(basemap)
  const showPathsRef = useRef(showPaths)
  const showWaterRef = useRef(showWater)
  const areaRef = useRef(area)
  const peaksRef = useRef(peaks)
  const onPeakSelectRef = useRef(onPeakSelect)
  const rebuildOverlays = useRef<(() => void) | null>(null)
  const applyLayerFilters = useRef<(() => void) | null>(null)
  const refreshWaterSources = useRef<((immediate?: boolean) => void) | null>(null)
  const openPeakPopup = useRef<
    ((peak: AreaPeak, coordinates: [number, number]) => void) | null
  >(null)
  const skipBasemapSwap = useRef(true)
  const fittedAreaSlug = useRef<string | null>(null)
  const openedFocusId = useRef<string | null>(null)
  const apiKey = import.meta.env.VITE_MAPTILER_KEY?.trim()

  basemapRef.current = basemap
  showPathsRef.current = showPaths
  showWaterRef.current = showWater
  areaRef.current = area
  peaksRef.current = peaks
  onPeakSelectRef.current = onPeakSelect

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

  useEffect(() => {
    if (!container.current || !apiKey) return

    config.apiKey = apiKey
    setReady(false)
    fittedAreaSlug.current = null
    openedFocusId.current = null

    const initialArea = areaRef.current
    let cancelled = false

    void resolveBasemapStyle(basemapRef.current, apiKey).then((style) => {
      if (cancelled || !container.current) return

      const map = new TilerMap({
        container: container.current,
        style,
        center: initialArea?.coords ?? [-3.7, 55.2],
        zoom: initialArea ? 8.25 : 4.7,
        pitch: initialArea ? 48 : 34,
        bearing: 0,
        terrain: true,
        terrainExaggeration: 1.05,
        navigationControl: true,
        terrainControl: false,
        scaleControl: true,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_MAX_ZOOM,
        maxBounds: ukMaxBounds,
        fadeDuration: 0,
        renderWorldCopies: false,
      })
      mapRef.current = map
      bindMap(map)
    })

    const markers: Marker[] = []
    let eventsBound = false
    let markersAdded = false
    let popup: Popup | null = null
    let weatherRoot: Root | null = null
    let waterTimer = 0
    let waterFetchId = 0
    let timeout = 0

    const clearWeatherRoot = () => {
      weatherRoot?.unmount()
      weatherRoot = null
    }

    function bindMap(map: TilerMap) {

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

    const hideBasePeaks = () => {
      for (const layerId of ['Peak labels', 'Peak labels (US)']) {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', 'none')
        }
      }
    }

    const restoreTerrain = () => {
      if (!map.hasTerrain()) {
        map.enableTerrain(1.05)
      }
    }

    const syncAreaMarkers = () => {
      const hidden = map.getZoom() >= 7
      for (const marker of markers) {
        marker.getElement().classList.toggle('is-map-hidden', hidden)
      }
    }

    const peakHitAt = (point: { x: number; y: number }) => {
      const layers = peakHitLayers.filter((layerId) => map.getLayer(layerId))
      if (!layers.length) return false
      return (
        map.queryRenderedFeatures([point.x, point.y], { layers }).length > 0
      )
    }

    const showRegionPopup = (
      feature: {
        properties?: Record<string, unknown> | null
        geometry: { type: string; coordinates?: unknown }
      },
      lngLat: [number, number],
    ) => {
      const details = document.createElement('div')
      const swatch = document.createElement('span')
      const kind = document.createElement('span')
      const name = document.createElement('strong')
      const nation = document.createElement('small')
      const link = document.createElement('a')

      details.className = 'area-region-popup'
      swatch.className = 'area-region-popup__swatch'
      swatch.style.background = String(feature.properties?.color ?? '#4d633f')
      kind.textContent = String(feature.properties?.kind ?? 'Region')
      name.textContent = String(feature.properties?.name ?? 'Unknown region')
      nation.textContent = String(feature.properties?.nation ?? '')
      link.href = `/checklists/${feature.properties?.slug ?? ''}`
      link.textContent = 'Open checklist'
      details.append(swatch, kind, name, nation, link)

      clearWeatherRoot()
      popup?.remove()
      popup = new Popup({ offset: 12, closeButton: true })
        .setLngLat(lngLat)
        .setDOMContent(details)
        .addTo(map)
    }

    const addAreaMarkers = () => {
      if (areaRef.current || markersAdded) return
      markersAdded = true
      for (const mapArea of areas) {
        const marker = document.createElement('a')
        const name = document.createElement('strong')
        const nation = document.createElement('small')
        marker.className = `area-marker ${mapArea.live ? 'is-live' : ''}`
        marker.href = `/checklists/${mapArea.slug}`
        name.textContent = mapArea.name
        nation.textContent = mapArea.nation
        marker.append(name, nation)
        marker.setAttribute(
          'aria-label',
          `Explore ${mapArea.name}, ${mapArea.nation}`,
        )
        markers.push(
          new Marker({
            element: marker,
            anchor: 'bottom',
            opacityWhenCovered: 1,
          })
            .setLngLat(mapArea.coords)
            .addTo(map),
        )
      }
      syncAreaMarkers()
    }

    const ensureOverlays = () => {
      const currentArea = areaRef.current
      const currentPeaks = peaksRef.current
      const satellite = basemapRef.current === 'satellite'

      hideBasePeaks()
      addAreaMarkers()
      addUkMaskLayer(map)

      const boundaries = getAreaBoundaryCollection(
        currentPeaks,
        currentArea?.slug,
      )
      const regionSource = map.getSource(regionSourceId) as
        | GeoJSONSource
        | undefined
      if (!regionSource) {
        map.addSource(regionSourceId, {
          type: 'geojson',
          data: boundaries,
        })
      } else {
        regionSource.setData(boundaries)
      }

      if (!map.getLayer(regionFillId)) {
        map.addLayer({
          id: regionFillId,
          type: 'fill',
          source: regionSourceId,
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': satellite
              ? currentArea
                ? 0.28
                : 0.24
              : currentArea
                ? 0.18
                : 0.16,
          },
        })
      } else {
        map.setPaintProperty(
          regionFillId,
          'fill-opacity',
          satellite
            ? currentArea
              ? 0.28
              : 0.24
            : currentArea
              ? 0.18
              : 0.16,
        )
      }

      if (!map.getLayer(regionOutlineId)) {
        map.addLayer({
          id: regionOutlineId,
          type: 'line',
          source: regionSourceId,
          paint: {
            'line-color': satellite ? '#fffdf4' : ['get', 'color'],
            'line-width': [
              'interpolate',
              ['linear'],
              ['zoom'],
              5,
              satellite ? 2.5 : 2,
              8,
              satellite ? 3.5 : 3,
              11,
              satellite ? 4.5 : 4,
            ],
            'line-opacity': 0.95,
          },
        })
      } else {
        map.setPaintProperty(
          regionOutlineId,
          'line-color',
          satellite ? '#fffdf4' : ['get', 'color'],
        )
      }

      if (!currentPeaks.length) {
        const peakSource = map.getSource(peakSourceId) as
          | GeoJSONSource
          | undefined
        peakSource?.setData({ type: 'FeatureCollection', features: [] })
        return
      }

      const peakSource = map.getSource(peakSourceId) as GeoJSONSource | undefined
      if (!peakSource) {
        map.addSource(peakSourceId, {
          type: 'geojson',
          cluster: true,
          clusterMaxZoom: currentArea ? 11 : 9,
          clusterRadius: 42,
          data: peakCollection(currentPeaks),
        })
      } else {
        peakSource.setData(peakCollection(currentPeaks))
      }

      const clusterMinZoom = currentArea ? 0 : 7
      const labelMinZoom = currentArea ? 10.5 : 10

      if (!map.getLayer('area-peak-clusters')) {
        map.addLayer({
          id: 'area-peak-clusters',
          type: 'circle',
          source: peakSourceId,
          minzoom: clusterMinZoom,
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#3a4654',
            'circle-radius': [
              'step',
              ['get', 'point_count'],
              17,
              20,
              21,
              60,
              25,
            ],
            'circle-stroke-color': '#faf6e9',
            'circle-stroke-width': 3,
          },
        })
      } else {
        map.setLayerZoomRange('area-peak-clusters', clusterMinZoom, 24)
      }

      if (!map.getLayer('area-peak-cluster-count')) {
        map.addLayer({
          id: 'area-peak-cluster-count',
          type: 'symbol',
          source: peakSourceId,
          minzoom: clusterMinZoom,
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-font': ['Noto Sans Bold'],
            'text-size': 12,
          },
          paint: {
            'text-color': '#fffdf4',
          },
        })
      } else {
        map.setLayerZoomRange('area-peak-cluster-count', clusterMinZoom, 24)
      }

      if (!map.getLayer('area-peak-points')) {
        map.addLayer({
          id: 'area-peak-points',
          type: 'circle',
          source: peakSourceId,
          minzoom: clusterMinZoom,
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': '#a3472d',
            'circle-radius': 7,
            'circle-stroke-color': '#fffdf4',
            'circle-stroke-width': 2.5,
          },
        })
      } else {
        map.setLayerZoomRange('area-peak-points', clusterMinZoom, 24)
      }

      if (!map.getLayer('area-peak-labels')) {
        map.addLayer({
          id: 'area-peak-labels',
          type: 'symbol',
          source: peakSourceId,
          minzoom: labelMinZoom,
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
            'text-color': satellite ? '#fffdf4' : '#292a21',
            'text-halo-color': satellite ? '#1d2118' : '#faf6e9',
            'text-halo-width': 1.5,
          },
        })
      } else {
        map.setLayerZoomRange('area-peak-labels', labelMinZoom, 24)
        map.setPaintProperty(
          'area-peak-labels',
          'text-color',
          satellite ? '#fffdf4' : '#292a21',
        )
        map.setPaintProperty(
          'area-peak-labels',
          'text-halo-color',
          satellite ? '#1d2118' : '#faf6e9',
        )
      }
    }

    const bindEvents = () => {
      if (eventsBound) return
      eventsBound = true

      map.on('click', 'area-peak-clusters', async (event) => {
        const feature = event.features?.[0]
        if (!feature || feature.geometry.type !== 'Point') return
        const clusterId = Number(feature.properties?.cluster_id)
        const source = map.getSource(peakSourceId) as GeoJSONSource
        const zoom = await source.getClusterExpansionZoom(clusterId)
        map.easeTo({
          center: feature.geometry.coordinates as [number, number],
          zoom,
          duration: 500,
        })
      })

      const showPeakPopup = (
        peak: AreaPeak,
        coordinates: [number, number],
      ) => {
        const details = document.createElement('div')
        const label = document.createElement('span')
        const name = document.createElement('strong')
        const height = document.createElement('p')
        const weatherMount = document.createElement('div')
        details.className = 'area-peak-popup'
        label.textContent = formatPeakLists(peak.lists)
        name.textContent = peak.name
        height.className = 'area-peak-popup__height'
        height.innerHTML = `<strong>${peak.height}</strong> <span>m</span>`
        details.append(label, name, height)

        const peakHikes = getHikesForPeak(peak.id)
        if (peakHikes.length) {
          const hikesLink = document.createElement('a')
          hikesLink.className = 'area-peak-popup__hikes'
          hikesLink.href = `/hikes?peak=${encodeURIComponent(peak.id)}`
          hikesLink.textContent =
            peakHikes.length === 1
              ? 'View hike route'
              : `View ${peakHikes.length} hike routes`
          details.append(hikesLink)
        }

        details.append(weatherMount)

        clearWeatherRoot()
        popup?.remove()
        weatherRoot = createRoot(weatherMount)
        weatherRoot.render(
          <PeakWeather
            name={peak.name}
            coords={coordinates}
            elevation={peak.height}
            peakId={peak.id}
            compact
          />,
        )

        popup = new Popup({ offset: 16, closeButton: true, maxWidth: '300px' })
          .setLngLat(coordinates)
          .setDOMContent(details)
          .addTo(map)
        popup.once('close', clearWeatherRoot)
      }

      openPeakPopup.current = (peak, coordinates) => {
        showPeakPopup(peak, coordinates)
      }

      map.on('click', 'area-peak-points', (event) => {
        const feature = event.features?.[0]
        if (!feature || feature.geometry.type !== 'Point') return

        const peakId = String(feature.properties?.id ?? '')
        const peak = peaksRef.current.find((entry) => entry.id === peakId)
        if (!peak) return

        const coordinates = feature.geometry.coordinates as [number, number]
        openedFocusId.current = peak.id
        onPeakSelectRef.current?.(peak)
        showPeakPopup(peak, coordinates)
      })

      map.on('click', regionFillId, (event) => {
        if (peakHitAt(event.point)) return
        const feature = event.features?.[0]
        if (!feature) return
        showRegionPopup(feature, [event.lngLat.lng, event.lngLat.lat])
      })

      map.on('mousemove', (event) => {
        if (peakHitAt(event.point)) {
          map.getCanvas().style.cursor = 'pointer'
          return
        }
        if (!map.getLayer(regionFillId)) {
          map.getCanvas().style.cursor = ''
          return
        }
        const regions = map.queryRenderedFeatures(
          [event.point.x, event.point.y],
          { layers: [regionFillId] },
        )
        map.getCanvas().style.cursor = regions.length ? 'pointer' : ''
      })
    }

    const rebuild = () => {
      try {
        restoreTerrain()
        ensureOverlays()
        bindEvents()
      } catch {
      }
      syncStyleLayers()
    }

    rebuildOverlays.current = () => {
      if (map.isStyleLoaded()) {
        rebuild()
        return
      }
      map.once('idle', rebuild)
    }

    const onStyleReady = () => {
      window.requestAnimationFrame(() => {
        rebuild()
        if (!map.getSource(regionSourceId)) {
          map.once('idle', rebuild)
        }
      })
    }

    map.on('load', onStyleReady)
    map.on('loadWithTerrain', onStyleReady)
    map.on('style.load', onStyleReady)
    map.on('terrain', () => {
      if (map.isStyleLoaded()) {
        syncStyleLayers()
      }
    })
    map.on('zoom', () => {
      syncAreaMarkers()
      syncStyleLayers()
    })
    map.on('moveend', () => {
      loadWaterSources()
    })
    map.once('idle', () => setReady(true))
    timeout = window.setTimeout(() => setReady(true), 8_000)
    }

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
      window.clearTimeout(waterTimer)
      rebuildOverlays.current = null
      applyLayerFilters.current = null
      refreshWaterSources.current = null
      openPeakPopup.current = null
      clearWeatherRoot()
      popup?.remove()
      for (const marker of markers) marker.remove()
      const map = mapRef.current
      mapRef.current = null
      map?.remove()
    }
    // Map instance must stay mounted across area/peak selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey])

  useEffect(() => {
    const el = container.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      mapRef.current?.resize()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [apiKey])

  useEffect(() => {
    if (!ready) return
    rebuildOverlays.current?.()
    if (area?.slug && !focusPeakId) {
      const map = mapRef.current
      if (!map) return
      if (fittedAreaSlug.current === area.slug) return
      fittedAreaSlug.current = area.slug
      if (!peaks.length) return
      const longitudes = peaks.map((peak) => peak.coords[0])
      const latitudes = peaks.map((peak) => peak.coords[1])
      map.fitBounds(
        [
          [Math.min(...longitudes), Math.min(...latitudes)],
          [Math.max(...longitudes), Math.max(...latitudes)],
        ],
        {
          padding: 72,
          maxZoom: 9.25,
          duration: 700,
        },
      )
    }
    if (!area) {
      fittedAreaSlug.current = null
    }
  }, [area, peaks, ready, focusPeakId])

  useEffect(() => {
    if (!focusPeakId) {
      openedFocusId.current = null
      return
    }
    if (!ready) return
    if (openedFocusId.current === focusPeakId) return
    const map = mapRef.current
    const peak = peaks.find((entry) => entry.id === focusPeakId)
    if (!map || !peak) return

    openedFocusId.current = focusPeakId
    map.easeTo({
      center: peak.coords,
      zoom: Math.max(map.getZoom(), 11.2),
      pitch: 52,
      duration: 900,
    })
    window.setTimeout(() => {
      openPeakPopup.current?.(peak, peak.coords)
    }, 950)
  }, [focusPeakId, peaks, ready])

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
        if (!mapRef.current) return
        map.jumpTo(camera)
        rebuildOverlays.current?.()
        applyLayerFilters.current?.()
        if (showWaterRef.current) {
          refreshWaterSources.current?.(true)
        }
      }
      map.once('style.load', () => {
        restore()
        map.once('idle', restore)
        window.setTimeout(restore, 450)
      })
    })
  }, [basemap, apiKey])

  useEffect(() => {
    if (!ready) return
    applyMapFilters(showPaths, showWater)
  }, [showPaths, showWater, ready])

  if (!apiKey) {
    return (
      <div className="map-key area-map-key">
        <div className="map-key__content">
          <span className="eyebrow">Map setup required</span>
          <h2>Add a MapTiler key</h2>
          <p>The UK exploration map needs the configured browser key.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="uk-map-wrap">
      <div
        ref={container}
        className="uk-map"
        aria-label={area ? `${area.name} summit map` : 'UK upland areas map'}
      />
      <div className="map-hud">
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
      {!ready && (
        <div className="map-loading" role="status">
          <div className="map-loading__rings" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="eyebrow">{area?.name ?? 'United Kingdom'} terrain</span>
          <strong>Drawing the high ground</strong>
          <small>Loading uplands, parks and mountain regions…</small>
        </div>
      )}
    </div>
  )
}
