import type {
  CreateCommentBody,
  CreatePostBody,
  FeedPost,
  PostComment,
  PublicProfile,
} from '@field-atlas/shared'

const apiBase = () =>
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ||
  ''

export function apiEnabled() {
  return Boolean(apiBase())
}

type ApiErrorBody = { error?: string }

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const body = (await response.json()) as ApiErrorBody
      if (body.error) message = body.error
    } catch {
      // ignore
    }
    throw new ApiError(response.status, message)
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
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

export type ApiProfileUpdate = {
  name?: string
  status: string
  avatarUrl?: string | null
  isPublic: boolean
  shareNotes: boolean
  sharePhotos: boolean
}

export type ApiPeakLog = {
  peakId?: string
  done: boolean
  date: string
  notes: string
  imageUrl?: string
  peakName?: string
  areaSlug?: string
  areaName?: string
  height?: number
}

export function apiMe() {
  return request<{ user: ApiUser | null; profile?: ApiProfile }>('/auth/me')
}

export function apiCheckUsername(username: string) {
  const query = new URLSearchParams({ username })
  return request<{
    username: string
    available: boolean
    reason: string | null
  }>(`/auth/username-available?${query}`)
}

export function apiRegister(body: {
  username: string
  firstName: string
  email: string
  phone: string
  password: string
}) {
  return request<{ user: ApiUser }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function apiLogin(body: { email: string; password: string }) {
  return request<{ user: ApiUser }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function apiDemoGoogle() {
  return request<{ user: ApiUser }>('/auth/demo-google', {
    method: 'POST',
    body: JSON.stringify({ provider: 'google' }),
  })
}

export function apiLogout() {
  return request<{ ok: boolean }>('/auth/logout', { method: 'POST' })
}

export function apiGetLogs() {
  return request<{ logs: Record<string, ApiPeakLog> }>('/me/logs')
}

export function apiPutLogs(logs: Record<string, ApiPeakLog>) {
  return request<{ ok: boolean }>('/me/logs', {
    method: 'PUT',
    body: JSON.stringify({ logs }),
  })
}

export function apiGetProfileSettings() {
  return request<{ profile: ApiProfile }>('/me/profile')
}

export function apiPutProfile(profile: ApiProfileUpdate) {
  return request<{ profile: ApiProfile }>('/me/profile', {
    method: 'PUT',
    body: JSON.stringify(profile),
  })
}

export function apiListProfiles() {
  return request<{ profiles: PublicProfile[] }>('/profiles')
}

export function apiGetProfile(handle: string) {
  return request<{ profile: PublicProfile }>(
    `/profiles/${encodeURIComponent(handle)}`,
  )
}

export type ApiFeedPost = FeedPost
export type ApiPostComment = PostComment

export function apiGetFeed(limit = 20, scope: 'all' | 'following' = 'all') {
  return request<{ posts: ApiFeedPost[]; scope: string }>(
    `/feed?limit=${limit}&scope=${scope}`,
  )
}

export function apiGetMyPosts() {
  return request<{ posts: ApiFeedPost[] }>('/me/posts')
}

export function apiGetPost(id: string) {
  return request<{ post: ApiFeedPost }>(`/posts/${encodeURIComponent(id)}`)
}

export async function apiUploadMedia(file: File) {
  const body = new FormData()
  body.append('file', file)
  const response = await fetch(`${apiBase()}/me/uploads`, {
    method: 'POST',
    credentials: 'include',
    body,
  })
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const payload = (await response.json()) as ApiErrorBody
      if (payload.error) message = payload.error
    } catch {
      // ignore
    }
    throw new ApiError(response.status, message)
  }
  return (await response.json()) as {
    media: { type: 'image' | 'video'; url: string }
  }
}

export function apiCreatePost(body: CreatePostBody) {
  return request<{ post: ApiFeedPost }>('/me/posts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function apiDeletePost(id: string) {
  return request<{ ok: boolean }>(`/me/posts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export function apiGetProfilePosts(handle: string) {
  return request<{ posts: ApiFeedPost[] }>(
    `/profiles/${encodeURIComponent(handle)}/posts`,
  )
}

export function apiGetProfileLogs(handle: string, area?: string) {
  const query = area ? `?area=${encodeURIComponent(area)}` : ''
  return request<{
    handle: string
    name: string
    avatarUrl?: string | null
    logs: Record<
      string,
      {
        done: boolean
        completedOn?: string | null
        notes?: string
        imageUrl?: string | null
        peakName?: string | null
        areaSlug?: string | null
        areaName?: string | null
        height?: number | null
      }
    >
  }>(`/profiles/${encodeURIComponent(handle)}/logs${query}`)
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

export function apiGetComments(postId: string) {
  return request<{ comments: ApiPostComment[] }>(
    `/posts/${encodeURIComponent(postId)}/comments`,
  )
}

export function apiCreateComment(postId: string, body: CreateCommentBody) {
  return request<{ comment: ApiPostComment; commentCount: number }>(
    `/posts/${encodeURIComponent(postId)}/comments`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
}

export function apiDeleteComment(postId: string, commentId: string) {
  return request<{ ok: boolean; commentCount: number }>(
    `/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
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
