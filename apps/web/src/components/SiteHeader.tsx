import { AtlasSearch } from './AtlasSearch'
import { loadUser } from '../data/auth'
import { useAuthModal } from './AuthModal'

export function SiteHeader() {
  const path = window.location.pathname
  const user = loadUser()
  const { openAuth } = useAuthModal()

  return (
    <header className="site-header">
      <a className="brand" href="/" aria-label="Field Atlas home">
        <span className="brand-mark" aria-hidden="true">
          <img src="/field-atlas-mark.png" alt="" />
        </span>
        <span>
          <strong>Field Atlas</strong>
          <small>Your atlas for the hills.</small>
        </span>
      </a>

      <AtlasSearch />

      <nav className="site-nav" aria-label="Main navigation">
        <a className={path === '/' ? 'active' : ''} href="/">
          Home
        </a>
        <a className={path === '/map' ? 'active' : ''} href="/map">
          Map
        </a>
        <a className={path === '/bothies' ? 'active' : ''} href="/bothies">
          Bothies
        </a>
        <a
          className={path === '/camping' || path === '/pitching' ? 'active' : ''}
          href="/pitching"
        >
          Pitching
        </a>
        <a className={path === '/forecasts' || path === '/weather' ? 'active' : ''} href="/forecasts">
          Forecasts
        </a>
        <a
          className={path === '/hikes' || path.startsWith('/hikes/') ? 'active' : ''}
          href="/hikes"
        >
          Hikes
        </a>
        <a
          className={
            path === '/wainwrights' ||
            path.startsWith('/lists') ||
            path.startsWith('/checklists') ||
            path.startsWith('/trackers')
              ? 'active'
              : ''
          }
          href="/checklists"
        >
          Checklists
        </a>
        {user ? (
          <a
            className={
              path === '/explore' || path.startsWith('/posts/') ? 'active' : ''
            }
            href="/explore"
          >
            Explore
          </a>
        ) : null}
        {user ? (
          <a
            className={`nav-account ${path.startsWith('/account') ? 'active' : ''}`}
            href="/account"
          >
            Account
          </a>
        ) : (
          <button
            className="nav-account"
            type="button"
            onClick={() => openAuth('login', path === '/' ? '/account' : path)}
          >
            Log in
          </button>
        )}
      </nav>
    </header>
  )
}
