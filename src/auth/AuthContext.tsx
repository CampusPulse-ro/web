import { type AuthenticationResult, BrowserAuthError, InteractionStatus } from '@azure/msal-browser'
import { MsalProvider, useIsAuthenticated, useMsal } from '@azure/msal-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createAccount, setOnAccountGone, setOnUnauthorized } from '../api/client'
import { queryClient } from '../api/queryClient'
import { loginRequest } from './config'
import { AUTH_ERRORS, AuthContext } from './context'
import { forgetAccount, getAccessToken, msalInstance, redirectOutcome } from './msal'
import type { AuthContextValue } from './types'
import { userFromAccount } from './utils'

/**
 * Set while an interactive sign-in waits for `POST /me`, so a reload in between finishes it
 * instead of leaving tokens behind with no account at the API.
 */
const SETUP_PENDING_KEY = 'campuspulse.accountSetupPending'

function setSetupPending(pending: boolean) {
  try {
    if (pending) sessionStorage.setItem(SETUP_PENDING_KEY, '1')
    else sessionStorage.removeItem(SETUP_PENDING_KEY)
  } catch {
    // Storage blocked: the sign-in still works, only the reload case isn't covered.
  }
}

function isSetupPending(): boolean {
  try {
    return sessionStorage.getItem(SETUP_PENDING_KEY) === '1'
  } catch {
    return false
  }
}

/** Forgets the account on this device and drops everything cached for it. */
async function signOutHere(): Promise<void> {
  setSetupPending(false)
  await forgetAccount()
  queryClient.clear()
}

/**
 * After an interactive sign-in only: `POST /me` creates the account (or returns it). Never on a
 * plain page load or a silent refresh, so a browser that still holds tokens can't re-create an
 * account the student deleted elsewhere (api README, "Sign-in"). If it fails, the sign-in didn't
 * finish and the account is forgotten here.
 */
async function finishSignIn(accessToken: string): Promise<void> {
  setSetupPending(true)
  try {
    await createAccount(accessToken)
    setSetupPending(false)
  } catch {
    await signOutHere()
    throw new Error(AUTH_ERRORS.setupFailed)
  }
}

/**
 * What the page load itself has to finish, once, whatever React re-mounts: a redirect sign-in
 * Microsoft just returned from (or its error), or a sign-in a reload interrupted before `POST /me`.
 */
let pageLoadSettled: Promise<void> | null = null

async function settlePageLoad(): Promise<void> {
  const { result, error } = await redirectOutcome
  if (error) throw error instanceof Error ? error : new Error(String(error))
  if (result?.account) {
    msalInstance.setActiveAccount(result.account)
    await finishSignIn(result.accessToken)
    return
  }
  if (isSetupPending()) {
    const token = await getAccessToken()
    if (!token) {
      await signOutHere()
      throw new Error(AUTH_ERRORS.setupFailed)
    }
    await finishSignIn(token)
  }
}

function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err))
}

function isPopupBlocked(err: unknown): boolean {
  return (
    err instanceof BrowserAuthError &&
    (err.errorCode === 'popup_window_error' || err.errorCode === 'empty_window_error')
  )
}

function isCancelled(err: unknown): boolean {
  return (
    err instanceof BrowserAuthError &&
    (err.errorCode === 'user_cancelled' || err.errorCode === 'user_cancelled_interaction')
  )
}

function InnerAuthProvider({ children }: { children: ReactNode }) {
  const { instance, inProgress, accounts } = useMsal()
  const isMsalAuthenticated = useIsAuthenticated()

  const [isBusy, setIsBusy] = useState(false)
  // True until the page load is settled and while a sign-in waits for `POST /me`: the student
  // isn't signed in to CampusPulse until their account exists.
  const [isFinishing, setIsFinishing] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    pageLoadSettled ??= settlePageLoad()
    pageLoadSettled
      .catch((err: unknown) => setError(toError(err)))
      .finally(() => setIsFinishing(false))
  }, [])

  // Make sure an account is active once MSAL knows of one.
  useEffect(() => {
    if (!instance.getActiveAccount() && accounts.length > 0) {
      instance.setActiveAccount(accounts[0])
    }
  }, [accounts, instance])

  // The API refused the session (401) or has no account behind it (404 on /me): sign out here, say why.
  useEffect(() => {
    const signOutWithReason = (reason: string) => {
      void signOutHere().finally(() => setError(new Error(reason)))
    }
    setOnUnauthorized(() => signOutWithReason(AUTH_ERRORS.sessionExpired))
    setOnAccountGone(() => signOutWithReason(AUTH_ERRORS.accountGone))
    return () => {
      setOnUnauthorized(null)
      setOnAccountGone(null)
    }
  }, [])

  // `accounts` changes only on MSAL account events, so `user` keeps its identity between them.
  const user = useMemo(
    () => userFromAccount(instance.getActiveAccount() ?? accounts[0] ?? null),
    [instance, accounts],
  )

  const signIn = useCallback(async () => {
    if (inProgress !== InteractionStatus.None || isBusy) return
    setIsBusy(true)
    setError(null)
    try {
      let result: AuthenticationResult
      try {
        result = await instance.loginPopup({ ...loginRequest, prompt: 'select_account' })
      } catch (err) {
        if (isCancelled(err)) return
        if (!isPopupBlocked(err)) throw err
        // The popup was blocked: sign in by redirect; the page Microsoft returns to finishes it.
        await instance.loginRedirect({ ...loginRequest, prompt: 'select_account' })
        return
      }
      if (result.account) instance.setActiveAccount(result.account)
      setIsFinishing(true)
      try {
        await finishSignIn(result.accessToken)
      } finally {
        setIsFinishing(false)
      }
    } catch (err) {
      setError(toError(err))
    } finally {
      setIsBusy(false)
    }
  }, [instance, inProgress, isBusy])

  // Signing out forgets the account on this device only. It doesn't end the student's Microsoft
  // session, which would also sign them out of Outlook, Teams and every other UPT app.
  const signOut = useCallback(async () => {
    setIsBusy(true)
    setError(null)
    try {
      await signOutHere()
    } finally {
      setIsBusy(false)
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: isMsalAuthenticated && user !== null && !isFinishing,
      isLoading: inProgress !== InteractionStatus.None || isFinishing,
      isBusy,
      user,
      error,
      signIn,
      signOut,
      clearError,
    }),
    [
      isMsalAuthenticated,
      user,
      inProgress,
      isFinishing,
      isBusy,
      error,
      signIn,
      signOut,
      clearError,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** MsalProvider plus the app's own sign-in state (`useAuth`). */
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <MsalProvider instance={msalInstance}>
      <InnerAuthProvider>{children}</InnerAuthProvider>
    </MsalProvider>
  )
}
