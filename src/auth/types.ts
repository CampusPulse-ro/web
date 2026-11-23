import type { Me } from '../api/client'
import type { UptIntent } from './msal'
import type { SessionState, SignedOutReason } from './session'

/** What can go wrong when signing in or linking, each with its own sentence on screen. */
export type AuthProblemCode =
  | 'identity-in-use'
  | 'already-linked'
  | 'microsoft-token-invalid'
  | 'microsoft-unavailable'
  | 'sign-in-unavailable'
  | 'rate-limited'
  | 'unreachable'
  | 'microsoft-error'
  | 'unknown'

export interface AuthProblem {
  code: AuthProblemCode
  /** Microsoft's own message, for `microsoft-error`. */
  detail?: string
}

/** How the last UPT sign-in or link ended: `problem` is null when it worked. */
export interface UptOutcome {
  intent: UptIntent
  problem: AuthProblem | null
}

export interface AuthContextValue {
  status: SessionState['status']
  isAuthenticated: boolean
  /** Resuming a stored session, or finishing a Microsoft redirect. */
  isLoading: boolean
  user: Me | null
  signedOutReason: SignedOutReason | null
  /** Our API is finishing a UPT sign-in or link (or the page is on its way to Microsoft). */
  uptBusy: boolean
  /** The Microsoft window is open for this; starting again replaces it. */
  uptWaiting: UptIntent | null
  uptOutcome: UptOutcome | null
  signInWithUpt: () => Promise<void>
  linkUpt: () => Promise<void>
  signOut: () => Promise<void>
  /** Try again to resume a stored session the API couldn't be reached for. */
  retryResume: () => void
  clearUptOutcome: () => void
  clearSignedOutReason: () => void
}
