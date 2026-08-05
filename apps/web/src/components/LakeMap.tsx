import { useEffect, useRef, useState } from 'react'
import {
  Map as TilerMap,
  MapStyle,
  Marker,
  config,
} from '@maptiler/sdk'
import '@maptiler/sdk/dist/maptiler-sdk.css'
import type { Peak } from '../data/peaks'
import { MAP_MAX_ZOOM } from '../data/mapBasemap'

export type PeakFilter = 'all' | 'done' | 'todo'

type LakeMapProps = {
  peaks: Peak[]
  filter: PeakFilter
  selectedId: string | null
  onSelect: (id: string) => void
}

type PeakGroup = {
  peaks: Peak[]
  coords: [number, number]
}

const lakeView = {
  center: [-3.165, 54.515] as [number, number],
  zoom: 9.65,
  pitch: 58,
  bearing: -18,
}

function matches(peak: Peak, filter: PeakFilter) {
  return (
    filter === 'all' ||
    (filter === 'done' && peak.done) ||
    (filter === 'todo' && !peak.done)
  )
}

function groupPeaks(peaks: Peak[], map: TilerMap): PeakGroup[] {
  const zoom = map.getZoom()
  const cellSize = zoom < 10 ? 76 : zoom < 11.5 ? 60 : zoom < 13 ? 44 : 28
  const cells = new Map<string, Peak[]>()

  for (const peak of peaks) {
    const point = map.project(peak.coords)
    const x = Math.floor(point.x / cellSize)
    const y = Math.floor(point.y / cellSize)
    const key = `${x}:${y}`
    const cell = cells.get(key) ?? []
    cell.push(peak)
    cells.set(key, cell)
  }

  return [...cells.values()].map((cell) => ({
    peaks: cell,
    coords: [
      cell.reduce((sum, peak) => sum + peak.coords[0], 0) / cell.length,
      cell.reduce((sum, peak) => sum + peak.coords[1], 0) / cell.length,
    ],
  }))
}

export function LakeMap({
  peaks,
  filter,
  selectedId,
  onSelect,
}: LakeMapProps) {
  const [ready, setReady] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<TilerMap | null>(null)
  const markers = useRef<Marker[]>([])
  const redraw = useRef(() => {})
  const peakData = useRef(peaks)
  const activeFilter = useRef(filter)
  const activePeak = useRef(selectedId)
  const select = useRef(onSelect)
  const apiKey = import.meta.env.VITE_MAPTILER_KEY?.trim()

  useEffect(() => {
    select.current = onSelect
  }, [onSelect])

  useEffect(() => {
    activeFilter.current = filter
    redraw.current()
  }, [filter])

  useEffect(() => {
    peakData.current = peaks
    redraw.current()
  }, [peaks])

  useEffect(() => {
    activePeak.current = selectedId
    redraw.current()

    if (!selectedId) return
    const peak = peaks.find((item) => item.id === selectedId)
    if (!peak || !map.current) return

    map.current.flyTo({
      center: peak.coords,
      zoom: 12.2,
      pitch: 60,
      bearing: -24,
      duration: 700,
      essential: true,
    })
  }, [peaks, selectedId])

  useEffect(() => {
    if (!container.current || !apiKey) return

    config.apiKey = apiKey
    setReady(false)

    const nextMap = new TilerMap({
      container: container.current,
      style: MapStyle.OUTDOOR.DEFAULT,
      ...lakeView,
      terrain: true,
      terrainExaggeration: 1.08,
      terrainControl: false,
      navigationControl: true,
      scaleControl: true,
      maxPitch: 72,
      minZoom: 8,
      maxZoom: MAP_MAX_ZOOM,
      fadeDuration: 0,
      renderWorldCopies: false,
    })

    map.current = nextMap
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

    const draw = () => {
      if (!nextMap.isStyleLoaded()) return
      hideBasePeaks()

      for (const marker of markers.current) marker.remove()
      markers.current = []

      const canvas = nextMap.getCanvas()
      const visible = peakData.current.filter(
        (peak) => {
          if (!matches(peak, activeFilter.current)) return false
          const point = nextMap.project(peak.coords)
          return (
            point.x >= -40 &&
            point.y >= -40 &&
            point.x <= canvas.clientWidth + 40 &&
            point.y <= canvas.clientHeight + 40
          )
        },
      )

      for (const group of groupPeaks(visible, nextMap)) {
        if (group.peaks.length === 1) {
          const peak = group.peaks[0]
          const element = document.createElement('button')
          element.type = 'button'
          element.className = [
            'map-peak',
            peak.done ? 'is-done' : 'is-todo',
            peak.id === activePeak.current ? 'is-selected' : '',
          ]
            .filter(Boolean)
            .join(' ')
          element.setAttribute(
            'aria-label',
            `${peak.name}, ${peak.height} metres, ${peak.done ? 'completed' : 'not completed'}`,
          )
          element.innerHTML = '<span aria-hidden="true"></span>'
          element.addEventListener('click', () => select.current(peak.id))

          markers.current.push(
            new Marker({ element, anchor: 'bottom' })
              .setLngLat(peak.coords)
              .addTo(nextMap),
          )
          continue
        }

        const element = document.createElement('button')
        const completed = group.peaks.filter((peak) => peak.done).length
        element.type = 'button'
        element.className = `map-cluster ${completed ? 'has-done' : ''}`
        element.textContent = String(group.peaks.length)
        element.setAttribute(
          'aria-label',
          `${group.peaks.length} Wainwrights, ${completed} completed. Zoom in to explore.`,
        )
        element.addEventListener('click', (event) => {
          event.stopPropagation()
          const longitudes = group.peaks.map((peak) => peak.coords[0])
          const latitudes = group.peaks.map((peak) => peak.coords[1])
          nextMap.fitBounds(
            [
              [Math.min(...longitudes), Math.min(...latitudes)],
              [Math.max(...longitudes), Math.max(...latitudes)],
            ],
            {
              padding: 120,
              maxZoom: 14.5,
              duration: 650,
            },
          )
        })

        markers.current.push(
          new Marker({ element })
            .setLngLat(group.coords)
            .addTo(nextMap),
        )
      }
    }

    redraw.current = draw
    nextMap.on('style.load', hideBasePeaks)
    nextMap.on('load', draw)
    nextMap.on('moveend', draw)
    nextMap.on('loadWithTerrain', draw)
    nextMap.once('idle', showMap)
    const loadTimeout = window.setTimeout(showMap, 8_000)

    return () => {
      settled = true
      window.clearTimeout(loadTimeout)
      redraw.current = () => {}
      for (const marker of markers.current) marker.remove()
      markers.current = []
      nextMap.remove()
      map.current = null
    }
  }, [apiKey])

  return (
    <div className="map-wrap">
      <div ref={container} className="map" aria-label="3D Lake District map" />
      {!ready && (
        <div className="map-loading" role="status" aria-live="polite">
          <div className="map-loading__rings" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="eyebrow">Lake District terrain</span>
          <strong>Surveying the fells</strong>
          <small>Loading contours, summits and 3D elevation…</small>
        </div>
      )}
      <button
        className="reset-view"
        type="button"
        onClick={() => map.current?.flyTo({ ...lakeView, duration: 700 })}
      >
        Reset Lake District view
      </button>
    </div>
  )
}
