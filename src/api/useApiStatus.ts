import { useQuery } from '@tanstack/react-query'
import { api } from './client'

/** `online`: the API and its database answer. `degraded`: the API answers, its database doesn't. */
export type ApiStatus = 'online' | 'degraded'

/**
 * Whether the API is reachable and ready, from `GET /health/ready`. Loading and errors come from
 * TanStack Query (`isPending`, `isError`, `refetch`): an error means the API couldn't be reached.
 * A pattern to copy for real data: one hook per call, the call made through `api`.
 */
export function useApiStatus() {
  return useQuery({
    queryKey: ['health', 'ready'],
    queryFn: async ({ signal }): Promise<ApiStatus> => {
      const { data, response } = await api.GET('/health/ready', { signal })
      if (data) return 'online'
      if (response.status === 503) return 'degraded'
      throw new Error(`Unexpected response from the API: HTTP ${response.status}`)
    },
  })
}
