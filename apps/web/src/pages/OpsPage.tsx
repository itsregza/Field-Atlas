import { useEffect, useMemo, useState } from 'react'
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
  const [userQuery, setUserQuery] = useState('')
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase()
    if (!q) return users
    return users.filter((user) => {
      const haystack = [
        user.name,
        user.email,
        user.handle ? `@${user.handle}` : '',
        user.handle ?? '',
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [users, userQuery])

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
                <>
                  <label className="ops-search">
                    <span className="sr-only">Search users</span>
                    <input
                      type="search"
                      value={userQuery}
                      placeholder="Search name, @handle, or email…"
                      onChange={(event) => setUserQuery(event.target.value)}
                    />
                  </label>
                  {filteredUsers.length === 0 ? (
                    <p className="account-muted">No users match that search.</p>
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
                          {filteredUsers.map((user) => (
                            <tr key={user.id}>
                              <td>
                                {user.handle ? (
                                  <a
                                    className="ops-user-link"
                                    href={`/u/${encodeURIComponent(user.handle)}`}
                                  >
                                    {user.name}
                                  </a>
                                ) : (
                                  user.name
                                )}
                              </td>
                              <td>
                                {user.handle ? (
                                  <a
                                    className="ops-user-link"
                                    href={`/u/${encodeURIComponent(user.handle)}`}
                                  >
                                    @{user.handle}
                                  </a>
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td>{user.email}</td>
                              <td>{user.isPublic ? 'Yes' : 'No'}</td>
                              <td>{formatWhen(user.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
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
                          {post.peakName || 'Post'} ·{' '}
                          {post.authorHandle ? (
                            <a
                              className="ops-user-link"
                              href={`/u/${encodeURIComponent(post.authorHandle)}`}
                            >
                              @{post.authorHandle}
                            </a>
                          ) : (
                            '@unknown'
                          )}
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
