/**
 * Where the CampusPulse API lives. Every build sets `VITE_API_BASE` (the deploy and preview
 * workflows per target: stage for previews and staging, prod for production; vite.config.ts
 * refuses to build without it). Only `bun dev` without it falls back to the stage API.
 */
const stageApi = 'https://campuspulse-api-stage.thorsp.net'

export const apiBase: string = (
  import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? stageApi : '')
).replace(/\/+$/, '')
