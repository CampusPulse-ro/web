export interface AuthUser {
  oid: string
  name: string
  email: string
  username: string
}

export interface AuthContextValue {
  isAuthenticated: boolean
  isLoading: boolean
  isBusy: boolean
  user: AuthUser | null
  error: Error | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}
