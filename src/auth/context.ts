import { createContext, useContext } from 'react'
import type { AuthContextValue } from './types'

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}

/** Why the student was signed out; ProtectedRoute shows the matching message. */
export const AUTH_ERRORS = {
  sessionExpired: 'SESSION_EXPIRED',
  accountGone: 'ACCOUNT_GONE',
  setupFailed: 'ACCOUNT_SETUP_FAILED',
} as const
