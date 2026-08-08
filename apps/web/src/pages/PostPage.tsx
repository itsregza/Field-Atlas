import { useEffect, useState } from 'react'
import { FeedPostCard } from '../components/FeedPostCard'
import { SiteHeader } from '../components/SiteHeader'
import { apiEnabled, apiGetPost, type ApiFeedPost } from '../data/api'

export function PostPage({ postId }: { postId: string }) {
  const [post, setPost] = useState<ApiFeedPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!apiEnabled()) {
      setLoading(false)
      setError('Posts need the API running.')
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')
    void apiGetPost(postId)
      .then((result) => {
        if (cancelled) return
        setPost(result.post)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Post not found.')
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [postId])

  const backHref = post ? `/u/${post.author.handle}` : '/explore'

  return (
    <main className="soft-page">
      <SiteHeader />
      <div className="soft-shell">
        <p className="hike-note" style={{ marginBottom: 12 }}>
          <a className="account-text-link" href={backHref}>
            ← Back
          </a>
          {' · '}
          <a className="account-text-link" href="/explore">
            Explore
          </a>
        </p>

        {loading ? (
          <p className="account-muted">Loading post…</p>
        ) : error || !post ? (
          <div className="account-card account-card--center">
            <strong>Post unavailable</strong>
            <span className="account-muted">{error || 'Not found.'}</span>
          </div>
        ) : (
          <FeedPostCard
            post={post}
            expandComments
            onDeleted={() => {
              window.location.href = backHref
            }}
            onUpdated={setPost}
          />
        )}
      </div>
    </main>
  )
}
