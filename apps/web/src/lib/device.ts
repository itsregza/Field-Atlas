const BROWSER_PREF_KEY = 'fa_prefer_browser'

export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false

  const hints = (
    navigator as Navigator & {
      userAgentData?: { mobile?: boolean }
    }
  ).userAgentData

  if (typeof hints?.mobile === 'boolean') {
    return hints.mobile
  }

  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(
    navigator.userAgent,
  )
}

export function prefersMobileBrowser() {
  try {
    return localStorage.getItem(BROWSER_PREF_KEY) === '1'
  } catch {
    return false
  }
}

export function setPrefersMobileBrowser(value: boolean) {
  try {
    if (value) localStorage.setItem(BROWSER_PREF_KEY, '1')
    else localStorage.removeItem(BROWSER_PREF_KEY)
  } catch {
    // ignore quota / private mode
  }
}

export function shouldShowMobileAppGate() {
  return isMobileDevice() && !prefersMobileBrowser()
}
