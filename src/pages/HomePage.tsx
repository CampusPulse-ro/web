import { Link } from 'react-router-dom'

export function HomePage() {
  return (
    <section>
      <h1 className="m-0 text-4xl font-bold tracking-tight">CampusPulse</h1>
      <p className="mt-3 text-xl text-ink-soft">Your UPT campus, in one app.</p>
      <p className="mt-6 text-ink-muted">Coming soon.</p>
      <Link
        to="/app"
        className="mt-8 inline-block rounded-md bg-accent px-4 py-2 font-medium text-white no-underline"
      >
        Open the web app
      </Link>
    </section>
  )
}
