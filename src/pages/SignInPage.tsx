import { Navigate, useSearchParams } from 'react-router-dom'
import { ProtectedRoute } from '../auth'

/** Only a path inside this site: never `//evil.example` or a full URL. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return '/app'
  }
  return value.startsWith('/sign-in') ? '/app' : value
}

/** `/sign-in?next=/somewhere`: the sign-in card, then on to `next` (the dashboard by default). */
export function SignInPage() {
  const [params] = useSearchParams()
  return (
    <ProtectedRoute>
      <Navigate to={safeNext(params.get('next'))} replace />
    </ProtectedRoute>
  )
}
