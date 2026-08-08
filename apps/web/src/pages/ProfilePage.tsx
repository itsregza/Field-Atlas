import { useEffect, useMemo, useState } from 'react'
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
import { SiteHeader } from '../components/SiteHeader'
import {
  apiEnabled,
  apiFollow,
  apiGetProfilePosts,
  apiUnfollow,
  type ApiFeedPost,
} from '../data/api'
import { loadUser } from '../data/auth'
import {
  getPublicProfile,
  type PublicProfile,
} from '../data/profiles'

function ProfileNotFound() {
  return (
    <main className="account-page">
      <SiteHeader />
      <div className="account-shell">
        <div className="account-card account-card--center">
          <h1>Profile not found</h1>
          <p className="account-muted">
            This user is private, or the link is out of date.
          </p>
          <a className="account-pill-btn" href="/">
            Back home
          </a>
        </div>
      </div>
    </main>
  )
}

export function ProfilePage({
  handle,
  section: sectionProp = 'overview',
}: {
  handle: string
  section?: string
}) {
  const section = parseProfileSection(sectionProp)
  const me = loadUser()
  const [profile, setProfile] = useState<PublicProfile | null | undefined>(
    undefined,
  )
  const [posts, setPosts] = useState<ApiFeedPost[]>([])
  const [activityFilter, setActivityFilter] = useState<'all' | PostActivity>(
    'all',
  )
  const [followBusy, setFollowBusy] = useState(false)
  const [followError, setFollowError] = useState('')

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
    void getPublicProfile(handle).then((next) => {
      if (cancelled) return
      setProfile(next)
    })
    return () => {
      cancelled = true
    }
  }, [handle])

  useEffect(() => {
    if (!apiEnabled()) {
      setPosts([])
      return
    }
    let cancelled = false
    void apiGetProfilePosts(handle)
      .then((result) => {
        if (cancelled) return
        setPosts(result.posts)
      })
      .catch(() => {
        if (cancelled) return
        setPosts([])
      })
    return () => {
      cancelled = true
    }
  }, [handle])

  if (profile === undefined) {
    return (
      <main className="account-page">
        <SiteHeader />
        <div className="account-shell">
          <p className="account-muted">Loading profile…</p>
        </div>
      </main>
    )
  }

  if (!profile) return <ProfileNotFound />

  const initial = profile.name.trim().charAt(0).toUpperCase() || '○'
  const isSelf = me?.id === profile.userId
  const canFollow = Boolean(me && apiEnabled() && !isSelf)
  const basePath = `/u/${profile.handle}`

  const toggleFollow = () => {
    if (!canFollow || followBusy) return
    setFollowBusy(true)
    setFollowError('')
    const action = profile.followedByMe
      ? apiUnfollow(profile.handle)
      : apiFollow(profile.handle)
    void action
      .then((result) => {
        setProfile((current) =>
          current
            ? {
                ...current,
                followedByMe: result.following,
                followerCount: result.followerCount,
              }
            : current,
        )
      })
      .catch((err) => {
        setFollowError(
          err instanceof Error ? err.message : 'Could not update follow.',
        )
      })
      .finally(() => setFollowBusy(false))
  }

  return (
    <main className="account-page">
      <SiteHeader />

      <div className="account-shell">
        <header className="account-hero">
          <span className="account-hero__avatar" aria-hidden="true">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt="" />
            ) : (
              initial
            )}
          </span>
          <h1>{profile.name}</h1>
          <p className="account-hero__handle">@{profile.handle}</p>
          {profile.status ? (
            <p className="account-hero__bio">{profile.status}</p>
          ) : null}
          <p className="account-muted">
            {profile.followerCount ?? 0} followers ·{' '}
            {profile.followingCount ?? 0} following
          </p>
          <div className="account-status-row">
            {canFollow ? (
              <button
                type="button"
                className={
                  profile.followedByMe
                    ? 'account-pill-btn account-pill-btn--ghost'
                    : 'account-pill-btn'
                }
                disabled={followBusy}
                onClick={toggleFollow}
              >
                {profile.followedByMe ? 'Following' : 'Follow'}
              </button>
            ) : null}
            {isSelf ? (
              <a className="account-text-link" href="/account">
                Your account →
              </a>
            ) : null}
          </div>
          {followError ? (
            <p className="account-muted" style={{ color: 'var(--rust)' }}>
              {followError}
            </p>
          ) : null}
        </header>

        <ProfileSectionNav
          basePath={basePath}
          section={section}
          showGear={false}
        />

        {section === 'overview' ? (
          <>
            <section className="account-card" aria-label="Shared progress">
              <div className="account-stat-grid account-stat-grid--compact">
                <article>
                  <span>Summits</span>
                  <strong>{profile.completed}</strong>
                </article>
                <article>
                  <span>Areas</span>
                  <strong>{profile.areasStarted}</strong>
                </article>
                <article>
                  <span>Posts</span>
                  <strong>{posts.length}</strong>
                </article>
                <article>
                  <span>Followers</span>
                  <strong>{profile.followerCount ?? 0}</strong>
                </article>
              </div>
            </section>

            <section className="account-card" aria-labelledby="public-activity-title">
              <div className="account-card__head">
                <h2 id="public-activity-title">Activity</h2>
              </div>
              {posts.length === 0 ? (
                <div className="account-empty">
                  <p>No feed posts yet.</p>
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
                    <ul className="account-post-grid" aria-label="Activity posts">
                      {filteredPosts.slice(0, 9).map((post) => (
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
                                  ? `Post from ${post.peakName}`
                                  : 'Shared photograph'
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
                            {isSelf && post.hiddenByMe ? (
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
                <a href={`${basePath}/stats`}>Full stats →</a>
                <a href={`${basePath}/trips`}>Trips →</a>
              </div>
            </section>
          </>
        ) : null}

        {section === 'stats' ? (
          <section className="account-card" aria-labelledby="public-stats-title">
            <div className="account-card__head">
              <h2 id="public-stats-title">Stats</h2>
            </div>
            <div className="account-stat-grid account-stat-grid--compact">
              <article>
                <span>Summits</span>
                <strong>{profile.completed}</strong>
              </article>
              <article>
                <span>Areas</span>
                <strong>{profile.areasStarted}</strong>
              </article>
              <article>
                <span>Followers</span>
                <strong>{profile.followerCount ?? 0}</strong>
              </article>
              <article>
                <span>Following</span>
                <strong>{profile.followingCount ?? 0}</strong>
              </article>
              <article>
                <span>Posts</span>
                <strong>{posts.length}</strong>
              </article>
            </div>

            <h3 className="account-card__sub">Region progress</h3>
            {!profile.areas || profile.areas.length === 0 ? (
              <div className="account-empty">
                <p>No shared region progress yet.</p>
              </div>
            ) : (
              <ul
                className="account-region-list"
                aria-label="Shared checklist progress"
              >
                {profile.areas.map((area) => {
                  const meter = area.total
                    ? Math.max(
                        area.done > 0 ? 3 : 0,
                        Math.min(100, (area.done / area.total) * 100),
                      )
                    : 0
                  const label = area.total
                    ? area.done > 0 && (area.done / area.total) * 100 < 1
                      ? '<1%'
                      : `${Math.round((area.done / area.total) * 100)}%`
                    : '0%'
                  return (
                    <li key={area.areaSlug}>
                      <a
                        href={`/u/${profile.handle}/checklists/${area.areaSlug}`}
                      >
                        <span
                          className="account-region-list__swatch"
                          style={{ background: area.color }}
                          aria-hidden="true"
                        />
                        <span className="account-region-list__copy">
                          <strong>{area.areaName}</strong>
                          <small>
                            {area.nation} · {area.done} of {area.total}
                          </small>
                        </span>
                        <span
                          className="account-region-list__meter"
                          aria-hidden="true"
                        >
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
                  )
                })}
              </ul>
            )}
          </section>
        ) : null}

        {section === 'trips' ? (
          <section className="account-card" aria-labelledby="public-trips-title">
            <div className="account-card__head">
              <h2 id="public-trips-title">Trips</h2>
            </div>
            {posts.length === 0 ? (
              <div className="account-empty">
                <p>No posts yet.</p>
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
                  <ul className="account-trips-grid" aria-label="Trips">
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
                            {isSelf && post.hiddenByMe ? (
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
      </div>
    </main>
  )
}
