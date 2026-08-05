export type LngLatBoundsLike = {
  getWest(): number
  getEast(): number
  getSouth(): number
  getNorth(): number
}

export type SlopeOverlayResult = {
  blobUrl: string
  coordinates: [[number, number], [number, number], [number, number], [number, number]]
  tileZoom: number
  tileCount: number
  tileExpected: number
}

const TILE_SIZE = 256
const MAX_TILES = 16
const ELEV_SMOOTH_RADIUS = 1
const SLOPE_SMOOTH_RADIUS = 1
const MAX_PROCESS_EDGE = 1280

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function lngToTileX(lng: number, z: number) {
  return ((lng + 180) / 360) * 2 ** z
}

export function latToTileY(lat: number, z: number) {
  const rad = (lat * Math.PI) / 180
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z
  )
}

function tileXToLng(x: number, z: number) {
  return (x / 2 ** z) * 360 - 180
}

function tileYToLat(y: number, z: number) {
  const n = Math.PI - (2 * Math.PI * y) / 2 ** z
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
}

function decodeElevation(r: number, g: number, b: number) {
  return -10000 + (r * 256 * 256 + g * 256 + b) * 0.1
}

/**
 * Map slope degrees: green (flat) → orange → red (steep).
 * Coarser DEM tiles under-read slope, so boost colour at lower tile zooms.
 */
export function slopeToRgba(
  degrees: number,
  tileZoom = 12,
): [number, number, number, number] {
  const zoomBoost = 1 + Math.max(0, 12 - tileZoom) * 0.28
  const t = clamp((degrees * zoomBoost) / 30, 0, 1)
  let r: number
  let g: number
  let b: number
  if (t < 0.5) {
    const u = t * 2
    r = Math.round(42 + u * (232 - 42))
    g = Math.round(168 + u * (140 - 168))
    b = Math.round(72 + u * (36 - 72))
  } else {
    const u = (t - 0.5) * 2
    r = Math.round(232 + u * (214 - 232))
    g = Math.round(140 + u * (48 - 140))
    b = Math.round(36 + u * (32 - 36))
  }
  const a = Math.round(150 + t * 90)
  return [r, g, b, a]
}

function tileRange(bounds: LngLatBoundsLike, z: number) {
  const x0 = Math.floor(lngToTileX(bounds.getWest(), z))
  const x1 = Math.floor(lngToTileX(bounds.getEast(), z))
  const y0 = Math.floor(latToTileY(bounds.getNorth(), z))
  const y1 = Math.floor(latToTileY(bounds.getSouth(), z))
  return { x0, x1, y0, y1, count: (x1 - x0 + 1) * (y1 - y0 + 1) }
}

/** Prefer denser tiles; drop zoom until the viewport is fully covered within budget. */
function pickTileZoom(bounds: LngLatBoundsLike, mapZoom: number) {
  let z = clamp(Math.floor(mapZoom + 0.25), 7, 12)
  while (z > 7 && tileRange(bounds, z).count > MAX_TILES) z -= 1
  return z
}

function boxBlurFloat(
  source: Float32Array,
  width: number,
  height: number,
  radius: number,
) {
  if (radius < 1) return source
  const temp = new Float32Array(source.length)
  const out = new Float32Array(source.length)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      let count = 0
      for (let dx = -radius; dx <= radius; dx++) {
        const sx = x + dx
        if (sx < 0 || sx >= width) continue
        const value = source[y * width + sx]
        if (Number.isNaN(value)) continue
        sum += value
        count++
      }
      temp[y * width + x] = count ? sum / count : Number.NaN
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0
      let count = 0
      for (let dy = -radius; dy <= radius; dy++) {
        const sy = y + dy
        if (sy < 0 || sy >= height) continue
        const value = temp[sy * width + x]
        if (Number.isNaN(value)) continue
        sum += value
        count++
      }
      out[y * width + x] = count ? sum / count : Number.NaN
    }
  }

  return out
}

function downsampleElev(
  source: Float32Array,
  width: number,
  height: number,
  step: number,
) {
  if (step <= 1) {
    return { elev: source, width, height, step: 1 }
  }
  const outW = Math.ceil(width / step)
  const outH = Math.ceil(height / step)
  const elev = new Float32Array(outW * outH)
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      elev[y * outW + x] = source[Math.min(height - 1, y * step) * width + Math.min(width - 1, x * step)]
    }
  }
  return { elev, width: outW, height: outH, step }
}

function sampleElev(
  elev: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
) {
  if (x < 0 || y < 0 || x >= width || y >= height) return Number.NaN
  return elev[y * width + x]
}

function slopeDegreesAt(
  elev: Float32Array,
  width: number,
  height: number,
  x: number,
  y: number,
  metersPerPixel: number,
) {
  const z1 = sampleElev(elev, width, height, x - 1, y - 1)
  const z2 = sampleElev(elev, width, height, x, y - 1)
  const z3 = sampleElev(elev, width, height, x + 1, y - 1)
  const z4 = sampleElev(elev, width, height, x - 1, y)
  const z6 = sampleElev(elev, width, height, x + 1, y)
  const z7 = sampleElev(elev, width, height, x - 1, y + 1)
  const z8 = sampleElev(elev, width, height, x, y + 1)
  const z9 = sampleElev(elev, width, height, x + 1, y + 1)
  if ([z1, z2, z3, z4, z6, z7, z8, z9].some((v) => Number.isNaN(v))) {
    return Number.NaN
  }
  const dzdx =
    (z3 + 2 * z6 + z9 - (z1 + 2 * z4 + z7)) / (8 * metersPerPixel)
  const dzdy =
    (z7 + 2 * z8 + z9 - (z1 + 2 * z2 + z3)) / (8 * metersPerPixel)
  return (Math.atan(Math.sqrt(dzdx * dzdx + dzdy * dzdy)) * 180) / Math.PI
}

async function loadTerrainTile(
  apiKey: string,
  z: number,
  x: number,
  y: number,
  signal?: AbortSignal,
): Promise<ImageData | null> {
  const urls = [
    `https://api.maptiler.com/tiles/terrain-rgb-v2/${z}/${x}/${y}.webp?key=${apiKey}`,
    `https://api.maptiler.com/tiles/terrain-rgb/${z}/${x}/${y}.png?key=${apiKey}`,
  ]

  for (const url of urls) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (signal?.aborted) return null
      try {
        const res = await fetch(url, { signal })
        if (!res.ok) {
          if (res.status >= 500 && attempt < 1) {
            await new Promise((resolve) => setTimeout(resolve, 180))
            continue
          }
          break
        }
        const blob = await res.blob()
        const bitmap = await createImageBitmap(blob)
        const canvas = document.createElement('canvas')
        canvas.width = TILE_SIZE
        canvas.height = TILE_SIZE
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) return null
        ctx.drawImage(bitmap, 0, 0, TILE_SIZE, TILE_SIZE)
        bitmap.close()
        return ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE)
      } catch {
        if (signal?.aborted) return null
        if (attempt < 1) {
          await new Promise((resolve) => setTimeout(resolve, 180))
          continue
        }
      }
    }
  }
  return null
}

function canvasToBlobUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Could not encode slope overlay'))
          return
        }
        resolve(URL.createObjectURL(blob))
      },
      'image/png',
    )
  })
}

/**
 * Build a slope colour raster covering the map bounds from Terrain-RGB tiles.
 */
export async function buildSlopeOverlay(
  apiKey: string,
  bounds: LngLatBoundsLike,
  mapZoom: number,
  signal?: AbortSignal,
): Promise<SlopeOverlayResult | null> {
  const z = pickTileZoom(bounds, mapZoom)
  const { x0, x1, y0, y1 } = tileRange(bounds, z)
  let result = await buildSlopeOverlayForTiles(apiKey, z, x0, x1, y0, y1, signal)
  for (let attempt = 0; !result && !signal?.aborted && attempt < 2; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 220 * (attempt + 1)))
    if (signal?.aborted) break
    result = await buildSlopeOverlayForTiles(apiKey, z, x0, x1, y0, y1, signal)
  }
  return result
}

async function buildSlopeOverlayForTiles(
  apiKey: string,
  z: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  signal?: AbortSignal,
): Promise<SlopeOverlayResult | null> {
  const tilesX = x1 - x0 + 1
  const tilesY = y1 - y0 + 1
  const expected = tilesX * tilesY
  const width = tilesX * TILE_SIZE
  const height = tilesY * TILE_SIZE
  const elev = new Float32Array(width * height)
  elev.fill(Number.NaN)

  let loaded = 0
  const jobs: Promise<void>[] = []
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const ox = (tx - x0) * TILE_SIZE
      const oy = (ty - y0) * TILE_SIZE
      jobs.push(
        loadTerrainTile(apiKey, z, tx, ty, signal).then((image) => {
          if (!image) return
          loaded++
          for (let py = 0; py < TILE_SIZE; py++) {
            for (let px = 0; px < TILE_SIZE; px++) {
              const i = (py * TILE_SIZE + px) * 4
              const e = decodeElevation(
                image.data[i],
                image.data[i + 1],
                image.data[i + 2],
              )
              elev[(oy + py) * width + (ox + px)] = e
            }
          }
        }),
      )
    }
  }
  await Promise.all(jobs)
  if (signal?.aborted) return null
  if (loaded === 0 || loaded < Math.ceil(expected * 0.4)) return null

  const processStep = Math.max(
    1,
    Math.ceil(Math.max(width, height) / MAX_PROCESS_EDGE),
  )
  const down = downsampleElev(elev, width, height, processStep)
  const midLat = tileYToLat((y0 + y1 + 1) / 2, z)
  const metersPerPixel =
    ((156543.03392 * Math.cos((midLat * Math.PI) / 180)) / 2 ** z) * processStep

  const smoothElev = boxBlurFloat(
    down.elev,
    down.width,
    down.height,
    ELEV_SMOOTH_RADIUS,
  )
  const rawSlope = new Float32Array(down.width * down.height)
  rawSlope.fill(Number.NaN)

  for (let y = 1; y < down.height - 1; y++) {
    for (let x = 1; x < down.width - 1; x++) {
      rawSlope[y * down.width + x] = slopeDegreesAt(
        smoothElev,
        down.width,
        down.height,
        x,
        y,
        metersPerPixel,
      )
    }
  }

  const smoothSlope = boxBlurFloat(
    rawSlope,
    down.width,
    down.height,
    SLOPE_SMOOTH_RADIUS,
  )

  const canvas = document.createElement('canvas')
  canvas.width = down.width
  canvas.height = down.height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const out = ctx.createImageData(down.width, down.height)

  for (let y = 0; y < down.height; y++) {
    for (let x = 0; x < down.width; x++) {
      const degrees = smoothSlope[y * down.width + x]
      if (Number.isNaN(degrees)) continue
      const [r, g, b, a] = slopeToRgba(degrees, z)
      const o = (y * down.width + x) * 4
      out.data[o] = r
      out.data[o + 1] = g
      out.data[o + 2] = b
      out.data[o + 3] = a
    }
  }
  ctx.putImageData(out, 0, 0)

  const soft = document.createElement('canvas')
  soft.width = down.width
  soft.height = down.height
  const softCtx = soft.getContext('2d')
  if (!softCtx) return null
  softCtx.filter = 'blur(0.9px)'
  softCtx.drawImage(canvas, 0, 0)

  const west = tileXToLng(x0, z)
  const east = tileXToLng(x1 + 1, z)
  const north = tileYToLat(y0, z)
  const south = tileYToLat(y1 + 1, z)
  const blobUrl = await canvasToBlobUrl(soft)

  return {
    blobUrl,
    coordinates: [
      [west, north],
      [east, north],
      [east, south],
      [west, south],
    ],
    tileZoom: z,
    tileCount: loaded,
    tileExpected: expected,
  }
}
