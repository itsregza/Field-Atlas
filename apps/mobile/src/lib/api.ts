import {
  cookieHeader,
  extractSessionFromSetCookie,
  getSessionToken,
  setSessionToken,
} from './session'

const apiBase = () =>
  (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '')

export function apiEnabled() {
  return Boolean(apiBase())
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export type ApiUser = {
  id: string
  email: string
  name: string
  provider: 'email' | 'google'
}

export type ApiProfile = {
  handle: string
  status: string
  avatarUrl?: string | null
  isPublic: boolean
  shareNotes: boolean
  sharePhotos: boolean
  name?: string
}

export type FeedPost = {
  id: string
  body: string
  imageUrl: string
  media?: Array<{ type: 'image' | 'video'; url: string }>
  activity?: 'hiking' | 'camping'
  peakName?: string
  areaName?: string
  height?: number
  hikeName?: string
  createdAt: string
  author: {
    userId: string
    handle: string
    name: string
    avatarUrl?: string | null
  }
  likeCount: number
  likedByMe: boolean
  commentCount: number
}

export type PublicProfile = {
  handle: string
  userId: string
  name: string
  status: string
  avatarUrl?: string | null
  completed: number
  areasStarted: number
  followerCount?: number
  followingCount?: number
  followedByMe?: boolean
}

export type PeakLog = {
  done: boolean
  date: string
  notes: string
  imageUrl?: string
  peakName?: string
  areaSlug?: string
  areaName?: string
  height?: number
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  options?: { formData?: boolean },
): Promise<T> {
  if (!apiEnabled()) {
    throw new ApiError(0, 'Set EXPO_PUBLIC_API_URL to your Field Atlas API.')
  }

  const token = await getSessionToken()
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  }
  if (!options?.formData) {
    headers['Content-Type'] = 'application/json'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
    const cookie = cookieHeader(token)
    if (cookie) headers.Cookie = cookie
  }

  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers,
  })

  const setCookie =
    response.headers.get('set-cookie') ||
    response.headers.get('Set-Cookie')
  const nextToken = extractSessionFromSetCookie(setCookie)
  if (nextToken) await setSessionToken(nextToken)

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = (await response.json()) as {
        error?: string
        detail?: { error?: string } | string
      }
      if (body.error) message = body.error
      else if (typeof body.detail === 'string') message = body.detail
      else if (body.detail && typeof body.detail === 'object' && body.detail.error) {
        message = body.detail.error
      }
    } catch {
      // ignore
    }
    throw new ApiError(response.status, message)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

type AuthResponse = { user: ApiUser; sessionToken?: string }

async function rememberSession(result: AuthResponse) {
  if (result.sessionToken) {
    await setSessionToken(result.sessionToken)
  }
  return result
}

export function apiMe() {
  return request<{ user: ApiUser | null; profile?: ApiProfile }>('/auth/me')
}

export async function apiLogin(body: { email: string; password: string }) {
  const result = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return rememberSession(result)
}

export async function apiRegister(body: {
  username: string
  firstName: string
  email: string
  phone: string
  password: string
}) {
  const result = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return rememberSession(result)
}

export async function apiLogout() {
  try {
    await request<{ ok: boolean }>('/auth/logout', { method: 'POST' })
  } finally {
    await setSessionToken(null)
  }
}

export function apiGetFeed(limit = 20, scope: 'all' | 'following' = 'all') {
  return request<{ posts: FeedPost[]; scope: string }>(
    `/feed?limit=${limit}&scope=${scope}`,
  )
}

export function apiGetMyPosts() {
  return request<{ posts: FeedPost[] }>('/me/posts')
}

export function apiGetPost(id: string) {
  return request<{ post: FeedPost }>(`/posts/${encodeURIComponent(id)}`)
}

export function apiGetProfile(handle: string) {
  return request<{ profile: PublicProfile }>(
    `/profiles/${encodeURIComponent(handle)}`,
  )
}

export function apiGetProfilePosts(handle: string) {
  return request<{ posts: FeedPost[] }>(
    `/profiles/${encodeURIComponent(handle)}/posts`,
  )
}

export function apiLikePost(id: string) {
  return request<{ liked: boolean; likeCount: number }>(
    `/posts/${encodeURIComponent(id)}/like`,
    { method: 'POST' },
  )
}

export function apiUnlikePost(id: string) {
  return request<{ liked: boolean; likeCount: number }>(
    `/posts/${encodeURIComponent(id)}/like`,
    { method: 'DELETE' },
  )
}

export function apiFollow(handle: string) {
  return request<{ following: boolean; followerCount: number }>(
    `/profiles/${encodeURIComponent(handle)}/follow`,
    { method: 'POST' },
  )
}

export function apiUnfollow(handle: string) {
  return request<{ following: boolean; followerCount: number }>(
    `/profiles/${encodeURIComponent(handle)}/follow`,
    { method: 'DELETE' },
  )
}

export function apiGetLogs() {
  return request<{ logs: Record<string, PeakLog> }>('/me/logs')
}

export function apiPutLogs(logs: Record<string, PeakLog>) {
  return request<{ ok: boolean }>('/me/logs', {
    method: 'PUT',
    body: JSON.stringify({ logs }),
  })
}

export function apiCreatePost(body: {
  body: string
  imageUrl: string
  media?: Array<{ type: 'image' | 'video'; url: string }>
  activity: 'hiking' | 'camping'
  peakId?: string
  peakName?: string
  areaSlug?: string
  areaName?: string
  height?: number
}) {
  return request<{ post: FeedPost }>('/me/posts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function apiUploadMedia(uri: string, mimeType = 'image/jpeg', name = 'photo.jpg') {
  const token = await getSessionToken()
  const form = new FormData()
  form.append('file', {
    uri,
    type: mimeType,
    name,
  } as unknown as Blob)

  const headers: Record<string, string> = {}
  const cookie = cookieHeader(token)
  if (cookie) headers.Cookie = cookie

  const response = await fetch(`${apiBase()}/me/uploads`, {
    method: 'POST',
    headers,
    body: form,
  })

  const setCookie = response.headers.get('set-cookie')
  const nextToken = extractSessionFromSetCookie(setCookie)
  if (nextToken) await setSessionToken(nextToken)

  if (!response.ok) {
    throw new ApiError(response.status, 'Upload failed')
  }
  return (await response.json()) as {
    media: { type: 'image' | 'video'; url: string }
  }
}

export function apiSetPitchability(peakId: string, score: number) {
  return request<{ average: number; count: number; myScore: number }>(
    `/me/ratings/pitch/${encodeURIComponent(peakId)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ score }),
    },
  )
}

export function apiGetPitchability(peakId: string) {
  return request<{ average: number; count: number; myScore: number | null }>(
    `/peaks/${encodeURIComponent(peakId)}/pitchability`,
  )
}

export function apiSetPeakRating(peakId: string, score: number) {
  return request<{ average: number; count: number; myScore: number }>(
    `/me/ratings/peak/${encodeURIComponent(peakId)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ score }),
    },
  )
}

export function apiGetPeakRating(peakId: string) {
  return request<{ average: number; count: number; myScore: number | null }>(
    `/peaks/${encodeURIComponent(peakId)}/rating`,
  )
}

export function mediaUrl(path: string) {
  if (!path) return path
  if (path.startsWith('http') || path.startsWith('data:')) return path
  return `${apiBase()}${path.startsWith('/') ? path : `/${path}`}`
}
