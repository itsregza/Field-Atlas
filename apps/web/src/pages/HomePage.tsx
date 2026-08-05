import { useEffect, useState } from 'react'
import { AtlasSearch } from '../components/AtlasSearch'
import { useAuthModal } from '../components/AuthModal'
import { SiteHeader } from '../components/SiteHeader'
import { areas, type Area } from '../data/areas'
import { getAreaPeaks } from '../data/areaPeaks'
import { loadUser } from '../data/auth'
import { homeHeroShots, pickHomeHero } from '../data/homeHero'

const HERO_INTERVAL_MS = 10_000

const featuredSlugs = [
  'lake-district',
  'peak-district',
  'yorkshire-dales',
  'eryri',
  'bannau-brycheiniog',
  'cairngorms',
  'northwest-highlands',
  'loch-lomond-trossachs',
] as const

const nationOrder = ['England', 'Wales', 'Scotland'] as const

export function HomePage() {
  const user = loadUser()
  const { openAuth } = useAuthModal()
  const [index, setIndex] = useState(() => {
    const first = pickHomeHero()
    const found = homeHeroShots.findIndex((shot) => shot.src === first.src)
    return found >= 0 ? found : 0
  })
  const hero = homeHeroShots[index] ?? homeHeroShots[0]

  useEffect(() => {
    if (homeHeroShots.length < 2) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduceMotion.matches) return

    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % homeHeroShots.length)
    }, HERO_INTERVAL_MS)

    return () => window.clearInterval(id)
  }, [])

  const featured = featuredSlugs
    .map((slug) => {
      const area = areas.find((entry) => entry.slug === slug)
      if (!area) return null
      return { area, peaks: getAreaPeaks(area.slug).length }
    })
    .filter((item): item is { area: Area; peaks: number } => Boolean(item))

  const byNation = nationOrder.map((nation) => ({
    nation,
    ranges: featured.filter((item) => item.area.nation === nation),
  }))

  return (
    <main className="home-page home-page--bleed">
      <SiteHeader />

      <section className="home-hero-bleed" aria-label="Field Atlas">
        <div className="home-hero-bleed__media" aria-hidden="true">
          {homeHeroShots.map((shot, shotIndex) => (
            <div
              key={shot.src}
              className={
                shotIndex === index
                  ? 'home-hero-bleed__slide is-active'
                  : 'home-hero-bleed__slide'
              }
              style={{ backgroundImage: `url('${shot.src}')` }}
            />
          ))}
          <div className="home-hero-bleed__shade" />
        </div>

        <div className="home-hero-bleed__content">
          <span className="home-hero-bleed__place">{hero.place}</span>
          <h1>Field Atlas</h1>
          <p>Your atlas for the hills. The ultimate guide to the UK's mountains.</p>
          <AtlasSearch
            className="site-search--hero"
            placeholder="Search hikes, peaks, ranges and friends…"
          />
          <div className="home-hero-bleed__actions">
            <a className="home-hero-bleed__cta" href="/map">
              Explore the map
            </a>
            {user ? (
              <>
                <a className="home-hero-bleed__cta" href="/explore">
                  Open Explore
                </a>
                <a className="home-hero-bleed__cta" href="/account">
                  View your account
                </a>
              </>
            ) : (
              <button
                className="home-hero-bleed__cta"
                type="button"
                onClick={() => openAuth('register', '/account')}
              >
                Register for FREE
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="home-index" aria-labelledby="home-index-title">
        <div className="home-index__intro">
          <h2 id="home-index-title">Ranges</h2>
          <p>Choose a range and start exploring.</p>
        </div>

        <div className="home-index__nations">
          {byNation.map(({ nation, ranges }) =>
            ranges.length === 0 ? null : (
              <div key={nation} className="home-index__nation">
                <h3>{nation}</h3>
                <ul>
                  {ranges.map(({ area, peaks }) => (
                    <li key={area.slug}>
                      <a href={`/map?area=${area.slug}`}>
                        <span
                          className="home-index__swatch"
                          style={{ backgroundColor: area.color }}
                          aria-hidden="true"
                        />
                        <span className="home-index__name">{area.name}</span>
                        <span className="home-index__meta">
                          {peaks} peaks
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
        </div>

        <a className="home-index__map" href="/map">
          Full UK map
        </a>
      </section>

      <section className="home-app" aria-labelledby="home-app-title">
        <div className="home-app__copy">
          <h2 id="home-app-title">Get the app</h2>
          <p>
              The ultimate guide to the UK's mountains, built for the hills.
          </p>
          <div className="home-app__stores">
            <button type="button" className="home-app__store" disabled>
              App Store
              <small>Coming soon</small>
            </button>
            <button type="button" className="home-app__store" disabled>
              Google Play
              <small>Coming soon</small>
            </button>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <a className="site-footer__brand" href="/">
          <img src="/field-atlas-mark.png" alt="" />
          <strong>Field Atlas</strong>
        </a>
        <nav className="site-footer__links" aria-label="Footer">
          <a href="/map">Map</a>
          <a href="/bothies">Bothies</a>
          <a href="/pitching">Pitching</a>
          <a href="/forecasts">Forecasts</a>
          <a href="/hikes">Hikes</a>
          <a href="/checklists">Checklists</a>
          {user ? <a href="/explore">Explore</a> : null}
          {user ? (
            <a href="/account">Account</a>
          ) : (
            <button type="button" onClick={() => openAuth('login', '/account')}>
              Log in
            </button>
          )}
        </nav>
      </footer>
    </main>
  )
}
