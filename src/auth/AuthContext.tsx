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
  const [uptBusy, setUptBusy] = useState(false)
  const busy = useRef(false)
  const [uptOutcome, setUptOutcome] = useState<UptOutcome | null>(null)

  useEffect(() => {
    pageLoad ??= settlePageLoad()
    void pageLoad.then((outcome) => {
      if (outcome) setUptOutcome(outcome)
      setPageLoadSettled(true)
    })
  }, [])

  const runUpt = useCallback(
    async (intent: UptIntent) => {
      if (busy.current || inProgress !== InteractionStatus.None) return
      busy.current = true
      setUptBusy(true)
      setUptOutcome(null)
      clearSignedOutReason()
      let redirecting = false
      try {
        const token = await microsoftAccessToken(intent)
        if (token.kind === 'redirecting') redirecting = true
        if (token.kind !== 'token') return
        const outcome = await finish(intent, token.accessToken)
        if (outcome) setUptOutcome(outcome)
      } catch (err) {
        setUptOutcome({ intent, problem: authProblem(err) })
      } finally {
        // On its way to Microsoft: stay busy until the page goes.
        if (!redirecting) {
          busy.current = false
          setUptBusy(false)
        }
      }
    },
    [inProgress],
  )

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
      uptBusy: uptBusy || inProgress !== InteractionStatus.None,
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
