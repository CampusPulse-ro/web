import { useTranslation } from 'react-i18next'
import { currentLanguage, isLanguage, type Language } from './index'

/** The locale each UI language formats dates and times with. */
const locales: Record<Language, string> = { en: 'en-GB', ro: 'ro-RO' }

/** Format a date and/or time for the given UI language (the current one by default). */
export function formatDateTime(
  value: Date | number,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
  language: Language = currentLanguage(),
): string {
  return new Intl.DateTimeFormat(locales[language], options).format(value)
}

/** Date and time formatters for the current language; components using it re-render on a switch. */
export function useDateTimeFormat() {
  const { i18n } = useTranslation()
  const language = isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : currentLanguage()
  return {
    date: (value: Date | number) => formatDateTime(value, { dateStyle: 'medium' }, language),
    time: (value: Date | number) => formatDateTime(value, { timeStyle: 'short' }, language),
    dateTime: (value: Date | number) => formatDateTime(value, undefined, language),
  }
}
