import type { FeatureCollection } from 'geojson'
import ukMaskJson from './ukMask.json'

/** Dim everything outside the UK (GB + NI); Republic of Ireland stays greyed. */
export const ukMaskCollection = ukMaskJson as FeatureCollection

export const ukMaskSourceId = 'uk-mask'
export const ukMaskLayerId = 'uk-mask-fill'
export const ukMaskHatchId = 'uk-mask-hatch'

/* MapTiler Map instance — kept loose so SDK layer unions don't fight us. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MaskMap = any

function hatchImageData() {
  const size = 16
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    return {
      width: size,
      height: size,
      data: new Uint8Array(size * size * 4),
    }
  }

  ctx.fillStyle = 'rgba(143, 138, 124, 0.55)'
  ctx.fillRect(0, 0, size, size)

  ctx.strokeStyle = 'rgba(70, 66, 56, 0.45)'
  ctx.lineWidth = 1.25
  ctx.beginPath()
  // Seamless diagonal stripes
  ctx.moveTo(-2, 6)
  ctx.lineTo(6, -2)
  ctx.moveTo(-2, 14)
  ctx.lineTo(14, -2)
  ctx.moveTo(2, 18)
  ctx.lineTo(18, 2)
  ctx.moveTo(10, 18)
  ctx.lineTo(18, 10)
  ctx.stroke()

  const image = ctx.getImageData(0, 0, size, size)
  return {
    width: image.width,
    height: image.height,
    data: image.data,
  }
}

function ensureHatchImage(map: MaskMap) {
  if (!map.hasImage(ukMaskHatchId)) {
    map.addImage(ukMaskHatchId, hatchImageData(), { pixelRatio: 2 })
  }
}

export function addUkMaskLayer(map: MaskMap) {
  ensureHatchImage(map)

  if (!map.getSource(ukMaskSourceId)) {
    map.addSource(ukMaskSourceId, {
      type: 'geojson',
      data: ukMaskCollection,
    })
  }

  if (map.getLayer(ukMaskLayerId)) return

  map.addLayer({
    id: ukMaskLayerId,
    type: 'fill',
    source: ukMaskSourceId,
    paint: {
      'fill-pattern': ukMaskHatchId,
      'fill-opacity': 1,
    },
  } as never)
}

/** Dim/hatch everything outside a custom polygon punch-out (e.g. one park region). */
export function addOutsideMaskLayer(
  map: MaskMap,
  data: FeatureCollection,
  sourceId = 'region-outside-mask',
  layerId = 'region-outside-mask-fill',
) {
  ensureHatchImage(map)

  const existing = map.getSource(sourceId)
  if (!existing) {
    map.addSource(sourceId, {
      type: 'geojson',
      data,
    })
  } else if (typeof existing.setData === 'function') {
    existing.setData(data)
  }

  if (map.getLayer(layerId)) return

  map.addLayer({
    id: layerId,
    type: 'fill',
    source: sourceId,
    paint: {
      'fill-pattern': ukMaskHatchId,
      'fill-opacity': 1,
    },
  } as never)
}
