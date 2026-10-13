import { Link, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col bg-page text-ink">
      <header className="border-b border-line px-4 py-4 sm:px-8">
        <Link to="/" className="text-lg font-semibold text-ink no-underline">
          CampusPulse
        </Link>
      </header>

      <main className="flex-1 px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-line px-4 py-6 text-sm text-ink-muted sm:px-8">
        <p className="m-0">CampusPulse is a student project. It is not an official UPT app.</p>
        <nav className="mt-2 flex gap-4">
          <Link to="/privacy" className="text-ink-muted underline">
            Privacy policy
          </Link>
          <Link to="/account-deletion" className="text-ink-muted underline">
            Delete your account
          </Link>
        </nav>
      </footer>
    </div>
  )
}
