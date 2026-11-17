import {
  type Configuration,
  InteractionRequiredAuthError,
  PublicClientApplication,
} from '@azure/msal-browser'
import { entraAuthority, entraClientId, loginRequest } from './config'

export const msalConfig: Configuration = {
  auth: {
    clientId: entraClientId,
    authority: entraAuthority,
    redirectUri: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
    postLogoutRedirectUri:
      typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
  },
  cache: {
    cacheLocation: 'sessionStorage',
  },
}

export const msalInstance = new PublicClientApplication(msalConfig)

/**
 * Returns a valid access token for calling the CampusPulse API, or null if unauthenticated.
 * Acquires silently using the active account or the first available account.
 */
export async function getAccessToken(): Promise<string | null> {
  const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]
  if (!account) return null

  try {
    const result = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account,
    })
    return result.accessToken
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      return null
    }
    return null
  }
}
