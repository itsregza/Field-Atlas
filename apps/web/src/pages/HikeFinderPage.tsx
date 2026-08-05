import { useMemo, useState } from 'react'
import {
  SharePostModal,
  type SharePostDefaults,
} from '../components/SharePostModal'
import { SiteHeader } from '../components/SiteHeader'
import { areas } from '../data/areas'
import { apiEnabled } from '../data/api'
import { loadUser } from '../data/auth'
import {
  countMatches,
  defaultGeneratorPrefs,
  hikeCountForArea,
  pickGeneratedHike,
  type CampingChoice,
  type GeneratorPrefs,
  type RankedHike,
} from '../data/hikeFinder'
import { providerLinks, type Difficulty } from '../data/hikes'
import { loadLogs } from '../data/logs'

type Step = 'region' | 'difficulty' | 'camping' | 'result'

const difficulties: Array<{
  value: Difficulty | 'any'
  label: string
  hint: string
}> = [
  { value: 'any', label: 'Surprise me', hint: 'Any grade that fits' },
  { value: 'easy', label: 'Easy', hint: 'Short days, steady paths' },
  { value: 'moderate', label: 'Moderate', hint: 'A solid hill day' },
  { value: 'hard', label: 'Hard', hint: 'Big ascent or serious ground' },
  { value: 'extreme', label: 'Extreme', hint: 'Exposed, long or committing' },
]

const campingOptions: Array<{
  value: CampingChoice
  label: string
  hint: string
}> = [
  {
    value: 'either',
    label: 'Either',
    hint: 'Day walk or overnight — dealer’s choice',
  },
  {
    value: 'yes',
    label: 'Yes',
    hint: 'Lean toward routes that suit a night out',
  },
  {
    value: 'no',
    label: 'No',
    hint: 'Keep it to a day walk',
  },
]

export function HikeFinderPage() {
  const user = useMemo(() => loadUser(), [])
  const logs = useMemo(() => (user ? loadLogs() : {}), [user])
  const [step, setStep] = useState<Step>('region')
  const [prefs, setPrefs] = useState<GeneratorPrefs>({
    ...defaultGeneratorPrefs,
    goal: { kind: 'any' },
  })
  const [picked, setPicked] = useState<RankedHike | null>(null)
  const [rolled, setRolled] = useState(0)
  const [shareDefaults, setShareDefaults] = useState<SharePostDefaults | null>(
    null,
  )

  const matchCount = countMatches(prefs, logs)
  const selectedNames = areas
    .filter((area) => prefs.areaSlugs.includes(area.slug))
    .map((area) => area.name)

  const toggleArea = (slug: string) => {
    setPrefs((current) => {
      const exists = current.areaSlugs.includes(slug)
      const areaSlugs = exists
        ? current.areaSlugs.filter((item) => item !== slug)
        : [...current.areaSlugs, slug]
      return { ...current, areaSlugs, excludeIds: [] }
    })
    setPicked(null)
  }

  const continueFromRegions = () => {
    if (!prefs.areaSlugs.length) return
    setStep('difficulty')
  }

  const setDifficulty = (difficulty: Difficulty | 'any') => {
    setPrefs((current) => ({ ...current, difficulty, excludeIds: [] }))
    setPicked(null)
    setStep('camping')
  }

  const setCamping = (campingNight: CampingChoice) => {
    setPrefs((current) => ({ ...current, campingNight, excludeIds: [] }))
    setPicked(null)
  }

  const generate = (nextPrefs: GeneratorPrefs = prefs) => {
    const result = pickGeneratedHike(nextPrefs, logs)
    setPrefs(nextPrefs)
    setPicked(result)
    setRolled((count) => count + 1)
    setStep('result')
  }

  const reroll = () => {
    if (!picked) {
      generate()
      return
    }
    generate({
      ...prefs,
      excludeIds: [...prefs.excludeIds, picked.hike.id],
    })
  }

  const restart = () => {
    setPrefs({ ...defaultGeneratorPrefs, goal: { kind: 'any' } })
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
          <p className="soft-kicker">Hike generator</p>
          <h1>Pick a few choices. Get a walk.</h1>
          <p>
            Choose a region, set the grade, and say whether a camping night is
            on the cards. We’ll draw a route and open AllTrails or OS Maps when
            we can match a published walk nearby.
          </p>
          <p className="hike-note">
            <a className="account-text-link" href="/hikes">
              ← All hike options
            </a>
            {' · '}
            <a className="account-text-link" href="/hikes/unfinished">
              Looking for unfinished peaks?
            </a>
          </p>
        </header>

        {step !== 'result' && (
          <ol className="hike-steps" aria-label="Generator steps">
            <li className={step === 'region' ? 'is-active' : 'is-done'}>
              <span>1</span> Region
            </li>
            <li
              className={
                step === 'difficulty'
                  ? 'is-active'
                  : step === 'camping'
                    ? 'is-done'
                    : ''
              }
            >
              <span>2</span> Difficulty
            </li>
            <li className={step === 'camping' ? 'is-active' : ''}>
              <span>3</span> Camping
            </li>
          </ol>
        )}

        {step === 'region' && (
          <section className="hike-step" aria-labelledby="region-title">
            <div className="hike-step__copy">
              <h2 id="region-title">Where are you heading?</h2>
              <p>Select one or more mountain areas for the draw.</p>
            </div>
            <div className="hike-choice-grid">
              {areas.map((area) => {
                const selected = prefs.areaSlugs.includes(area.slug)
                const routes = hikeCountForArea(area.slug)
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
                      {area.nation} · {routes} route{routes === 1 ? '' : 's'}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="hike-generate-row">
              <button
                className="primary-link hike-generate"
                type="button"
                onClick={continueFromRegions}
                disabled={!prefs.areaSlugs.length}
              >
                Continue
              </button>
              <span>
                {prefs.areaSlugs.length
                  ? `${prefs.areaSlugs.length} region${
                      prefs.areaSlugs.length === 1 ? '' : 's'
                    } selected`
                  : 'Pick at least one region'}
              </span>
            </div>
          </section>
        )}

        {step === 'difficulty' && (
          <section className="hike-step" aria-labelledby="difficulty-title">
            <div className="hike-step__copy">
              <button
                className="hike-back"
                type="button"
                onClick={() => setStep('region')}
              >
                ← Regions
              </button>
              <h2 id="difficulty-title">How hard should it feel?</h2>
              <p>
                Drawing from <strong>{regionSummary}</strong>.
              </p>
            </div>
            <div className="hike-choice-grid hike-choice-grid--tight">
              {difficulties.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="hike-choice"
                  onClick={() => setDifficulty(option.value)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.hint}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {step === 'camping' && (
          <section className="hike-step" aria-labelledby="camping-title">
            <div className="hike-step__copy">
              <button
                className="hike-back"
                type="button"
                onClick={() => setStep('difficulty')}
              >
                ← Difficulty
              </button>
              <h2 id="camping-title">Camping night?</h2>
              <p>
                We won’t pin wild pitches — only whether the day suits an
                overnight nearby.
              </p>
            </div>
            <div className="hike-choice-grid hike-choice-grid--tight">
              {campingOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`hike-choice ${
                    prefs.campingNight === option.value ? 'is-selected' : ''
                  }`}
                  onClick={() => setCamping(option.value)}
                >
                  <strong>{option.label}</strong>
                  <span>{option.hint}</span>
                </button>
              ))}
            </div>
            <div className="hike-generate-row">
              <button
                className="primary-link hike-generate"
                type="button"
                onClick={() => generate()}
                disabled={matchCount === 0}
              >
                Generate my hike
              </button>
              <span>
                {matchCount
                  ? `${matchCount} route${matchCount === 1 ? '' : 's'} in range`
                  : 'No routes match — add a region or loosen a choice'}
              </span>
            </div>
          </section>
        )}

        {step === 'result' && (
          <section className="hike-result" aria-live="polite">
            <div className="hike-result__toolbar">
              <span className="eyebrow">
                {rolled ? `Draw ${rolled}` : 'Your walk'} · {regionSummary}
                {prefs.difficulty !== 'any' ? ` · ${prefs.difficulty}` : ''}
                {prefs.campingNight === 'yes'
                  ? ' · camping'
                  : prefs.campingNight === 'no'
                    ? ' · day walk'
                    : ''}
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
                <strong>Nothing matched that combination.</strong>
                <span>Start over and widen the regions or difficulty.</span>
                <button
                  className="primary-link"
                  type="button"
                  onClick={restart}
                >
                  Start over
                </button>
              </div>
            ) : (
              <article className="hike-feature">
                <header>
                  <span className="eyebrow">
                    {picked.areaName} · {picked.hike.difficulty}
                    {picked.hike.source === 'curated'
                      ? ' · classic'
                      : ' · summit day'}
                    {picked.hike.campingNight ? ' · overnight-friendly' : ''}
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
                    Remaining peaks: {picked.remainingNames.join(', ')}
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
                        {user && apiEnabled() ? (
                          <button
                            className="text-link"
                            type="button"
                            onClick={() =>
                              setShareDefaults({
                                hikeId: picked.hike.id,
                                hikeName: picked.hike.name,
                                areaSlug: picked.hike.areaSlug,
                                areaName: picked.areaName,
                              })
                            }
                          >
                            Share to feed
                          </button>
                        ) : null}
                      </>
                    )
                  })()}
                </div>
              </article>
            )}
          </section>
        )}
      </section>

      <SharePostModal
        open={Boolean(shareDefaults)}
        defaults={shareDefaults ?? undefined}
        onClose={() => setShareDefaults(null)}
      />
    </main>
  )
}
