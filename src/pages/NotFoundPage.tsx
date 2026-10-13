import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section>
      <h1 className="m-0 text-2xl font-semibold">Page not found</h1>
      <p className="mt-3 text-ink-muted">
        There is nothing at this address.{' '}
        <Link to="/" className="text-accent underline">
          Go to the home page
        </Link>
        .
      </p>
    </section>
  )
}
