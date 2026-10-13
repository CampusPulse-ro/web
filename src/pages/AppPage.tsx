import { useTranslation } from 'react-i18next'

export function AppPage() {
  const { t } = useTranslation()
  return (
    <section>
      <h1 className="m-0 text-2xl font-semibold">{t('appPage.title')}</h1>
      <p className="mt-3 text-ink-muted">{t('appPage.body')}</p>
    </section>
  )
}
