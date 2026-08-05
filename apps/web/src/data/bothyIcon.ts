/** Raster house icons for MapLibre bothy markers (MBA vs other). */

export const bothyHouseMbaIconId = 'bothy-house-mba'
export const bothyHouseOtherIconId = 'bothy-house-other'

const MBA_FILL = '#c2410c'
const MBA_ROOF = '#9a3412'
const OTHER_FILL = '#0f766e'
const OTHER_ROOF = '#115e59'
const OUTLINE = '#fff8eb'
const DOOR = '#fff8eb'

function drawHouse(
  fill: string,
  roof: string,
): {
  width: number
  height: number
  data: Uint8ClampedArray | Uint8Array
} {
  const size = 96
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

  ctx.clearRect(0, 0, size, size)

  // Halo disc so the mark reads against busy basemap / peak triangles
  ctx.beginPath()
  ctx.arc(48, 50, 40, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 248, 235, 0.92)'
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(40, 36, 28, 0.35)'
  ctx.stroke()

  // Shadow
  ctx.fillStyle = 'rgba(30, 28, 22, 0.28)'
  ctx.beginPath()
  ctx.ellipse(48, 82, 26, 6, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.lineJoin = 'round'
  ctx.lineWidth = 4
  ctx.strokeStyle = OUTLINE

  // Body
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.moveTo(22, 44)
  ctx.lineTo(22, 76)
  ctx.lineTo(74, 76)
  ctx.lineTo(74, 44)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Roof
  ctx.fillStyle = roof
  ctx.beginPath()
  ctx.moveTo(16, 46)
  ctx.lineTo(48, 16)
  ctx.lineTo(80, 46)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  // Door
  ctx.fillStyle = DOOR
  ctx.fillRect(42, 54, 12, 22)

  // Window
  ctx.fillStyle = DOOR
  ctx.fillRect(28, 52, 10, 10)
  ctx.fillRect(58, 52, 10, 10)

  const image = ctx.getImageData(0, 0, size, size)
  return {
    width: image.width,
    height: image.height,
    data: image.data,
  }
}

export function bothyHouseMbaImageData() {
  return drawHouse(MBA_FILL, MBA_ROOF)
}

export function bothyHouseOtherImageData() {
  return drawHouse(OTHER_FILL, OTHER_ROOF)
}
