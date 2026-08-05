import { setPrefersMobileBrowser } from '../lib/device'

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
          <button type="button" className="mobile-gate__store" disabled>
            App Store
            <small>Coming soon</small>
          </button>
          <button type="button" className="mobile-gate__store" disabled>
            Google Play
            <small>Coming soon</small>
          </button>
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
