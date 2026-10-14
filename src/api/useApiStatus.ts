import { useQuery } from '@tanstack/react-query'
import { api, unwrap } from './client'

/** `online`: the API and its database answer. `degraded`: the API answers, its database doesn't. */
export type ApiStatus = 'online' | 'degraded'

/**
 * Whether the API is reachable and ready, from `GET /health/ready`. A special case of the usual
 * pattern (`unwrap(await api.GET(…))`): here a 503 is a result to show, not an error.
 * `networkMode: 'always'`: offline is a result too ("can't be reached"), not a paused query.
 */
export function useApiStatus() {
  return useQuery({
    queryKey: ['health', 'ready'],
    networkMode: 'always',
    queryFn: async ({ signal }): Promise<ApiStatus> => {
      const result = await api.GET('/health/ready', { signal })
      if (result.response.status === 503) return 'degraded'
      unwrap(result)
      return 'online'
    },
  })
}
