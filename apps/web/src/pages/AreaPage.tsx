import { SiteHeader } from '../components/SiteHeader'
import { getAreaPeaks } from '../data/areaPeaks'
import { areas } from '../data/areas'
import { loadUser } from '../data/auth'
import { loadLogs } from '../data/logs'

const nations = ['England', 'Scotland', 'Wales', 'Northern Ireland'] as const

function formatPercent(done: number, total: number) {
  if (!total) return '0%'
  const exact = (done / total) * 100
  if (done > 0 && exact < 1) return '<1%'
  return `${Math.round(exact)}%`
}

/** Nation-grouped directory of summit checklists. */
export function TrackersDirectoryPage() {
  const user = loadUser()
  const logs = user ? loadLogs() : {}

  const progressBySlug = new Map(
    areas.map((area) => {
      const peaks = getAreaPeaks(area.slug)
      const done = peaks.filter((peak) => logs[peak.id]?.done).length
      return [
        area.slug,
        {
          done,
          total: peaks.length,
          percent: peaks.length ? Math.round((done / peaks.length) * 100) : 0,
          label: formatPercent(done, peaks.length),
        },
      ] as const
    }),
  )

  return (
    <main className="soft-page">
      <SiteHeader />
      <div className="soft-shell soft-shell--wide">
        <header className="soft-hero">
          <p className="soft-kicker">Summit checklists</p>
          <h1>Choose your range</h1>
          <p>
            Record completed peaks across every mapped UK mountain area. Your
            progress shows on each card.
          </p>
          <a className="account-pill-btn" href="/map">
            Open the UK map
          </a>
        </header>

        <div className="soft-groups">
          {nations.map((nation) => {
            const nationAreas = areas.filter((area) => area.nation === nation)
            if (!nationAreas.length) return null
            return (
              <section key={nation} className="account-card soft-group">
                <div className="account-card__head">
                  <h2>{nation}</h2>
                  <span className="account-muted">
                    {nationAreas.length} areas
                  </span>
                </div>
                <div className="soft-area-grid">
                  {nationAreas.map((area) => {
                    const progress = progressBySlug.get(area.slug)
                    const meterWidth = progress
                      ? Math.max(
                          progress.done > 0 ? 3 : 0,
                          Math.min(
                            100,
                            (progress.done / Math.max(progress.total, 1)) * 100,
                          ),
                        )
                      : 0

                    return (
                      <a
                        key={area.slug}
                        className="soft-area-card"
                        href={`/checklists/${area.slug}`}
                      >
                        <div className="soft-area-card__top">
                          <span>{area.kind}</span>
                          {progress ? <strong>{progress.label}</strong> : null}
                        </div>
                        <h3>{area.name}</h3>
                        <p>{area.summary}</p>
                        {progress ? (
                          <div className="soft-area-card__progress" aria-hidden="true">
                            <span className="soft-area-card__track">
                              <span
                                style={{
                                  width: `${meterWidth}%`,
                                  background: area.color,
                                }}
                              />
                            </span>
                            <small>
                              {progress.done} of {progress.total}
                            </small>
                          </div>
                        ) : null}
                      </a>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </main>
  )
}
