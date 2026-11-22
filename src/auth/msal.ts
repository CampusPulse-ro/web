import {
  type AuthenticationResult,
  type Configuration,
  PublicClientApplication,
} from '@azure/msal-browser'
import { entraAuthority, entraClientId, loginRequest } from './config'

export const msalConfig: Configuration = {
  auth: {
    clientId: entraClientId,
    authority: entraAuthority,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
    postLogoutRedirectUri:
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
  },
  cache: {
    // Per tab: closing the tab forgets the tokens.
    cacheLocation: 'sessionStorage',
  },
}

export const msalInstance = new PublicClientApplication(msalConfig)

/**
 * MSAL must be initialized before any other call, and a redirect sign-in (the fallback when the
 * popup is blocked) is finished by `handleRedirectPromise` on the page Microsoft sends back to.
 * Everything that touches MSAL waits on this. The result is the redirect sign-in, if there was one.
 */
export const msalReady: Promise<AuthenticationResult | null> = msalInstance
  .initialize()
  .then(() => msalInstance.handleRedirectPromise())
  .then((result) => {
    if (result?.account) msalInstance.setActiveAccount(result.account)
    return result
  })
  .catch(() => null)

/**
 * A valid access token for the CampusPulse API, or null when nobody is signed in or the session
 * needs the student to sign in again. MSAL refreshes it silently from its cache.
 */
export async function getAccessToken(): Promise<string | null> {
  await msalReady
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]
  if (!account) return null
  try {
    const result = await msalInstance.acquireTokenSilent({ ...loginRequest, account })
    return result.accessToken
  } catch {
    return null
  }
}

/** Forgets the signed-in account on this device only (the Microsoft session stays). */
export async function forgetAccount(): Promise<void> {
  await msalReady
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]
  await msalInstance.clearCache(account ? { account } : undefined)
  msalInstance.setActiveAccount(null)
}
