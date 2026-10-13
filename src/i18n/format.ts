import { useTranslation } from 'react-i18next'
import { currentLanguage, isLanguage, type Language } from './index'

/** The locale each UI language formats dates and times with. */
const locales: Record<Language, string> = { en: 'en-GB', ro: 'ro-RO' }

/**
 * Campus time. Classes happen in Timișoara, so times are shown in its zone whatever the device is
 * set to (a phone still on another country's time would otherwise show every class at the wrong
 * hour, and a date-only value like 2026-10-20 would show as the 19th west of UTC).
 */
export const campusTimeZone = 'Europe/Bucharest'

/** What a missing or unreadable date shows instead of throwing. */
const invalidDate = '—'

/**
 * Format a date and/or time for the given UI language (the current one by default), in campus
 * time. `options` are merged over the defaults; pass `timeZone` only to deliberately use another.
 */
export function formatDateTime(
  value: Date | number,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' },
  language: Language = currentLanguage(),
): string {
  // One bad value from the API must not throw (RangeError) and take the whole page down.
  if (Number.isNaN(+value)) return invalidDate
  return new Intl.DateTimeFormat(locales[language], {
    timeZone: campusTimeZone,
    ...options,
  }).format(value)
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
