import { areas } from './areas'
import { getAllAreaPeaks } from './areaPeaks'
import { bothies } from './bothies'
import { hikes } from './hikes'
import {
  formatDurationDays,
  multiDayRoutes,
} from './multiDayRoutes'
import type { PublicProfile } from './profiles'

export type SearchHit =
  | {
      kind: 'user'
      id: string
      label: string
      detail: string
      href: string
    }
  | {
      kind: 'hike'
      id: string
      label: string
      detail: string
      href: string
    }
  | {
      kind: 'multi-day'
      id: string
      label: string
      detail: string
      href: string
    }
  | {
      kind: 'peak'
      id: string
      label: string
      detail: string
      href: string
    }
  | {
      kind: 'range'
      id: string
      label: string
      detail: string
      href: string
    }
  | {
      kind: 'bothy'
      id: string
      label: string
      detail: string
      href: string
    }

const kindLabel: Record<SearchHit['kind'], string> = {
  user: 'User',
  hike: 'Hike',
  'multi-day': 'Multi-day',
  peak: 'Peak',
  range: 'Range',
  bothy: 'Bothy',
}

export function searchKindLabel(kind: SearchHit['kind']) {
  return kindLabel[kind]
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}

function scoreName(name: string, query: string) {
  const n = normalize(name)
  if (n === query) return 100
  if (n.startsWith(query)) return 80
  if (n.includes(query)) return 50
  return 0
}

/** Search peaks, ranges, hikes, multi-day routes, and optional public profiles. */
export function searchAtlas(
  query: string,
  profiles: PublicProfile[] = [],
  limit = 8,
): SearchHit[] {
  const q = normalize(query)
  if (q.length < 2) return []

  const hits: Array<SearchHit & { score: number }> = []

  for (const profile of profiles) {
    const score = Math.max(
      scoreName(profile.name, q),
      scoreName(profile.handle, q),
      scoreName(`@${profile.handle}`, q),
    )
    if (!score) continue
    hits.push({
      kind: 'user',
      id: profile.handle,
      label: profile.name,
      detail: `@${profile.handle}`,
      href: `/u/${profile.handle}`,
      score,
    })
  }

  for (const area of areas) {
    const score = Math.max(
      scoreName(area.name, q),
      scoreName(area.slug.replace(/-/g, ' '), q),
      scoreName(area.nation, q) > 0 && q.length > 4
        ? scoreName(area.nation, q) / 2
        : 0,
    )
    if (!score) continue
    hits.push({
      kind: 'range',
      id: area.slug,
      label: area.name,
      detail: `${area.nation} · ${area.kind}`,
      href: `/map?area=${encodeURIComponent(area.slug)}`,
      score,
    })
  }

  for (const hike of hikes) {
    const score = scoreName(hike.name, q)
    if (!score) continue
    const areaName =
      areas.find((area) => area.slug === hike.areaSlug)?.name ?? hike.areaSlug
    hits.push({
      kind: 'hike',
      id: hike.id,
      label: hike.name,
      detail: `${areaName} · ${hike.difficulty}`,
      href: `/hikes/${encodeURIComponent(hike.id)}`,
      score,
    })
  }

  for (const route of multiDayRoutes) {
    const score = Math.max(
      scoreName(route.name, q),
      scoreName(route.start, q),
      scoreName(route.finish, q),
      scoreName(route.nation, q) > 0 && q.length > 4
        ? scoreName(route.nation, q) / 2
        : 0,
    )
    if (!score) continue
    hits.push({
      kind: 'multi-day',
      id: route.id,
      label: route.name,
      detail: `${route.nation} · ${route.distanceKm} km · ${formatDurationDays(route)}`,
      href: `/hikes/multi-day/${encodeURIComponent(route.id)}`,
      score: score + 2,
    })
  }

  for (const peak of getAllAreaPeaks()) {
    const score = scoreName(peak.name, q)
    if (!score) continue
    const areaName =
      areas.find((area) => area.slug === peak.area)?.name ?? peak.area
    hits.push({
      kind: 'peak',
      id: peak.id,
      label: peak.name,
      detail: `${areaName} · ${peak.height} m`,
      href: `/map?area=${encodeURIComponent(peak.area)}&peak=${encodeURIComponent(peak.id)}`,
      score,
    })
  }

  for (const bothy of bothies) {
    const score = Math.max(
      scoreName(bothy.name, q),
      scoreName(bothy.region, q) > 0 && q.length > 4
        ? scoreName(bothy.region, q) / 2
        : 0,
    )
    if (!score) continue
    hits.push({
      kind: 'bothy',
      id: bothy.id,
      label: bothy.name,
      detail: bothy.region,
      href: `/bothies?bothy=${encodeURIComponent(bothy.id)}`,
      score,
    })
  }

  const seen = new Set<string>()
  const ranked = hits
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.label.localeCompare(b.label) ||
        a.kind.localeCompare(b.kind),
    )
    // Generated rounds often share a title + area; keep one visible hit.
    .filter((hit) => {
      const key = `${hit.kind}|${hit.label}|${hit.detail}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  const places = ranked.filter((hit) => hit.kind !== 'user')
  const users = ranked.filter((hit) => hit.kind === 'user')
  // Places / routes first; keep a few matching users at the end.
  const userSlots = Math.min(users.length, 3)
  const placeSlots = Math.max(0, limit - userSlots)
  return [...places.slice(0, placeSlots), ...users.slice(0, userSlots)]
    .slice(0, limit)
    .map(({ score: _score, ...hit }) => hit)
}
