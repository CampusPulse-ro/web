import { useTranslation } from 'react-i18next'
import { Link, Outlet } from 'react-router-dom'
import { LanguageSwitch } from './components/LanguageSwitch'

export function Layout() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-dvh flex-col bg-page text-ink">
      <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-4 sm:px-8">
        <Link to="/" className="text-lg font-semibold text-ink no-underline">
          {t('app.name')}
        </Link>
        <LanguageSwitch />
      </header>

      <main className="flex-1 px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-2xl">
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
