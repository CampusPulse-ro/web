/**
 * The typed API client. Every call to the CampusPulse API goes through `api`: the paths, request
 * and response shapes come from `schema.d.ts`, generated from the API's contract with
 * `bun run api:types`. Never call `fetch` with a hand-written URL.
 */
import createClient from 'openapi-fetch'
import { apiBase } from '../config'
import type { paths } from './schema'

export const api = createClient<paths>({ baseUrl: apiBase })
