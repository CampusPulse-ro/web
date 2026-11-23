import { InteractionStatus } from '@azure/msal-browser'
import { MsalProvider, useMsal } from '@azure/msal-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { api, unwrap } from '../api/client'
import { AuthContext } from './context'
import {
  forgetMicrosoft,
  microsoftAccessToken,
  msalInstance,
  redirectOutcome,
  type UptIntent,
} from './msal'
import { authProblem } from './problems'
import {
  clearSignedOutReason,
  getSessionState,
  resumeSession,
  signOut as endSession,
  startSession,
  updateUser,
  useSession,
} from './session'
import type { AuthContextValue, UptOutcome } from './types'

/** Signs in with a UPT Entra access token: the API answers with our own tokens. */
async function exchange(accessToken: string): Promise<void> {
  try {
    await startSession(unwrap(await api.POST('/auth/microsoft', { body: { accessToken } })))
  } finally {
    void forgetMicrosoft()
  }
}

/** Links the UPT account of an Entra access token to the signed-in account. */
async function link(accessToken: string): Promise<void> {
  try {
    updateUser(unwrap(await api.POST('/me/identities/upt-microsoft', { body: { accessToken } })))
  } finally {
    void forgetMicrosoft()
  }
}

/** Runs the Microsoft step's own work for `intent`: a sign-in, or linking to this account. */
async function finish(intent: UptIntent, accessToken: string): Promise<UptOutcome | null> {
  if (intent === 'sign-in') {
    await exchange(accessToken)
    return null
  }
  if (getSessionState().status !== 'signedIn') {
    void forgetMicrosoft()
    return null
  }
  await link(accessToken)
  return { intent, problem: null }
}

/**
 * What the page load itself has to finish, once, whatever React re-mounts: resume the stored
 * session, and finish a redirect sign-in or link Microsoft just returned from (or report its error).
 */
let pageLoad: Promise<UptOutcome | null> | null = null

async function settlePageLoad(): Promise<UptOutcome | null> {
  const resumed = resumeSession()
  const redirect = await redirectOutcome
  await resumed
  if (!redirect) return null
  if (redirect.error) return { intent: redirect.intent, problem: authProblem(redirect.error) }
  if (!redirect.result) return null
  try {
    return await finish(redirect.intent, redirect.result.accessToken)
  } catch (err) {
    return { intent: redirect.intent, problem: authProblem(err) }
  }
}

function InnerAuthProvider({ children }: { children: ReactNode }) {
  const { inProgress } = useMsal()
  const session = useSession()
  const [pageLoadSettled, setPageLoadSettled] = useState(false)
  // `waiting`: the Microsoft window is open (the button stays usable: if the student closed the
  // window, starting again is the way out). `busy`: our API is finishing, or the page is on its
  // way to Microsoft.
  const [uptWaiting, setUptWaiting] = useState<UptIntent | null>(null)
  const [uptBusy, setUptBusy] = useState(false)
  const busy = useRef(false)
  const attempt = useRef(0)
  const [uptOutcome, setUptOutcome] = useState<UptOutcome | null>(null)

  useEffect(() => {
    pageLoad ??= settlePageLoad()
    void pageLoad.then((outcome) => {
      if (outcome) setUptOutcome(outcome)
      setPageLoadSettled(true)
    })
  }, [])

  const runUpt = useCallback(async (intent: UptIntent) => {
    if (busy.current) return
    // A newer attempt (the student started again) replaces this one; only the latest one counts.
    const mine = ++attempt.current
    const current = () => mine === attempt.current
    setUptWaiting(intent)
    setUptOutcome(null)
    clearSignedOutReason()
    try {
      const token = await microsoftAccessToken(intent)
      if (!current()) return
      setUptWaiting(null)
      if (token.kind === 'cancelled') return
      busy.current = true
      setUptBusy(true)
      // On its way to Microsoft: stay busy until the page goes.
      if (token.kind === 'redirecting') return
      try {
        const outcome = await finish(intent, token.accessToken)
        if (outcome) setUptOutcome(outcome)
      } finally {
        busy.current = false
        setUptBusy(false)
      }
    } catch (err) {
      if (!current()) return
      setUptWaiting(null)
      setUptOutcome({ intent, problem: authProblem(err) })
    }
  }, [])

  const signInWithUpt = useCallback(() => runUpt('sign-in'), [runUpt])
  const linkUpt = useCallback(() => runUpt('link'), [runUpt])

  // Signing out forgets our tokens on this device and revokes the session. It doesn't end the
  // student's Microsoft session, which would also sign them out of Outlook, Teams and every other
  // UPT app.
  const signOut = useCallback(async () => {
    setUptOutcome(null)
    void forgetMicrosoft()
    await endSession()
  }, [])

  const retryResume = useCallback(() => void resumeSession(), [])
  const clearUptOutcome = useCallback(() => setUptOutcome(null), [])

  const value = useMemo<AuthContextValue>(() => {
    const user = session.status === 'signedIn' ? session.user : null
    return {
      status: session.status,
      isAuthenticated: user !== null,
      isLoading: session.status === 'loading' || (!pageLoadSettled && user === null),
      user,
      signedOutReason: session.status === 'signedOut' ? session.reason : null,
      // MSAL finishing a redirect at startup also blocks starting another.
      uptBusy:
        uptBusy ||
        inProgress === InteractionStatus.Startup ||
        inProgress === InteractionStatus.HandleRedirect,
      uptWaiting,
      uptOutcome,
      signInWithUpt,
      linkUpt,
      signOut,
      retryResume,
      clearUptOutcome,
      clearSignedOutReason,
    }
  }, [
    session,
    pageLoadSettled,
    uptBusy,
    uptWaiting,
    inProgress,
    uptOutcome,
    signInWithUpt,
    linkUpt,
    signOut,
    retryResume,
    clearUptOutcome,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** MsalProvider plus the app's own session (`useAuth`). */
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <MsalProvider instance={msalInstance}>
      <InnerAuthProvider>{children}</InnerAuthProvider>
    </MsalProvider>
  )
}
