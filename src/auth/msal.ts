import {
  type AuthenticationResult,
  BrowserAuthError,
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
    // Per tab, and cleared right after use: the Microsoft token is only handed to the API once.
    cacheLocation: 'sessionStorage',
  },
}

export const msalInstance = new PublicClientApplication(msalConfig)

/**
 * What a Microsoft sign-in is for. It travels as MSAL's `state`, so a redirect sign-in (the
 * fallback when the popup is blocked) knows on its way back what to finish.
 */
export type UptIntent = 'sign-in' | 'link'

/** How the page load ended for a redirect sign-in: its result, its error, or neither. */
export interface RedirectOutcome {
  intent: UptIntent
  result: AuthenticationResult | null
  error: unknown
}

function intentOf(state: string | null | undefined): UptIntent | null {
  return state === 'link' || state === 'sign-in' ? state : null
}

/** Set before a redirect starts, so a failed one (no result, so no state) still knows its intent. */
const redirectIntentKey = 'campuspulse.uptRedirectIntent'

function takeRedirectIntent(): UptIntent | null {
  try {
    const value = sessionStorage.getItem(redirectIntentKey)
    sessionStorage.removeItem(redirectIntentKey)
    return intentOf(value)
  } catch {
    return null
  }
}

/**
 * MSAL must be initialized before any other call, and a redirect sign-in is finished by
 * `handleRedirectPromise` on the page Microsoft sends back to. A failed redirect sign-in (consent
 * refused, an AADSTS error) is kept, not swallowed, so the screen can say why.
 */
export const redirectOutcome: Promise<RedirectOutcome | null> = msalInstance
  .initialize()
  .then(() => msalInstance.handleRedirectPromise())
  .then(
    (result) => {
      const stored = takeRedirectIntent()
      if (!result) return null
      return { intent: intentOf(result.state) ?? stored ?? 'sign-in', result, error: null }
    },
    (error: unknown) => {
      const stored = takeRedirectIntent()
      return { intent: stored ?? 'sign-in', result: null, error }
    },
  )

/** Everything that touches MSAL waits on this. */
export const msalReady: Promise<void> = redirectOutcome.then(() => undefined)

export function isPopupBlocked(err: unknown): boolean {
  return (
    err instanceof BrowserAuthError &&
    (err.errorCode === 'popup_window_error' || err.errorCode === 'empty_window_error')
  )
}

/**
 * The student closed or abandoned the Microsoft window, or opened a new one. MSAL v5 can't see a
 * popup being closed (it waits for the answer on a BroadcastChannel), so an abandoned one ends
 * as `timed_out` after a minute, and a newer attempt cancels the older one's wait.
 */
export function isCancelled(err: unknown): boolean {
  return (
    err instanceof BrowserAuthError &&
    [
      'user_cancelled',
      'user_cancelled_interaction',
      'interaction_in_progress_cancelled',
      'timed_out',
    ].includes(err.errorCode)
  )
}

/** The outcome of asking Microsoft for a UPT access token. */
export type MicrosoftToken =
  | { kind: 'token'; accessToken: string }
  | { kind: 'cancelled' }
  /** The popup was blocked, so the page is on its way to Microsoft; it comes back to finish. */
  | { kind: 'redirecting' }

/**
 * Signs in with Microsoft (UPT's tenant) in a popup and returns the access token for our API.
 * Always lets the student pick the account. When the popup is blocked, starts a redirect instead.
 * Throws MSAL's error for anything else (consent refused, an AADSTS error).
 *
 * Calling it again while a popup is still open replaces that attempt (the older call then
 * resolves `cancelled`): MSAL can't tell that a popup was closed, so the student's way out of a
 * closed one is to start again. The app runs one Microsoft step at a time, which is what
 * `overrideInteractionInProgress` needs to be safe.
 */
export async function microsoftAccessToken(intent: UptIntent): Promise<MicrosoftToken> {
  await msalReady
  const request = { ...loginRequest, prompt: 'select_account', state: intent }
  try {
    const result = await msalInstance.loginPopup({
      ...request,
      overrideInteractionInProgress: true,
    })
    return { kind: 'token', accessToken: result.accessToken }
  } catch (err) {
    if (isCancelled(err)) return { kind: 'cancelled' }
    if (!isPopupBlocked(err)) throw err
  }
  try {
    sessionStorage.setItem(redirectIntentKey, intent)
  } catch {
    // Storage blocked: a failed redirect is then reported as a sign-in.
  }
  await msalInstance.loginRedirect(request)
  return { kind: 'redirecting' }
}

/**
 * Forgets the Microsoft account in this tab (the Microsoft session itself stays, so the student
 * isn't signed out of Outlook, Teams and every other UPT app). Called right after each token is
 * handed to the API: from then on only our own tokens are used.
 */
export async function forgetMicrosoft(): Promise<void> {
  try {
    await msalReady
    await msalInstance.clearCache()
    msalInstance.setActiveAccount(null)
  } catch {
    // Nothing to forget, or storage blocked.
  }
}
