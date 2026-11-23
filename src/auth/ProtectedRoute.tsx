import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/Button'
import { useAuth } from './context'
import { SignInCard } from './SignInCard'

export interface ProtectedRouteProps {
  children: ReactNode
}

/** Shows `children` to a signed-in student; otherwise the sign-in card, on the same address. */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, status } = useAuth()

  if (isAuthenticated) return <>{children}</>
  if (isLoading) return <CheckingSession />
  if (status === 'unreachable') return <SessionUnreachable />
  return <SignInCard />
}

export function CheckingSession() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3" role="status">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
        <span className="text-caption text-ink-muted">{t('auth.checkingSession')}</span>
      </div>
    </div>
  )
}

/** A stored session that couldn't be resumed because the API didn't answer: still signed in. */
function SessionUnreachable() {
  const { t } = useTranslation()
  const { retryResume, signOut, isLoading } = useAuth()
  return (
    <section className="mx-auto flex max-w-sm flex-col gap-4 py-10" role="alert">
      <h1 className="m-0 text-heading text-ink">{t('auth.unreachableTitle')}</h1>
      <p className="m-0 text-body text-ink-muted">{t('auth.unreachableBody')}</p>
      <div className="flex flex-wrap gap-3">
        <Button onClick={retryResume} loading={isLoading}>
          {t('auth.retry')}
        </Button>
        <Button variant="ghost" onClick={() => void signOut()}>
          {t('auth.signOut')}
        </Button>
      </div>
    </section>
  )
}
