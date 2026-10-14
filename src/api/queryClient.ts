import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './client'

/**
 * Caches what the API returns and tracks loading and error states for every screen
 * (TanStack Query). One instance for the whole app, provided in `main.tsx`.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // One quick retry for network errors and 5xx; a 4xx won't change by asking again.
      retry: (failures, error) =>
        failures < 1 && !(error instanceof ApiError && error.status < 500),
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})
