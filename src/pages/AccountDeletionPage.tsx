import { useTranslation } from 'react-i18next'
import { DraftNotice } from '../components/DraftNotice'

export function AccountDeletionPage() {
  const { t } = useTranslation()
  return (
    <section>
      <h1 className="m-0 text-2xl font-semibold">{t('accountDeletion.title')}</h1>
      <div className="mt-4">
        <DraftNotice />
      </div>
      <p className="mt-6 text-ink-soft">{t('accountDeletion.body')}</p>
    </section>
  )
}
