/**
 * Where the CampusPulse API lives. The Deploy and Preview workflows set `VITE_API_BASE` for
 * each target (the stage API for previews and staging, the prod API for production); local
 * development without it talks to stage.
 */
export const apiBase: string =
  import.meta.env.VITE_API_BASE || 'https://campuspulse-api-stage.thorsp.net'
