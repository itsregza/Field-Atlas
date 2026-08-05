export function MobileAppGate() {
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
      </div>
    </main>
  )
}
