import { areas } from './areas'
import { getAllAreaPeaks } from './areaPeaks'
import {
  apiEnabled,
  apiGetLogs,
  apiPutLogs,
  type ApiPeakLog,
} from './api'

export type PeakLog = {
  done: boolean
  date: string
  notes: string
  image?: string
}

export type PeakLogs = Record<string, PeakLog>

const storageKey = 'field-atlas:peak-logs'

export function loadLogs(): PeakLogs {
  try {
    const saved = localStorage.getItem(storageKey)
    return saved ? (JSON.parse(saved) as PeakLogs) : {}
  } catch {
    return {}
  }
}

function writeLocal(logs: PeakLogs) {
  localStorage.setItem(storageKey, JSON.stringify(logs))
}

function peakMeta(peakId: string) {
  const peak = getAllAreaPeaks().find((entry) => entry.id === peakId)
  if (!peak) return {}
  const area = areas.find((entry) => entry.slug === peak.area)
  return {
    peakName: peak.name,
    areaSlug: peak.area,
    areaName: area?.name ?? peak.area,
    height: peak.height,
  }
}

export function toApiLogs(logs: PeakLogs): Record<string, ApiPeakLog> {
  const payload: Record<string, ApiPeakLog> = {}
  for (const [peakId, log] of Object.entries(logs)) {
    payload[peakId] = {
      done: log.done,
      date: log.date,
      notes: log.notes,
      imageUrl: log.image,
      ...peakMeta(peakId),
    }
  }
  return payload
}

export function fromApiLogs(logs: Record<string, ApiPeakLog>): PeakLogs {
  const next: PeakLogs = {}
  for (const [peakId, log] of Object.entries(logs)) {
    next[peakId] = {
      done: log.done,
      date: log.date,
      notes: log.notes,
      image: log.imageUrl,
    }
  }
  return next
}

/** Merge remote + local: remote wins on overlapping keys; keep local-only peaks. */
export function mergeLogs(remote: PeakLogs, local: PeakLogs): PeakLogs {
  return { ...local, ...remote }
}

export function saveLogs(logs: PeakLogs) {
  writeLocal(logs)

  if (!apiEnabled()) return

  void apiPutLogs(toApiLogs(logs)).catch(() => {
    // Local save already succeeded; next change retries.
  })
}

export async function saveLogsAsync(logs: PeakLogs) {
  writeLocal(logs)
  if (!apiEnabled()) return
  await apiPutLogs(toApiLogs(logs))
}

/**
 * Pull logs from the API and merge with anything still only on this device.
 * Uploads the merged set so the server gains any local-only completions.
 */
export async function hydrateLogsFromApi(): Promise<PeakLogs> {
  if (!apiEnabled()) return loadLogs()

  const local = loadLogs()
  const { logs } = await apiGetLogs()
  const remote = fromApiLogs(logs)
  const merged = mergeLogs(remote, local)
  writeLocal(merged)

  const localOnly = Object.keys(local).some((id) => !remote[id])
  if (localOnly || Object.keys(remote).length === 0) {
    await apiPutLogs(toApiLogs(merged)).catch(() => undefined)
  }

  return merged
}

export async function prepareImage(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('Choose an image file.')
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error('Choose an image smaller than 8 MB.')
  }

  const source = await createImageBitmap(file)
  const scale = Math.min(1, 1200 / source.width, 900 / source.height)
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(source.width * scale)
  canvas.height = Math.round(source.height * scale)

  const context = canvas.getContext('2d')
  if (!context) throw new Error('This browser could not process the image.')

  context.fillStyle = '#faf6e9'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  source.close()

  return canvas.toDataURL('image/jpeg', 0.78)
}

/** Compress an image to a JPEG File for multipart upload. */
export async function prepareImageFile(file: File) {
  const dataUrl = await prepareImage(file)
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const name = file.name.replace(/\.\w+$/, '') || 'photo'
  return new File([blob], `${name}.jpg`, { type: 'image/jpeg' })
}
