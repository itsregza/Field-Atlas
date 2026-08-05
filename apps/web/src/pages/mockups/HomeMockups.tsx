import type { CSSProperties } from 'react'
import { MockupChrome } from './MockupChrome'
import './mockups.css'

type RidgeProps = {
  id: 'a' | 'e' | 'h' | 'i' | 'j'
  name: string
  place: string
  image: string
  layout?: 'bottom' | 'split'
}

function RidgeMock({
  id,
  name,
  place,
  image,
  layout = 'bottom',
}: RidgeProps) {
  return (
    <div className={`mu-shell mu-a mu-a--${layout}`}>
      <MockupChrome active={id} name={name} />
      <header className="mu-a__nav">
        <a className="mu-a__brand" href="/mockups">
          <img src="/field-atlas-mark.png" alt="" />
          Field Atlas
        </a>
        <nav className="mu-a__nav-links" aria-label="Mock nav">
          <span>Feed</span>
          <span>Map</span>
          <span>Checklists</span>
          <span>Walkers</span>
        </nav>
      </header>

      {layout === 'split' ? (
        <section className="mu-a__hero mu-a__hero--split-dom">
          <div className="mu-a__hero-copy">
            <span className="mu-kicker">{place}</span>
            <h1>Field Atlas</h1>
            <p>
              Track your summits in private. Share the days worth keeping with
              walkers who know the wind.
            </p>
            <div className="mu-a__actions">
              <span className="mu-btn">Join the feed</span>
              <span className="mu-link">Browse walkers</span>
            </div>
          </div>
          <figure
            className="mu-a__hero-media"
            style={{ backgroundImage: `url('${image}')` } as CSSProperties}
            aria-hidden="true"
          />
        </section>
      ) : (
        <section
          className="mu-a__hero"
          style={{
            backgroundImage: `linear-gradient(180deg, transparent 22%, rgb(31 36 24 / 70%) 100%), url('${image}')`,
          }}
        >
          <div className="mu-a__hero-copy">
            <span className="mu-kicker">{place}</span>
            <h1>Field Atlas</h1>
            <p>
              Track your summits in private. Share the days worth keeping with
              walkers who know the wind.
            </p>
            <div className="mu-a__actions">
              <span className="mu-btn">Join the feed</span>
              <span className="mu-link">Browse walkers</span>
            </div>
          </div>
        </section>
      )}

      <section className="mu-a__strip">
        <article>
          <h2>Optional posts</h2>
          <p>A photo and a note — only when you choose to share.</p>
        </article>
        <article>
          <h2>Private rounds</h2>
          <p>Sixteen area checklists that stay yours until you post.</p>
        </article>
        <article>
          <h2>Other walkers</h2>
          <p>Public profiles of people already out on the hill.</p>
        </article>
      </section>
    </div>
  )
}

export function HomeMockA() {
  return (
    <RidgeMock
      id="a"
      name="Wasdale"
      place="Lake District · Wasdale Head"
      image="/heroes/lakes-wasdale.jpg"
      layout="bottom"
    />
  )
}

export function HomeMockE() {
  return (
    <RidgeMock
      id="e"
      name="Langdale"
      place="Lake District · Langdale Pikes"
      image="/heroes/lakes-langdale.jpg"
      layout="bottom"
    />
  )
}

export function HomeMockH() {
  return (
    <RidgeMock
      id="h"
      name="Kinder"
      place="Peak District · Kinder Scout"
      image="/heroes/peak-kinder.jpg"
      layout="split"
    />
  )
}

export function HomeMockI() {
  return (
    <RidgeMock
      id="i"
      name="Wasdale split"
      place="Lake District · Wasdale Head"
      image="/heroes/lakes-wasdale.jpg"
      layout="split"
    />
  )
}

export function HomeMockJ() {
  return (
    <RidgeMock
      id="j"
      name="Glencoe split"
      place="Scottish Highlands · Glencoe"
      image="/heroes/glencoe-buachaille.jpg"
      layout="split"
    />
  )
}
