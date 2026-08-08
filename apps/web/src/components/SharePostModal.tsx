import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  ApiError,
  apiCreatePost,
  apiEnabled,
  apiUploadMedia,
} from '../data/api'
import { getAllAreaPeaks } from '../data/areaPeaks'
import { areas } from '../data/areas'
import { preparePostImageFile } from '../data/logs'
import {
  HikingGlyph,
  PostActivityBadge,
  TentGlyph,
  type PostActivity,
} from './PostActivity'

export type SharePostDefaults = {
  peakId?: string
  peakName?: string
  areaSlug?: string
  areaName?: string
  height?: number
  hikeId?: string
  hikeName?: string
  imageUrl?: string
  body?: string
  activity?: PostActivity
}

type LocalMedia = {
  key: string
  kind: 'image' | 'video'
  previewUrl: string
  file?: File
  remoteUrl?: string
}

type SharePostModalProps = {
  open: boolean
  defaults?: SharePostDefaults
  onClose: () => void
  onShared?: () => void
}

type Step = 'activity' | 'media' | 'details' | 'preview'

const STEPS: Step[] = ['activity', 'media', 'details', 'preview']
const MAX_MEDIA = 10

const stepTitle: Record<Step, string> = {
  activity: 'Type',
  media: 'Photos',
  details: 'Details',
  preview: 'Preview',
}

export function SharePostModal({
  open,
  defaults,
  onClose,
  onShared,
}: SharePostModalProps) {
  const [step, setStep] = useState<Step>('activity')
  const [activity, setActivity] = useState<PostActivity | null>(null)
  const [body, setBody] = useState('')
  const [media, setMedia] = useState<LocalMedia[]>([])
  const [peakQuery, setPeakQuery] = useState('')
  const [peakId, setPeakId] = useState<string | undefined>()
  const [peakName, setPeakName] = useState<string | undefined>()
  const [areaSlug, setAreaSlug] = useState<string | undefined>()
  const [areaName, setAreaName] = useState<string | undefined>()
  const [height, setHeight] = useState<number | undefined>()
  const [routeUrl, setRouteUrl] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [slide, setSlide] = useState(0)
  const [peakMenu, setPeakMenu] = useState<{
    top: number
    left: number
    width: number
  } | null>(null)
  const peakInputRef = useRef<HTMLInputElement>(null)

  const peaks = useMemo(() => getAllAreaPeaks(), [])
  const peakHits = useMemo(() => {
    const q = peakQuery.trim().toLowerCase()
    if (q.length < 2 || peakId || step !== 'details') return []
    return peaks
      .filter(
        (peak) =>
          peak.name.toLowerCase().includes(q) ||
          peak.area.toLowerCase().includes(q),
      )
      .slice(0, 8)
  }, [peakQuery, peaks, peakId, step])

  const stepIndex = STEPS.indexOf(step)

  useEffect(() => {
    if (!peakHits.length || !peakInputRef.current) {
      setPeakMenu(null)
      return
    }

    const place = () => {
      const el = peakInputRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const menuHeight = Math.min(220, peakHits.length * 52 + 12)
      const spaceBelow = window.innerHeight - rect.bottom - 12
      const openUp = spaceBelow < menuHeight && rect.top > spaceBelow
      setPeakMenu({
        top: openUp ? rect.top - menuHeight - 6 : rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      })
    }

    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [peakHits])

  useEffect(() => {
    if (!open) return
    setBody(defaults?.body ?? '')
    setPeakId(defaults?.peakId)
    setPeakName(defaults?.peakName)
    setAreaSlug(defaults?.areaSlug)
    setAreaName(defaults?.areaName)
    setHeight(defaults?.height)
    setPeakQuery(defaults?.peakName ?? '')
    setRouteUrl('')
    setError('')
    setPending(false)
    setSlide(0)
    setActivity(defaults?.activity ?? null)
    setStep(defaults?.activity ? 'media' : 'activity')
    if (defaults?.imageUrl) {
      const url = defaults.imageUrl
      if (url.startsWith('data:')) {
        void fetch(url)
          .then((response) => response.blob())
          .then((blob) => {
            const file = new File([blob], 'photo.jpg', {
              type: blob.type || 'image/jpeg',
            })
            setMedia([
              {
                key: 'default',
                kind: 'image',
                previewUrl: url,
                file,
              },
            ])
          })
          .catch(() => {
            setMedia([])
            setError('Could not use the photo from your summit log.')
          })
      } else {
        setMedia([
          {
            key: 'default',
            kind: 'image',
            previewUrl: url,
            remoteUrl: url.startsWith('/uploads/') ? url : undefined,
            file: undefined,
          },
        ])
      }
    } else {
      setMedia([])
    }
  }, [open, defaults])

  useEffect(() => {
    return () => {
      for (const item of media) {
        if (item.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl)
      }
    }
  }, [media])

  if (!open) return null

  const goBack = () => {
    setError('')
    if (stepIndex <= 0) {
      onClose()
      return
    }
    setStep(STEPS[stepIndex - 1]!)
  }

  const validateRoute = () => {
    const link = routeUrl.trim()
    if (!link) return true
    try {
      const parsed = new URL(link)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setError('Route link must start with http:// or https://')
        return false
      }
      return true
    } catch {
      setError('Enter a valid route link, or leave it blank.')
      return false
    }
  }

  const goNext = () => {
    setError('')
    if (step === 'activity') {
      if (!activity) {
        setError('Choose hiking or camping.')
        return
      }
      setStep('media')
      return
    }
    if (step === 'media') {
      if (!media.length) {
        setError('Add at least one photo or video.')
        return
      }
      setStep('details')
      return
    }
    if (step === 'details') {
      if (!body.trim()) {
        setError('Write a caption.')
        return
      }
      if (!validateRoute()) return
      setStep('preview')
    }
  }

  const pickActivity = (next: PostActivity) => {
    setActivity(next)
    setError('')
    setStep('media')
  }

  const pickFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (!files.length) return
    setError('')
    const room = MAX_MEDIA - media.length
    if (room <= 0) {
      setError(`Up to ${MAX_MEDIA} photos or videos.`)
      return
    }

    const next: LocalMedia[] = []
    for (const file of files.slice(0, room)) {
      try {
        if (file.type.startsWith('image/')) {
          const prepared = await preparePostImageFile(file)
          next.push({
            key: `${Date.now()}-${prepared.name}-${Math.random()}`,
            kind: 'image',
            previewUrl: URL.createObjectURL(prepared),
            file: prepared,
          })
        } else if (file.type.startsWith('video/')) {
          if (file.size > 25 * 1024 * 1024) {
            throw new Error('Videos must be under 25 MB.')
          }
          next.push({
            key: `${Date.now()}-${file.name}-${Math.random()}`,
            kind: 'video',
            previewUrl: URL.createObjectURL(file),
            file,
          })
        } else {
          throw new Error('Photos or videos only.')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not add media.')
      }
    }
    if (next.length) {
      setMedia((current) => {
        const merged = [...current, ...next]
        setSlide(Math.max(0, merged.length - 1))
        return merged
      })
    }
  }

  const removeMedia = (key: string) => {
    setMedia((current) => {
      const target = current.find((item) => item.key === key)
      if (target?.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl)
      }
      const next = current.filter((item) => item.key !== key)
      setSlide((value) => Math.min(value, Math.max(0, next.length - 1)))
      return next
    })
  }

  const clearPeak = () => {
    setPeakId(undefined)
    setPeakName(undefined)
    setAreaSlug(undefined)
    setAreaName(undefined)
    setHeight(undefined)
    setPeakQuery('')
  }

  const selectPeak = (peak: (typeof peaks)[number]) => {
    setPeakId(peak.id)
    setPeakName(peak.name)
    setAreaSlug(peak.area)
    setHeight(peak.height)
    setPeakQuery(peak.name)
    setAreaName(areas.find((area) => area.slug === peak.area)?.name ?? peak.area)
  }

  const publish = async () => {
    if (!apiEnabled()) {
      setError('Sharing needs the Field Atlas API.')
      return
    }
    if (!activity) {
      setError('Choose hiking or camping first.')
      setStep('activity')
      return
    }
    const trimmed = body.trim()
    if (!media.length) {
      setError('Add at least one photo or video.')
      setStep('media')
      return
    }
    if (!trimmed) {
      setError('Write a caption.')
      setStep('details')
      return
    }
    if (!validateRoute()) {
      setStep('details')
      return
    }

    const link = routeUrl.trim()
    setPending(true)
    setError('')
    try {
      const uploaded: Array<{ type: 'image' | 'video'; url: string }> = []
      for (const item of media) {
        if (item.remoteUrl && item.remoteUrl.startsWith('/uploads/')) {
          uploaded.push({ type: item.kind, url: item.remoteUrl })
          continue
        }
        if (!item.file) {
          throw new Error('Re-add media files before sharing.')
        }
        const result = await apiUploadMedia(item.file)
        uploaded.push(result.media)
      }

      await apiCreatePost({
        body: trimmed,
        imageUrl: uploaded.find((item) => item.type === 'image')?.url ?? uploaded[0].url,
        media: uploaded,
        activity,
        routeUrl: link || undefined,
        routeLabel: link ? 'Route' : undefined,
        peakId: peakId ?? defaults?.peakId,
        peakName: peakName ?? defaults?.peakName,
        areaSlug: areaSlug ?? defaults?.areaSlug,
        areaName: areaName ?? defaults?.areaName,
        height: height ?? defaults?.height,
        hikeId: defaults?.hikeId,
        hikeName: defaults?.hikeName,
      })
      onShared?.()
      onClose()
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Could not share this post.',
      )
      setPending(false)
    }
  }

  const current = media[slide]

  const mediaStage = (
    <div className="share-modal__stage">
      {current ? (
        <>
          {current.kind === 'video' ? (
            <video src={current.previewUrl} controls playsInline />
          ) : (
            <img src={current.previewUrl} alt="" />
          )}
          {step === 'media' ? (
            <button
              type="button"
              className="share-modal__remove"
              aria-label="Remove media"
              onClick={() => removeMedia(current.key)}
            >
              ×
            </button>
          ) : null}
          {media.length > 1 ? (
            <>
              <button
                type="button"
                className="share-modal__nav is-prev"
                aria-label="Previous"
                onClick={() =>
                  setSlide((value) => (value - 1 + media.length) % media.length)
                }
              >
                ‹
              </button>
              <button
                type="button"
                className="share-modal__nav is-next"
                aria-label="Next"
                onClick={() => setSlide((value) => (value + 1) % media.length)}
              >
                ›
              </button>
              <div className="share-modal__dots" aria-hidden="true">
                {media.map((item, index) => (
                  <span
                    key={item.key}
                    className={index === slide ? 'is-active' : ''}
                  />
                ))}
              </div>
            </>
          ) : null}
        </>
      ) : (
        <label className="share-modal__drop">
          <strong>Add photos or videos</strong>
          <span>Up to {MAX_MEDIA}</span>
          <input
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
            multiple
            onChange={(e) => void pickFiles(e)}
          />
        </label>
      )}
    </div>
  )

  return (
    <div className="share-modal" role="presentation" onClick={onClose}>
      <div
        className="share-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="share-modal__bar">
          <button type="button" className="share-modal__ghost" onClick={goBack}>
            {stepIndex === 0 ? 'Cancel' : 'Back'}
          </button>
          <h2 id="share-modal-title">{stepTitle[step]}</h2>
          {step === 'preview' ? (
            <button
              type="button"
              className="share-modal__share share-modal__share--solid"
              disabled={pending}
              onClick={() => void publish()}
            >
              {pending ? '…' : 'Post'}
            </button>
          ) : (
            <span className="share-modal__share-spacer" aria-hidden="true" />
          )}
        </header>

        <ol className="share-modal__progress" aria-label="Post steps">
          {STEPS.map((id, index) => (
            <li
              key={id}
              className={
                index < stepIndex
                  ? 'is-done'
                  : index === stepIndex
                    ? 'is-active'
                    : undefined
              }
            >
              <span>{index + 1}</span>
              <small>{stepTitle[id]}</small>
            </li>
          ))}
        </ol>

        <div className="share-modal__body share-modal__body--step">
          {step === 'activity' ? (
            <>
              <p className="share-modal__step-copy">
                Step 1 — tap hiking or camping to continue.
              </p>
              <div className="share-modal__activity-grid">
                <button
                  type="button"
                  className={`share-modal__activity-choice ${
                    activity === 'hiking' ? 'is-selected' : ''
                  }`}
                  onClick={() => pickActivity('hiking')}
                >
                  <HikingGlyph />
                  <strong>Hiking</strong>
                  <span>Summit days, day walks, routes</span>
                </button>
                <button
                  type="button"
                  className={`share-modal__activity-choice ${
                    activity === 'camping' ? 'is-selected' : ''
                  }`}
                  onClick={() => pickActivity('camping')}
                >
                  <TentGlyph />
                  <strong>Camping</strong>
                  <span>Overnight pitches and wild camps</span>
                </button>
              </div>
            </>
          ) : null}

          {step === 'media' ? (
            <>
              <p className="share-modal__step-copy">
                Step 2 — add photos or videos from the day.
              </p>
              {mediaStage}
              {media.length > 0 && media.length < MAX_MEDIA ? (
                <label className="share-modal__add-more">
                  + Add more
                  <input
                    type="file"
                    accept="image/*,video/mp4,video/webm,video/quicktime"
                    multiple
                    onChange={(e) => void pickFiles(e)}
                  />
                </label>
              ) : null}
              <button
                type="button"
                className="share-modal__post-btn"
                onClick={goNext}
              >
                Next
              </button>
            </>
          ) : null}

          {step === 'details' ? (
            <>
              <p className="share-modal__step-copy">
                Step 3 — caption and optional peak or route link.
              </p>
              <textarea
                className="share-modal__caption"
                value={body}
                maxLength={1000}
                rows={4}
                placeholder="Write a caption…"
                onChange={(event) => {
                  setBody(event.target.value)
                  if (error) setError('')
                }}
              />
              <div className="share-modal__meta">
                {peakId && peakName ? (
                  <div className="share-modal__chip">
                    <span>
                      {peakName}
                      {height ? ` · ${height} m` : ''}
                    </span>
                    <button type="button" aria-label="Clear peak" onClick={clearPeak}>
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="share-modal__peak">
                    <input
                      ref={peakInputRef}
                      type="search"
                      value={peakQuery}
                      placeholder="Tag a peak (optional)"
                      autoComplete="off"
                      onChange={(event) => {
                        setPeakQuery(event.target.value)
                        if (peakName && event.target.value !== peakName) {
                          setPeakId(undefined)
                          setPeakName(undefined)
                        }
                      }}
                    />
                  </div>
                )}
                <input
                  className="share-modal__link"
                  type="text"
                  inputMode="url"
                  value={routeUrl}
                  maxLength={2000}
                  placeholder="Route link (optional)"
                  autoComplete="off"
                  onChange={(event) => {
                    setRouteUrl(event.target.value)
                    if (error) setError('')
                  }}
                />
              </div>
              <button
                type="button"
                className="share-modal__post-btn"
                onClick={goNext}
              >
                Next
              </button>
            </>
          ) : null}

          {step === 'preview' ? (
            <>
              <p className="share-modal__step-copy">
                Step 4 — check it looks right, then post.
              </p>
              <div className="share-modal__preview">
                <div className="share-modal__preview-head">
                  {activity ? <PostActivityBadge activity={activity} /> : null}
                  {peakName || defaults?.hikeName ? (
                    <strong>
                      {peakName || defaults?.hikeName}
                      {height ? ` · ${height} m` : ''}
                    </strong>
                  ) : null}
                </div>
                {mediaStage}
                {areaName ? (
                  <p className="share-modal__preview-meta">{areaName}</p>
                ) : null}
                {routeUrl.trim() ? (
                  <p className="share-modal__preview-meta">
                    Route link ready
                  </p>
                ) : null}
                {body.trim() ? (
                  <p className="share-modal__preview-caption">{body.trim()}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="share-modal__post-btn"
                disabled={pending}
                onClick={() => void publish()}
              >
                {pending ? 'Posting…' : 'Post'}
              </button>
            </>
          ) : null}

          {error ? <p className="share-modal__error">{error}</p> : null}
        </div>

        {peakHits.length > 0 && peakMenu ? (
          <ul
            className="share-modal__peak-hits share-modal__peak-hits--float"
            style={{
              top: peakMenu.top,
              left: peakMenu.left,
              width: peakMenu.width,
            }}
            role="listbox"
          >
            {peakHits.map((peak) => (
              <li key={peak.id}>
                <button type="button" onClick={() => selectPeak(peak)}>
                  <strong>{peak.name}</strong>
                  <span>
                    {peak.area} · {peak.height} m
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  )
}
