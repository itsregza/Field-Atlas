import { loadUser } from './auth'

export type RatingEntityType = 'peak' | 'hike' | 'bothy' | 'pitch'

export type UserRating = {
  entityType: RatingEntityType
  entityId: string
  userId: string
  score: number
  updatedAt: string
}

export type RatingSummary = {
  average: number
  count: number
  myScore: number | null
}

const storageKey = 'field-atlas:ratings'

function clampScore(score: number) {
  return Math.min(5, Math.max(1, Math.round(score)))
}

function readAll(): UserRating[] {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const parsed = JSON.parse(raw) as UserRating[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry) =>
        entry &&
        typeof entry.entityId === 'string' &&
        typeof entry.userId === 'string' &&
        typeof entry.score === 'number',
    )
  } catch {
    return []
  }
}

function writeAll(ratings: UserRating[]) {
  localStorage.setItem(storageKey, JSON.stringify(ratings))
}

/** Stable demo community signal so empty catalogs still show a Field Atlas rating. */
function seedSummary(entityType: RatingEntityType, entityId: string): RatingSummary {
  let hash = 0
  const key = `${entityType}:${entityId}`
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 33 + key.charCodeAt(i)) % 997
  }
  const average = Math.round((3.4 + (hash % 16) / 10) * 10) / 10
  const count = 4 + (hash % 28)
  return { average, count, myScore: null }
}

export function getRatingSummary(
  entityType: RatingEntityType,
  entityId: string,
): RatingSummary {
  const user = loadUser()
  const mine = readAll().filter(
    (entry) =>
      entry.entityType === entityType && entry.entityId === entityId,
  )
  const myScore =
    user != null
      ? (mine.find((entry) => entry.userId === user.id)?.score ?? null)
      : null

  if (!mine.length) {
    const seeded = seedSummary(entityType, entityId)
    return { ...seeded, myScore }
  }

  const sum = mine.reduce((total, entry) => total + entry.score, 0)
  const seeded = seedSummary(entityType, entityId)
  // Blend real browser ratings with the seeded community baseline.
  const blendedSum = sum + seeded.average * seeded.count
  const blendedCount = mine.length + seeded.count
  return {
    average: Math.round((blendedSum / blendedCount) * 10) / 10,
    count: blendedCount,
    myScore,
  }
}

export function setMyRating(
  entityType: RatingEntityType,
  entityId: string,
  score: number,
): RatingSummary {
  const user = loadUser()
  if (!user) return getRatingSummary(entityType, entityId)

  const nextScore = clampScore(score)
  const all = readAll().filter(
    (entry) =>
      !(
        entry.entityType === entityType &&
        entry.entityId === entityId &&
        entry.userId === user.id
      ),
  )
  all.push({
    entityType,
    entityId,
    userId: user.id,
    score: nextScore,
    updatedAt: new Date().toISOString(),
  })
  writeAll(all)
  return getRatingSummary(entityType, entityId)
}

export function clearMyRating(
  entityType: RatingEntityType,
  entityId: string,
): RatingSummary {
  const user = loadUser()
  if (!user) return getRatingSummary(entityType, entityId)
  writeAll(
    readAll().filter(
      (entry) =>
        !(
          entry.entityType === entityType &&
          entry.entityId === entityId &&
          entry.userId === user.id
        ),
    ),
  )
  return getRatingSummary(entityType, entityId)
}

/** Community pitchability for a summit (1–5). */
export function getPitchability(peakId: string): RatingSummary {
  return getRatingSummary('pitch', peakId)
}

export function setPitchability(peakId: string, score: number): RatingSummary {
  return setMyRating('pitch', peakId, score)
}

/** True when average pitchability is at least the overnight threshold. */
export function isWellPitchable(peakId: string, minAverage = 3.5): boolean {
  return getPitchability(peakId).average >= minAverage
}

/** Best pitchability average among a hike’s peaks (0 if none). */
export function bestPitchabilityForPeaks(
  peakIds: string[],
  minAverage = 0,
): number {
  let best = 0
  for (const id of peakIds) {
    const average = getPitchability(id).average
    if (average >= minAverage && average > best) best = average
  }
  return best
}
