import './mockups.css'

const cards = [
  {
    id: 'a',
    name: 'Wasdale',
    blurb: 'Full-bleed Lake District — Wasdale Head & Great Gable.',
    href: '/mockups/a',
    image: '/heroes/lakes-wasdale.jpg',
    layout: 'Full bleed',
  },
  {
    id: 'e',
    name: 'Langdale',
    blurb: 'Full-bleed Lake District — Langdale Pikes (sharp wide shot).',
    href: '/mockups/e',
    image: '/heroes/lakes-langdale.jpg',
    layout: 'Full bleed',
  },
  {
    id: 'h',
    name: 'Kinder',
    blurb: 'Split layout — Peak District, Kinder Scout.',
    href: '/mockups/h',
    image: '/heroes/peak-kinder.jpg',
    layout: 'Split',
  },
  {
    id: 'i',
    name: 'Wasdale split',
    blurb: 'Same Wasdale photo as A, in the H split layout.',
    href: '/mockups/i',
    image: '/heroes/lakes-wasdale.jpg',
    layout: 'Split',
  },
  {
    id: 'j',
    name: 'Glencoe split',
    blurb: 'Split layout — Buachaille Etive Mòr, Glencoe.',
    href: '/mockups/j',
    image: '/heroes/glencoe-buachaille.jpg',
    layout: 'Split',
  },
]

export function MockupsGallery() {
  return (
    <main className="mu-gallery">
      <header className="mu-gallery__intro">
        <span>Homepage · A & H shortlist</span>
        <h1>Full bleed or split.</h1>
        <p>
          F and G are gone. These keep the two directions you liked — sharp UK
          range photos only.
        </p>
      </header>

      <div className="mu-gallery__grid">
        <a className="mu-gallery__card" href="/mockups/forecasts">
          <div className="mu-gallery__swatch mu-gallery__swatch--forecast" aria-hidden="true">
            <strong>FX</strong>
          </div>
          <div className="mu-gallery__meta">
            <strong>Forecasts · layout shortlist</strong>
            <span>Three forecast page layouts to compare.</span>
            <small>Open gallery →</small>
          </div>
        </a>
        {cards.map((card) => (
          <a key={card.id} className="mu-gallery__card" href={card.href}>
            <div
              className="mu-gallery__swatch"
              style={{
                background: `linear-gradient(180deg, transparent, rgb(31 36 24 / 45%)), url(${card.image}) center/cover`,
              }}
              aria-hidden="true"
            />
            <div className="mu-gallery__meta">
              <strong>
                {card.id.toUpperCase()} · {card.name}
              </strong>
              <span>
                {card.layout} · {card.blurb}
              </span>
              <small>Open mockup →</small>
            </div>
          </a>
        ))}
      </div>
    </main>
  )
}
