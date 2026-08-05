export type PrivatePitchPin = {
  id: string
  lng: number
  lat: number
  label: string
  notes: string
  pitchedBefore: boolean
  /** Metres to nearest mapped path/track, when known. */
  pathDistanceM?: number | null
  imageDataUrl?: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = 'field-atlas:private-pitch-pins'

function readAll(): PrivatePitchPin[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as PrivatePitchPin[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeAll(pins: PrivatePitchPin[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pins))
}

export function loadPrivatePitchPins() {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function upsertPrivatePitchPin(
  pin: Omit<PrivatePitchPin, 'createdAt' | 'updatedAt'> & {
    createdAt?: string
    updatedAt?: string
  },
) {
  const now = new Date().toISOString()
  const pins = readAll()
  const index = pins.findIndex((row) => row.id === pin.id)
  const next: PrivatePitchPin = {
    id: pin.id,
    lng: pin.lng,
    lat: pin.lat,
    label: pin.label.trim() || 'Saved spot',
    notes: pin.notes,
    pitchedBefore: pin.pitchedBefore,
    pathDistanceM: pin.pathDistanceM ?? null,
    imageDataUrl: pin.imageDataUrl,
    createdAt: pin.createdAt ?? now,
    updatedAt: now,
  }
  if (index >= 0) pins[index] = { ...pins[index], ...next, createdAt: pins[index].createdAt }
  else pins.push(next)
  writeAll(pins)
  return next
}

export function deletePrivatePitchPin(id: string) {
  writeAll(readAll().filter((pin) => pin.id !== id))
}
