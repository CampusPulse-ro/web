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
    /** Any other combination, e.g. `{ weekday: 'short', day: 'numeric', month: 'short' }`. */
    custom: (value: Date | number, options: Intl.DateTimeFormatOptions) =>
      formatDateTime(value, options, language),
  }
}

// Campus wall time: date and time inputs are read and filled in campus time, whatever the
// device's own zone, so "23:59" means 23:59 in Timișoara.

const campusPartsFormat = new Intl.DateTimeFormat('en-GB', {
  timeZone: campusTimeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function campusParts(value: Date | number) {
  const parts: Record<string, number> = {}
  for (const part of campusPartsFormat.formatToParts(value)) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value)
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour,
    minute: parts.minute,
  }
}

const pad = (value: number) => String(value).padStart(2, '0')

/** The campus date of an instant, as a date input holds it (`2026-11-24`). */
export function campusDate(value: Date | number): string {
  const p = campusParts(value)
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`
}

/** The campus time of an instant, as a time input holds it (`18:00`). */
export function campusTime(value: Date | number): string {
  const p = campusParts(value)
  return `${pad(p.hour)}:${pad(p.minute)}`
}

/** How far the campus clock is ahead of UTC at `instant`, in ms. */
function campusOffset(instant: number): number {
  const p = campusParts(instant)
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
  return wall - (instant - (((instant % 60_000) + 60_000) % 60_000))
}

/**
 * The instant a campus date and time stand for (`2026-11-24`, `18:00`), or null if either can't
 * be read. Checked twice around the clock change, so a time near it lands on the right side.
 */
export function campusInstant(date: string, time: string): Date | null {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const t = /^(\d{2}):(\d{2})$/.exec(time)
  if (!d || !t) return null
  const wall = Date.UTC(+d[1], +d[2] - 1, +d[3], +t[1], +t[2])
  if (Number.isNaN(wall)) return null
  const guess = wall - campusOffset(wall)
  return new Date(wall - campusOffset(guess))
}

/** Whole days from campus date `from` to campus date `to` (both `YYYY-MM-DD`). */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000)
}

/** Monday 1 … Sunday 7, for a campus date. */
export function isoWeekday(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7
}
