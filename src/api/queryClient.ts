import { QueryClient } from '@tanstack/react-query'

/**
 * Caches what the API returns and tracks loading and error states for every screen
 * (TanStack Query). One instance for the whole app, provided in `main.tsx`.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // one quick retry, then show the error state with its own "Try again"
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})
