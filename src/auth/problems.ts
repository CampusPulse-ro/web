import { AuthError, BrowserAuthError } from '@azure/msal-browser'
import { ApiError } from '../api/client'
import { SessionUnavailableError } from './session'
import type { AuthProblem, AuthProblemCode } from './types'

const apiTypes: readonly AuthProblemCode[] = [
  'identity-in-use',
  'already-linked',
  'microsoft-token-invalid',
  'microsoft-unavailable',
  'sign-in-unavailable',
]

/** True when the request never got an answer: offline, the API down, or the 8 s timeout. */
export function isUnreachable(err: unknown): boolean {
  return (
    err instanceof TypeError ||
    err instanceof SessionUnavailableError ||
    (err instanceof DOMException && (err.name === 'TimeoutError' || err.name === 'AbortError'))
  )
}

/** Which sentence to show for a failed UPT sign-in or link. */
export function authProblem(err: unknown): AuthProblem {
  if (err instanceof ApiError) {
    const code = apiTypes.find((type) => type === err.type)
    if (code) return { code }
    if (err.status === 429) return { code: 'rate-limited' }
    return { code: 'unknown' }
  }
  if (isUnreachable(err)) return { code: 'unreachable' }
  if (err instanceof BrowserAuthError && err.errorCode === 'timed_out') {
    return { code: 'microsoft-timeout' }
  }
  if (err instanceof AuthError) return { code: 'microsoft-error', detail: err.message }
  return { code: 'unknown' }
}
