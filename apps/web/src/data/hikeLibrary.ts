import { getAllAreaPeaks } from './areaPeaks'
import { hikes, type Hike } from './hikes'
import { loadLogs, saveLogs, type PeakLogs } from './logs'

export type HikeCompletion = {
  completedOn: string
}

export type HikeLibrary = {
  savedIds: string[]
  completed: Record<string, HikeCompletion>
}

const storageKey = 'field-atlas:hike-library'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function readLibrary(): HikeLibrary {
  try {
    const saved = localStorage.getItem(storageKey)
    if (!saved) return { savedIds: [], completed: {} }
    const parsed = JSON.parse(saved) as Partial<HikeLibrary>
    return {
      savedIds: Array.isArray(parsed.savedIds)
        ? parsed.savedIds.filter((id): id is string => typeof id === 'string')
        : [],
      completed:
        parsed.completed && typeof parsed.completed === 'object'
          ? parsed.completed
          : {},
    }
  } catch {
    return { savedIds: [], completed: {} }
  }
}

function writeLibrary(library: HikeLibrary) {
  localStorage.setItem(storageKey, JSON.stringify(library))
}

export function loadHikeLibrary(): HikeLibrary {
  return readLibrary()
}

export function isHikeSaved(hikeId: string, library = readLibrary()) {
  return library.savedIds.includes(hikeId)
}

export function isHikeCompleted(hikeId: string, library = readLibrary()) {
  return Boolean(library.completed[hikeId])
}

export function toggleSavedHike(hikeId: string): HikeLibrary {
  const library = readLibrary()
  const savedIds = library.savedIds.includes(hikeId)
    ? library.savedIds.filter((id) => id !== hikeId)
    : [hikeId, ...library.savedIds]
  const next = { ...library, savedIds }
  writeLibrary(next)
  return next
}

export function markHikeCompleted(
  hike: Hike,
  logs: PeakLogs = loadLogs(),
): { library: HikeLibrary; logs: PeakLogs } {
  const library = readLibrary()
  const nextLibrary: HikeLibrary = {
    ...library,
    completed: {
      ...library.completed,
      [hike.id]: { completedOn: todayIso() },
    },
  }
  writeLibrary(nextLibrary)

  const nextLogs: PeakLogs = { ...logs }
  const peaks = getAllAreaPeaks()
  for (const peakId of hike.peakIds) {
    const peak = peaks.find((entry) => entry.id === peakId)
    if (!peak) continue
    const existing = nextLogs[peakId]
    nextLogs[peakId] = {
      done: true,
      date: existing?.date || todayIso(),
      notes: existing?.notes ?? '',
      image: existing?.image,
    }
  }
  saveLogs(nextLogs)

  return { library: nextLibrary, logs: nextLogs }
}

export function unmarkHikeCompleted(hikeId: string): HikeLibrary {
  const library = readLibrary()
  const completed = { ...library.completed }
  delete completed[hikeId]
  const next = { ...library, completed }
  writeLibrary(next)
  return next
}

export function listSavedHikes(library = readLibrary()): Hike[] {
  const byId = new Map(hikes.map((hike) => [hike.id, hike]))
  return library.savedIds
    .map((id) => byId.get(id))
    .filter((hike): hike is Hike => Boolean(hike))
}

export function listCompletedHikes(library = readLibrary()): Array<{
  hike: Hike
  completedOn: string
}> {
  const byId = new Map(hikes.map((hike) => [hike.id, hike]))
  return Object.entries(library.completed)
    .map(([id, entry]) => {
      const hike = byId.get(id)
      if (!hike) return null
      return { hike, completedOn: entry.completedOn }
    })
    .filter(
      (entry): entry is { hike: Hike; completedOn: string } => Boolean(entry),
    )
    .sort((a, b) => b.completedOn.localeCompare(a.completedOn))
}
