/**
 * Microsoft sends every sign-in answer back to the site root with `#code=…&state=…` (or
 * `#error=…`). In MSAL v5 the page that started a popup or silent sign-in waits for that answer on
 * a BroadcastChannel, and only MSAL's redirect bridge sends it; for a redirect sign-in the bridge
 * stores it and returns to the page the student started from, where `handleRedirectPromise`
 * finishes it. So when the URL carries an answer, `main.tsx` runs the bridge instead of the app.
 *
 * Kept free of MSAL and React imports: a popup or hidden iframe must not boot the app.
 */
export function urlCarriesAuthResponse(location: Location = window.location): boolean {
  for (const part of [location.hash, location.search]) {
    const params = new URLSearchParams(part.replace(/^[#?]/, ''))
    if (params.has('state') && (params.has('code') || params.has('error'))) return true
  }
  return false
}

/** Hands the answer to MSAL's redirect bridge. Resolves false if it couldn't (start the app). */
export async function runRedirectBridge(): Promise<boolean> {
  try {
    const { broadcastResponseToMainFrame } = await import('@azure/msal-browser/redirect-bridge')
    await broadcastResponseToMainFrame()
    return true
  } catch {
    return false
  }
}
