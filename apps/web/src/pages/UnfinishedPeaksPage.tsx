import { useMemo, useState } from 'react'
import { SiteHeader } from '../components/SiteHeader'
import { useAuthModal } from '../components/AuthModal'
import { areas } from '../data/areas'
import { loadUser } from '../data/auth'
import {
  countMatches,
  defaultGeneratorPrefs,
  goalLabel,
  listOptionsForAreas,
  pickGeneratedHike,
  unfinishedCountForAreas,
  type GeneratorGoal,
  type GeneratorPrefs,
  type RankedHike,
} from '../data/hikeFinder'
import { providerLinks } from '../data/hikes'
import { loadLogs } from '../data/logs'

type Step = 'region' | 'list' | 'result'

export function UnfinishedPeaksPage() {
  const user = useMemo(() => loadUser(), [])
  const { openAuth } = useAuthModal()
  const logs = useMemo(() => (user ? loadLogs() : {}), [user])
  const [step, setStep] = useState<Step>('region')
  const [prefs, setPrefs] = useState<GeneratorPrefs>({
    ...defaultGeneratorPrefs,
    goal: { kind: 'remaining' },
  })
  const [picked, setPicked] = useState<RankedHike | null>(null)
  const [rolled, setRolled] = useState(0)

  const matchCount = countMatches(prefs, logs)
  const selectedNames = areas
    .filter((area) => prefs.areaSlugs.includes(area.slug))
    .map((area) => area.name)
  const listOptions = useMemo(
    () => listOptionsForAreas(prefs.areaSlugs),
    [prefs.areaSlugs],
  )
  const unfinishedAll = unfinishedCountForAreas(prefs.areaSlugs, logs)

  const toggleArea = (slug: string) => {
    setPrefs((current) => {
      const exists = current.areaSlugs.includes(slug)
      const areaSlugs = exists
        ? current.areaSlugs.filter((item) => item !== slug)
        : [...current.areaSlugs, slug]
      return {
        ...current,
        areaSlugs,
        goal: { kind: 'remaining' },
        excludeIds: [],
      }
    })
    setPicked(null)
  }

  const setGoal = (goal: GeneratorGoal) => {
    const next = { ...prefs, goal, excludeIds: [] }
    setPrefs(next)
    const result = pickGeneratedHike(next, logs)
    setPicked(result)
    setRolled((count) => count + 1)
    setStep('result')
  }

  const reroll = () => {
    if (!picked) {
      setGoal(prefs.goal)
      return
    }
    const next = {
      ...prefs,
      excludeIds: [...prefs.excludeIds, picked.hike.id],
    }
    setPrefs(next)
    setPicked(pickGeneratedHike(next, logs))
    setRolled((count) => count + 1)
  }

  const restart = () => {
    setPrefs({
      ...defaultGeneratorPrefs,
      goal: { kind: 'remaining' },
    })
    setPicked(null)
    setRolled(0)
    setStep('region')
  }

  const regionSummary =
    selectedNames.length <= 2
      ? selectedNames.join(' · ')
      : `${selectedNames.length} regions`

  return (
    <main className="soft-page">
      <SiteHeader />

      <section className="soft-shell soft-shell--wide hike-generator">
        <header className="soft-hero">
          <p className="soft-kicker">Unfinished peaks</p>
          <h1>What still needs ticking?</h1>
          <p>
            Choose a region, then pick a list — or every unfinished summit in
            that area. We only draw single-summit days for peaks you haven’t
            done, so the tick list matches the walk.
          </p>
          <p className="hike-note">
            <a className="account-text-link" href="/hikes">
              ← All hike options
            </a>
            {!user && (
              <>
                {' · '}
                <button
                  className="account-text-link"
                  type="button"
                  onClick={() =>
                    openAuth(
                      'login',
                      window.location.pathname + window.location.search,
                    )
                  }
                >
                  Sign in
                </button>{' '}
                so this uses your checklist.
              </>
            )}
          </p>
        </header>

        {step !== 'result' && (
          <ol className="hike-steps" aria-label="Unfinished peaks steps">
            <li className={step === 'region' ? 'is-active' : 'is-done'}>
              <span>1</span> Region
            </li>
            <li className={step === 'list' ? 'is-active' : ''}>
              <span>2</span> List
            </li>
          </ol>
        )}

        {step === 'region' && (
          <section className="hike-step" aria-labelledby="bag-region-title">
            <div className="hike-step__copy">
              <h2 id="bag-region-title">Where are you bagging?</h2>
              <p>Select one or more areas — Lake District for Wainwrights, and so on.</p>
            </div>
            <div className="hike-choice-grid">
              {areas.map((area) => {
                const selected = prefs.areaSlugs.includes(area.slug)
                const unfinished = unfinishedCountForAreas([area.slug], logs)
                return (
                  <button
                    key={area.slug}
                    type="button"
                    className={`hike-choice ${selected ? 'is-selected' : ''}`}
                    aria-pressed={selected}
                    onClick={() => toggleArea(area.slug)}
                  >
                    <strong>{area.name}</strong>
                    <span>
                      {user
                        ? `${unfinished.remaining} of ${unfinished.total} open`
                        : `${unfinished.total} tracked peaks`}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="hike-generate-row">
              <button
                className="primary-link hike-generate"
                type="button"
                onClick={() => setStep('list')}
                disabled={!prefs.areaSlugs.length}
              >
                Continue
              </button>
              <span>
                {prefs.areaSlugs.length
                  ? `${regionSummary} · ${unfinishedAll.remaining} still open`
                  : 'Pick at least one region'}
              </span>
            </div>
          </section>
        )}

        {step === 'list' && (
          <section className="hike-step" aria-labelledby="bag-list-title">
            <div className="hike-step__copy">
              <button
                className="hike-back"
                type="button"
                onClick={() => setStep('region')}
              >
                ← Regions
              </button>
              <h2 id="bag-list-title">Which list?</h2>
              <p>
                Drawing from <strong>{regionSummary}</strong>
                {user
                  ? ` · ${unfinishedAll.remaining} unfinished overall`
                  : ''}
                .
              </p>
            </div>
            <div className="hike-choice-grid hike-choice-grid--tight">
              <button
                type="button"
                className="hike-choice"
                onClick={() => setGoal({ kind: 'remaining' })}
                disabled={Boolean(user) && unfinishedAll.remaining === 0}
              >
                <strong>Any unfinished peak</strong>
                <span>
                  {user
                    ? unfinishedAll.remaining
                      ? `${unfinishedAll.remaining} summit${
                          unfinishedAll.remaining === 1 ? '' : 's'
                        } still open`
                      : 'Everything in these regions is done'
                    : 'All tracked summits in range'}
                </span>
              </button>
              {listOptions.map(({ list, peakCount }) => {
                const unfinished = unfinishedCountForAreas(
                  prefs.areaSlugs,
                  logs,
                  list,
                )
                const empty = Boolean(user) && unfinished.remaining === 0
                return (
                  <button
                    key={list}
                    type="button"
                    className="hike-choice"
                    onClick={() => setGoal({ kind: 'list', list })}
                    disabled={empty}
                  >
                    <strong>{list}</strong>
                    <span>
                      {user
                        ? empty
                          ? `All ${peakCount} done`
                          : `${unfinished.remaining} of ${peakCount} still to tick`
                        : `${peakCount} summits in range`}
                    </span>
                  </button>
                )
              })}
            </div>
            {matchCount === 0 && prefs.areaSlugs.length > 0 && (
              <p className="hike-note">
                No routes currently cover unfinished peaks for that mix — try
                another region or tick fewer on the checklist.
              </p>
            )}
          </section>
        )}

        {step === 'result' && (
          <section className="hike-result" aria-live="polite">
            <div className="hike-result__toolbar">
              <span className="eyebrow">
                {rolled ? `Draw ${rolled}` : 'Your walk'} · {regionSummary} ·{' '}
                {goalLabel(prefs.goal)}
              </span>
              <div className="hike-result__actions">
                <button className="text-link" type="button" onClick={reroll}>
                  Try another
                </button>
                <button className="text-link" type="button" onClick={restart}>
                  Start over
                </button>
              </div>
            </div>

            {!picked ? (
              <div className="hike-empty">
                <strong>No unfinished-peak route matched.</strong>
                <span>
                  Try another list, or open the random generator for any walk.
                </span>
                <a className="primary-link" href="/hikes/generator">
                  Random generator
                </a>
              </div>
            ) : (
              <article className="hike-feature">
                <header>
                  <span className="eyebrow">
                    {picked.areaName} · {picked.hike.difficulty}
                    {picked.hike.source === 'curated'
                      ? ' · classic'
                      : ' · summit day'}
                  </span>
                  <h2>{picked.hike.name}</h2>
                  <p>{picked.hike.summary}</p>
                </header>

                <dl>
                  <div>
                    <dt>Time</dt>
                    <dd>{picked.hike.hours} h</dd>
                  </div>
                  <div>
                    <dt>Ascent</dt>
                    <dd>{picked.hike.ascent} m</dd>
                  </div>
                  <div>
                    <dt>Distance</dt>
                    <dd>{picked.hike.distanceKm} km</dd>
                  </div>
                  <div>
                    <dt>Shape</dt>
                    <dd>{picked.hike.shape}</dd>
                  </div>
                </dl>

                <div className="hike-reasons">
                  {picked.reasons.map((reason) => (
                    <span key={reason}>{reason}</span>
                  ))}
                </div>

                {picked.remainingNames.length > 0 && (
                  <p className="hike-peaks">
                    {prefs.goal.kind === 'list'
                      ? `Unfinished ${prefs.goal.list}: `
                      : 'Still to tick: '}
                    {picked.remainingNames.join(', ')}
                  </p>
                )}

                <div className="hike-card__actions">
                  {(() => {
                    const links = providerLinks(picked.hike)
                    return (
                      <>
                        {links.allTrails ? (
                          <a
                            className="provider-btn provider-btn--alltrails"
                            href={links.allTrails.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            AllTrails
                          </a>
                        ) : null}
                        {links.osMaps ? (
                          <a
                            className="provider-btn provider-btn--osmaps"
                            href={links.osMaps.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            OS Maps
                          </a>
                        ) : null}
                        {links.other ? (
                          <a
                            className="provider-btn provider-btn--other"
                            href={links.other.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {links.other.label}
                          </a>
                        ) : null}
                        <a
                          className="text-link"
                          href={`/checklists/${picked.hike.areaSlug}`}
                        >
                          Open checklist
                        </a>
                      </>
                    )
                  })()}
                </div>
              </article>
            )}
          </section>
        )}
      </section>
    </main>
  )
}
