import { type AccountInfo, BrowserAuthError, InteractionStatus } from '@azure/msal-browser'
import { MsalProvider, useIsAuthenticated, useMsal } from '@azure/msal-react'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AuthContextValue, AuthUser } from './types'
import { createAccount, setOnUnauthorized } from '../api/client'
import { loginRequest } from './config'
import { msalInstance } from './msal'
import { AuthContext } from './context'

function userFromAccount(account: AccountInfo | null): AuthUser | null {
  if (!account) return null

  const claims = account.idTokenClaims as Record<string, unknown> | undefined

  const email =
    (claims?.email as string) || (claims?.preferred_username as string) || account.username || ''

  return {
    oid: account.localAccountId || (claims?.oid as string) || '',
    name: account.name || (claims?.name as string) || email,
    email,
    username: account.username,
  }
}

function InnerAuthProvider({ children }: { children: ReactNode }) {
  const { instance, inProgress, accounts } = useMsal()
  const isMsalAuthenticated = useIsAuthenticated()

  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Ensure an active account is selected
  useEffect(() => {
    if (!instance.getActiveAccount() && accounts.length > 0) {
      instance.setActiveAccount(accounts[0])
    }
  }, [accounts, instance])

  // Listen for 401 unauthorized responses from protected API calls
  useEffect(() => {
    setOnUnauthorized(() => {
      setError(new Error('SESSION_EXPIRED'))
    })

    return () => {
      setOnUnauthorized(null)
    }
  }, [])

  const activeAccount = instance.getActiveAccount() ?? (accounts.length > 0 ? accounts[0] : null)

  const user = useMemo(() => userFromAccount(activeAccount), [activeAccount])

  const signIn = useCallback(async () => {
  if (inProgress !== InteractionStatus.None || isBusy) {
    return
  }
    setIsBusy(true)
    setError(null)

    try {
      const result = await instance.loginPopup({
        ...loginRequest,
        prompt: 'select_account',
      })
      console.log('[auth] Login result:', result)
      console.log('[auth] Account:', result.account)
      console.log('[auth] Accounts after login:', instance.getAllAccounts())

      if (result.account) {
  instance.setActiveAccount(result.account)
  console.log('[auth] Active account:', instance.getActiveAccount())
}

      // Call POST /me right after interactive sign-in
      if (result.accessToken) {
        try {
          await createAccount(result.accessToken)
        } catch (apiErr) {
          console.warn('[auth] POST /me notice:', apiErr)
        }
      }
    } catch (err) {
      if (
        err instanceof BrowserAuthError &&
        (err.errorCode === 'popup_window_error' || err.errorCode === 'empty_window_error')
      ) {
        await instance.loginRedirect({
          ...loginRequest,
          prompt: 'select_account',
        })
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
        await instance.logoutPopup({
          account,
          mainWindowRedirectUri: window.location.origin,
        })
      }
    } catch {
      try {
        await instance.logoutRedirect()
      } catch (logoutErr) {
        setError(logoutErr instanceof Error ? logoutErr : new Error(String(logoutErr)))
      }
    } finally {
      setIsBusy(false)
    }
  }, [accounts, instance])

  const clearError = useCallback(() => setError(null), [])

  const isLoading = inProgress !== InteractionStatus.None

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: isMsalAuthenticated && user !== null,
      isLoading,
      isBusy,
      user,
      error,
      signIn,
      signOut,
      clearError,
    }),
    [isMsalAuthenticated, user, isLoading, isBusy, error, signIn, signOut, clearError],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Root AuthProvider initializing MSAL before mounting providers. */

/** Root AuthProvider. MsalProvider handles MSAL initialization and redirects. */
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <MsalProvider instance={msalInstance}>
      <InnerAuthProvider>{children}</InnerAuthProvider>
    </MsalProvider>
  )
}

