/**
 * The typed API client. Every call to the CampusPulse API goes through `api`: the paths, request
 * and response shapes come from `schema.d.ts`, generated from the API's contract with
 * `bun run api:types`. Never call `fetch` with a hand-written URL.
 *
 * In a query, wrap the call in `unwrap()`: it returns the data of a 2xx response and throws an
 * `ApiError` for anything else, so TanStack Query sees the failure.
 */
import createClient from 'openapi-fetch'
import { getAccessToken } from '../auth/msal'
import { apiBase } from '../config'
import type { paths } from './schema'

/** Every request gives up after this long instead of hanging the screen. */
const timeoutMs = 8000

let onUnauthorizedHandler: (() => void) | null = null
let onAccountGoneHandler: (() => void) | null = null

/** Called when the API refuses the token (401): the session is over. */
export function setOnUnauthorized(handler: (() => void) | null) {
  onUnauthorizedHandler = handler
}

/** Called when a `GET /me…` answers 404: the account was deleted, maybe from another device. */
export function setOnAccountGone(handler: (() => void) | null) {
  onAccountGoneHandler = handler
}

export const api = createClient<paths>({
  baseUrl: apiBase,
  fetch: (request: Request) =>
    fetch(
      new Request(request, {
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(timeoutMs)]),
      }),
    ),
})

/**
 * Every request carries the signed-in student's access token when available.
 * If the server responds with 401 on an authenticated call, the session is expired or revoked.
 */
api.use({
  async onRequest({ request }) {
    if (request.headers.has('Authorization')) return
    try {
      const token = await getAccessToken()
      if (token) {
        request.headers.set('Authorization', `Bearer ${token}`)
      }
    } catch {
      // Continue without token if acquisition fails
    }
  },
  async onResponse({ request, response }) {
    if (!request.headers.has('Authorization')) return
    if (response.status === 401) onUnauthorizedHandler?.()
    else if (
      response.status === 404 &&
      request.method === 'GET' &&
      /^\/me(\/|$)/.test(new URL(request.url).pathname)
    ) {
      onAccountGoneHandler?.()
    }
  },
})

/** `POST /me` with the token right after an interactive sign-in, creating or returning the account. */
export async function createAccount(accessToken: string): Promise<void> {
  const result = await api.POST('/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  unwrap(result)
}

/** The API answered, but not with a 2xx. `body` is what it sent back (parsed JSON, or text). */
export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    super(`The API answered HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

/**
 * The data of a successful call; throws `ApiError` when the response isn't 2xx. Decides on
 * `response.ok`, so a 204 (no content) is a success with `undefined` data.
 */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  if (!result.response.ok) throw new ApiError(result.response.status, result.error)
  return result.data as T
}
