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

/** One line saying whether the API answers: checking, error (with retry), and the two results. */
function ApiStatusLine() {
  const { t } = useTranslation()
  const status = useApiStatus()

  let text: string
  if (status.isPending || (status.isError && status.isFetching)) text = t('appPage.api.checking')
  else if (status.isError) text = t('appPage.api.unreachable')
  else text = status.data === 'online' ? t('appPage.api.online') : t('appPage.api.degraded')

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
      <p className="m-0" role="status">
        {t('appPage.api.label')} {text}
      </p>
      {status.isError && (
        <button
          type="button"
          onClick={() => void status.refetch()}
          disabled={status.isFetching}
          className="min-h-11 rounded-md border border-line px-3 text-ink hover:bg-raised disabled:opacity-50"
        >
          {t('appPage.api.retry')}
        </button>
      )}
    </div>
  )
}
