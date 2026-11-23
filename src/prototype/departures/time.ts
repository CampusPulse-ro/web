/** Date and time wording for prototype A. Everything is campus wall-clock time (see `../clock.ts`). */
import { addDays, formatMinutes, weekdayIndex, type WallTime } from '../clock'

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3))

/** Days since the epoch, for date arithmetic on `YYYY-MM-DD`. */
function dayNumber(date: string): number {
  return Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) / 864e5
}

export function daysBetween(from: string, to: string): number {
  return Math.round(dayNumber(to) - dayNumber(from))
}

/** Wall-clock ms of a demo moment (the inverse of the clock's own conversion). */
export function wallMs(t: WallTime): number {
  return dayNumber(t.date) * 864e5 + t.minutes * 60_000 + t.seconds * 1000
}

/** Minutes from midnight, with the seconds as a fraction. */
export function nowMinutes(t: WallTime): number {
  return t.minutes + t.seconds / 60
}

/** `YYYY-MM-DDTHH:MM` for `?at=`. */
export function atParam(ms: number): string {
  return new Date(ms).toISOString().slice(0, 16)
}

export function weekday(date: string): string {
  return WEEKDAYS[weekdayIndex(date)]
}

export function weekdayShort(date: string): string {
  return WEEKDAYS_SHORT[weekdayIndex(date)]
}

export function dayOfMonth(date: string): number {
  return +date.slice(8, 10)
}

/** "Tuesday 24 November" */
export function longDate(date: string): string {
  return `${weekday(date)} ${dayOfMonth(date)} ${MONTHS[+date.slice(5, 7) - 1]}`
}

/** "24 November" */
export function dayMonth(date: string): string {
  return `${dayOfMonth(date)} ${MONTHS[+date.slice(5, 7) - 1]}`
}

/** "Tue 24 Nov" */
export function shortDate(date: string): string {
  return `${weekdayShort(date)} ${dayOfMonth(date)} ${MONTHS_SHORT[+date.slice(5, 7) - 1]}`
}

/** "today", "tomorrow", "Thursday" (within the week ahead), else "Wed 2 Dec". */
export function relativeDay(date: string, today: string): string {
  const d = daysBetween(today, date)
  if (d === 0) return 'today'
  if (d === 1) return 'tomorrow'
  if (d === -1) return 'yesterday'
  if (d > 1 && d < 7) return weekday(date)
  return shortDate(date)
}

export function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** `HH:MM:SS` → `HH:MM`. */
export function hm(time: string): string {
  return time.slice(0, 5)
}

export { formatMinutes as clock }

/** "12 min", "1 h", "1 h 05", "3 h 19". */
export function duration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r === 0 ? `${h} h` : `${h} h ${String(r).padStart(2, '0')}`
}

/** For screen readers: "1 hour 5 minutes". */
export function spokenDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes))
  const h = Math.floor(m / 60)
  const r = m % 60
  const parts = []
  if (h) parts.push(`${h} ${h === 1 ? 'hour' : 'hours'}`)
  if (r || !h) parts.push(`${r} ${r === 1 ? 'minute' : 'minutes'}`)
  return parts.join(' ')
}

/** An ISO time with the campus offset (`2026-11-24T18:00:00+02:00`) as wall-clock date and minutes. */
export function parseWall(iso: string): { date: string; minutes: number } {
  return { date: iso.slice(0, 10), minutes: +iso.slice(11, 13) * 60 + +iso.slice(14, 16) }
}

/** Monday of the week that holds `date`. */
export function mondayOf(date: string): string {
  return addDays(date, -weekdayIndex(date))
}

/** Every date from `from` to `to`, both included. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d)
  return out
}
