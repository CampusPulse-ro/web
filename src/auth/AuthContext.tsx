import { type AuthenticationResult, BrowserAuthError, InteractionStatus } from '@azure/msal-browser'
import { MsalProvider, useIsAuthenticated, useMsal } from '@azure/msal-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { createAccount, setOnAccountGone, setOnUnauthorized } from '../api/client'
import { loginRequest } from './config'
import { AUTH_ERRORS, AuthContext } from './context'
import { forgetAccount, msalInstance, msalReady } from './msal'
import type { AuthContextValue } from './types'
import { userFromAccount } from './utils'

/**
 * After an interactive sign-in only: `POST /me` creates the account (or returns it). Never on a
 * page load or a silent refresh, so a browser that still holds tokens can't re-create an account
 * the student deleted elsewhere (api README, "Sign-in"). If it fails, the sign-in didn't finish.
 */
async function finishSignIn(result: AuthenticationResult): Promise<void> {
  if (result.account) msalInstance.setActiveAccount(result.account)
  try {
    await createAccount(result.accessToken)
  } catch {
    await forgetAccount()
    throw new Error(AUTH_ERRORS.setupFailed)
  }
}

// A redirect sign-in returns on a fresh page load: finish it once, whatever React re-mounts.
let redirectFinished: Promise<void> | null = null

function InnerAuthProvider({ children }: { children: ReactNode }) {
  const { instance, inProgress, accounts } = useMsal()
  const isMsalAuthenticated = useIsAuthenticated()

  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    redirectFinished ??= msalReady.then((result) =>
      result?.accessToken ? finishSignIn(result) : undefined,
    )
    redirectFinished.catch((err: unknown) =>
      setError(err instanceof Error ? err : new Error(String(err))),
    )
  }, [])

  // Make sure an account is active once MSAL knows of one.
  useEffect(() => {
    if (!instance.getActiveAccount() && accounts.length > 0) {
      instance.setActiveAccount(accounts[0])
    }
  }, [accounts, instance])

  // The API refused a token (401) or has no account behind it (404 on /me): sign out here and say why.
  useEffect(() => {
    const signOutLocally = (reason: string) => {
      void forgetAccount().finally(() => setError(new Error(reason)))
    }
    setOnUnauthorized(() => signOutLocally(AUTH_ERRORS.sessionExpired))
    setOnAccountGone(() => signOutLocally(AUTH_ERRORS.accountGone))
    return () => {
      setOnUnauthorized(null)
      setOnAccountGone(null)
    }
  }, [])

  const activeAccount = instance.getActiveAccount() ?? accounts[0] ?? null
  const user = useMemo(() => userFromAccount(activeAccount), [activeAccount])

  const signIn = useCallback(async () => {
    if (inProgress !== InteractionStatus.None || isBusy) return
    setIsBusy(true)
    setError(null)
    try {
      const result = await instance.loginPopup({ ...loginRequest, prompt: 'select_account' })
      await finishSignIn(result)
    } catch (err) {
      if (
        err instanceof BrowserAuthError &&
        (err.errorCode === 'popup_window_error' || err.errorCode === 'empty_window_error')
      ) {
        // The popup was blocked: sign in by redirect instead; the page that returns finishes it.
        await instance.loginRedirect({ ...loginRequest, prompt: 'select_account' })
        return
      }
      if (
        err instanceof BrowserAuthError &&
        (err.errorCode === 'user_cancelled' || err.errorCode === 'user_cancelled_interaction')
      ) {
        return
      }
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsBusy(false)
    }
  }, [instance, inProgress, isBusy])

  const signOut = useCallback(async () => {
    setIsBusy(true)
    setError(null)
    try {
      const account = instance.getActiveAccount() ?? accounts[0]
      if (account) {
        await instance.logoutPopup({ account, mainWindowRedirectUri: window.location.origin })
      }
    } catch {
      // The popup failed (blocked or closed): still forget the account on this device.
      await forgetAccount()
    } finally {
      setIsBusy(false)
    }
  }, [accounts, instance])

  const clearError = useCallback(() => setError(null), [])

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: isMsalAuthenticated && user !== null,
      isLoading: inProgress !== InteractionStatus.None,
      isBusy,
      user,
      error,
      signIn,
      signOut,
      clearError,
    }),
    [isMsalAuthenticated, user, inProgress, isBusy, error, signIn, signOut, clearError],
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
