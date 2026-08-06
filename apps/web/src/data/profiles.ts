import { areas } from './areas'
import { getAllAreaPeaks, getAreaPeaks } from './areaPeaks'
import {
  apiEnabled,
  apiGetProfile,
  apiListProfiles,
  apiPutProfile,
} from './api'
import { loadUser, type MockUser } from './auth'
import { loadLogs, type PeakLogs } from './logs'

export type PublicCompletion = {
  peakId: string
  peakName: string
  areaSlug: string
  areaName: string
  height: number
  date: string
  notes?: string
  image?: string
}

export type PublicAreaProgress = {
  areaSlug: string
  areaName: string
  nation: string
  color: string
  done: number
  total: number
}

export type PublicProfile = {
  handle: string
  userId: string
  name: string
  status: string
  avatarUrl?: string | null
  shareNotes: boolean
  sharePhotos: boolean
  completed: number
  areasStarted: number
  followerCount?: number
  followingCount?: number
  followedByMe?: boolean
  updatedAt: string
  recent: PublicCompletion[]
  areas?: PublicAreaProgress[]
}

export type ProfileSettings = {
  handle: string
  status: string
  avatarUrl?: string | null
  isPublic: boolean
  shareNotes: boolean
  sharePhotos: boolean
}

const settingsKey = 'field-atlas:profile-settings'
const publicKey = 'field-atlas:public-profiles'

const placeholderPhoto = (tone: string, label: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${tone}"/>
          <stop offset="100%" stop-color="#2a2c24"/>
        </linearGradient>
      </defs>
      <rect width="640" height="420" fill="url(#g)"/>
      <path d="M0 290 L120 210 L210 255 L320 150 L420 230 L520 170 L640 250 L640 420 L0 420 Z" fill="rgb(250 246 233 / 22%)"/>
      <text x="32" y="380" fill="rgb(250 246 233 / 85%)" font-family="Georgia, serif" font-size="28">${label}</text>
    </svg>`,
  )}`

const demoProfiles: PublicProfile[] = [
  {
    handle: 'moor-walker',
    userId: 'demo-moor-walker',
    name: 'Aisha Khan',
    status: 'Chipping away at the Wainwrights — clear days only.',
    shareNotes: true,
    sharePhotos: true,
    completed: 18,
    areasStarted: 3,
    updatedAt: '2026-07-26T10:00:00.000Z',
    recent: [
      {
        peakId: 'demo-helvellyn',
        peakName: 'Helvellyn',
        areaSlug: 'lake-district',
        areaName: 'Lake District',
        height: 950,
        date: '2026-07-26',
        notes: 'Striding Edge in a southerly — hands on rock more than once.',
        image: placeholderPhoto('#4a6b3d', 'Helvellyn'),
      },
      {
        peakId: 'demo-catbells',
        peakName: 'Catbells',
        areaSlug: 'lake-district',
        areaName: 'Lake District',
        height: 451,
        date: '2026-07-19',
        notes: 'Evening light over Derwentwater. Short and perfect.',
        image: placeholderPhoto('#5f7a48', 'Catbells'),
      },
      {
        peakId: 'demo-kinder',
        peakName: 'Kinder Scout',
        areaSlug: 'peak-district',
        areaName: 'Peak District',
        height: 636,
        date: '2026-07-08',
        notes: 'Peat and mist on the plateau. Compass out for once.',
        image: placeholderPhoto('#6b4f32', 'Kinder Scout'),
      },
    ],
  },
  {
    handle: 'eryri-ridge',
    userId: 'demo-eryri-ridge',
    name: 'Owen Price',
    status: 'North Wales ridges. Sharing notes, keeping photographs private.',
    shareNotes: true,
    sharePhotos: false,
    completed: 11,
    areasStarted: 2,
    updatedAt: '2026-07-28T16:30:00.000Z',
    recent: [
      {
        peakId: 'demo-tryfan',
        peakName: 'Tryfan',
        areaSlug: 'eryri',
        areaName: 'Eryri (Snowdonia)',
        height: 918,
        date: '2026-07-28',
        notes: 'North Ridge dry. Adam and Eve for luck.',
      },
      {
        peakId: 'demo-wyddfa',
        peakName: 'Yr Wyddfa',
        areaSlug: 'eryri',
        areaName: 'Eryri (Snowdonia)',
        height: 1085,
        date: '2026-07-14',
        notes: 'Pyg Track early, quiet summit for twenty minutes.',
      },
      {
        peakId: 'demo-pen-y-fan',
        peakName: 'Pen y Fan',
        areaSlug: 'bannau-brycheiniog',
        areaName: 'Bannau Brycheiniog (Brecon Beacons)',
        height: 886,
        date: '2026-06-30',
        notes: 'Cloud inversion in the Beacons. Worth the 5am start.',
      },
    ],
  },
  {
    handle: 'cairn-notes',
    userId: 'demo-cairn-notes',
    name: 'Fiona MacLeod',
    status: 'Munro weather or no weather. Photos when the cloud lifts.',
    shareNotes: true,
    sharePhotos: true,
    completed: 27,
    areasStarted: 4,
    updatedAt: '2026-07-21T09:15:00.000Z',
    recent: [
      {
        peakId: 'demo-macdui',
        peakName: 'Ben Macdui',
        areaSlug: 'cairngorms',
        areaName: 'Cairngorms',
        height: 1309,
        date: '2026-07-21',
        notes: 'Plateau wind strong. Tea at the cairn.',
        image: placeholderPhoto('#3d5a6b', 'Ben Macdui'),
      },
      {
        peakId: 'demo-lomond',
        peakName: 'Ben Lomond',
        areaSlug: 'loch-lomond-trossachs',
        areaName: 'Loch Lomond & The Trossachs',
        height: 974,
        date: '2026-07-03',
        image: placeholderPhoto('#4d6270', 'Ben Lomond'),
      },
    ],
  },
]

function slugifyHandle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
}

export function defaultHandleFor(user: MockUser) {
  const fromName = slugifyHandle(user.name)
  if (fromName.length >= 3) return fromName
  return slugifyHandle(user.email.split('@')[0] || 'user') || 'user'
}

export function loadProfileSettings(user: MockUser): ProfileSettings {
  try {
    const saved = localStorage.getItem(settingsKey)
    if (saved) {
      const parsed = JSON.parse(saved) as ProfileSettings
      return {
        handle: slugifyHandle(parsed.handle) || defaultHandleFor(user),
        status: parsed.status?.slice(0, 160) ?? '',
        avatarUrl: parsed.avatarUrl ?? null,
        isPublic: Boolean(parsed.isPublic),
        shareNotes: parsed.shareNotes !== false,
        sharePhotos: parsed.sharePhotos !== false,
      }
    }
  } catch {
    // fall through
  }

  return {
    handle: defaultHandleFor(user),
    status: '',
    avatarUrl: null,
    isPublic: false,
    shareNotes: true,
    sharePhotos: true,
  }
}

export function saveProfileSettings(settings: ProfileSettings) {
  const next: ProfileSettings = {
    handle: slugifyHandle(settings.handle) || 'user',
    status: settings.status.trim().slice(0, 160),
    avatarUrl: settings.avatarUrl ?? null,
    isPublic: settings.isPublic,
    shareNotes: settings.shareNotes,
    sharePhotos: settings.sharePhotos,
  }
  localStorage.setItem(settingsKey, JSON.stringify(next))
  return next
}

/** Persist sharing settings to the API when enabled, otherwise local only. */
export async function persistProfileSettings(
  settings: ProfileSettings,
  name?: string,
) {
  const draft: ProfileSettings = {
    handle: slugifyHandle(settings.handle) || 'user',
    status: settings.status.trim().slice(0, 160),
    avatarUrl: settings.avatarUrl ?? null,
    isPublic: settings.isPublic,
    shareNotes: settings.shareNotes,
    sharePhotos: settings.sharePhotos,
  }

  if (!apiEnabled()) {
    return saveProfileSettings(draft)
  }

  const { profile } = await apiPutProfile({
    ...(name !== undefined ? { name } : {}),
    status: draft.status,
    avatarUrl: draft.avatarUrl ?? null,
    isPublic: draft.isPublic,
    shareNotes: draft.shareNotes,
    sharePhotos: draft.sharePhotos,
  })

  return saveProfileSettings({
    handle: profile.handle,
    status: profile.status,
    avatarUrl: profile.avatarUrl ?? null,
    isPublic: profile.isPublic,
    shareNotes: profile.shareNotes,
    sharePhotos: profile.sharePhotos,
  })
}

function loadStoredPublicProfiles(): PublicProfile[] {
  try {
    const saved = localStorage.getItem(publicKey)
    if (!saved) return []
    const parsed = JSON.parse(saved) as PublicProfile[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveStoredPublicProfiles(profiles: PublicProfile[]) {
  localStorage.setItem(publicKey, JSON.stringify(profiles))
}

function buildRecentFromLogs(
  logs: PeakLogs,
  shareNotes: boolean,
  sharePhotos: boolean,
): PublicCompletion[] {
  const peaks = getAllAreaPeaks()
  return peaks
    .filter((peak) => logs[peak.id]?.done)
    .map((peak) => {
      const log = logs[peak.id]
      const area = areas.find((entry) => entry.slug === peak.area)
      const entry: PublicCompletion = {
        peakId: peak.id,
        peakName: peak.name,
        areaSlug: peak.area,
        areaName: area?.name ?? peak.area,
        height: peak.height,
        date: log?.date ?? '',
      }
      if (shareNotes && log?.notes.trim()) entry.notes = log.notes.trim()
      if (sharePhotos && log?.image) entry.image = log.image
      return entry
    })
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || a.peakName.localeCompare(b.peakName),
    )
    .slice(0, 12)
}

export function buildPublicProfile(
  user: MockUser,
  settings: ProfileSettings,
  logs: PeakLogs = loadLogs(),
): PublicProfile {
  const peaks = getAllAreaPeaks()
  const completed = peaks.filter((peak) => logs[peak.id]?.done).length
  const areaRows = areas
    .map((area) => {
      const areaPeaks = getAreaPeaks(area.slug)
      const done = areaPeaks.filter((peak) => logs[peak.id]?.done).length
      return {
        areaSlug: area.slug,
        areaName: area.name,
        nation: area.nation,
        color: area.color,
        done,
        total: areaPeaks.length,
      }
    })
    .filter((entry) => entry.done > 0)
    .sort(
      (a, b) =>
        b.done / Math.max(b.total, 1) - a.done / Math.max(a.total, 1) ||
        a.areaName.localeCompare(b.areaName),
    )

  return {
    handle: settings.handle,
    userId: user.id,
    name: user.name,
    status: settings.status,
    avatarUrl: settings.avatarUrl ?? null,
    shareNotes: settings.shareNotes,
    sharePhotos: settings.sharePhotos,
    completed,
    areasStarted: areaRows.length,
    updatedAt: new Date().toISOString(),
    recent: buildRecentFromLogs(logs, settings.shareNotes, settings.sharePhotos),
    areas: areaRows,
  }
}

/** Offline-only publish into local public registry. */
export function syncPublicProfile(
  user: MockUser | null = loadUser(),
  logs: PeakLogs = loadLogs(),
) {
  if (!user || apiEnabled()) return

  const settings = loadProfileSettings(user)
  const stored = loadStoredPublicProfiles().filter(
    (profile) =>
      profile.userId !== user.id && profile.handle !== settings.handle,
  )

  if (!settings.isPublic) {
    saveStoredPublicProfiles(stored)
    return
  }

  const published = buildPublicProfile(user, settings, logs)
  const withoutHandleClash = stored.filter(
    (profile) => profile.handle !== published.handle,
  )
  saveStoredPublicProfiles([published, ...withoutHandleClash])
}

function mapApiProfile(profile: {
  handle: string
  userId: string
  name: string
  status: string
  avatarUrl?: string | null
  shareNotes: boolean
  sharePhotos: boolean
  completed: number
  areasStarted: number
  followerCount?: number
  followingCount?: number
  followedByMe?: boolean
  updatedAt: string
  recent: Array<{
    peakId: string
    peakName: string
    areaSlug: string
    areaName: string
    height: number
    date: string
    notes?: string
    imageUrl?: string
  }>
  areas?: Array<{
    areaSlug: string
    areaName: string
    nation?: string
    color?: string
    done: number
    total?: number
  }>
}): PublicProfile {
  return {
    handle: profile.handle,
    userId: profile.userId,
    name: profile.name,
    status: profile.status,
    avatarUrl: profile.avatarUrl ?? null,
    shareNotes: profile.shareNotes,
    sharePhotos: profile.sharePhotos,
    completed: profile.completed,
    areasStarted: profile.areasStarted,
    followerCount: profile.followerCount ?? 0,
    followingCount: profile.followingCount ?? 0,
    followedByMe: profile.followedByMe ?? false,
    updatedAt: profile.updatedAt,
    recent: profile.recent.map((entry) => ({
      peakId: entry.peakId,
      peakName: entry.peakName,
      areaSlug: entry.areaSlug,
      areaName: entry.areaName,
      height: entry.height,
      date: entry.date,
      notes: entry.notes,
      image: entry.imageUrl,
    })),
    areas: (profile.areas ?? []).map((entry) => {
      const meta = areas.find((area) => area.slug === entry.areaSlug)
      return {
        areaSlug: entry.areaSlug,
        areaName: entry.areaName || meta?.name || entry.areaSlug,
        nation: entry.nation || meta?.nation || '',
        color: entry.color || meta?.color || '#5f7a48',
        done: entry.done,
        total: entry.total ?? (meta ? getAreaPeaks(meta.slug).length : entry.done),
      }
    }),
  }
}

export function listPublicProfilesLocal(): PublicProfile[] {
  const user = loadUser()
  const settings = user ? loadProfileSettings(user) : null
  if (user && settings?.isPublic) {
    syncPublicProfile(user)
  }

  const stored = loadStoredPublicProfiles()
  const byHandle = new Map<string, PublicProfile>()

  for (const profile of demoProfiles) {
    byHandle.set(profile.handle, profile)
  }
  for (const profile of stored) {
    byHandle.set(profile.handle, profile)
  }

  if (user && settings && !settings.isPublic) {
    for (const [handle, profile] of [...byHandle.entries()]) {
      if (profile.userId === user.id) byHandle.delete(handle)
    }
  }

  return [...byHandle.values()].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  )
}

export async function listPublicProfiles(): Promise<PublicProfile[]> {
  if (!apiEnabled()) return listPublicProfilesLocal()

  try {
    const { profiles } = await apiListProfiles()
    const byHandle = new Map<string, PublicProfile>()
    for (const profile of demoProfiles) {
      byHandle.set(profile.handle, profile)
    }
    for (const profile of profiles) {
      byHandle.set(profile.handle, mapApiProfile(profile))
    }
    return [...byHandle.values()].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    )
  } catch {
    return listPublicProfilesLocal()
  }
}

export async function getPublicProfile(
  handle: string,
): Promise<PublicProfile | null> {
  const normalized = slugifyHandle(handle)
  if (!normalized) return null

  if (apiEnabled()) {
    try {
      const { profile } = await apiGetProfile(normalized)
      return mapApiProfile(profile)
    } catch {
      // fall through to local/demo
    }
  }

  return (
    listPublicProfilesLocal().find(
      (profile) => profile.handle === normalized,
    ) ?? null
  )
}

export function formatProfileDate(value: string) {
  if (!value) return 'No date'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
