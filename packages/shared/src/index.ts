import { z } from 'zod'

export const providerSchema = z.enum(['email', 'google'])

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(120),
  provider: providerSchema,
})

/** Peak log payload. imageUrl may be a remote URL or (prototype) a data URL. */
export const peakLogSchema = z.object({
  peakId: z.string().min(1).max(80).optional(),
  done: z.boolean(),
  date: z.string().max(32).default(''),
  notes: z.string().max(500).default(''),
  imageUrl: z.string().max(2_500_000).optional(),
  peakName: z.string().max(200).optional(),
  areaSlug: z.string().max(80).optional(),
  areaName: z.string().max(120).optional(),
  height: z.number().int().nonnegative().optional(),
})

export const peakLogsMapSchema = z.record(z.string(), peakLogSchema)

export const profileSettingsSchema = z.object({
  handle: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Handle must be lowercase kebab-case'),
  status: z.string().max(160).default(''),
  avatarUrl: z.string().max(2_500_000).nullable().optional(),
  isPublic: z.boolean(),
  shareNotes: z.boolean(),
  sharePhotos: z.boolean(),
})

/** Writable profile fields — handle is immutable after signup. */
export const profileUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  status: z.string().max(160).default(''),
  avatarUrl: z.string().max(2_500_000).nullable().optional(),
  isPublic: z.boolean(),
  shareNotes: z.boolean(),
  sharePhotos: z.boolean(),
})

export const publicCompletionSchema = z.object({
  peakId: z.string(),
  peakName: z.string(),
  areaSlug: z.string(),
  areaName: z.string(),
  height: z.number().int().nonnegative(),
  date: z.string(),
  notes: z.string().optional(),
  imageUrl: z.string().optional(),
})

export const publicProfileSchema = z.object({
  handle: z.string(),
  userId: z.string().uuid(),
  name: z.string(),
  status: z.string(),
  avatarUrl: z.string().nullable().optional(),
  shareNotes: z.boolean(),
  sharePhotos: z.boolean(),
  completed: z.number().int().nonnegative(),
  areasStarted: z.number().int().nonnegative(),
  followerCount: z.number().int().nonnegative().default(0),
  followingCount: z.number().int().nonnegative().default(0),
  followedByMe: z.boolean().default(false),
  updatedAt: z.string(),
  recent: z.array(publicCompletionSchema),
})

export const registerBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(120),
})

export const loginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
})

export const demoLoginBodySchema = z.object({
  provider: z.literal('google'),
})

export const postMediaSchema = z.object({
  type: z.enum(['image', 'video']),
  url: z.string().min(1).max(2000),
})

export const createPostBodySchema = z.object({
  body: z.string().trim().min(1).max(1000),
  imageUrl: z.string().min(1).max(500_000),
  media: z.array(postMediaSchema).min(1).max(10).optional(),
  routeUrl: z.string().max(2000).optional(),
  routeLabel: z.string().max(120).optional(),
  peakId: z.string().max(80).optional(),
  peakName: z.string().max(200).optional(),
  areaSlug: z.string().max(80).optional(),
  areaName: z.string().max(120).optional(),
  height: z.number().int().nonnegative().optional(),
  hikeId: z.string().max(80).optional(),
  hikeName: z.string().max(200).optional(),
})

export const feedPostSchema = z.object({
  id: z.string().uuid(),
  body: z.string(),
  imageUrl: z.string(),
  media: z.array(postMediaSchema).default([]),
  routeUrl: z.string().optional(),
  routeLabel: z.string().optional(),
  peakId: z.string().optional(),
  peakName: z.string().optional(),
  areaSlug: z.string().optional(),
  areaName: z.string().optional(),
  height: z.number().int().nonnegative().optional(),
  hikeId: z.string().optional(),
  hikeName: z.string().optional(),
  createdAt: z.string(),
  author: z.object({
    userId: z.string().uuid(),
    handle: z.string(),
    name: z.string(),
    avatarUrl: z.string().nullable().optional(),
  }),
  likeCount: z.number().int().nonnegative().default(0),
  likedByMe: z.boolean().default(false),
  commentCount: z.number().int().nonnegative().default(0),
})

export const postCommentSchema = z.object({
  id: z.string().uuid(),
  postId: z.string().uuid(),
  body: z.string(),
  createdAt: z.string(),
  author: z.object({
    userId: z.string().uuid(),
    handle: z.string(),
    name: z.string(),
    avatarUrl: z.string().nullable().optional(),
  }),
})

export const createCommentBodySchema = z.object({
  body: z.string().trim().min(1).max(500),
})

export type User = z.infer<typeof userSchema>
export type PeakLogDto = z.infer<typeof peakLogSchema>
export type ProfileSettings = z.infer<typeof profileSettingsSchema>
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>
export type PublicProfile = z.infer<typeof publicProfileSchema>
export type PublicCompletion = z.infer<typeof publicCompletionSchema>
export type CreatePostBody = z.infer<typeof createPostBodySchema>
export type FeedPost = z.infer<typeof feedPostSchema>
export type PostComment = z.infer<typeof postCommentSchema>
export type CreateCommentBody = z.infer<typeof createCommentBodySchema>
