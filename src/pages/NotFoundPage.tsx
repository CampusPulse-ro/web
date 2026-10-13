import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <section>
      <h1 className="m-0 text-2xl font-semibold">{t('notFound.title')}</h1>
      <p className="mt-3 text-ink-muted">
        <Trans
          i18nKey="notFound.body"
          components={{ home: <Link to="/" className="text-accent underline" /> }}
        />
      </p>
    </section>
  )
}
