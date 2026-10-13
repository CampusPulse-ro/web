import { useTranslation } from 'react-i18next'
import { languages, setLanguage } from '../i18n'

export function LanguageSwitch() {
  const { t, i18n } = useTranslation()
  return (
    <div role="group" aria-label={t('language.label')} className="flex gap-1 text-sm">
      {languages.map((language) => {
        const active = i18n.resolvedLanguage === language
        return (
          <button
            key={language}
            type="button"
            lang={language}
            aria-pressed={active}
            onClick={() => setLanguage(language)}
            className={`min-h-11 cursor-pointer rounded-md border px-3 ${
              active
                ? 'border-accent bg-accent/15 text-ink'
                : 'border-line bg-transparent text-ink-muted hover:text-ink'
            }`}
          >
            {t(`language.${language}`)}
          </button>
        )
      })}
    </div>
  )
}
