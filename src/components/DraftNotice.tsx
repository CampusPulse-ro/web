import { useTranslation } from 'react-i18next'

export function DraftNotice() {
  const { t } = useTranslation()
  return (
    <p className="rounded-md border border-warn/40 bg-warn/10 px-4 py-3 text-sm text-warn">
      {t('draftNotice')}
    </p>
  )
}
