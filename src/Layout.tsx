import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getInitials, useAuth } from './auth'
import { Icon } from './components/Icon'
import { LanguageSwitch } from './components/LanguageSwitch'

export function Layout() {
  const { t } = useTranslation()
  const { isAuthenticated, user, signIn, signOut, isBusy } = useAuth()
  const navigate = useNavigate()

  // Signing in from the header lands on the dashboard, where a failed sign-in shows its reason.
  const signInFromHeader = () => {
    navigate('/app')
    void signIn()
  }

  const userInitials = getInitials(user?.name || user?.email || '')

  return (
    <div className="flex min-h-dvh flex-col bg-page text-ink">
      <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-3.5 sm:px-8">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-semibold text-ink no-underline">
            {t('app.name')}
          </Link>

          {isAuthenticated && (
            <nav className="hidden items-center gap-4 sm:flex" aria-label={t('nav.dashboard')}>
              <NavLink
                to="/app"
                className={({ isActive }) =>
                  `text-label font-medium no-underline transition ${
                    isActive ? 'text-accent' : 'text-ink-muted hover:text-ink'
                  }`
                }
              >
                {t('nav.dashboard')}
              </NavLink>
              <NavLink
                to="/timetable"
                className={({ isActive }) =>
                  `text-label font-medium no-underline transition ${
                    isActive ? 'text-accent' : 'text-ink-muted hover:text-ink'
                  }`
                }
              >
                {t('nav.timetable')}
              </NavLink>
            </nav>
          )}
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitch />

          {isAuthenticated ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Student avatar and name badge */}
              <div
                className="flex items-center gap-2 rounded-full border border-line bg-raised px-2.5 py-1"
                title={user?.email || user?.name}
              >
                <div
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-on-accent"
                  aria-hidden="true"
                >
                  {userInitials}
                </div>
                <span className="hidden max-w-32 truncate text-caption font-medium text-ink sm:inline">
                  {user?.name || user?.email}
                </span>
              </div>

              {/* Sign out button */}
              <button
                type="button"
                onClick={() => void signOut()}
                disabled={isBusy}
                className="inline-flex h-9 cursor-pointer items-center rounded-md border border-line bg-raised px-3 text-label font-medium text-ink-muted transition hover:border-line-strong hover:text-ink focus:outline-2 focus:outline-offset-2 focus:outline-accent disabled:opacity-50"
              >
                <span>{t('auth.signOut')}</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={signInFromHeader}
              disabled={isBusy}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md bg-accent px-3 text-label font-semibold text-on-accent transition hover:opacity-90 focus:outline-2 focus:outline-offset-2 focus:outline-accent disabled:opacity-50"
            >
              <Icon name="user" size={16} />
              <span>{t('auth.signIn')}</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-line px-4 py-6 text-sm text-ink-muted sm:px-8">
        <p className="m-0">{t('layout.notOfficial')}</p>
        <nav className="mt-2 flex gap-4">
          <Link to="/privacy" className="text-ink-muted underline">
            {t('layout.privacy')}
          </Link>
          <Link to="/account-deletion" className="text-ink-muted underline">
            {t('layout.deleteAccount')}
          </Link>
        </nav>
      </footer>
    </div>
  )
}
