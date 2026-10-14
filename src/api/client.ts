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
import type { paths } from './schema'

/** Every request gives up after this long instead of hanging the screen. */
const timeoutMs = 8000

export const api = createClient<paths>({
  baseUrl: apiBase,
  fetch: (request: Request) =>
    fetch(
      new Request(request, {
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(timeoutMs)]),
      }),
    ),
})

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
