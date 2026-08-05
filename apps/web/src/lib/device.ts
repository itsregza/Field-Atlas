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
