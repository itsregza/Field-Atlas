import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { SharePostModal } from '../components/SharePostModal'
import { SiteHeader } from '../components/SiteHeader'
import { apiEnabled, apiGetMyPosts, type ApiFeedPost } from '../data/api'
import { bootstrapSession, loadUser } from '../data/auth'
import { getAllAreaPeaks, getAreaPeaks } from '../data/areaPeaks'
import { areas } from '../data/areas'
import { hydrateLogsFromApi, loadLogs } from '../data/logs'
import {
  listCompletedHikes,
  listSavedHikes,
  loadHikeLibrary,
} from '../data/hikeLibrary'
import {
  addGearItem,
  gearCategories,
  loadGear,
  removeGearItem,
  type GearItem,
} from '../data/gear'
import {
  parseProfileSection,
  ProfileSectionNav,
} from '../components/ProfileSectionNav'
import {
  PostActivityBadge,
  PostActivityFilter,
  PostActivityIcon,
  isPostActivity,
  type PostActivity,
} from '../components/PostActivity'
import {
  loadProfileSettings,
  type ProfileSettings,
} from '../data/profiles'
import { LoginGatePage } from '../components/LoginGatePage'

function formatPercent(done: number, total: number) {
  if (!total) return '0%'
  const exact = (done / total) * 100
  if (done > 0 && exact < 1) return '<1%'
  return `${Math.round(exact)}%`
}

export function AccountPage({ section: sectionProp = 'overview' }: { section?: string }) {
  const section = parseProfileSection(sectionProp)
  const [user, setUser] = useState(loadUser)
  const [logs, setLogs] = useState(loadLogs)
  const [gear, setGear] = useState<GearItem[]>(loadGear)
  const [gearName, setGearName] = useState('')
  const [gearCategory, setGearCategory] = useState(gearCategories()[0])
  const [gearNotes, setGearNotes] = useState('')
  const [settings, setSettings] = useState<ProfileSettings | null>(() => {
    const current = loadUser()
    return current ? loadProfileSettings(current) : null
  })
  const [posts, setPosts] = useState<ApiFeedPost[]>([])
  const [postsReady, setPostsReady] = useState(!apiEnabled())
  const [activityFilter, setActivityFilter] = useState<'all' | PostActivity>(
    'all',
  )
  const [composeOpen, setComposeOpen] = useState(false)
  const [ready, setReady] = useState(!apiEnabled())
  const usingApi = apiEnabled()

  const activityCounts = useMemo(() => {
    let hiking = 0
    let camping = 0
    for (const post of posts) {
      if (post.activity === 'camping') camping += 1
      else if (post.activity === 'hiking') hiking += 1
    }
    return { all: posts.length, hiking, camping }
  }, [posts])

  const filteredPosts = useMemo(() => {
    if (activityFilter === 'all') return posts
    return posts.filter((post) => post.activity === activityFilter)
  }, [posts, activityFilter])

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
      setSettings(
        session.profile
          ? {
              handle: session.profile.handle,
              status: session.profile.status,
              avatarUrl: session.profile.avatarUrl ?? null,
              isPublic: session.profile.isPublic,
              shareNotes: session.profile.shareNotes,
              sharePhotos: session.profile.sharePhotos,
            }
          : loadProfileSettings(session.user),
      )

      if (usingApi) {
        try {
          const hydrated = await hydrateLogsFromApi()
          if (!cancelled) setLogs(hydrated)
        } catch {
          if (!cancelled) setLogs(loadLogs())
        }

        try {
          const mine = await apiGetMyPosts()
          if (!cancelled) {
            setPosts(mine.posts)
            setPostsReady(true)
          }
        } catch {
          if (!cancelled) {
            setPosts([])
            setPostsReady(true)
          }
        }
      } else if (!cancelled) {
        setPostsReady(true)
      }

      if (!cancelled) setReady(true)
    })()

    return () => {
      cancelled = true
    }
  }, [usingApi])

  if (!ready) {
    return (
      <main className="account-page">
        <SiteHeader />
        <div className="account-shell">
          <p className="account-muted">Loading your profile…</p>
        </div>
      </main>
    )
  }

  if (!user || !settings) {
    return <LoginGatePage returnTo="/account" />
  }

  const peaks = getAllAreaPeaks()
  const completedPeaks = peaks.filter((peak) => logs[peak.id]?.done)
  const completed = completedPeaks.length
  const photos = Object.values(logs).filter((log) => log.image).length
  const areasStarted = areas.filter((area) =>
    getAreaPeaks(area.slug).some((peak) => logs[peak.id]?.done),
  ).length

  const initial = user.name.trim().charAt(0).toUpperCase() || '○'
  const library = loadHikeLibrary()
  const savedHikes = listSavedHikes(library)
  const completedHikes = listCompletedHikes(library)
  const regionProgress = areas
    .map((area) => {
      const peaks = getAreaPeaks(area.slug)
      const done = peaks.filter((peak) => logs[peak.id]?.done).length
      return {
        area,
        done,
        total: peaks.length,
        label: formatPercent(done, peaks.length),
        meter: peaks.length
          ? Math.max(
              done > 0 ? 3 : 0,
              Math.min(100, (done / peaks.length) * 100),
            )
          : 0,
      }
    })
    .filter((entry) => entry.done > 0)
    .sort(
      (a, b) =>
        b.done / Math.max(b.total, 1) - a.done / Math.max(a.total, 1) ||
        a.area.name.localeCompare(b.area.name),
    )

  const addGear = (event: FormEvent) => {
    event.preventDefault()
    if (!gearName.trim()) return
    setGear(
      addGearItem({
        name: gearName,
        category: gearCategory,
        notes: gearNotes,
      }),
    )
    setGearName('')
    setGearNotes('')
  }

  return (
    <main className="account-page">
      <SiteHeader />

      <div className="account-shell">
        <header className="account-hero">
          <span className="account-hero__avatar" aria-hidden="true">
            {settings.avatarUrl ? (
              <img src={settings.avatarUrl} alt="" />
            ) : (
              initial
            )}
          </span>
          <h1>{user.name}</h1>
          {settings.handle ? (
            <p className="account-hero__handle">@{settings.handle}</p>
          ) : null}
          {settings.status ? (
            <p className="account-hero__bio">{settings.status}</p>
          ) : null}
          <div className="account-hero__actions">
            <a className="account-hero__settings" href="/account/settings">
              Settings
            </a>
            <button
              type="button"
              className="account-pill-btn account-hero__compose"
              onClick={() => setComposeOpen(true)}
            >
              New post
            </button>
          </div>
        </header>

        <ProfileSectionNav basePath="/account" section={section} />

        {section === 'overview' ? (
          <>
            <section className="account-card" aria-labelledby="account-activity-title">
              <div className="account-card__head">
                <h2 id="account-activity-title">Activity</h2>
              </div>

              {!postsReady ? (
                <p className="account-muted">Loading activity…</p>
              ) : posts.length === 0 ? (
                <div className="account-empty">
                  <p>
                    Nothing here yet. Share a peak day, route link, or photos to
                    the feed.
                  </p>
                </div>
              ) : (
                <>
                  <PostActivityFilter
                    value={activityFilter}
                    onChange={setActivityFilter}
                    counts={activityCounts}
                  />
                  {filteredPosts.length === 0 ? (
                    <div className="account-empty">
                      <p>No {activityFilter} posts yet.</p>
                    </div>
                  ) : (
                    <ul className="account-post-grid" aria-label="Your posts">
                      {filteredPosts.slice(0, 6).map((post) => (
                        <li key={post.id}>
                          <a
                            className="account-post-tile"
                            href={`/posts/${post.id}`}
                            aria-label={
                              post.peakName
                                ? `Open post from ${post.peakName}`
                                : 'Open shared photograph'
                            }
                          >
                            <img
                              src={post.imageUrl}
                              alt={
                                post.peakName
                                  ? `Your post from ${post.peakName}`
                                  : 'Your shared photograph'
                              }
                            />
                            {isPostActivity(post.activity) ? (
                              <span
                                className={`account-post-tile__badge is-${post.activity}`}
                                aria-label={post.activity}
                              >
                                <PostActivityIcon activity={post.activity} />
                              </span>
                            ) : null}
                            {post.hiddenByMe ? (
                              <span className="account-post-tile__hidden">
                                Hidden
                              </span>
                            ) : null}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              <div className="account-quick-links">
                <a href="/account/trips">All posts →</a>
                <a href="/explore">Explore →</a>
                <a href="/account/stats">Full stats →</a>
              </div>
            </section>
          </>
        ) : null}

        {section === 'stats' ? (
          <section className="account-card" aria-labelledby="account-stats-title">
            <div className="account-card__head">
              <h2 id="account-stats-title">Stats</h2>
              <a className="account-text-link" href="/checklists">
                Checklists →
              </a>
            </div>

            <div className="account-stat-grid account-stat-grid--compact">
              <article>
                <span>Summits</span>
                <strong>{completed}</strong>
              </article>
              <article>
                <span>Areas</span>
                <strong>{areasStarted}</strong>
              </article>
              <article>
                <span>Routes</span>
                <strong>{completedHikes.length}</strong>
              </article>
              <article>
                <span>Saved</span>
                <strong>{savedHikes.length}</strong>
              </article>
              <article>
                <span>Posts</span>
                <strong>{posts.length}</strong>
              </article>
              <article>
                <span>Photos</span>
                <strong>{photos}</strong>
              </article>
            </div>

            <h3 className="account-card__sub">Region progress</h3>
            {regionProgress.length === 0 ? (
              <div className="account-empty">
                <p>
                  No regions started yet. Tick summits on your checklists to
                  build progress here.
                </p>
                <a className="account-pill-btn" href="/checklists">
                  Open checklists
                </a>
              </div>
            ) : (
              <ul className="account-region-list" aria-label="Checklist progress by region">
                {regionProgress.map(({ area, done, total, label, meter }) => (
                  <li key={area.slug}>
                    <a href={`/checklists/${area.slug}`}>
                      <span
                        className="account-region-list__swatch"
                        style={{ background: area.color }}
                        aria-hidden="true"
                      />
                      <span className="account-region-list__copy">
                        <strong>{area.name}</strong>
                        <small>
                          {area.nation} · {done} of {total}
                        </small>
                      </span>
                      <span className="account-region-list__meter" aria-hidden="true">
                        <span
                          style={{
                            width: `${meter}%`,
                            background: area.color,
                          }}
                        />
                      </span>
                      <span className="account-region-list__pct">{label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {!settings.isPublic ? (
              <p className="account-muted account-muted--pad">
                Profile is private — this progress isn’t shown on your public
                page.
              </p>
            ) : null}
          </section>
        ) : null}

        {section === 'trips' ? (
          <section className="account-card" aria-labelledby="account-trips-title">
            <div className="account-card__head">
              <h2 id="account-trips-title">Trips</h2>
            </div>

            {!postsReady ? (
              <p className="account-muted">Loading posts…</p>
            ) : posts.length === 0 ? (
              <div className="account-empty">
                <p>Your posts will show up here.</p>
              </div>
            ) : (
              <>
                <PostActivityFilter
                  value={activityFilter}
                  onChange={setActivityFilter}
                  counts={activityCounts}
                />
                {filteredPosts.length === 0 ? (
                  <div className="account-empty">
                    <p>No {activityFilter} posts yet.</p>
                  </div>
                ) : (
                  <ul className="account-trips-grid" aria-label="Your trips">
                    {filteredPosts.map((post) => (
                      <li key={post.id}>
                        <a
                          className="account-trips-tile"
                          href={`/posts/${post.id}`}
                        >
                          <span className="account-trips-tile__media">
                            <img src={post.imageUrl} alt="" />
                            {isPostActivity(post.activity) ? (
                              <span
                                className={`account-trips-tile__badge is-${post.activity}`}
                                aria-hidden="true"
                              >
                                <PostActivityIcon activity={post.activity} />
                              </span>
                            ) : null}
                            {post.hiddenByMe ? (
                              <span className="account-trips-tile__hidden">
                                Hidden
                              </span>
                            ) : null}
                          </span>
                          <span className="account-trips-tile__name">
                            {post.peakName || post.hikeName || 'Post'}
                          </span>
                          {isPostActivity(post.activity) ? (
                            <PostActivityBadge activity={post.activity} />
                          ) : null}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        ) : null}

        {section === 'gear' ? (
          <section className="account-card" aria-labelledby="account-gear-title">
            <div className="account-card__head">
              <h2 id="account-gear-title">Gear</h2>
            </div>

            <form className="account-gear-form" onSubmit={addGear}>
              <label>
                Item
                <input
                  value={gearName}
                  onChange={(event) => setGearName(event.target.value)}
                  placeholder="e.g. Terra Nova Southern Cross"
                  required
                />
              </label>
              <label>
                Category
                <select
                  value={gearCategory}
                  onChange={(event) => setGearCategory(event.target.value)}
                >
                  {gearCategories().map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Notes
                <input
                  value={gearNotes}
                  onChange={(event) => setGearNotes(event.target.value)}
                  placeholder="Weight, season, notes…"
                />
              </label>
              <button type="submit" className="account-pill-btn">
                Add gear
              </button>
            </form>

            {gear.length === 0 ? (
              <div className="account-empty">
                <p>Build your kit list — tents, boots, stoves, layers.</p>
              </div>
            ) : (
              <ul className="account-gear-list">
                {gear.map((item) => (
                  <li key={item.id}>
                    <div>
                      <strong>{item.name}</strong>
                      <small>
                        {item.category}
                        {item.notes ? ` · ${item.notes}` : ''}
                      </small>
                    </div>
                    <button
                      type="button"
                      className="account-text-link"
                      onClick={() => setGear(removeGearItem(item.id))}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </div>

      <SharePostModal
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        onShared={() => {
          if (!apiEnabled()) return
          void apiGetMyPosts()
            .then((result) => setPosts(result.posts))
            .catch(() => undefined)
        }}
      />
    </main>
  )
}
