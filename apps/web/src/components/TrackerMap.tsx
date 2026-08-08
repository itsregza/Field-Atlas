import { useEffect, useRef, useState } from 'react'
import {
  Map as TilerMap,
  config,
  type GeoJSONSource,
} from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import {
  getAreaBoundaryFeature,
  getAreaCameraBounds,
  getAreaOutsideMask,
} from '../data/areaBoundaries'
import type { Area } from '../data/areas'
import { formatPeakLists, type TrackedPeak } from '../data/areaPeaks'
import {
  type BasemapId,
  basemapStyle,
  ukMaxBounds,
  MAP_MAX_ZOOM,
} from '../data/mapBasemap'
import { addOutsideMaskLayer } from '../data/ukMask'
import type { PeakFilter } from './LakeMap'

type TrackerMapProps = {
  area: Area
  peaks: TrackedPeak[]
  filter: PeakFilter
  selectedId: string | null
  onSelect: (id: string) => void
}

const sourceId = 'tracker-peaks'
const clusterLayer = 'tracker-clusters'
const pointLayer = 'tracker-points'
const regionSourceId = 'tracker-region'
const regionFillId = 'tracker-region-fill'
const regionOutlineId = 'tracker-region-outline'
const outsideMaskSourceId = 'region-outside-mask'

function visiblePeaks(peaks: TrackedPeak[], filter: PeakFilter) {
  return peaks.filter(
    (peak) =>
      filter === 'all' ||
      (filter === 'done' && peak.done) ||
      (filter === 'todo' && !peak.done),
  )
}

function peakCollection(
  peaks: TrackedPeak[],
  filter: PeakFilter,
  selectedId: string | null,
) {
  return {
    type: 'FeatureCollection' as const,
    features: visiblePeaks(peaks, filter).map((peak) => ({
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
        done: peak.done,
        selected: peak.id === selectedId,
      },
    })),
  }
}

function fitArea(map: TilerMap, peaks: TrackedPeak[], duration = 0) {
  const longitudes = peaks.map((peak) => peak.coords[0])
  const latitudes = peaks.map((peak) => peak.coords[1])
  if (longitudes.length < 2) return
  map.fitBounds(
    [
      [Math.min(...longitudes), Math.min(...latitudes)],
      [Math.max(...longitudes), Math.max(...latitudes)],
    ],
    {
      padding: 80,
      maxZoom: 9.2,
      duration,
    },
  )
}

export function TrackerMap({
  area,
  peaks,
  filter,
  selectedId,
  onSelect,
}: TrackerMapProps) {
  const [ready, setReady] = useState(false)
  const [basemap, setBasemap] = useState<BasemapId>('map')
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<TilerMap | null>(null)
  const source = useRef<GeoJSONSource | null>(null)
  const peakData = useRef(peaks)
  const activeFilter = useRef(filter)
  const activeId = useRef(selectedId)
  const select = useRef(onSelect)
  const basemapRef = useRef(basemap)
  const rebuildOverlays = useRef<(() => void) | null>(null)
  const skipBasemapSwap = useRef(true)
  const apiKey = import.meta.env.VITE_MAPTILER_KEY?.trim()
  basemapRef.current = basemap

  const updateSource = () => {
    source.current?.setData(
      peakCollection(peakData.current, activeFilter.current, activeId.current),
    )
  }

  useEffect(() => {
    select.current = onSelect
  }, [onSelect])

  useEffect(() => {
    peakData.current = peaks
    updateSource()
  }, [peaks])

  useEffect(() => {
    activeFilter.current = filter
    updateSource()
  }, [filter])

  useEffect(() => {
    activeId.current = selectedId
    updateSource()

    if (!selectedId || !map.current) return
    const peak = peaks.find((item) => item.id === selectedId)
    if (!peak) return

    map.current.easeTo({
      center: peak.coords,
      zoom: Math.max(map.current.getZoom(), 11.7),
      pitch: 55,
      duration: 550,
    })
  }, [peaks, selectedId])

  useEffect(() => {
    if (!container.current || !apiKey) return

    config.apiKey = apiKey
    setReady(false)

    const cameraBounds = getAreaCameraBounds(peakData.current) ?? ukMaxBounds

    const nextMap = new TilerMap({
      container: container.current,
      style: basemapStyle(basemapRef.current),
      center: area.coords,
      zoom: 7.5,
      pitch: 48,
      bearing: -10,
      terrain: true,
      terrainExaggeration: 1.06,
      terrainControl: false,
      navigationControl: true,
      scaleControl: true,
      minZoom: 7,
      maxZoom: MAP_MAX_ZOOM,
      maxPitch: 70,
      maxBounds: cameraBounds,
      fadeDuration: 0,
      renderWorldCopies: false,
    })

    map.current = nextMap
    let eventsBound = false
    let didFitBounds = false
    let settled = false

    const showMap = () => {
      if (settled) return
      settled = true
      setReady(true)
    }

    const hideBasePeaks = () => {
      for (const layerId of ['Peak labels', 'Peak labels (US)']) {
        if (nextMap.getLayer(layerId)) {
          nextMap.setLayoutProperty(layerId, 'visibility', 'none')
        }
      }
    }

    const restoreTerrain = () => {
      if (!nextMap.hasTerrain()) {
        nextMap.enableTerrain(1.06)
      }
    }

    const ensureOverlays = () => {
      hideBasePeaks()

      const satellite = basemapRef.current === 'satellite'
      const boundary = getAreaBoundaryFeature(area, peakData.current)

      if (boundary) {
        addOutsideMaskLayer(
          nextMap,
          getAreaOutsideMask(boundary),
          outsideMaskSourceId,
        )

        if (!nextMap.getSource(regionSourceId)) {
          nextMap.addSource(regionSourceId, {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [boundary],
            },
          })
        }

        if (!nextMap.getLayer(regionFillId)) {
          nextMap.addLayer({
            id: regionFillId,
            type: 'fill',
            source: regionSourceId,
            paint: {
              'fill-color': area.color,
              'fill-opacity': satellite ? 0.28 : 0.18,
            },
          })
        } else {
          nextMap.setPaintProperty(
            regionFillId,
            'fill-opacity',
            satellite ? 0.28 : 0.18,
          )
        }

        if (!nextMap.getLayer(regionOutlineId)) {
          nextMap.addLayer({
            id: regionOutlineId,
            type: 'line',
            source: regionSourceId,
            paint: {
              'line-color': satellite ? '#fffdf4' : area.color,
              'line-width': [
                'interpolate',
                ['linear'],
                ['zoom'],
                7,
                satellite ? 3 : 2.5,
                10,
                satellite ? 4 : 3.5,
                13,
                satellite ? 5 : 4.5,
              ],
              'line-opacity': 0.95,
            },
          })
        } else {
          nextMap.setPaintProperty(
            regionOutlineId,
            'line-color',
            satellite ? '#fffdf4' : area.color,
          )
        }
      }

      if (!nextMap.getSource(sourceId)) {
        nextMap.addSource(sourceId, {
          type: 'geojson',
          cluster: true,
          clusterMaxZoom: 11,
          clusterRadius: 46,
          data: peakCollection(
            peakData.current,
            activeFilter.current,
            activeId.current,
          ),
        })
      }

      source.current = nextMap.getSource(sourceId) as GeoJSONSource
      source.current?.setData(
        peakCollection(
          peakData.current,
          activeFilter.current,
          activeId.current,
        ),
      )

      if (!nextMap.getLayer(clusterLayer)) {
        nextMap.addLayer({
          id: clusterLayer,
          type: 'circle',
          source: sourceId,
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
      }

      if (!nextMap.getLayer('tracker-cluster-count')) {
        nextMap.addLayer({
          id: 'tracker-cluster-count',
          type: 'symbol',
          source: sourceId,
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
      }

      if (!nextMap.getLayer(pointLayer)) {
        nextMap.addLayer({
          id: pointLayer,
          type: 'circle',
          source: sourceId,
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': [
              'case',
              ['boolean', ['get', 'done'], false],
              '#5f8a48',
              '#a3472d',
            ],
            'circle-radius': [
              'case',
              ['boolean', ['get', 'selected'], false],
              10,
              7,
            ],
            'circle-stroke-color': '#fffdf4',
            'circle-stroke-width': [
              'case',
              ['boolean', ['get', 'selected'], false],
              4,
              2.5,
            ],
          },
        })
      }

      if (!nextMap.getLayer('tracker-peak-labels')) {
        nextMap.addLayer({
          id: 'tracker-peak-labels',
          type: 'symbol',
          source: sourceId,
          minzoom: 11,
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
        nextMap.setPaintProperty(
          'tracker-peak-labels',
          'text-color',
          satellite ? '#fffdf4' : '#292a21',
        )
        nextMap.setPaintProperty(
          'tracker-peak-labels',
          'text-halo-color',
          satellite ? '#1d2118' : '#faf6e9',
        )
      }

      if (!didFitBounds) {
        didFitBounds = true
        fitArea(nextMap, peakData.current)
      }
    }

    const bindEvents = () => {
      if (eventsBound) return
      eventsBound = true

      nextMap.on('click', clusterLayer, async (event) => {
        const feature = event.features?.[0]
        if (!feature || feature.geometry.type !== 'Point' || !source.current) {
          return
        }

        const zoom = await source.current.getClusterExpansionZoom(
          Number(feature.properties?.cluster_id),
        )
        nextMap.easeTo({
          center: feature.geometry.coordinates as [number, number],
          zoom,
          duration: 450,
        })
      })

      nextMap.on('click', pointLayer, (event) => {
        const id = event.features?.[0]?.properties?.id
        if (typeof id === 'string') select.current(id)
      })

      for (const layerId of [clusterLayer, pointLayer]) {
        nextMap.on('mouseenter', layerId, () => {
          nextMap.getCanvas().style.cursor = 'pointer'
        })
        nextMap.on('mouseleave', layerId, () => {
          nextMap.getCanvas().style.cursor = ''
        })
      }
    }

    const rebuild = () => {
      try {
        restoreTerrain()
        ensureOverlays()
        bindEvents()
      } catch {
        // Style may still be settling; idle handler retries.
      }
    }

    rebuildOverlays.current = () => {
      if (nextMap.isStyleLoaded()) {
        rebuild()
        return
      }
      nextMap.once('idle', rebuild)
    }

    const onStyleReady = () => {
      // Wait a tick so the new style is fully queryable after setStyle.
      window.requestAnimationFrame(() => {
        rebuild()
        if (!nextMap.getSource(sourceId)) {
          nextMap.once('idle', rebuild)
        }
      })
    }

    nextMap.on('load', onStyleReady)
    nextMap.on('loadWithTerrain', onStyleReady)
    nextMap.on('style.load', onStyleReady)
    nextMap.once('idle', showMap)
    const timeout = window.setTimeout(showMap, 8_000)

    return () => {
      settled = true
      rebuildOverlays.current = null
      window.clearTimeout(timeout)
      source.current = null
      nextMap.remove()
      map.current = null
    }
  }, [apiKey, area])

  useEffect(() => {
    const el = container.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      map.current?.resize()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [apiKey, area])

  useEffect(() => {
    if (skipBasemapSwap.current) {
      skipBasemapSwap.current = false
      return
    }

    const nextMap = map.current
    if (!nextMap) return

    const camera = {
      center: nextMap.getCenter(),
      zoom: nextMap.getZoom(),
      pitch: nextMap.getPitch(),
      bearing: nextMap.getBearing(),
    }

    source.current = null
    nextMap.setStyle(basemapStyle(basemap), { diff: false })
    nextMap.once('style.load', () => {
      nextMap.jumpTo(camera)
      rebuildOverlays.current?.()
    })
    // Fallback if style.load already fired before once() attached.
    nextMap.once('idle', () => {
      if (!nextMap.getSource(sourceId)) {
        rebuildOverlays.current?.()
      }
    })
  }, [basemap])

  if (!apiKey) {
    return (
      <div className="map-key">
        <div className="map-key__content">
          <span className="eyebrow">Map setup required</span>
          <h2>Add your MapTiler key</h2>
          <p>The summit checklist needs the configured browser key.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="map-wrap">
      <div
        ref={container}
        className="map"
        aria-label={`${area.name} 3D summit checklist`}
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
      {!ready && (
        <div className="map-loading" role="status" aria-live="polite">
          <div className="map-loading__rings" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="eyebrow">{area.name} terrain</span>
          <strong>Surveying the summits</strong>
          <small>Loading contours, peaks and 3D elevation…</small>
        </div>
      )}
      <button
        className="reset-view"
        type="button"
        onClick={() => {
          if (!map.current) return
          fitArea(map.current, peaks, 600)
        }}
      >
        Reset {area.name} view
      </button>
    </div>
  )
}
