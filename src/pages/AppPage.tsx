import { useTranslation } from 'react-i18next'
import { useApiStatus } from '../api/useApiStatus'

export function AppPage() {
  const { t } = useTranslation()
  return (
    <section>
      <h1 className="m-0 text-2xl font-semibold">{t('appPage.title')}</h1>
      <p className="mt-3 text-ink-muted">{t('appPage.body')}</p>
      <ApiStatusLine />
    </section>
  )
}

/** One line saying whether the API answers: loading, error (with retry), and the two results. */
function ApiStatusLine() {
  const { t } = useTranslation()
  const status = useApiStatus()

  let text: string
  if (status.isPending) text = t('appPage.api.checking')
  else if (status.isError) text = t('appPage.api.unreachable')
  else text = status.data === 'online' ? t('appPage.api.online') : t('appPage.api.degraded')

  return (
    <p className="mt-6 flex flex-wrap items-center gap-3 text-sm text-ink-muted" role="status">
      <span>
        {t('appPage.api.label')} {text}
      </span>
      {status.isError && (
        <button
          type="button"
          onClick={() => void status.refetch()}
          className="min-h-11 rounded-md border border-line px-3 text-ink hover:bg-raised"
        >
          {t('appPage.api.retry')}
        </button>
      )}
    </p>
  )
}
