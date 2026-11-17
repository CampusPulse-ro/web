/**
 * Where the CampusPulse API lives. Every build sets `VITE_API_BASE` (the deploy and preview
 * workflows per target: stage for previews and staging, prod for production; vite.config.ts
 * refuses to build without it). Only `bun dev` without it falls back to the stage API.
 */
const stageApi = 'https://campuspulse-api-stage.thorsp.net'

export const apiBase: string = (
  import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? stageApi : '')
).replace(/\/+$/, '')

/**
 * Microsoft Entra ID configuration for UPT accounts (from AGENTS.md / api README).
 * Web, mobile and the API share this single app registration in UPT's tenant.
 * Neither the tenant id nor the client id is a secret.
 */
export const entraTenantId: string =
  import.meta.env.VITE_ENTRA_TENANT_ID || '6bb41fe4-40a3-4a10-b6cd-38278e78b21a'

export const entraClientId: string =
  import.meta.env.VITE_ENTRA_CLIENT_ID || 'bc1d7e77-6fb2-48ab-a4d5-2fd2ac7080fc'

export const entraAuthority = `https://login.microsoftonline.com/${entraTenantId}`

export const authScopes = [
  'openid',
  'profile',
  'offline_access',
  `api://${entraClientId}/access_as_user`,
]
