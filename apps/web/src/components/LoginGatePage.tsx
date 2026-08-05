import { SiteHeader } from './SiteHeader'
import { useAuthModal } from './AuthModal'
import { useEffect, useRef } from 'react'

type LoginGatePageProps = {
  returnTo: string
}

export function LoginGatePage({ returnTo }: LoginGatePageProps) {
  const { openAuth } = useAuthModal()
  const opened = useRef(false)

  useEffect(() => {
    if (opened.current) return
    opened.current = true
    openAuth('login', returnTo)
  }, [openAuth, returnTo])

  return (
    <main className="account-page">
      <SiteHeader />
      <div className="account-shell">
        <div className="account-card account-card--center">
          <h1>Sign in to continue</h1>
          <p className="account-muted">
            A free account unlocks checklists, Explore, saved progress and the
            rest of Field Atlas.
          </p>
          <button
            className="account-pill-btn"
            type="button"
            onClick={() => openAuth('login', returnTo)}
          >
            Log in / sign up for free
          </button>
        </div>
      </div>
    </main>
  )
}
