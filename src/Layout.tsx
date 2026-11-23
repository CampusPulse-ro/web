import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import type { Me } from './api/client'
import { getInitials, useAuth } from './auth'
import { Icon } from './components/Icon'
import { LanguageSwitch } from './components/LanguageSwitch'
import { buttonClasses } from './components/styles'

const navItems = [
  { to: '/app', labelKey: 'nav.dashboard' },
  { to: '/timetable', labelKey: 'nav.timetable' },
  { to: '/deadlines', labelKey: 'nav.deadlines' },
] as const

export function Layout() {
  const { t } = useTranslation()
  const { isAuthenticated, user } = useAuth()
  const location = useLocation()

  // Signing in from the header comes back to this page (the dashboard from the landing page).
  const here = `${location.pathname}${location.search}`
  const signInHref =
    location.pathname === '/' ? '/sign-in' : `/sign-in?next=${encodeURIComponent(here)}`

  return (
    <div className="flex min-h-dvh flex-col bg-page text-ink">
      <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-3.5 sm:px-8">
        <div className="flex items-center gap-6">
          <Link to="/" className="text-lg font-semibold text-ink no-underline">
            {t('app.name')}
          </Link>

          {isAuthenticated && (
            <nav className="hidden items-center gap-4 sm:flex" aria-label={t('nav.main')}>
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `text-label font-medium no-underline transition ${
                      isActive ? 'text-accent' : 'text-ink-muted hover:text-ink'
                    }`
                  }
                >
                  {t(item.labelKey)}
                </NavLink>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitch />

          {user ? (
            <AccountMenu user={user} />
          ) : (
            location.pathname !== '/sign-in' && (
              <Link to={signInHref} className={buttonClasses('primary', 'sm')}>
                <Icon name="user" size={16} className="max-sm:hidden" />
                <span>{t('auth.signIn')}</span>
              </Link>
            )
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

const menuItemClasses =
  'flex h-10 w-full cursor-pointer items-center gap-2.5 rounded-sm px-3 text-left text-label text-ink-soft no-underline transition hover:bg-sunken hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent'

/**
 * The avatar button and its menu: who is signed in, the account page, sign out, and (at phone
 * width, where the header has no room for them) the main links. Closes on Escape, a click
 * outside, or choosing an item.
 */
function AccountMenu({ user }: { user: Me }) {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="flex h-11 cursor-pointer items-center gap-2 rounded-full p-1 text-ink transition hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:pr-2"
      >
        <span
          aria-hidden="true"
          className="flex size-8 items-center justify-center rounded-full bg-accent text-caption font-bold text-on-accent"
        >
          {getInitials(user.displayName || user.email || '')}
        </span>
        <span className="hidden max-w-40 truncate text-label sm:inline">{user.displayName}</span>
        <span className="sr-only">{t('nav.accountMenu')}</span>
        <Icon name="chevron-down" size={16} className="text-ink-muted max-sm:hidden" />
      </button>

      {open && (
        <div
          id={menuId}
          className="absolute top-full right-0 z-20 mt-2 flex w-72 flex-col gap-1 rounded-lg border border-line bg-raised p-2 shadow-lg"
        >
          <div className="flex flex-col gap-0.5 px-3 pt-2 pb-3">
            <span className="truncate text-label text-ink">{user.displayName}</span>
            {user.email && (
              <span className="truncate text-body-small text-ink-muted">{user.email}</span>
            )}
          </div>

          <nav
            aria-label={t('nav.main')}
            className="flex flex-col border-t border-line pt-1 sm:hidden"
          >
            {navItems.map((item) => (
              <Link key={item.to} to={item.to} onClick={close} className={menuItemClasses}>
                {t(item.labelKey)}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col border-t border-line pt-1">
            <Link to="/account" onClick={close} className={menuItemClasses}>
              <Icon name="user" size={18} />
              {t('nav.account')}
            </Link>
            <button
              type="button"
              onClick={() => {
                close()
                void signOut()
              }}
              className={menuItemClasses}
            >
              <Icon name="logout" size={18} />
              {t('auth.signOut')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
