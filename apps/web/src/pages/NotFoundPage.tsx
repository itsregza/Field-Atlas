import { SiteHeader } from '../components/SiteHeader'

export function NotFoundPage() {
  return (
    <main className="soft-page not-found-page">
      <SiteHeader />
      <div className="soft-shell">
        <div className="not-found-card">
          <p className="soft-kicker">404</p>
          <h1>Path not found</h1>
          <p>
            Don&apos;t get lost in the hills my friend, return home here
          </p>
          <a className="account-pill-btn" href="/">
            Return home
          </a>
        </div>
      </div>
    </main>
  )
}
