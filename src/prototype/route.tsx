import { lazy, Suspense } from 'react'

// UI prototype (throwaway, see README.md here): its own full-screen shell, loaded on demand.
const Prototype = lazy(() => import('./d-refined'))

export function PrototypeRoute() {
  return (
    <Suspense fallback={null}>
      <Prototype />
    </Suspense>
  )
}
