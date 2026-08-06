import { useEffect, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import type { AreaPeak } from '@/src/data/areaPeaks'
import { colors } from '@/src/theme'

const STYLE = `https://api.maptiler.com/maps/outdoor-v4/style.json?key=${
  process.env.EXPO_PUBLIC_MAPTILER_KEY ?? ''
}`

type Props = {
  peaks: AreaPeak[]
  selectedId: string | null
  doneIds: Set<string>
  onSelect: (peakId: string) => void
  center?: [number, number]
  zoom?: number
}

/**
 * MapLibre v4 on a portal'd DOM node — avoids RN-web stealing touches
 * ("Cannot find a single active touch").
 */
export function PeaksMapCanvas({
  peaks,
  selectedId,
  doneIds,
  onSelect,
  center = [-3.0, 54.5],
  zoom = 5.8,
}: Props) {
  const hostRef = useRef<View>(null)
  const slotRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<import('maplibre-gl').Map | null>(null)
  const peaksRef = useRef(peaks)
  const doneRef = useRef(doneIds)
  const onSelectRef = useRef(onSelect)
  const readyRef = useRef(false)
  peaksRef.current = peaks
  doneRef.current = doneIds
  onSelectRef.current = onSelect

  const pushData = (map: import('maplibre-gl').Map) => {
    const source = map.getSource('peaks') as
      | import('maplibre-gl').GeoJSONSource
      | undefined
    if (!source) return
    source.setData({
      type: 'FeatureCollection',
      features: peaksRef.current.map((peak) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: peak.coords,
        },
        properties: {
          id: peak.id,
          name: peak.name,
          done: doneRef.current.has(peak.id) ? 1 : 0,
        },
      })),
    })
  }

  useEffect(() => {
    let cancelled = false
    let map: import('maplibre-gl').Map | null = null
    let ro: ResizeObserver | null = null
    const slot = document.createElement('div')
    slot.style.cssText =
      'position:absolute;inset:0;width:100%;height:100%;touch-action:pan-x pan-y;'
    slotRef.current = slot

    const mount = () => {
      const host = hostRef.current as unknown as HTMLElement | null
      if (!host || cancelled) return
      host.innerHTML = ''
      host.appendChild(slot)
    }
    mount()

    void (async () => {
      const maplibregl = (await import('maplibre-gl')).default
      if (cancelled) return

      if (!document.getElementById('maplibre-css')) {
        const link = document.createElement('link')
        link.id = 'maplibre-css'
        link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css'
        document.head.appendChild(link)
      }

      await new Promise((r) => requestAnimationFrame(() => r(null)))
      if (cancelled || !slot.isConnected) mount()
      if (cancelled) return

      map = new maplibregl.Map({
        container: slot,
        style: STYLE,
        center,
        zoom,
        minZoom: 4,
        maxZoom: 18,
        maxBounds: [
          [-16.5, 48.0],
          [7.5, 62.5],
        ],
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        cooperativeGestures: false,
      })
      mapRef.current = map
      map.touchZoomRotate.disableRotation()

      map.addControl(
        new maplibregl.NavigationControl({
          showCompass: false,
          visualizePitch: false,
        }),
        'top-right',
      )

      map.on('load', () => {
        if (!map || cancelled) return

        map.addSource('peaks', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
          cluster: true,
          clusterMaxZoom: 11,
          clusterRadius: 46,
        })

        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'peaks',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#a3472d',
            'circle-stroke-color': '#fffdf4',
            'circle-stroke-width': 2,
            'circle-radius': ['step', ['get', 'point_count'], 18, 20, 22, 60, 28],
          },
        })

        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'peaks',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-size': 12,
          },
          paint: { 'text-color': '#fffdf4' },
        })

        map.addLayer({
          id: 'peak-hit',
          type: 'circle',
          source: 'peaks',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': 18,
            'circle-opacity': 0,
            'circle-color': '#000',
          },
        })

        map.addLayer({
          id: 'peak-points',
          type: 'circle',
          source: 'peaks',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': 7,
            'circle-color': [
              'case',
              ['==', ['get', 'done'], 1],
              '#2f6f5e',
              '#a3472d',
            ],
            'circle-stroke-width': 2.5,
            'circle-stroke-color': '#fffdf4',
          },
        })

        map.addLayer({
          id: 'peak-labels',
          type: 'symbol',
          source: 'peaks',
          minzoom: 10.5,
          filter: ['!', ['has', 'point_count']],
          layout: {
            'text-field': ['get', 'name'],
            'text-size': 12,
            'text-offset': [0, 1.3],
            'text-anchor': 'top',
            'text-optional': true,
          },
          paint: {
            'text-color': '#292a21',
            'text-halo-color': '#faf6e9',
            'text-halo-width': 1.6,
          },
        })

        pushData(map)
        readyRef.current = true
        map.resize()

        const isClusterFeature = (
          feature: import('maplibre-gl').MapGeoJSONFeature,
        ) => {
          const props = feature.properties ?? {}
          return (
            Boolean(props.point_count) ||
            props.cluster === true ||
            props.cluster === 'true'
          )
        }

        map.on('click', (event) => {
          const hits = map!.queryRenderedFeatures(event.point, {
            layers: ['cluster-count', 'clusters', 'peak-hit', 'peak-points'],
          })
          const feature = hits[0]
          if (!feature) return

          if (isClusterFeature(feature)) {
            const clusterId = Number(feature.properties?.cluster_id)
            const source = map!.getSource(
              'peaks',
            ) as import('maplibre-gl').GeoJSONSource
            const coords =
              feature.geometry.type === 'Point'
                ? (feature.geometry.coordinates as [number, number])
                : null
            if (!coords || Number.isNaN(clusterId)) return

            void Promise.resolve(source.getClusterExpansionZoom(clusterId))
              .then((nextZoom) => {
                if (nextZoom == null) return
                map!.easeTo({
                  center: coords,
                  zoom: Math.max(Number(nextZoom), map!.getZoom() + 1.5),
                  duration: 450,
                })
              })
              .catch(() => {
                map!.easeTo({
                  center: coords,
                  zoom: Math.min(map!.getZoom() + 2, 14),
                  duration: 450,
                })
              })
            return
          }

          const id = String(feature.properties?.id ?? '')
          if (id) onSelectRef.current(id)
        })

        map.on('mouseenter', 'clusters', () => {
          map!.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', 'clusters', () => {
          map!.getCanvas().style.cursor = ''
        })
        map.on('mouseenter', 'peak-points', () => {
          map!.getCanvas().style.cursor = 'pointer'
        })
        map.on('mouseleave', 'peak-points', () => {
          map!.getCanvas().style.cursor = ''
        })
      })

      ro = new ResizeObserver(() => map?.resize())
      ro.observe(slot)
    })()

    return () => {
      cancelled = true
      readyRef.current = false
      ro?.disconnect()
      map?.remove()
      mapRef.current = null
      slot.remove()
    }
    // center/zoom only used on initial mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (map && readyRef.current) pushData(map)
  }, [peaks, doneIds])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedId) return
    const peak = peaksRef.current.find((p) => p.id === selectedId)
    if (!peak) return
    map.easeTo({
      center: peak.coords,
      zoom: Math.max(map.getZoom(), 11.5),
      duration: 550,
    })
  }, [selectedId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !readyRef.current || selectedId) return
    map.easeTo({ center, zoom, duration: 500 })
  }, [center, zoom, selectedId])

  return <View ref={hostRef} style={styles.host} collapsable={false} />
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.bgDeep,
    zIndex: 0,
  },
})
