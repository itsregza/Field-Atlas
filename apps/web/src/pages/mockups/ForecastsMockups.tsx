import './mockups.css'

const sample = {
  peak: 'Scafell Pike',
  area: 'Lake District',
  height: 978,
  gridRef: 'NY 215 072',
  temp: 4,
  label: 'Overcast',
  cloudBase: 'Summit in cloud',
  wind: 'SW 28 mph',
  days: [
    { day: 'Today', hi: 6, lo: 2, note: '3h in cloud' },
    { day: 'Mon', hi: 5, lo: 1, note: 'Summit clear' },
    { day: 'Tue', hi: 7, lo: 3, note: '2h near cloud' },
    { day: 'Wed', hi: 4, lo: 0, note: '5h in cloud' },
    { day: 'Thu', hi: 6, lo: 2, note: '1h near cloud' },
    { day: 'Fri', hi: 8, lo: 4, note: 'Summit clear' },
    { day: 'Sat', hi: 7, lo: 3, note: 'Dry' },
  ],
}

function ForecastMockChrome({
  active,
  name,
}: {
  active: 'a' | 'b' | 'c'
  name: string
}) {
  const designs = [
    { id: 'a', label: 'A', href: '/mockups/forecasts/a', name: 'Split dashboard' },
    { id: 'b', label: 'B', href: '/mockups/forecasts/b', name: 'Magazine' },
    { id: 'c', label: 'C', href: '/mockups/forecasts/c', name: 'Compact explorer' },
  ] as const

  return (
    <div className="mu-chrome" role="navigation" aria-label="Forecast mockup switcher">
      <a href="/mockups/forecasts">Gallery</a>
      <span className="mu-chrome__label">
        {active.toUpperCase()} · {name}
      </span>
      <div className="mu-chrome__nav">
        {designs.map((design) => (
          <a
            key={design.id}
            href={design.href}
            className={design.id === active ? 'is-active' : undefined}
            title={design.name}
          >
            {design.label}
          </a>
        ))}
      </div>
    </div>
  )
}

export function ForecastsMockupsGallery() {
  const cards = [
    {
      id: 'a',
      name: 'Split dashboard',
      blurb: 'Sticky picker left, forecast hero and tabs right.',
      href: '/mockups/forecasts/a',
    },
    {
      id: 'b',
      name: 'Magazine',
      blurb: 'Full-width peak header with vertical day timeline.',
      href: '/mockups/forecasts/b',
    },
    {
      id: 'c',
      name: 'Compact explorer',
      blurb: 'Top picker bar, two-column forecast body.',
      href: '/mockups/forecasts/c',
    },
  ]

  return (
    <main className="mu-gallery">
      <header className="mu-gallery__intro">
        <span>Forecasts · layout shortlist</span>
        <h1>Three ways to lay out the week.</h1>
        <p>Same data and theme — pick a direction before we ship the live page.</p>
      </header>
      <div className="mu-gallery__grid">
        {cards.map((card) => (
          <a key={card.id} className="mu-gallery__card" href={card.href}>
            <div className="mu-gallery__swatch mu-gallery__swatch--forecast" aria-hidden="true">
              <strong>{card.id.toUpperCase()}</strong>
            </div>
            <div className="mu-gallery__meta">
              <strong>
                {card.id.toUpperCase()} · {card.name}
              </strong>
              <span>{card.blurb}</span>
              <small>Open mockup →</small>
            </div>
          </a>
        ))}
      </div>
    </main>
  )
}

export function ForecastMockA() {
  return (
    <>
      <ForecastMockChrome active="a" name="Split dashboard" />
      <main className="fm fm-a">
        <div className="fm-a__picker">
          <span className="fm__eyebrow">Find a peak</span>
          <input type="search" defaultValue="Scafell Pike" readOnly />
          <div className="fm-a__chips">
            {['Scafell Pike', 'Helvellyn', 'Snowdon'].map((name) => (
              <button key={name} type="button" className={name === sample.peak ? 'is-active' : ''}>
                {name}
              </button>
            ))}
          </div>
        </div>
        <div className="fm-a__detail">
          <header className="fm-a__head">
            <div>
              <span className="fm__eyebrow">{sample.area}</span>
              <h1>{sample.peak}</h1>
              <p>{sample.height} m · {sample.gridRef}</p>
            </div>
            <div className="fm-a__now">
              <strong>{sample.temp}°C</strong>
              <span>{sample.label}</span>
              <small>{sample.cloudBase}</small>
            </div>
          </header>
          <div className="fm-a__days">
            {sample.days.map((day, index) => (
              <button key={day.day} type="button" className={index === 0 ? 'is-active' : ''}>
                <strong>{day.day}</strong>
                <span>{day.hi}° / {day.lo}°</span>
                <small>{day.note}</small>
              </button>
            ))}
          </div>
          <div className="fm-a__hourly">
            <span>Hourly table scrolls here</span>
          </div>
        </div>
      </main>
    </>
  )
}

export function ForecastMockB() {
  return (
    <>
      <ForecastMockChrome active="b" name="Magazine" />
      <main className="fm fm-b">
        <header className="fm-b__hero">
          <span className="fm__eyebrow">{sample.area}</span>
          <h1>{sample.peak}</h1>
          <div className="fm-b__hero-stats">
            <div>
              <strong>{sample.temp}°C</strong>
              <span>{sample.label}</span>
            </div>
            <div>
              <strong>{sample.cloudBase}</strong>
              <span>Cloud base</span>
            </div>
            <div>
              <strong>{sample.wind}</strong>
              <span>Wind</span>
            </div>
          </div>
        </header>
        <div className="fm-b__timeline">
          {sample.days.map((day) => (
            <article key={day.day} className="fm-b__day">
              <strong>{day.day}</strong>
              <span>{day.hi}° / {day.lo}°</span>
              <small>{day.note}</small>
            </article>
          ))}
        </div>
      </main>
    </>
  )
}

export function ForecastMockC() {
  return (
    <>
      <ForecastMockChrome active="c" name="Compact explorer" />
      <main className="fm fm-c">
        <div className="fm-c__bar">
          <input type="search" defaultValue="Scafell Pike" readOnly />
          <select defaultValue="lake-district">
            <option value="lake-district">Lake District</option>
          </select>
        </div>
        <div className="fm-c__body">
          <section className="fm-c__summary">
            <span className="fm__eyebrow">{sample.area}</span>
            <h1>{sample.peak}</h1>
            <div className="fm-c__now">
              <strong>{sample.temp}°C</strong>
              <p>{sample.label} · {sample.cloudBase}</p>
            </div>
            <ul className="fm-c__week">
              {sample.days.map((day) => (
                <li key={day.day}>
                  <strong>{day.day}</strong>
                  <span>{day.hi}° / {day.lo}°</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="fm-c__hourly">
            <span>Hourly scroll panel</span>
          </section>
        </div>
      </main>
    </>
  )
}
