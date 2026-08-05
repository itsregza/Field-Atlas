import {
  apiEnabled,
  apiLogout,
  apiMe,
  type ApiProfile,
  type ApiUser,
} from './api'

export type MockUser = {
  id: string
  name: string
  email: string
  provider: 'email' | 'google'
}

export type CachedProfile = {
  handle: string
  status: string
  avatarUrl?: string | null
  isPublic: boolean
  shareNotes: boolean
  sharePhotos: boolean
}

const sessionKey = 'field-atlas:mock-session'
const settingsKey = 'field-atlas:profile-settings'

export function loadUser(): MockUser | null {
  try {
    const saved = localStorage.getItem(sessionKey)
    return saved ? (JSON.parse(saved) as MockUser) : null
  } catch {
    return null
  }
}

export function startSession(
  user: Omit<MockUser, 'id'> & { id?: string },
): MockUser {
  const session: MockUser = {
    id: user.id ?? `mock-${user.email.toLowerCase()}`,
    name: user.name,
    email: user.email,
    provider: user.provider,
  }
  localStorage.setItem(sessionKey, JSON.stringify(session))
  return session
}

export function updateCachedUserName(name: string) {
  const current = loadUser()
  if (!current) return null
  return startSession({ ...current, name })
}

export function cacheApiUser(user: ApiUser) {
  return startSession(user)
}

function clearLocalSession() {
  localStorage.removeItem(sessionKey)
}

function cacheProfile(profile: ApiProfile): CachedProfile {
  const settings: CachedProfile = {
    handle: profile.handle,
    status: profile.status,
    avatarUrl: profile.avatarUrl ?? null,
    isPublic: profile.isPublic,
    shareNotes: profile.shareNotes,
    sharePhotos: profile.sharePhotos,
  }
  localStorage.setItem(settingsKey, JSON.stringify(settings))
  return settings
}

export async function endSession() {
  clearLocalSession()
  if (apiEnabled()) {
    try {
      await apiLogout()
    } catch {
      // Local sign-out still succeeds if the API is unreachable.
    }
  }
}

/**
 * When the API is enabled, cookie session is the source of truth.
 * LocalStorage mirrors the user for sync UI reads.
 */
export async function bootstrapSession(): Promise<{
  user: MockUser | null
  profile: CachedProfile | null
}> {
  if (!apiEnabled()) {
    return { user: loadUser(), profile: null }
  }

  try {
    const { user, profile } = await apiMe()
    if (!user) {
      clearLocalSession()
      return { user: null, profile: null }
    }
    cacheApiUser(user)
    return {
      user,
      profile: profile ? cacheProfile(profile) : null,
    }
  } catch {
    return { user: loadUser(), profile: null }
  }
}
