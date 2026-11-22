import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Icon } from '../components/Icon'
import { AUTH_ERRORS, useAuth } from './context'
export interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading, isBusy, error, signIn, clearError } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-ink-muted">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
          <span className="text-caption text-ink-muted">{t('auth.checkingSession')}</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // A known reason gets its own sentence; anything else shows MSAL's message under a generic title.
    const known: Record<string, string> = {
      [AUTH_ERRORS.sessionExpired]: t('auth.sessionExpired'),
      [AUTH_ERRORS.accountGone]: t('auth.accountGone'),
      [AUTH_ERRORS.setupFailed]: t('auth.setupFailed'),
    }
    const knownMessage = error ? known[error.message] : undefined

    return (
      <div className="mx-auto flex max-w-md flex-col items-center rounded-lg border border-line bg-raised p-8 text-center sm:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-sunken text-accent">
          <Icon name="user" size={26} />
        </div>

        <h2 className="mt-5 mb-2 text-heading font-semibold text-ink">
          {t('auth.signInRequiredTitle')}
        </h2>

        <p className="m-0 mb-6 text-body-small text-ink-muted">{t('auth.signInRequiredDesc')}</p>

        {error && (
          <div className="mb-5 w-full rounded-md border border-danger/30 bg-danger/10 p-3.5 text-left text-body-small text-danger">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold">{knownMessage ?? t('auth.authError')}</span>
              <button
                type="button"
                onClick={clearError}
                aria-label={t('auth.dismissError')}
                className="cursor-pointer text-xs text-danger/80 hover:text-danger"
              >
                {'✕'}
              </button>
            </div>
            {!knownMessage && error.message && (
              <p className="mt-1 mb-0 text-caption opacity-90">{error.message}</p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => void signIn()}
          disabled={isBusy}
          className="inline-flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-accent px-4 text-label font-semibold text-on-accent transition hover:opacity-90 focus:outline-2 focus:outline-offset-2 focus:outline-accent disabled:opacity-50"
        >
          {isBusy ? (
            <span>{t('auth.signingIn')}</span>
          ) : (
            <>
              <Icon name="user" size={18} />
              <span>{t('auth.signInWithMicrosoft')}</span>
            </>
          )}
        </button>

        <span className="mt-4 text-caption text-ink-muted">{t('auth.studentAccountOnly')}</span>
      </div>
    )
  }

  return <>{children}</>
}
