import { useEffect, useMemo, useState } from 'react'
import {
  PitchingMap,
  usePitchPinEditor,
  type PendingPitchDrop,
} from '../components/PitchingMap'
import { LoginPrompt } from '../components/LoginPrompt'
import { SiteHeader } from '../components/SiteHeader'
import { areas } from '../data/areas'
import { loadUser } from '../data/auth'
import {
  acceptCampingDisclaimer,
  campingGuidanceByNation,
  hasAcceptedCampingDisclaimer,
} from '../data/campingGuidance'
import {
  loadPrivatePitchPins,
  upsertPrivatePitchPin,
  type PrivatePitchPin,
} from '../data/privatePitchPins'

const campingAreas = areas

export function CampingMapPage() {
  const params = new URLSearchParams(window.location.search)
  const initialArea =
    campingAreas.find((area) => area.slug === params.get('area'))?.slug ??
    'lake-district'

  const [accepted, setAccepted] = useState(hasAcceptedCampingDisclaimer)
  const [areaSlug, setAreaSlug] = useState(initialArea)
  const [dropMode, setDropMode] = useState(false)
  const [pendingDrop, setPendingDrop] = useState<PendingPitchDrop | null>(null)
  const [pins, setPins] = useState<PrivatePitchPin[]>(() => loadPrivatePitchPins())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const user = loadUser()
  const canPin = Boolean(user)
  const pinReturnTo = `/pitching?area=${areaSlug}`

  // Keep the URL in sync so /pitching and /pitching?area=lake-district match.
  useEffect(() => {
    const url = new URL(window.location.href)
    if (url.pathname === '/pitching' && url.searchParams.get('area') === areaSlug) {
      return
    }
    url.pathname = '/pitching'
    url.searchParams.set('area', areaSlug)
    window.history.replaceState({}, '', url)
  }, [areaSlug])

  useEffect(() => {
    if (canPin) return
    setDropMode(false)
    setPendingDrop(null)
    setSelectedId(null)
  }, [canPin])

  useEffect(() => {
    if (!canPin || !pendingDrop || pendingDrop.measuring) return
    const created = upsertPrivatePitchPin({
      id: crypto.randomUUID(),
      lng: pendingDrop.lng,
      lat: pendingDrop.lat,
      label: '',
      notes: '',
      pitchedBefore: false,
      pathDistanceM: pendingDrop.pathDistanceM,
    })
    setPins(loadPrivatePitchPins())
    setSelectedId(created.id)
    setPendingDrop(null)
    setDropMode(false)
  }, [pendingDrop, canPin])

  const selected = useMemo(
    () => pins.find((pin) => pin.id === selectedId) ?? null,
    [pins, selectedId],
  )
  const editor = usePitchPinEditor(selected, (next) => {
    setPins(next)
  })

  if (!accepted) {
    return (
      <main className="camping-page">
        <SiteHeader />
        <section className="camping-gate" aria-labelledby="camping-gate-title">
          <div className="camping-gate__card">
            <span className="eyebrow">Camping tool</span>
            <h1 id="camping-gate-title">ATTENTION: Before you open the map</h1>
            <p>
              This map is designed to help you find an ideal location for an overnight camp. It is important to comply with the local laws and regulations in the area you are pitching in.
            </p>
            <ul className="camping-gate__rules">
              <li>Leave no trace.</li>
              <li>Pitch up late, pack up early.</li>
              <li>Stay clear from the path.</li>
              <li>Respect the land and local communities. No fires, no excessive noise, no littering.</li>
            </ul>
            <div className="camping-gate__links">
              {Object.values(campingGuidanceByNation).flatMap((item) =>
                item.links.slice(0, 1).map((link) => (
                  <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                )),
              )}
            </div>
            <button
              type="button"
              className="camping-gate__agree"
              onClick={() => {
                acceptCampingDisclaimer()
                setAccepted(true)
              }}
            >
              Agree and open map
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="camping-page">
      <SiteHeader />
      <section className="camping-layout">
        <aside className="camping-sidebar">
          <span className="eyebrow">Camping tool</span>
          <h1>Find flatter ground</h1>
          <p>
            Use our camping tool to find an ideal location for an overnight camp. The colour gradient shows the topography and how flat the ground is. 
            It doesn't guarantee a perfect pitch, but it will give you a good idea of where to start. Doesnt take into account surface type.
          </p>

          <label className="camping-field">
            Region
            <select
              value={areaSlug}
              onChange={(event) => {
                const next = event.target.value
                setAreaSlug(next)
                const url = new URL(window.location.href)
                url.searchParams.set('area', next)
                window.history.replaceState({}, '', url)
              }}
            >
              {campingAreas.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <div className="camping-pin-tools">
            {canPin ? (
              <>
                <button
                  type="button"
                  className={dropMode ? 'camping-tool is-active' : 'camping-tool'}
                  onClick={() => setDropMode((value) => !value)}
                >
                  {dropMode ? 'Click the map to drop a pin…' : 'Save a private pin'}
                </button>
                <p className="camping-pin-tools__hint">
                  Pins remain private and only visible to you.
                </p>
              </>
            ) : (
              <LoginPrompt
                className="camping-pin-gate"
                returnTo={pinReturnTo}
                description="Sign in to drop private pitching pins on the map."
              />
            )}
          </div>

          {canPin && editor.draft ? (
            <div className="camping-pin-editor">
              <h2>Private pin</h2>
              <label className="camping-field">
                Label
                <input
                  value={editor.draft.label}
                  onChange={(event) =>
                    editor.setDraft({
                      ...editor.draft!,
                      label: event.target.value,
                    })
                  }
                />
              </label>
              <label className="camping-field">
                Notes
                <textarea
                  rows={3}
                  value={editor.draft.notes}
                  onChange={(event) =>
                    editor.setDraft({
                      ...editor.draft!,
                      notes: event.target.value,
                    })
                  }
                />
              </label>
              <label className="camping-check">
                <input
                  type="checkbox"
                  checked={editor.draft.pitchedBefore}
                  onChange={(event) =>
                    editor.setDraft({
                      ...editor.draft!,
                      pitchedBefore: event.target.checked,
                    })
                  }
                />
                I’ve pitched here before
              </label>
              <label className="camping-field">
                Private photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void editor.onImage(file)
                    event.target.value = ''
                  }}
                />
              </label>
              {editor.imageError ? (
                <p className="image-error">{editor.imageError}</p>
              ) : null}
              {editor.draft.imageDataUrl ? (
                <img
                  className="camping-pin-photo"
                  src={editor.draft.imageDataUrl}
                  alt=""
                />
              ) : null}
              <div className="camping-pin-editor__actions">
                <button type="button" className="camping-tool" onClick={editor.save}>
                  Save
                </button>
                <button
                  type="button"
                  className="camping-tool camping-tool--ghost"
                  onClick={() => {
                    editor.remove()
                    setSelectedId(null)
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ) : null}

          {canPin && pins.length > 0 ? (
            <div className="camping-pin-list">
              <h2>Your pins</h2>
              <ul>
                {pins.map((pin) => (
                  <li key={pin.id}>
                    <button
                      type="button"
                      className={
                        pin.id === selectedId
                          ? 'camping-pin-list__item is-selected'
                          : 'camping-pin-list__item'
                      }
                      onClick={() => setSelectedId(pin.id)}
                    >
                      <strong>{pin.label}</strong>
                      <span>
                        {pin.pitchedBefore ? 'Pitched · ' : ''}
                        {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>

        <PitchingMap
          areaSlug={areaSlug}
          dropMode={canPin && dropMode}
          pinsEnabled={canPin}
          selectedPinId={canPin ? selectedId : null}
          onPinsChange={canPin ? setPins : undefined}
          onSelectPin={
            canPin
              ? (pin) => {
                  setSelectedId(pin?.id ?? null)
                  if (pin) setDropMode(false)
                }
              : undefined
          }
          pendingDrop={canPin ? pendingDrop : null}
          onPendingDrop={canPin ? setPendingDrop : () => {}}
        />
      </section>
    </main>
  )
}
