import type { AccountInfo } from '@azure/msal-browser'
import type { AuthUser } from './types'

export function userFromAccount(account: AccountInfo | null): AuthUser | null {
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

/** Extracts 1-2 uppercase letters from the student's name for their avatar. */
export function getInitials(name: string): string {
  const trimmed = name.trim()

  if (!trimmed) return '?'

  const parts = trimmed.split(/\s+/).filter(Boolean)

  if (parts.length === 0) return '?'

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
