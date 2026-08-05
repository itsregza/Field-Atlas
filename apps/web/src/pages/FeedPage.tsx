import { useEffect, useMemo, useState } from 'react'
import { FeedPostCard } from '../components/FeedPostCard'
import { LoginGatePage } from '../components/LoginGatePage'
import { SiteHeader } from '../components/SiteHeader'
import { apiEnabled, apiGetFeed, type ApiFeedPost } from '../data/api'
import { loadUser } from '../data/auth'

export function ExplorePage() {
  const user = useMemo(() => loadUser(), [])
  const [posts, setPosts] = useState<ApiFeedPost[]>([])
  const [scope, setScope] = useState<'all' | 'following'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user || !apiEnabled()) {
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')
    void apiGetFeed(30, scope)
      .then((result) => {
        if (cancelled) return
        setPosts(result.posts)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(
          err instanceof Error ? err.message : 'Could not load Explore.',
        )
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [user, scope])

  if (!user) {
    return <LoginGatePage returnTo="/explore" />
  }

  if (!apiEnabled()) {
    return (
      <main className="soft-page">
        <SiteHeader />
        <div className="soft-shell">
          <div className="account-card account-card--center">
            <h1>Explore needs the API</h1>
            <p className="account-muted">
              Sharing and discovery run through the Field Atlas server. Start
              the API, then return here.
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="soft-page">
      <SiteHeader />
      <div className="soft-shell soft-shell--feed">
        <header className="soft-hero">
          <p className="soft-kicker">Explore</p>
          <h1>From the hill</h1>
          <p>
            Optional posts from public walkers — like, follow and comment when
            something lands.
          </p>
          <div className="soft-tabs" role="tablist" aria-label="Feed scope">
            <button
              type="button"
              role="tab"
              aria-selected={scope === 'all'}
              className={scope === 'all' ? 'is-active' : ''}
              onClick={() => setScope('all')}
            >
              Everyone
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={scope === 'following'}
              className={scope === 'following' ? 'is-active' : ''}
              onClick={() => setScope('following')}
            >
              Following
            </button>
          </div>
        </header>

        {loading ? (
          <p className="account-muted">Loading Explore…</p>
        ) : error ? (
          <p className="account-muted" style={{ color: 'var(--rust)' }}>
            {error}
          </p>
        ) : posts.length === 0 ? (
          <div className="account-card">
            <div className="account-empty">
              <p>
                {scope === 'following'
                  ? 'No posts from people you follow yet. Open a walker profile and tap Follow.'
                  : 'No shared posts yet. Mark a summit complete, then share it to the feed.'}
              </p>
              <button
                type="button"
                className="account-pill-btn"
                onClick={() => {
                  if (scope === 'following') setScope('all')
                  else window.location.href = '/checklists'
                }}
              >
                {scope === 'following' ? 'Show everyone' : 'Open checklists'}
              </button>
            </div>
          </div>
        ) : (
          <section className="soft-feed" aria-label="Shared posts">
            {posts.map((post) => (
              <FeedPostCard key={post.id} post={post} />
            ))}
          </section>
        )}
      </div>
    </main>
  )
}

/** @deprecated Use ExplorePage — kept so old imports fail loudly if missed. */
export const FeedPage = ExplorePage
