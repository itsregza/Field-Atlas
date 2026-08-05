import { useEffect, useState } from 'react'
import { SiteHeader } from '../components/SiteHeader'
import {
  ApiError,
  apiOpsDeletePost,
  apiOpsPosts,
  apiOpsSummary,
  apiOpsUsers,
  type OpsPost,
  type OpsSummary,
  type OpsUser,
} from '../data/api'
import { NotFoundPage } from './NotFoundPage'

function formatWhen(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso.slice(0, 10)
  }
}

export function OpsPage() {
  const [denied, setDenied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<OpsSummary | null>(null)
  const [users, setUsers] = useState<OpsUser[]>([])
  const [posts, setPosts] = useState<OpsPost[]>([])
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    void Promise.all([apiOpsSummary(), apiOpsUsers(), apiOpsPosts()])
      .then(([summaryResult, usersResult, postsResult]) => {
        setSummary(summaryResult)
        setUsers(usersResult.users)
        setPosts(postsResult.posts)
        setDenied(false)
      })
      .catch((err) => {
        if (err instanceof ApiError && (err.status === 404 || err.status === 401)) {
          setDenied(true)
          return
        }
        setError(err instanceof Error ? err.message : 'Could not load ops data.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const removePost = (id: string) => {
    if (busyId) return
    if (!window.confirm('Delete this post permanently?')) return
    setBusyId(id)
    setError('')
    void apiOpsDeletePost(id)
      .then(() => {
        setPosts((current) => current.filter((post) => post.id !== id))
        setSummary((current) =>
          current
            ? { ...current, posts: Math.max(0, current.posts - 1) }
            : current,
        )
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setDenied(true)
          return
        }
        setError(err instanceof Error ? err.message : 'Could not delete post.')
      })
      .finally(() => setBusyId(''))
  }

  if (denied) return <NotFoundPage />

  return (
    <main className="soft-page ops-page">
      <SiteHeader />
      <div className="soft-shell soft-shell--wide">
        <header className="soft-hero soft-hero--left">
          <p className="soft-kicker">Ops</p>
          <h1>Control</h1>
          <p>Owner-only overview. Not linked anywhere on the public site.</p>
        </header>

        {loading ? (
          <p className="account-muted">Loading…</p>
        ) : (
          <>
            {summary ? (
              <div className="ops-stat-grid" aria-label="Site totals">
                <article>
                  <span>Users</span>
                  <strong>{summary.users}</strong>
                </article>
                <article>
                  <span>Posts</span>
                  <strong>{summary.posts}</strong>
                </article>
                <article>
                  <span>Likes</span>
                  <strong>{summary.likes}</strong>
                </article>
                <article>
                  <span>Comments</span>
                  <strong>{summary.comments}</strong>
                </article>
                <article>
                  <span>Public profiles</span>
                  <strong>{summary.publicProfiles}</strong>
                </article>
              </div>
            ) : null}

            {error ? <p className="ops-error">{error}</p> : null}

            <section className="account-card" aria-labelledby="ops-users-title">
              <div className="account-card__head">
                <h2 id="ops-users-title">Users</h2>
              </div>
              {users.length === 0 ? (
                <p className="account-muted">No users yet.</p>
              ) : (
                <div className="ops-table-wrap">
                  <table className="ops-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Handle</th>
                        <th>Email</th>
                        <th>Public</th>
                        <th>Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.name}</td>
                          <td>{user.handle ? `@${user.handle}` : '—'}</td>
                          <td>{user.email}</td>
                          <td>{user.isPublic ? 'Yes' : 'No'}</td>
                          <td>{formatWhen(user.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="account-card" aria-labelledby="ops-posts-title">
              <div className="account-card__head">
                <h2 id="ops-posts-title">Posts</h2>
              </div>
              {posts.length === 0 ? (
                <p className="account-muted">No posts yet.</p>
              ) : (
                <ul className="ops-post-list">
                  {posts.map((post) => (
                    <li key={post.id}>
                      <a
                        className="ops-post-list__thumb"
                        href={`/posts/${post.id}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <img src={post.imageUrl} alt="" />
                      </a>
                      <div className="ops-post-list__copy">
                        <strong>
                          {post.peakName || 'Post'} · @
                          {post.authorHandle || 'unknown'}
                        </strong>
                        <span>{post.authorEmail}</span>
                        <p>{post.body}</p>
                        <span>{formatWhen(post.createdAt)}</span>
                      </div>
                      <button
                        type="button"
                        className="ops-danger"
                        disabled={busyId === post.id}
                        onClick={() => removePost(post.id)}
                      >
                        Delete
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  )
}
