import { useEffect, useId, useState } from 'react'
import { AtlasSearch } from './AtlasSearch'
import { loadUser } from '../data/auth'
import { useAuthModal } from './AuthModal'

export function SiteHeader() {
  const path = window.location.pathname
  const user = loadUser()
  const { openAuth } = useAuthModal()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className={`site-header ${menuOpen ? 'is-menu-open' : ''}`}>
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

      <button
        type="button"
        className="site-header__menu-btn"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? 'Close' : 'Menu'}
      </button>

      <nav
        id={menuId}
        className="site-nav"
        aria-label="Main navigation"
      >
        <a className={path === '/' ? 'active' : ''} href="/" onClick={closeMenu}>
          Home
        </a>
        <a
          className={path === '/map' ? 'active' : ''}
          href="/map"
          onClick={closeMenu}
        >
          Map
        </a>
        <a
          className={path === '/bothies' ? 'active' : ''}
          href="/bothies"
          onClick={closeMenu}
        >
          Bothies
        </a>
        <a
          className={path === '/camping' || path === '/pitching' ? 'active' : ''}
          href="/pitching"
          onClick={closeMenu}
        >
          Pitching
        </a>
        <a
          className={path === '/forecasts' || path === '/weather' ? 'active' : ''}
          href="/forecasts"
          onClick={closeMenu}
        >
          Forecasts
        </a>
        <a
          className={path === '/hikes' || path.startsWith('/hikes/') ? 'active' : ''}
          href="/hikes"
          onClick={closeMenu}
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
          onClick={closeMenu}
        >
          Checklists
        </a>
        {user ? (
          <a
            className={
              path === '/explore' || path.startsWith('/posts/') ? 'active' : ''
            }
            href="/explore"
            onClick={closeMenu}
          >
            Explore
          </a>
        ) : null}
        {user ? (
          <a
            className={`nav-account ${path.startsWith('/account') ? 'active' : ''}`}
            href="/account"
            onClick={closeMenu}
          >
            Account
          </a>
        ) : (
          <button
            className="nav-account"
            type="button"
            onClick={() => {
              closeMenu()
              openAuth('login', path === '/' ? '/account' : path)
            }}
          >
            Log in
          </button>
        )}
      </nav>
    </header>
  )
}
