import { setPrefersMobileBrowser } from '../lib/device'

const APP_STORE_URL = (import.meta.env.VITE_APP_STORE_URL as string | undefined)?.trim()
const PLAY_STORE_URL = (import.meta.env.VITE_PLAY_STORE_URL as string | undefined)?.trim()

export function MobileAppGate({ onContinue }: { onContinue: () => void }) {
  const continueInBrowser = () => {
    setPrefersMobileBrowser(true)
    onContinue()
  }

  return (
    <main className="mobile-gate">
      <div className="mobile-gate__inner">
        <img
          className="mobile-gate__mark"
          src="/field-atlas-mark.png"
          alt=""
          width={72}
          height={72}
        />
        <span className="eyebrow">Field Atlas</span>
        <h1>Get the free app.</h1>
        <p>Built for the hills. Or keep going in your browser for now.</p>
        <div className="mobile-gate__stores">
          {APP_STORE_URL ? (
            <a className="mobile-gate__store" href={APP_STORE_URL}>
              App Store
              <small>Download</small>
            </a>
          ) : (
            <button type="button" className="mobile-gate__store" disabled>
              App Store
              <small>Coming soon</small>
            </button>
          )}
          {PLAY_STORE_URL ? (
            <a className="mobile-gate__store" href={PLAY_STORE_URL}>
              Google Play
              <small>Download</small>
            </a>
          ) : (
            <button type="button" className="mobile-gate__store" disabled>
              Google Play
              <small>Coming soon</small>
            </button>
          )}
        </div>
        <button
          type="button"
          className="mobile-gate__browser"
          onClick={continueInBrowser}
        >
          Continue with browser
        </button>
      </div>
    </main>
  )
}
