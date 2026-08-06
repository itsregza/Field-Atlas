import { useEffect, useId, useRef, useState } from 'react'
import { AtlasSearch } from './AtlasSearch'
import { bootstrapSession, loadUser, type MockUser } from '../data/auth'
import { useAuthModal } from './AuthModal'

type NavItem = {
  label: string
  href?: string
  disabled?: boolean
}

function NavDropdown({
  label,
  active,
  items,
  onNavigate,
  flat,
}: {
  label: string
  active: boolean
  items: NavItem[]
  onNavigate: () => void
  flat?: boolean
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open || flat) return
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, flat])

  if (flat) {
    return (
      <div className={`site-nav__drop site-nav__drop--flat ${active ? 'is-active' : ''}`}>
        <span className="site-nav__group-label">{label}</span>
        {items.map((item) =>
          item.disabled || !item.href ? (
            <span key={item.label} className="site-nav__drop-soon" role="menuitem">
              {item.label}
              <small>Soon</small>
            </span>
          ) : (
            <a
              key={item.label}
              role="menuitem"
              href={item.href}
              onClick={() => onNavigate()}
            >
              {item.label}
            </a>
          ),
        )}
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className={`site-nav__drop ${active ? 'is-active' : ''} ${open ? 'is-open' : ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="site-nav__drop-btn"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
      >
        {label}
      </button>
      <div id={menuId} className="site-nav__drop-menu" role="menu" hidden={!open}>
        <div className="site-nav__drop-menu-inner">
          {items.map((item) =>
            item.disabled || !item.href ? (
              <span key={item.label} className="site-nav__drop-soon" role="menuitem">
                {item.label}
                <small>Soon</small>
              </span>
            ) : (
              <a
                key={item.label}
                role="menuitem"
                href={item.href}
                onClick={() => {
                  setOpen(false)
                  onNavigate()
                }}
              >
                {item.label}
              </a>
            ),
          )}
        </div>
      </div>
    </div>
  )
}

export function SiteHeader() {
  const path = window.location.pathname
  const [user, setUser] = useState<MockUser | null>(() => loadUser())
  const { openAuth } = useAuthModal()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()

  useEffect(() => {
    let cancelled = false
    void bootstrapSession().then((session) => {
      if (!cancelled) setUser(session.user)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  const mapsActive =
    path === '/map' || path === '/bothies' || path === '/pitching' || path === '/camping'
  const hikingActive =
    path === '/hikes' || path.startsWith('/hikes/') || path === '/hikes/multi-day'

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

      <nav id={menuId} className="site-nav" aria-label="Main navigation">
        <a className={path === '/' ? 'active' : ''} href="/" onClick={closeMenu}>
          Home
        </a>

        <NavDropdown
          label="Maps"
          active={mapsActive}
          onNavigate={closeMenu}
          flat={menuOpen}
          items={[
            { label: 'UK Map', href: '/map' },
            { label: 'Pitching Map', href: '/pitching' },
            { label: 'Bothies', href: '/bothies' },
          ]}
        />

        <NavDropdown
          label="Hiking"
          active={hikingActive}
          onNavigate={closeMenu}
          flat={menuOpen}
          items={[
            { label: 'Find a hike', href: '/hikes/generator' },
            { label: 'Unfinished peaks', href: '/hikes/unfinished' },
            { label: 'Multi-day hikes', href: '/hikes/multi-day' },
          ]}
        />

        <a
          className={path === '/forecasts' || path === '/weather' ? 'active' : ''}
          href="/forecasts"
          onClick={closeMenu}
        >
          Forecasts
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
          onClick={(event) => {
            if (user) {
              closeMenu()
              return
            }
            event.preventDefault()
            closeMenu()
            openAuth('login', '/checklists')
          }}
        >
          Checklists
        </a>
        {user ? (
          <a
            className={`nav-explore ${path === '/explore' || path.startsWith('/posts/') ? 'active' : ''}`}
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
