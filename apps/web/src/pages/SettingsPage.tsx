import { useEffect, useRef, useState, type ReactNode } from 'react'
import { SiteHeader } from '../components/SiteHeader'
import { apiEnabled } from '../data/api'
import {
  bootstrapSession,
  endSession,
  loadUser,
  updateCachedUserName,
} from '../data/auth'
import { loadLogs, prepareImage } from '../data/logs'
import {
  loadProfileSettings,
  persistProfileSettings,
  syncPublicProfile,
  type ProfileSettings,
} from '../data/profiles'
import { LoginGatePage } from '../components/LoginGatePage'

type EditField = 'name' | 'bio' | 'sharing' | null

export function SettingsPage() {
  const [user, setUser] = useState(loadUser)
  const [settings, setSettings] = useState<ProfileSettings | null>(() => {
    const current = loadUser()
    return current ? loadProfileSettings(current) : null
  })
  const [savedNotice, setSavedNotice] = useState('')
  const [saveError, setSaveError] = useState(false)
  const [ready, setReady] = useState(!apiEnabled())
  const [editing, setEditing] = useState<EditField>(null)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftBio, setDraftBio] = useState('')
  const [draftShareNotes, setDraftShareNotes] = useState(true)
  const [draftSharePhotos, setDraftSharePhotos] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const usingApi = apiEnabled()

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const session = await bootstrapSession()
      if (cancelled) return

      if (!session.user) {
        setUser(null)
        setReady(true)
        return
      }

      setUser(session.user)
      const next = session.profile
        ? {
            handle: session.profile.handle,
            status: session.profile.status,
            avatarUrl: session.profile.avatarUrl ?? null,
            isPublic: session.profile.isPublic,
            shareNotes: session.profile.shareNotes,
            sharePhotos: session.profile.sharePhotos,
          }
        : loadProfileSettings(session.user)
      setSettings(next)
      if (!cancelled) setReady(true)
    })()

    return () => {
      cancelled = true
    }
  }, [usingApi])

  if (!ready) {
    return (
      <main className="settings-page">
        <SiteHeader />
        <section className="account-loading">
          <p>Loading settings…</p>
        </section>
      </main>
    )
  }

  if (!user || !settings) {
    return <LoginGatePage returnTo="/account/settings" />
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || '○'

  const save = async (
    patch: Partial<ProfileSettings>,
    name?: string,
  ): Promise<ProfileSettings | null> => {
    setSaving(true)
    setSavedNotice('')
    setSaveError(false)
    const draft = { ...settings, ...patch }
    try {
      const next = await persistProfileSettings(draft, name)
      setSettings(next)
      if (name) {
        const updated = updateCachedUserName(name)
        if (updated) setUser(updated)
      }
      syncPublicProfile(
        name ? { ...user, name } : user,
        loadLogs(),
      )
      return next
    } catch (err) {
      const message =
        err instanceof TypeError ||
        (err instanceof Error &&
          /failed to fetch|networkerror|load failed/i.test(err.message))
          ? 'Could not reach the server. Check the API is running, then try again.'
          : err instanceof Error
            ? err.message
            : 'Could not save settings.'
      setSaveError(true)
      setSavedNotice(message)
      return null
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (field: EditField) => {
    setSavedNotice('')
    setSaveError(false)
    setPrivacyOpen(false)
    if (field === 'name') setDraftName(user.name)
    if (field === 'bio') setDraftBio(settings.status)
    if (field === 'sharing') {
      setDraftShareNotes(settings.shareNotes)
      setDraftSharePhotos(settings.sharePhotos)
    }
    setEditing(field)
  }

  const cancelEdit = () => setEditing(null)

  const onPickPhoto = async (file: File | null) => {
    if (!file) return
    try {
      const avatarUrl = await prepareImage(file)
      const next = await save({ avatarUrl })
      if (next) setSavedNotice('Photo updated.')
    } catch (err) {
      setSaveError(true)
      setSavedNotice(
        err instanceof Error ? err.message : 'Could not update photo.',
      )
    }
  }

  const removePhoto = async () => {
    const next = await save({ avatarUrl: null })
    if (next) setSavedNotice('Photo removed.')
  }

  const saveName = async () => {
    const trimmed = draftName.trim()
    if (!trimmed) {
      setSaveError(true)
      setSavedNotice('Name is required.')
      return
    }
    const next = await save({}, trimmed)
    if (next) {
      setSavedNotice('Name updated.')
      setEditing(null)
    }
  }

  const saveBio = async () => {
    const next = await save({ status: draftBio.trim().slice(0, 160) })
    if (next) {
      setSavedNotice('Bio updated.')
      setEditing(null)
    }
  }

  const saveSharing = async () => {
    const next = await save({
      shareNotes: draftShareNotes,
      sharePhotos: draftSharePhotos,
    })
    if (next) {
      setSavedNotice('Sharing preferences updated.')
      setEditing(null)
    }
  }

  const setVisibility = async (isPublic: boolean) => {
    const next = await save({ isPublic })
    if (next) {
      setSavedNotice(
        isPublic ? 'Your profile is now public.' : 'Your profile is now private.',
      )
      setPrivacyOpen(false)
    }
  }

  const signOut = () => {
    void endSession().then(() => {
      window.location.href = '/'
    })
  }

  return (
    <main className="settings-page">
      <SiteHeader />

      <div className="settings-shell">
        <a className="settings-back" href="/account">
          ← Back to profile
        </a>

        <header className="settings-hero">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              void onPickPhoto(event.target.files?.[0] ?? null)
              event.target.value = ''
            }}
          />

          <button
            type="button"
            className="settings-avatar"
            disabled={saving}
            onClick={() => fileRef.current?.click()}
            aria-label="Change profile picture"
          >
            {settings.avatarUrl ? (
              <img src={settings.avatarUrl} alt="" />
            ) : (
              <span>{initial}</span>
            )}
          </button>

          <button
            type="button"
            className="settings-photo-cta"
            disabled={saving}
            onClick={() => fileRef.current?.click()}
          >
            Change profile picture
          </button>
          {settings.avatarUrl ? (
            <button
              type="button"
              className="settings-text-btn"
              disabled={saving}
              onClick={() => void removePhoto()}
            >
              Remove
            </button>
          ) : null}

          <h1>{user.name}</h1>
          <p className="settings-handle">@{settings.handle}</p>
          <p className="settings-bio">
            {settings.status.trim() ||
              'Add a short line about where you are on the hills.'}
          </p>

          <div className="settings-status-row">
            <span
              className={`settings-pill ${settings.isPublic ? 'is-public' : 'is-private'}`}
            >
              {settings.isPublic ? 'Public' : 'Private'}
            </span>
            {settings.isPublic ? (
              <a className="settings-text-btn" href={`/u/${settings.handle}`}>
                View profile →
              </a>
            ) : null}
          </div>
        </header>

        {savedNotice ? (
          <p
            className={`settings-notice ${saveError ? 'is-error' : ''}`}
            role="status"
          >
            {savedNotice}
          </p>
        ) : null}

        <section className="settings-card" aria-labelledby="settings-profile-title">
          <h2 id="settings-profile-title">Profile</h2>
          <p className="settings-card__lead">How you show up across Field Atlas.</p>

          <div className="settings-list">
            <SettingsRow
              label="Display name"
              value={user.name}
              open={editing === 'name'}
              onEdit={() => openEdit('name')}
              onCancel={cancelEdit}
            >
              <div className="settings-edit">
                <input
                  type="text"
                  value={draftName}
                  maxLength={120}
                  aria-label="Display name"
                  onChange={(event) => setDraftName(event.target.value)}
                />
                <div className="settings-edit__actions">
                  <button
                    type="button"
                    className="settings-btn-primary"
                    disabled={saving}
                    onClick={() => void saveName()}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="settings-btn-ghost"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </SettingsRow>

            <SettingsRow
              label="Bio"
              value={settings.status.trim() || 'Not set yet'}
              open={editing === 'bio'}
              onEdit={() => openEdit('bio')}
              onCancel={cancelEdit}
            >
              <div className="settings-edit">
                <textarea
                  value={draftBio}
                  maxLength={160}
                  rows={3}
                  aria-label="Bio"
                  placeholder="A short line about where you are on the hills"
                  onChange={(event) => setDraftBio(event.target.value)}
                />
                <div className="settings-edit__actions">
                  <button
                    type="button"
                    className="settings-btn-primary"
                    disabled={saving}
                    onClick={() => void saveBio()}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="settings-btn-ghost"
                    onClick={cancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </SettingsRow>

            <div className="settings-item">
              <div className="settings-item__copy">
                <span>Handle</span>
                <strong>@{settings.handle}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="settings-card" aria-labelledby="settings-privacy-title">
          <h2 id="settings-privacy-title">Privacy</h2>
          <p className="settings-card__lead">
            Control who can see your walks and posts.
          </p>

          <div className="settings-privacy-panel">
            <div>
              <strong>
                {settings.isPublic ? 'Public profile' : 'Private profile'}
              </strong>
              <p>
                {settings.isPublic
                  ? 'Anyone can open your page and you can post on Explore.'
                  : 'Your page stays hidden until you go public.'}
              </p>
            </div>
            <button
              type="button"
              className="settings-btn-primary"
              disabled={saving}
              onClick={() => {
                setEditing(null)
                setPrivacyOpen(true)
              }}
            >
              {settings.isPublic ? 'Make private' : 'Make public'}
            </button>
          </div>

          {privacyOpen ? (
            <div className="settings-confirm" role="dialog" aria-label="Confirm visibility">
              {settings.isPublic ? (
                <>
                  <h3>Make profile private?</h3>
                  <p>
                    /u/{settings.handle} will hide, and your posts leave Explore
                    until you go public again.
                  </p>
                  <div className="settings-edit__actions">
                    <button
                      type="button"
                      className="settings-btn-ghost"
                      disabled={saving}
                      onClick={() => setPrivacyOpen(false)}
                    >
                      Keep public
                    </button>
                    <button
                      type="button"
                      className="settings-btn-primary"
                      disabled={saving}
                      onClick={() => void setVisibility(false)}
                    >
                      Make private
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3>Make profile public?</h3>
                  <p>
                    Anyone with the link can open /u/{settings.handle}. Public is
                    required before you can post on Explore.
                  </p>
                  <div className="settings-edit__actions">
                    <button
                      type="button"
                      className="settings-btn-primary"
                      disabled={saving}
                      onClick={() => void setVisibility(true)}
                    >
                      Make public
                    </button>
                    <button
                      type="button"
                      className="settings-btn-ghost"
                      onClick={() => setPrivacyOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}

          {settings.isPublic ? (
            <div className="settings-list settings-list--flush">
              <SettingsRow
                label="Completion sharing"
                value={[
                  settings.shareNotes ? 'Notes' : null,
                  settings.sharePhotos ? 'Photos' : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Peaks only'}
                open={editing === 'sharing'}
                onEdit={() => openEdit('sharing')}
                onCancel={cancelEdit}
              >
                <div className="settings-edit">
                  <label className="settings-check">
                    <input
                      type="checkbox"
                      checked={draftShareNotes}
                      onChange={(event) =>
                        setDraftShareNotes(event.target.checked)
                      }
                    />
                    <span>Show notes on completed days</span>
                  </label>
                  <label className="settings-check">
                    <input
                      type="checkbox"
                      checked={draftSharePhotos}
                      onChange={(event) =>
                        setDraftSharePhotos(event.target.checked)
                      }
                    />
                    <span>Show photographs on completed days</span>
                  </label>
                  <div className="settings-edit__actions">
                    <button
                      type="button"
                      className="settings-btn-primary"
                      disabled={saving}
                      onClick={() => void saveSharing()}
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="settings-btn-ghost"
                      onClick={cancelEdit}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </SettingsRow>
            </div>
          ) : null}
        </section>

        <button className="settings-signout-btn" type="button" onClick={signOut}>
          Sign out
        </button>
      </div>
    </main>
  )
}

function SettingsRow({
  label,
  value,
  open,
  onEdit,
  onCancel,
  children,
}: {
  label: string
  value: string
  open: boolean
  onEdit: () => void
  onCancel: () => void
  children: ReactNode
}) {
  return (
    <div className={`settings-item ${open ? 'is-open' : ''}`}>
      <div className="settings-item__copy">
        <span>{label}</span>
        {!open ? <strong>{value}</strong> : null}
      </div>
      {!open ? (
        <button type="button" className="settings-item__edit" onClick={onEdit}>
          Edit
        </button>
      ) : (
        <button type="button" className="settings-item__edit" onClick={onCancel}>
          Close
        </button>
      )}
      {open ? children : null}
    </div>
  )
}
