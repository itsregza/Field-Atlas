import { getAllAreaPeaks, getAreaPeaks } from './areaPeaks'
import { areas } from './areas'
import { hikes, type Difficulty, type Hike } from './hikes'
import type { PeakLogs } from './logs'
import { bestPitchabilityForPeaks } from './ratings'

export type CampingChoice = 'yes' | 'no' | 'either'

/** What the draw should chase. */
export type GeneratorGoal =
  | { kind: 'any' }
  | { kind: 'remaining' }
  | { kind: 'list'; list: string }

export type GeneratorPrefs = {
  areaSlugs: string[]
  difficulty: Difficulty | 'any'
  campingNight: CampingChoice
  goal: GeneratorGoal
  excludeIds: string[]
}

export type RankedHike = {
  hike: Hike
  score: number
  reasons: string[]
  remainingPeaks: number
  remainingNames: string[]
  areaName: string
}

const peakIndex = new Map(getAllAreaPeaks().map((peak) => [peak.id, peak]))
const OVERNIGHT_PITCH_MIN = 3.5

export const defaultGeneratorPrefs: GeneratorPrefs = {
  areaSlugs: [],
  difficulty: 'any',
  campingNight: 'either',
  goal: { kind: 'any' },
  excludeIds: [],
}

function remainingFor(hike: Hike, logs: PeakLogs, list?: string) {
  const remaining = hike.peakIds.filter((id) => {
    if (logs[id]?.done) return false
    if (!list) return true
    return peakIndex.get(id)?.lists.includes(list) ?? false
  })
  return {
    count: remaining.length,
    names: remaining
      .map((id) => peakIndex.get(id)?.name)
      .filter((name): name is string => Boolean(name)),
  }
}

function matchesGenerator(hike: Hike, prefs: GeneratorPrefs, logs: PeakLogs) {
  if (prefs.excludeIds.includes(hike.id)) return false
  if (!prefs.areaSlugs.length || !prefs.areaSlugs.includes(hike.areaSlug)) {
    return false
  }
  if (prefs.difficulty !== 'any' && hike.difficulty !== prefs.difficulty) {
    return false
  }
  if (prefs.campingNight === 'yes') {
    if (!hike.campingNight) return false
    // Overnight draws need a summit with solid pitchability analytics.
    if (bestPitchabilityForPeaks(hike.peakIds, OVERNIGHT_PITCH_MIN) < OVERNIGHT_PITCH_MIN) {
      return false
    }
  }
  if (prefs.campingNight === 'no' && hike.campingNight) return false

  if (prefs.goal.kind === 'remaining') {
    // Only single-summit days — curated classics and multi-peak rounds over-claim.
    if (hike.source !== 'summit' || hike.peakIds.length !== 1) return false
    return remainingFor(hike, logs).count > 0
  }
  if (prefs.goal.kind === 'list') {
    if (hike.source !== 'summit' || hike.peakIds.length !== 1) return false
    return remainingFor(hike, logs, prefs.goal.list).count > 0
  }
  return true
}

function scoreGenerated(
  hike: Hike,
  prefs: GeneratorPrefs,
  logs: PeakLogs,
): RankedHike {
  const areaName =
    areas.find((area) => area.slug === hike.areaSlug)?.name ?? hike.areaSlug
  const listFocus = prefs.goal.kind === 'list' ? prefs.goal.list : undefined
  const remaining = remainingFor(hike, logs, listFocus)
  const anyRemaining = remainingFor(hike, logs)
  const reasons: string[] = []
  let score = 30 + Math.random() * 40

  if (hike.source === 'curated') {
    if (prefs.goal.kind === 'any') {
      score += 18
      reasons.push('Classic curated route')
    }
  } else if (prefs.goal.kind !== 'any') {
    score += 28
    reasons.push('Summit day for one unfinished peak')
  }

  reasons.push(`In ${areaName}`)
  score += 14

  if (prefs.difficulty !== 'any') {
    reasons.push(`${prefs.difficulty} difficulty`)
    score += 12
  } else {
    reasons.push(`${hike.difficulty} day`)
  }

  if (prefs.campingNight === 'yes') {
    const pitch = bestPitchabilityForPeaks(hike.peakIds, OVERNIGHT_PITCH_MIN)
    reasons.push(`Pitchability ${pitch.toFixed(1)}/5 nearby`)
    score += 12 + (pitch - OVERNIGHT_PITCH_MIN) * 10
  } else if (prefs.campingNight === 'no') {
    reasons.push('Day walk without an overnight')
    score += 6
  } else if (hike.campingNight) {
    const pitch = bestPitchabilityForPeaks(hike.peakIds)
    if (pitch >= OVERNIGHT_PITCH_MIN) {
      reasons.push('Also works with a camping night')
    }
  }

  if (prefs.goal.kind === 'remaining') {
    score += 36 + Math.min(40, remaining.count * 14)
    reasons.push(
      `${remaining.count} unfinished peak${remaining.count === 1 ? '' : 's'}`,
    )
  } else if (prefs.goal.kind === 'list') {
    score += 42 + Math.min(48, remaining.count * 16)
    reasons.push(
      `${remaining.count} unfinished ${prefs.goal.list.replace(/s$/, '')}${
        remaining.count === 1 ? '' : 's'
      }`,
    )
  } else if (anyRemaining.count > 0) {
    score += Math.min(28, anyRemaining.count * 10)
    reasons.push(
      `${anyRemaining.count} peak${anyRemaining.count === 1 ? '' : 's'} still to tick`,
    )
  } else if (hike.peakIds.length) {
    score -= 8
  }

  // Prefer tighter summit days when bagging unfinished peaks.
  if (prefs.goal.kind !== 'any' && hike.peakIds.length === 1 && remaining.count === 1) {
    score += 12
  }

  return {
    hike,
    score,
    reasons: reasons.slice(0, 3),
    remainingPeaks: remaining.count,
    remainingNames: remaining.names,
    areaName,
  }
}

/** Rank matching routes with a random boost so each generate feels fresh. */
export function generateHikes(prefs: GeneratorPrefs, logs: PeakLogs) {
  return hikes
    .filter((hike) => matchesGenerator(hike, prefs, logs))
    .map((hike) => scoreGenerated(hike, prefs, logs))
    .sort((a, b) => b.score - a.score)
}

export function pickGeneratedHike(prefs: GeneratorPrefs, logs: PeakLogs) {
  return generateHikes(prefs, logs)[0] ?? null
}

/** Every mapped Field Atlas area can be chosen for a draw. */
export function areaOptions() {
  return areas
}

export function countMatches(prefs: GeneratorPrefs, logs: PeakLogs = {}) {
  if (!prefs.areaSlugs.length) return 0
  return hikes.filter((hike) =>
    matchesGenerator(hike, { ...prefs, excludeIds: [] }, logs),
  ).length
}

export function hikeCountForArea(slug: string) {
  return hikes.filter((hike) => hike.areaSlug === slug).length
}

/** Lists present on peaks inside the selected regions. */
export function listOptionsForAreas(areaSlugs: string[]) {
  const counts = new Map<string, number>()
  for (const slug of areaSlugs) {
    for (const peak of getAreaPeaks(slug)) {
      for (const list of peak.lists) {
        counts.set(list, (counts.get(list) || 0) + 1)
      }
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([list, peakCount]) => ({ list, peakCount }))
}

export function unfinishedCountForAreas(
  areaSlugs: string[],
  logs: PeakLogs,
  list?: string,
) {
  let total = 0
  let remaining = 0
  for (const slug of areaSlugs) {
    for (const peak of getAreaPeaks(slug)) {
      if (list && !peak.lists.includes(list)) continue
      total++
      if (!logs[peak.id]?.done) remaining++
    }
  }
  return { total, remaining }
}

export function goalLabel(goal: GeneratorGoal) {
  if (goal.kind === 'remaining') return 'Unfinished peaks'
  if (goal.kind === 'list') return `Unfinished ${goal.list}`
  return 'Any route'
}
