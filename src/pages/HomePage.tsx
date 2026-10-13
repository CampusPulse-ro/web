import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function HomePage() {
  const { t } = useTranslation()
  return (
    <section>
      <h1 className="m-0 text-4xl font-bold tracking-tight">{t('app.name')}</h1>
      <p className="mt-3 text-xl text-ink-soft">{t('home.tagline')}</p>
      <p className="mt-6 text-ink-muted">{t('home.comingSoon')}</p>
      <Link
        to="/app"
        className="mt-8 inline-block rounded-md bg-accent px-4 py-2 font-medium text-white no-underline"
      >
        {t('home.openWebApp')}
      </Link>
    </section>
  )
}
