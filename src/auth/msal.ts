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
    // Microsoft sends every answer (popup, redirect, silent iframe) back to the site root;
    // `main.tsx` hands it to MSAL's redirect bridge before the app starts (see `bridge.ts`).
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

/** How the page load ended for a redirect sign-in: its result, its error, or neither. */
export interface RedirectOutcome {
  result: AuthenticationResult | null
  error: unknown
}

/**
 * MSAL must be initialized before any other call, and a redirect sign-in (the fallback when the
 * popup is blocked) is finished by `handleRedirectPromise` on the page Microsoft sends back to.
 * A failed redirect sign-in (consent refused, an AADSTS error) is kept, not swallowed, so the
 * sign-in screen can say why.
 */
export const redirectOutcome: Promise<RedirectOutcome> = msalInstance
  .initialize()
  .then(() => msalInstance.handleRedirectPromise())
  .then(
    (result) => {
      if (result?.account) msalInstance.setActiveAccount(result.account)
      return { result, error: null }
    },
    (error: unknown) => ({ result: null, error }),
  )

/** Everything that touches MSAL waits on this. */
export const msalReady: Promise<void> = redirectOutcome.then(() => undefined)

function currentAccount() {
  return msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0] ?? null
}

/** Whether this tab holds a signed-in account (after `msalReady`). */
export function hasSignedInAccount(): boolean {
  try {
    return currentAccount() !== null
  } catch {
    return false
  }
}

/**
 * A valid access token for the CampusPulse API, or null when nobody is signed in or the session
 * can't be renewed silently. MSAL refreshes it from its cache. A signed-in student whose request
 * then goes out without a token gets a 401, and `api/client.ts` signs them out with a reason.
 */
export async function getAccessToken(): Promise<string | null> {
  await msalReady
  const account = currentAccount()
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
  const account = currentAccount()
  await msalInstance.clearCache(account ? { account } : undefined)
  msalInstance.setActiveAccount(null)
}
