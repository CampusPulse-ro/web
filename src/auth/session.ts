/**
 * The CampusPulse session: our own tokens, from `/auth/*` (api README, "Sign-in").
 *
 * - The **refresh token** lives in localStorage, so the session survives closing the tab. It
 *   rotates on every refresh, and the API treats a rotated token shown again as theft. So every
 *   tab reads it from storage (never from memory) and refreshes only while holding one lock
 *   shared by all tabs (`navigator.locks`): two tabs never send the same token.
 * - The **access token** (15 minutes) stays in this tab's memory and is refreshed shortly before it
 *   expires, or once after the API refuses it.
 * - Other tabs follow along through `storage` events: signing out in one signs out all; signing
 *   in in one signs in the others.
 *
 * Kept free of React: `useSession()` reads it through `useSyncExternalStore`.
 */
import { useSyncExternalStore } from 'react'
import { api, setSessionHooks, type Me, type TokenResponse } from '../api/client'
import { queryClient } from '../api/queryClient'

/** Why the student was signed out; the sign-in card says so. */
export type SignedOutReason = 'sessionExpired' | 'accountGone' | 'accountDeleted'

export type SessionState =
  /** A stored session is being resumed (page load). */
  | { status: 'loading' }
  | { status: 'signedIn'; user: Me }
  | { status: 'signedOut'; reason: SignedOutReason | null }
  /** A stored session exists, but the API can't be reached to resume it. */
  | { status: 'unreachable' }

interface StoredSession {
  refreshToken: string
  userId: string
}

const storageKey = 'campuspulse.session'
const lockName = 'campuspulse.session'
/** Refresh this long before the access token expires, so a request never carries a dying one. */
const refreshMarginMs = 60_000

// ---------------------------------------------------------------------------------------------
// Storage. If localStorage is blocked (some private modes), the session lasts for this tab only.

let memoryOnly: StoredSession | null = null

function readStored(): StoredSession | null {
  try {
    const raw = localStorage.getItem(storageKey)
    if (raw === null) return null
    const value: unknown = JSON.parse(raw)
    if (
      typeof value === 'object' &&
      value !== null &&
      'refreshToken' in value &&
      'userId' in value &&
      typeof value.refreshToken === 'string' &&
      typeof value.userId === 'string'
    ) {
      return { refreshToken: value.refreshToken, userId: value.userId }
    }
    return null
  } catch {
    return memoryOnly
  }
}

function writeStored(value: StoredSession | null) {
  memoryOnly = value
  try {
    if (value) localStorage.setItem(storageKey, JSON.stringify(value))
    else localStorage.removeItem(storageKey)
  } catch {
    // Storage blocked: memoryOnly keeps it for this tab.
  }
}

/** Runs `task` while holding the lock every tab of this site shares (or plainly, without locks). */
function withLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    return navigator.locks.request(lockName, task) as Promise<T>
  }
  return task()
}

// ---------------------------------------------------------------------------------------------
// State.

let state: SessionState = readStored()
  ? { status: 'loading' }
  : { status: 'signedOut', reason: null }
let access: { token: string; expiresAt: number } | null = null
/** Bumped whenever the session starts or ends here, so an answer for an older one is dropped. */
let generation = 0
const listeners = new Set<() => void>()

function setState(next: SessionState) {
  state = next
  for (const listener of listeners) listener()
}

function currentUserId(): string | null {
  return state.status === 'signedIn' ? state.user.id : null
}

/** How long a token is valid, from its own claims (`exp - iat`), so a wrong device clock can't
 * make it look expired; the answer's `accessTokenExpiresAt` if the token can't be read. */
function lifetimeMs(tokens: TokenResponse): number {
  try {
    const payload = tokens.accessToken.split('.')[1] ?? ''
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const claims: unknown = JSON.parse(json)
    if (
      typeof claims === 'object' &&
      claims !== null &&
      'exp' in claims &&
      'iat' in claims &&
      typeof claims.exp === 'number' &&
      typeof claims.iat === 'number' &&
      claims.exp > claims.iat
    ) {
      return (claims.exp - claims.iat) * 1000
    }
  } catch {
    // fall through
  }
  return Math.max(0, Date.parse(tokens.accessTokenExpiresAt) - Date.now())
}

/** Takes a TokenResponse (sign-in or refresh) as this tab's session. */
function adopt(tokens: TokenResponse) {
  if (currentUserId() !== tokens.user.id) queryClient.clear() // never show another account's data
  writeStored({ refreshToken: tokens.refreshToken, userId: tokens.user.id })
  access = { token: tokens.accessToken, expiresAt: Date.now() + lifetimeMs(tokens) }
  setState({ status: 'signedIn', user: tokens.user })
}

/** Ends the session in this tab (memory only). */
function endHere(reason: SignedOutReason | null) {
  generation += 1
  access = null
  queryClient.clear()
  setState({ status: 'signedOut', reason })
}

/** Ends the session in this tab and forgets it on this device. */
function end(reason: SignedOutReason | null) {
  writeStored(null)
  endHere(reason)
}

// ---------------------------------------------------------------------------------------------
// Refreshing.

type RefreshOutcome = 'ok' | 'signedOut' | 'unreachable'

let inFlight: Promise<RefreshOutcome> | null = null

/** One refresh at a time in this tab (shared by every caller), and one at a time across tabs. */
function refresh(): Promise<RefreshOutcome> {
  inFlight ??= (async () => {
    // An answer for a session that ended or changed meanwhile is dropped; ask again for the new one.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const outcome = await withLock(refreshHoldingLock)
      if (outcome !== 'stale') return outcome
    }
    return 'unreachable' as const
  })().finally(() => {
    inFlight = null
  })
  return inFlight
}

async function refreshHoldingLock(): Promise<RefreshOutcome | 'stale'> {
  const startedIn = generation
  // Read under the lock: another tab may have rotated it while this one waited.
  const stored = readStored()
  if (!stored) {
    if (state.status !== 'signedOut') end(null)
    return 'signedOut'
  }

  let result
  try {
    result = await api.POST('/auth/refresh', { body: { refreshToken: stored.refreshToken } })
  } catch {
    return 'unreachable'
  }
  // Signed out, or in again, here while the answer was on its way: it belongs to an old session.
  if (generation !== startedIn) return 'stale'

  if (result.response.ok && result.data) {
    adopt(result.data)
    return 'ok'
  }
  if (result.response.status === 401) {
    end('sessionExpired')
    return 'signedOut'
  }
  return 'unreachable' // 429, 5xx: the session may well be fine; try again later
}

/** Resumes the stored session (page load, or another tab signed in). */
let resuming: Promise<void> | null = null

export function resumeSession(): Promise<void> {
  resuming ??= (async () => {
    if (!readStored()) return
    if (state.status !== 'signedIn') setState({ status: 'loading' })
    const outcome = await refresh()
    if (outcome === 'unreachable' && state.status !== 'signedIn')
      setState({ status: 'unreachable' })
  })().finally(() => {
    resuming = null
  })
  return resuming
}

/** Thrown into a request when no token can be had right now (the API is unreachable). */
export class SessionUnavailableError extends Error {
  constructor() {
    super('The session could not be renewed right now.')
    this.name = 'SessionUnavailableError'
  }
}

async function accessToken(): Promise<string | null> {
  if (access && access.expiresAt - Date.now() > refreshMarginMs) return access.token
  if (!readStored()) return null
  const outcome = await refresh()
  if (outcome === 'ok') return currentAccessToken()
  if (outcome === 'unreachable') {
    // Not expired yet: use it rather than fail the request.
    if (access && access.expiresAt > Date.now()) return access.token
    throw new SessionUnavailableError()
  }
  return null
}

async function replaceRejected(rejected: string): Promise<string | null> {
  // Another request already replaced it: use the new one.
  if (access && access.token !== rejected && access.expiresAt - Date.now() > refreshMarginMs) {
    return access.token
  }
  access = null
  const outcome = await refresh()
  return outcome === 'ok' ? currentAccessToken() : null
}

/** Read through a function: TypeScript would otherwise keep `access` narrowed across the await. */
function currentAccessToken(): string | null {
  return access?.token ?? null
}

setSessionHooks({
  accessToken,
  replaceRejected,
  sessionRefused: () => void signOut('sessionExpired'),
  accountGone: () => {
    if (state.status === 'signedIn') end('accountGone')
  },
})

// ---------------------------------------------------------------------------------------------
// Starting and ending.

/** A sign-in succeeded (`/auth/email/verify` or `/auth/microsoft`): this is the session now. */
export async function startSession(tokens: TokenResponse): Promise<void> {
  generation += 1
  // Under the lock, so a refresh of an older session in another tab can't write over it.
  await withLock(async () => adopt(tokens))
}

let signingOut: Promise<void> | null = null

/**
 * Signs out on this device. The screen changes at once; then, under the lock (so a refresh another
 * tab is finishing can't write the session back), the stored token is forgotten and the API asked
 * to revoke its session, best effort: unreachable, the token is forgotten here all the same.
 */
export function signOut(reason: SignedOutReason | null = null): Promise<void> {
  endHere(reason)
  signingOut ??= (async () => {
    const refreshToken = await withLock(async () => {
      const stored = readStored() // the newest token of this session, if another tab rotated it
      writeStored(null)
      return stored?.refreshToken ?? null
    })
    if (!refreshToken) return
    try {
      await api.POST('/auth/sign-out', { body: { refreshToken } })
    } catch {
      // Unreachable: the token is gone from this device anyway.
    }
  })().finally(() => {
    signingOut = null
  })
  return signingOut
}

/** The account was deleted (`DELETE /me` answered 204): its sessions are gone server-side too. */
export function accountDeleted() {
  end('accountDeleted')
}

/** A newer copy of the account (`GET /me`, linking UPT). */
export function updateUser(user: Me) {
  if (state.status === 'signedIn' && state.user.id === user.id) {
    setState({ status: 'signedIn', user })
  }
}

/** Drops the "why you were signed out" message once it has been read. */
export function clearSignedOutReason() {
  if (state.status === 'signedOut' && state.reason) setState({ status: 'signedOut', reason: null })
}

// Other tabs: they write the same key, and `storage` fires here (never in the tab that wrote it).
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if ((event.key !== storageKey && event.key !== null) || signingOut) return
    const stored = readStored()
    if (!stored) {
      // Signed out (or expired, or deleted) in another tab.
      if (state.status !== 'signedOut') endHere(null)
      return
    }
    // Signed in, maybe as someone else, in another tab: take that session (with a token of our own).
    if (stored.userId !== currentUserId()) {
      generation += 1
      access = null
      void resumeSession()
    }
    // The same account's token rotated in another tab: nothing to do, the next refresh reads it.
  })
}

// ---------------------------------------------------------------------------------------------
// React.

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSession(): SessionState {
  return useSyncExternalStore(subscribe, () => state)
}

/** The session as it is now (outside React). */
export function getSessionState(): SessionState {
  return state
}
