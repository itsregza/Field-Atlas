import { useEffect, useState } from 'react'
import { FeedPostCard } from '../components/FeedPostCard'
import { LoginGatePage } from '../components/LoginGatePage'
import { SiteHeader } from '../components/SiteHeader'
import { apiEnabled, apiGetFeed, type ApiFeedPost } from '../data/api'
import { bootstrapSession, type MockUser } from '../data/auth'

export function ExplorePage() {
  const [user, setUser] = useState<MockUser | null>(null)
  const [ready, setReady] = useState(!apiEnabled())
  const [posts, setPosts] = useState<ApiFeedPost[]>([])
  const [scope, setScope] = useState<'all' | 'following'>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    void bootstrapSession().then((session) => {
      if (cancelled) return
      setUser(session.user)
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready || !user || !apiEnabled()) {
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
  }, [ready, user, scope])

  if (!ready) {
    return (
      <main className="soft-page">
        <SiteHeader />
        <div className="soft-shell">
          <p className="account-muted">Loading Explore…</p>
        </div>
      </main>
    )
  }

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
            Optional posts from public users — like, follow and comment when
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
          <p className="account-muted">Loading posts…</p>
        ) : error ? (
          <div className="account-card account-card--center">
            <p className="account-muted">{error}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="account-card account-card--center">
            <p className="account-muted">
              {scope === 'following'
                ? 'No posts from people you follow yet.'
                : 'No posts in the feed yet.'}
            </p>
          </div>
        ) : (
          <div className="soft-feed">
            {posts.map((post) => (
              <FeedPostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
