import { runRedirectBridge, urlCarriesAuthResponse } from './auth/bridge'

// A sign-in answer from Microsoft goes to MSAL's redirect bridge, not the app (see auth/bridge.ts).
// If the bridge can't use it, the app starts anyway and shows the sign-in screen.
async function start() {
  if (urlCarriesAuthResponse() && (await runRedirectBridge())) return
  const { renderApp } = await import('./App')
  renderApp()
}

void start()
