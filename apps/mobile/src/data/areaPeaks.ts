import { areas } from './areas'
import ethels from './ethels.json'
import ukHills from './uk-hills.json'
import wainwrights from './wainwrights.json'

export type AreaPeak = {
  id: string
  name: string
  height: number
  gridRef: string
  coords: [number, number]
  lists: string[]
  area: string
}

export type TrackedPeak = AreaPeak & {
  done: boolean
}

type IncomingPeak = {
  id: string
  name: string
  height: number
  gridRef: string
  coords: [number, number]
  list: string
  area: string
  /** Curated datasets keep their area when later rows collide. */
  lockedArea?: boolean
}

const areaCenters = new Map(
  areas.map((area) => [area.slug, area.coords] as const),
)

function dist2(a: [number, number], b: [number, number]) {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  return dx * dx + dy * dy
}

/** Yorks / North Pennines tags that wrongly include many Lake District hills. */
const lakeMisTagAreas = new Set(['yorkshire-dales', 'north-pennines'])

function nearestAreaSlug(coords: [number, number], candidates: Iterable<string>) {
  let best: string | null = null
  let bestDist = Infinity
  for (const slug of candidates) {
    const center = areaCenters.get(slug)
    if (!center) continue
    const d = dist2(coords, center)
    if (d < bestDist) {
      best = slug
      bestDist = d
    }
  }
  return best
}

/** Prefer curated area; trust clean tags; only remap known Lake District mis-tags. */
function resolveArea(
  coords: [number, number],
  claimedAreas: string[],
  lockedArea?: string,
) {
  if (lockedArea) return lockedArea

  const uniqueClaimed = [
    ...new Set(claimedAreas.filter((slug) => areaCenters.has(slug))),
  ]

  // Donalds etc. are correctly tagged — don't pull them into the Lakes.
  if (uniqueClaimed.length === 1 && !lakeMisTagAreas.has(uniqueClaimed[0])) {
    return uniqueClaimed[0]
  }

  const candidates = uniqueClaimed.length
    ? uniqueClaimed
    : [...areaCenters.keys()]
  const best = nearestAreaSlug(coords, candidates) ?? candidates[0]

  // Only remap when every claimed area is a known Lake District mis-tag source.
  if (
    uniqueClaimed.length > 0 &&
    uniqueClaimed.every((slug) => lakeMisTagAreas.has(slug)) &&
    nearestAreaSlug(coords, areaCenters.keys()) === 'lake-district'
  ) {
    return 'lake-district'
  }

  return best
}

function mergePeaks(rows: IncomingPeak[]): AreaPeak[] {
  const grouped = new Map<string, IncomingPeak[]>()
  for (const row of rows) {
    const list = grouped.get(row.id) ?? []
    list.push(row)
    grouped.set(row.id, list)
  }

  return [...grouped.values()].map((group) => {
    const primary = group[0]
    const lists = [...new Set(group.map((row) => row.list).filter(Boolean))]
    const lockedArea = group.find((row) => row.lockedArea)?.area
    const area = resolveArea(
      primary.coords,
      group.map((row) => row.area),
      lockedArea,
    )

    return {
      id: primary.id,
      name: primary.name,
      height: primary.height,
      gridRef: primary.gridRef,
      coords: primary.coords,
      lists,
      area,
    }
  })
}

export function formatPeakLists(lists: string[]) {
  return lists.join(' · ')
}

export function peakHasList(peak: AreaPeak, list: string) {
  return peak.lists.includes(list)
}

const lakePeaks: IncomingPeak[] = wainwrights.map((peak) => ({
  id: peak.id,
  name: peak.name,
  height: peak.height,
  gridRef: peak.gridRef,
  coords: [peak.coords[0], peak.coords[1]],
  list: 'Wainwrights',
  area: 'lake-district',
  lockedArea: true,
}))

const peakDistrictPeaks: IncomingPeak[] = ethels.map((peak) => ({
  id: peak.id,
  name: peak.name,
  height: peak.height,
  gridRef: peak.gridRef,
  coords: [peak.coords[0], peak.coords[1]],
  list: peak.list,
  area: peak.area,
  lockedArea: true,
}))

const hillPeaks: IncomingPeak[] = ukHills.map((peak) => ({
  id: peak.id,
  name: peak.name,
  height: peak.height,
  gridRef: peak.gridRef,
  coords: [peak.coords[0], peak.coords[1]],
  list: peak.list,
  area: peak.area,
}))

const mergedPeaks = mergePeaks([
  ...lakePeaks,
  ...peakDistrictPeaks,
  ...hillPeaks,
])

export const areaPeaks: Record<string, AreaPeak[]> = {}
for (const peak of mergedPeaks) {
  areaPeaks[peak.area] ??= []
  areaPeaks[peak.area].push(peak)
}

for (const peaks of Object.values(areaPeaks)) {
  peaks.sort((a, b) => b.height - a.height || a.name.localeCompare(b.name))
}

export function getAreaPeaks(areaSlug: string) {
  return areaPeaks[areaSlug] ?? []
}

export function getAllAreaPeaks() {
  return mergedPeaks
}

export function getPeakById(id: string) {
  return mergedPeaks.find((peak) => peak.id === id) ?? null
}
