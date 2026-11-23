/**
 * The typed API client. Every call to the CampusPulse API goes through `api`: the paths, request
 * and response shapes come from `schema.d.ts`, generated from the API's contract with
 * `bun run api:types`. Never call `fetch` with a hand-written URL.
 *
 * In a query, wrap the call in `unwrap()`: it returns the data of a 2xx response and throws an
 * `ApiError` for anything else, so TanStack Query sees the failure.
 */
import createClient from 'openapi-fetch'
import { apiBase } from '../config'
import type { components, paths } from './schema'

export type Me = components['schemas']['MeResponse']
export type TokenResponse = components['schemas']['TokenResponse']
export type Deadline = components['schemas']['DeadlineResponse']

/** Every request gives up after this long instead of hanging the screen. */
const timeoutMs = 8000

/**
 * How requests get the signed-in student's access token, set by `auth/session.ts` (which owns the
 * tokens). Kept as hooks so this file doesn't import the session, which imports `api`.
 */
export interface SessionHooks {
  /** A valid access token, refreshed first if it is about to expire; null when signed out. */
  accessToken(): Promise<string | null>
  /** The API refused `rejected` (401): a new token to retry with once, or null (signed out). */
  replaceRejected(rejected: string): Promise<string | null>
  /** Even a fresh token was refused: the session is over. */
  sessionRefused(): void
  /** A `GET /me…` answered 404: the account was deleted, maybe from another device. */
  accountGone(): void
}

let session: SessionHooks | null = null

export function setSessionHooks(hooks: SessionHooks | null) {
  session = hooks
}

/** The request's path on the API (without the base's own path, if it has one). */
function apiPath(request: Request): string {
  const base = new URL(apiBase || window.location.origin).pathname.replace(/\/+$/, '')
  const path = new URL(request.url).pathname
  return base && path.startsWith(base) ? path.slice(base.length) || '/' : path
}

function send(request: Request): Promise<Response> {
  return fetch(
    new Request(request, {
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(timeoutMs)]),
    }),
  )
}

function withBearer(request: Request, token: string): Request {
  const authorized = new Request(request)
  authorized.headers.set('Authorization', `Bearer ${token}`)
  return authorized
}

/**
 * Every request carries the signed-in student's access token. `/auth/*` never does (it is how a
 * session starts or ends), nor a request that sets its own `Authorization`. A 401 is retried once
 * with a refreshed token; if that is refused too, the session is over. A 404 from `GET /me…`
 * means the account is gone.
 */
async function authorizedFetch(request: Request): Promise<Response> {
  const path = apiPath(request)
  if (!session || path.startsWith('/auth/') || request.headers.has('Authorization')) {
    return send(request)
  }

  const token = await session.accessToken()
  if (!token) return send(request)

  // The body can be read only once: keep a copy for the retry.
  const retry = request.clone()
  let response = await send(withBearer(request, token))

  if (response.status === 401) {
    const fresh = await session.replaceRejected(token)
    if (!fresh) return response
    response = await send(withBearer(retry, fresh))
    if (response.status === 401) session.sessionRefused()
  }

  if (response.status === 404 && request.method === 'GET' && /^\/me(\/|$)/.test(path)) {
    session.accountGone()
  }
  return response
}

export const api = createClient<paths>({ baseUrl: apiBase, fetch: authorizedFetch })

/** The API answered, but not with a 2xx. `body` is what it sent back (parsed JSON, or text). */
export class ApiError extends Error {
  readonly status: number
  readonly body: unknown
  /** Seconds from the `Retry-After` header (a 429), or null. */
  readonly retryAfterSeconds: number | null

  constructor(status: number, body: unknown, retryAfterSeconds: number | null = null) {
    super(`The API answered HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
    this.retryAfterSeconds = retryAfterSeconds
  }

  /** The ProblemDetails `type` the API sent (a slug like `invalid-code`), if any. */
  get type(): string | null {
    const body = this.body
    if (typeof body === 'object' && body !== null && 'type' in body) {
      return typeof body.type === 'string' ? body.type : null
    }
    return null
  }
}

/**
 * The data of a successful call; throws `ApiError` when the response isn't 2xx. Decides on
 * `response.ok`, so a 204 (no content) is a success with `undefined` data.
 */
export function unwrap<T>(result: { data?: T; error?: unknown; response: Response }): T {
  const { response } = result
  if (!response.ok) {
    const retryAfter = Number(response.headers.get('Retry-After'))
    throw new ApiError(
      response.status,
      result.error,
      Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null,
    )
  }
  return result.data as T
}
