import { useEffect, useRef, useState } from 'react'
import {
  Map as TilerMap,
  Popup,
  config,
  type GeoJSONSource,
} from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import {
  bothyHouseMbaIconId,
  bothyHouseMbaImageData,
  bothyHouseOtherIconId,
  bothyHouseOtherImageData,
} from '../data/bothyIcon'
import { formatBothyCoords, isMbaBothy, type Bothy } from '../data/bothies'
import {
  type BasemapId,
  basemapStyle,
  resolveBasemapStyle,
  ukMaxBounds,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
} from '../data/mapBasemap'
import { addUkMaskLayer } from '../data/ukMask'
import { MapLayerFilters } from './MapLayerFilters'
import {
  clearWaterOverlay,
  fetchWaterSourcesInBbox,
  syncMapFilters,
  waterSourceSourceId,
  type FilterMap,
} from '../data/mapLayers'

type BothiesMapProps = {
  bothies: Bothy[]
  focusBothyId?: string | null
  onBothySelect?: (bothy: Bothy) => void
  onBothyClear?: () => void
}

const sourceId = 'bothies'
const hitLayers = ['bothy-clusters', 'bothy-points']

function bothyCollection(items: Bothy[]) {
  return {
    type: 'FeatureCollection' as const,
    features: items.map((bothy) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: bothy.coords,
      },
      properties: {
        id: bothy.id,
        name: bothy.name,
        region: bothy.region,
        operator: bothy.operator,
        ele: bothy.ele,
        mba: isMbaBothy(bothy) ? 1 : 0,
      },
    })),
  }
}

export function BothiesMap({
  bothies,
  focusBothyId,
  onBothySelect,
  onBothyClear,
}: BothiesMapProps) {
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
  const bothiesRef = useRef(bothies)
  const onSelectRef = useRef(onBothySelect)
  const onClearRef = useRef(onBothyClear)
  const rebuildOverlays = useRef<(() => void) | null>(null)
  const applyLayerFilters = useRef<(() => void) | null>(null)
  const refreshWaterSources = useRef<((immediate?: boolean) => void) | null>(
    null,
  )
  const openPopup = useRef<
    ((bothy: Bothy, coordinates: [number, number]) => void) | null
  >(null)
  const clearPopupRef = useRef<((silent?: boolean) => void) | null>(null)
  const skipBasemapSwap = useRef(true)
  const openedFocusId = useRef<string | null>(null)
  const apiKey = import.meta.env.VITE_MAPTILER_KEY?.trim()

  basemapRef.current = basemap
  showPathsRef.current = showPaths
  showWaterRef.current = showWater
  bothiesRef.current = bothies
  onSelectRef.current = onBothySelect
  onClearRef.current = onBothyClear

  useEffect(() => {
    if (!container.current || !apiKey) return

    config.apiKey = apiKey
    setReady(false)

    let cancelled = false
    let map: TilerMap | null = null
    let popup: Popup | null = null
    let eventsBound = false
    let waterTimer: number | null = null
    let waterFetchId = 0
    let suppressClearOnClose = false

    void resolveBasemapStyle('map', apiKey).then((style) => {
      if (cancelled || !container.current) return

      map = new TilerMap({
        container: container.current,
        style,
        center: [-4.2, 56.4],
        zoom: 5.6,
        pitch: 42,
        bearing: -8,
        terrain: true,
        terrainExaggeration: 1.05,
        navigationControl: true,
        terrainControl: true,
        scaleControl: true,
        minZoom: MAP_MIN_ZOOM,
        maxZoom: MAP_MAX_ZOOM,
        maxBounds: ukMaxBounds,
        fadeDuration: 0,
        renderWorldCopies: false,
      })

      mapRef.current = map

      const clearPopup = (silent = false) => {
        if (!popup) return
        suppressClearOnClose = silent
        popup.remove()
        popup = null
        suppressClearOnClose = false
      }
      clearPopupRef.current = clearPopup

      const applyMapFilters = (paths: boolean, water: boolean) => {
        if (!map) return
        syncMapFilters(map as unknown as FilterMap, paths, water)
        if (!water) clearWaterOverlay(map as unknown as FilterMap)
      }
      applyLayerFilters.current = () =>
        applyMapFilters(showPathsRef.current, showWaterRef.current)

      const loadWaterSources = (immediate = false) => {
        if (!map || !showWaterRef.current) return
        if (waterTimer != null) window.clearTimeout(waterTimer)
        const runFetch = () => {
          if (!map || !showWaterRef.current) return
          const bounds = map.getBounds()
          const fetchId = ++waterFetchId
          setWaterLoading(true)
          void fetchWaterSourcesInBbox(
            bounds.getSouth(),
            bounds.getWest(),
            bounds.getNorth(),
            bounds.getEast(),
          )
            .then((data) => {
              if (!map || fetchId !== waterFetchId || !showWaterRef.current)
                return
              const existing = map.getSource(waterSourceSourceId) as
                | GeoJSONSource
                | undefined
              if (existing) existing.setData(data)
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

      const showBothyPopup = (
        bothy: Bothy,
        coordinates: [number, number],
      ) => {
        const details = document.createElement('div')
        details.className = 'bothy-popup'
        const label = document.createElement('span')
        label.textContent = bothy.region
        const name = document.createElement('strong')
        name.textContent = bothy.name
        details.append(label, name)

        if (bothy.operator) {
          const op = document.createElement('p')
          op.textContent = bothy.operator
          details.append(op)
        }
        const kind = document.createElement('p')
        kind.className = isMbaBothy(bothy)
          ? 'bothy-popup__kind is-mba'
          : 'bothy-popup__kind is-other'
        kind.textContent = isMbaBothy(bothy)
          ? 'MBA bothy'
          : 'Other shelter'
        details.append(kind)
        if (bothy.ele != null) {
          const elev = document.createElement('p')
          elev.textContent = `${bothy.ele} m`
          details.append(elev)
        }

        const coords = document.createElement('p')
        coords.className = 'bothy-popup__coords'
        coords.textContent = formatBothyCoords(coordinates)
        details.append(coords)

        if (bothy.website && isMbaBothy(bothy)) {
          const links = document.createElement('div')
          links.className = 'bothy-popup__links'
          const web = document.createElement('a')
          web.href = bothy.website
          web.target = '_blank'
          web.rel = 'noreferrer'
          web.textContent = 'MBA page'
          links.append(web)
          details.append(links)
        }

        let ignoreClose = true
        clearPopup(true)
        popup = new Popup({ offset: 12, closeButton: true, maxWidth: '260px' })
          .setLngLat(coordinates)
          .setDOMContent(details)
          .addTo(map!)
        popup.on('close', () => {
          if (suppressClearOnClose || ignoreClose) return
          popup = null
          onClearRef.current?.()
        })
        // Allow the next close (user X / map dismiss) to clear selection.
        window.setTimeout(() => {
          ignoreClose = false
        }, 0)
      }
      openPopup.current = showBothyPopup

      const ensureOverlays = () => {
        if (!map) return
        addUkMaskLayer(map)

        // Outdoor style peak triangles compete with bothy houses — hide them.
        for (const layerId of ['Peak labels', 'Peak labels (US)', 'Mountain peak']) {
          if (map.getLayer(layerId)) {
            map.setLayoutProperty(layerId, 'visibility', 'none')
          }
        }

        if (!map.hasImage(bothyHouseMbaIconId)) {
          map.addImage(bothyHouseMbaIconId, bothyHouseMbaImageData(), {
            pixelRatio: 2,
          })
        }
        if (!map.hasImage(bothyHouseOtherIconId)) {
          map.addImage(bothyHouseOtherIconId, bothyHouseOtherImageData(), {
            pixelRatio: 2,
          })
        }

        const items = bothiesRef.current
        const existing = map.getSource(sourceId) as GeoJSONSource | undefined
        if (!existing) {
          map.addSource(sourceId, {
            type: 'geojson',
            cluster: true,
            clusterMaxZoom: 10,
            clusterRadius: 48,
            data: bothyCollection(items),
          })
        } else {
          existing.setData(bothyCollection(items))
        }

        if (!map.getLayer('bothy-clusters')) {
          map.addLayer({
            id: 'bothy-clusters',
            type: 'circle',
            source: sourceId,
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': '#3d4f3a',
              'circle-radius': [
                'step',
                ['get', 'point_count'],
                18,
                15,
                22,
                40,
                26,
              ],
              'circle-stroke-color': '#f4efe2',
              'circle-stroke-width': 3,
            },
          })
        }

        if (!map.getLayer('bothy-cluster-count')) {
          map.addLayer({
            id: 'bothy-cluster-count',
            type: 'symbol',
            source: sourceId,
            filter: ['has', 'point_count'],
            layout: {
              'text-field': ['get', 'point_count_abbreviated'],
              'text-font': ['Noto Sans Bold'],
              'text-size': 13,
            },
            paint: { 'text-color': '#f8f4ea' },
          })
        }

        if (!map.getLayer('bothy-points')) {
          map.addLayer({
            id: 'bothy-points',
            type: 'symbol',
            source: sourceId,
            filter: ['!', ['has', 'point_count']],
            layout: {
              'icon-image': [
                'case',
                ['==', ['get', 'mba'], 1],
                bothyHouseMbaIconId,
                bothyHouseOtherIconId,
              ],
              'icon-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                5,
                0.72,
                8,
                0.92,
                11,
                1.12,
                14,
                1.28,
              ],
              'icon-anchor': 'bottom',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
          })
        }

        if (!map.getLayer('bothy-labels')) {
          map.addLayer({
            id: 'bothy-labels',
            type: 'symbol',
            source: sourceId,
            minzoom: 9.2,
            filter: ['!', ['has', 'point_count']],
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Noto Sans Bold'],
              'text-size': 12,
              'text-offset': [0, 0.4],
              'text-anchor': 'top',
              'text-optional': true,
            },
            paint: {
              'text-color':
                basemapRef.current === 'satellite' ? '#f8f4ea' : '#2a2b22',
              'text-halo-color':
                basemapRef.current === 'satellite' ? '#1c2118' : '#f4efe2',
              'text-halo-width': 1.6,
            },
          })
        } else {
          const satellite = basemapRef.current === 'satellite'
          map.setPaintProperty(
            'bothy-labels',
            'text-color',
            satellite ? '#f8f4ea' : '#2a2b22',
          )
          map.setPaintProperty(
            'bothy-labels',
            'text-halo-color',
            satellite ? '#1c2118' : '#f4efe2',
          )
        }

        if (!map.hasTerrain()) map.enableTerrain(1.05)
      }
      rebuildOverlays.current = ensureOverlays

      const bindEvents = () => {
        if (!map || eventsBound) return
        eventsBound = true

        map.on('click', 'bothy-clusters', async (event) => {
          const feature = event.features?.[0]
          if (!feature || feature.geometry.type !== 'Point') return
          const clusterId = Number(feature.properties?.cluster_id)
          const source = map!.getSource(sourceId) as GeoJSONSource
          const zoom = await source.getClusterExpansionZoom(clusterId)
          map!.easeTo({
            center: feature.geometry.coordinates as [number, number],
            zoom,
            duration: 500,
          })
        })

        map.on('click', 'bothy-points', (event) => {
          event.originalEvent.stopPropagation()
          const feature = event.features?.[0]
          if (!feature?.properties || feature.geometry.type !== 'Point') return
          const id = String(feature.properties.id)
          const bothy = bothiesRef.current.find((item) => item.id === id)
          if (!bothy) return
          const coordinates = feature.geometry.coordinates as [number, number]
          onSelectRef.current?.(bothy)
          showBothyPopup(bothy, coordinates)
        })

        map.on('click', (event) => {
          const layers = hitLayers.filter((layerId) => map!.getLayer(layerId))
          if (!layers.length) return
          const hits = map!.queryRenderedFeatures(event.point, { layers })
          if (hits.length) return
          clearPopup()
        })

        for (const layerId of hitLayers) {
          map.on('mouseenter', layerId, () => {
            map!.getCanvas().style.cursor = 'pointer'
          })
          map.on('mouseleave', layerId, () => {
            map!.getCanvas().style.cursor = ''
          })
        }

        map.on('moveend', () => {
          if (showWaterRef.current) loadWaterSources()
        })
      }

      const onReady = () => {
        if (!map || cancelled) return
        ensureOverlays()
        bindEvents()
        applyMapFilters(showPathsRef.current, showWaterRef.current)
        setReady(true)
      }

      map.on('load', onReady)
      map.on('style.load', () => {
        ensureOverlays()
        applyMapFilters(showPathsRef.current, showWaterRef.current)
        if (showWaterRef.current) loadWaterSources(true)
      })
    })

    return () => {
      cancelled = true
      if (waterTimer != null) window.clearTimeout(waterTimer)
      popup?.remove()
      map?.remove()
      mapRef.current = null
      rebuildOverlays.current = null
      applyLayerFilters.current = null
      refreshWaterSources.current = null
      openPopup.current = null
      clearPopupRef.current = null
    }
  }, [apiKey])

  useEffect(() => {
    if (!ready) return
    rebuildOverlays.current?.()
  }, [bothies, ready])

  useEffect(() => {
    if (!focusBothyId) {
      openedFocusId.current = null
      clearPopupRef.current?.(true)
      return
    }
    if (!ready) return
    if (openedFocusId.current === focusBothyId) return
    const map = mapRef.current
    const bothy = bothies.find((item) => item.id === focusBothyId)
    if (!map || !bothy) return

    openedFocusId.current = focusBothyId
    map.easeTo({
      center: bothy.coords,
      zoom: Math.max(map.getZoom(), 11.5),
      pitch: 50,
      duration: 900,
    })
    window.setTimeout(() => {
      openPopup.current?.(bothy, bothy.coords)
    }, 950)
  }, [focusBothyId, bothies, ready])

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
        if (showWaterRef.current) refreshWaterSources.current?.(true)
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
    applyLayerFilters.current?.()
    if (showWater) refreshWaterSources.current?.(true)
  }, [showPaths, showWater, ready])

  if (!apiKey) {
    return (
      <div className="uk-map-panel">
        <p className="map-missing-key">
          Add a MapTiler key to <code>.env.local</code> to load the bothies map.
        </p>
      </div>
    )
  }

  return (
    <div className="uk-map-panel">
      <div className="uk-map-wrap">
        <div ref={container} className="uk-map" />
        <div className="map-hud">
          <MapLayerFilters
            showPaths={showPaths}
            showWater={showWater}
            waterLoading={waterLoading}
            onPathsChange={setShowPaths}
            onWaterChange={setShowWater}
          />
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
        <div className="bothies-map-legend" aria-label="Bothy legend">
          <span className="bothies-map-legend__item is-mba">
            <span className="bothies-map-legend__swatch" aria-hidden="true" />
            MBA
          </span>
          <span className="bothies-map-legend__item is-other">
            <span className="bothies-map-legend__swatch" aria-hidden="true" />
            Other
          </span>
        </div>
      </div>
    </div>
  )
}
