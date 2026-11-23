/**
 * What the app knows at a given demo moment: the state of the day (the "now" badge's job), breaks,
 * room availability and deadline urgency. Pure functions over the shared demo data and clock.
 */
import { addDays, formatMinutes, minutesOf, weekdayIndex, type WallTime } from '../clock'
import {
  buildingOf,
  classesOn,
  type Assignment,
  type DemoData,
  type Occurrence,
  type RoomOccurrence,
} from '../data'
import type { ShapeName } from './shapes'

/* ── Dates and durations ─────────────────────────────────────────────────────────────────── */

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
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

export const weekday = (date: string) => WEEKDAYS[weekdayIndex(date)]
export const weekdayShort = (date: string) => weekday(date).slice(0, 3)
const dayNum = (date: string) => Number(date.slice(8, 10))
const month = (date: string) => MONTHS[Number(date.slice(5, 7)) - 1]

/** "Tuesday 24 November" */
export const longDate = (date: string) => `${weekday(date)} ${dayNum(date)} ${month(date)}`
/** "Tue 24 Nov" */
export const shortDate = (date: string) =>
  `${weekdayShort(date)} ${dayNum(date)} ${month(date).slice(0, 3)}`
/** "24 November" */
export const dayMonth = (date: string) => `${dayNum(date)} ${month(date)}`

export function daysBetween(a: string, b: string): number {
  const ms = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))
  return Math.round((ms(b) - ms(a)) / 864e5)
}

/** "today" / "tomorrow" / "Thursday" (this week) / "Wed 2 Dec" */
export function relativeDay(date: string, today: string): string {
  const d = daysBetween(today, date)
  if (d === 0) return 'today'
  if (d === 1) return 'tomorrow'
  if (d > 1 && d < 7 && weekdayIndex(date) > weekdayIndex(today)) return weekday(date)
  return shortDate(date)
}

/** 12 → "12 min", 80 → "1 h 20", 120 → "2 h" */
export function duration(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

/** Tight spaces (trailing columns): 80 → "1 h 20" */
export function durationShort(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m}` : `${h} h`
}

/** "CTI-EN 4 1.1", "CTI-EN 4 1.2" → "CTI-EN 4 groups 1.1 and 1.2" */
export function groupsText(groups: string[]): string {
  const byPrefix = new Map<string, string[]>()
  for (const g of groups) {
    const i = g.lastIndexOf(' ')
    const [p, l] = i > 0 ? [g.slice(0, i), g.slice(i + 1)] : ['', g]
    byPrefix.set(p, [...(byPrefix.get(p) ?? []), l])
  }
  const and = (xs: string[]) =>
    xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`
  return and(
    [...byPrefix.entries()].map(([p, ls]) =>
      p ? `${p} ${ls.length > 1 ? 'groups' : 'group'} ${and(ls)}` : and(ls),
    ),
  )
}

/** For screen readers: "1 hour 20 minutes" */
export function durationSpoken(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  const hs = h ? `${h} hour${h > 1 ? 's' : ''}` : ''
  const ms = m ? `${m} minute${m > 1 ? 's' : ''}` : ''
  return [hs, ms].filter(Boolean).join(' ') || '0 minutes'
}

export const hhmm = formatMinutes

/* ── Semester ────────────────────────────────────────────────────────────────────────────── */

export function weekNumber(data: DemoData, date: string): number | null {
  let n: number | null = null
  for (const w of data.semester.weeks) if (w.startsOn <= date) n = w.number
  const last = data.semester.weeks.at(-1)
  if (last && daysBetween(last.startsOn, date) >= 7) return null
  return n
}

export const weekCount = (data: DemoData) => data.semester.weeks.length

export function mondayOf(date: string): string {
  return addDays(date, -weekdayIndex(date))
}

export function weekStart(data: DemoData, week: number): string | null {
  return data.semester.weeks.find((w) => w.number === week)?.startsOn ?? null
}

/** A public holiday or a semester break on that date, in English. */
export function holidayOf(data: DemoData, date: string): string | null {
  const day = data.semester.nonTeachingDays.find((d) => d.date === date)
  if (day) return day.reason.en || 'Non-teaching day'
  const br = data.semester.breaks.find((b) => b.from <= date && date <= b.to)
  return br ? br.name?.en || 'Break' : null
}

export const isWeekend = (date: string) => weekdayIndex(date) >= 5

/* ── Classes ─────────────────────────────────────────────────────────────────────────────── */

export interface Cls {
  o: Occurrence
  date: string
  start: number
  end: number
  /** Stable id for URLs: `2026-11-24_14:00` */
  key: string
}

const toCls = (o: Occurrence): Cls => ({
  o,
  date: o.date,
  start: minutesOf(o.startsAt),
  end: minutesOf(o.endsAt),
  key: `${o.date}_${o.startsAt.slice(0, 5)}`,
})

export function dayClasses(data: DemoData, date: string): Cls[] {
  return classesOn(data.timetable, date).map(toCls)
}

export function findClass(data: DemoData, key: string | null): Cls | null {
  if (!key) return null
  const o = data.timetable.occurrences.find((x) => `${x.date}_${x.startsAt.slice(0, 5)}` === key)
  return o ? toCls(o) : null
}

/** The first class starting at or after `minutes` on `date`, looking ahead up to three weeks. */
export function nextClassFrom(data: DemoData, date: string, minutes: number): Cls | null {
  for (let i = 0; i < 21; i++) {
    const d = addDays(date, i)
    const c = dayClasses(data, d).find((x) => i > 0 || x.start >= minutes)
    if (c) return c
  }
  return null
}

/** Holidays between two dates (exclusive), so "next class" can say why it's so far away. */
export function holidaysBetween(data: DemoData, from: string, to: string) {
  const out: { date: string; reason: string }[] = []
  for (let d = addDays(from, 1); d < to; d = addDays(d, 1)) {
    if (isWeekend(d)) continue
    const h = holidayOf(data, d)
    if (h) out.push({ date: d, reason: h })
  }
  return out
}

export const kindOf = (c: Cls) => {
  const k = c.o.kinds[0] ?? 'class'
  return k.charAt(0).toUpperCase() + k.slice(1)
}

/* ── A class relative to now ──────────────────────────────────────────────────────────────── */

export type ClassPhase = 'past' | 'now' | 'future'

export function phaseOf(c: Cls, date: string, minutes: number): ClassPhase {
  if (c.date < date) return 'past'
  if (c.date > date) return 'future'
  if (c.end <= minutes) return 'past'
  if (c.start <= minutes) return 'now'
  return 'future'
}

export function classLabel(c: Cls, phase: ClassPhase, withDay = false) {
  return [
    c.o.subject,
    kindOf(c).toLowerCase(),
    withDay ? longDate(c.date) : null,
    `${hhmm(c.start)} to ${hhmm(c.end)}`,
    c.o.room ? `room ${c.o.room}` : null,
    phase === 'now' ? 'now' : phase === 'past' ? 'finished' : null,
  ]
    .filter(Boolean)
    .join(', ')
}

/* ── Subject identity: colour + shape, so colour is never the only signal ─────────────────── */

const SUBJECT_TONES = ['s3', 's1', 's4', 's6', 's2', 's7', 's5', 's8'] as const
const SUBJECT_SHAPES: ShapeName[] = [
  'cookie9',
  'clover4',
  'pentagon',
  'sunny',
  'cookie4',
  'flower',
  'gem',
  'cookie12',
]

export interface SubjectLook {
  tone: (typeof SUBJECT_TONES)[number]
  shape: ShapeName
}

export function subjectLooks(data: DemoData): Map<string, SubjectLook> {
  const names = [...new Set(data.timetable.occurrences.map((o) => o.shortName ?? o.subject))].sort()
  return new Map(
    names.map((n, i) => [
      n,
      {
        tone: SUBJECT_TONES[i % SUBJECT_TONES.length],
        shape: SUBJECT_SHAPES[i % SUBJECT_SHAPES.length],
      },
    ]),
  )
}

export const shortOf = (o: { shortName?: string | null; subject: string }) =>
  o.shortName ?? o.subject

/* ── The day's state: what the "now" badge says ──────────────────────────────────────────── */

export type DayState =
  /** In a class. */
  | { kind: 'now'; cls: Cls; left: number; progress: number; next: Cls | null; after: Cls | null }
  /** The next class starts within 15 minutes. */
  | { kind: 'soon'; cls: Cls; until: number; first: boolean }
  /** Before the first class of the day, more than 15 minutes out. */
  | { kind: 'later'; cls: Cls; until: number }
  /** Between two classes, more than 15 minutes free. */
  | { kind: 'break'; cls: Cls; until: number; since: number }
  /** The day's classes are over. */
  | { kind: 'done'; next: Cls | null; holidays: { date: string; reason: string }[] }
  /** No classes today (weekend, holiday or simply none). */
  | {
      kind: 'off'
      why: 'weekend' | 'holiday' | 'none'
      holiday: string | null
      next: Cls | null
      holidays: { date: string; reason: string }[]
    }

export const SOON = 15

export function dayState(data: DemoData, now: WallTime): DayState {
  const today = dayClasses(data, now.date)
  const t = now.minutes
  const nextAfter = (c: Cls | undefined) => {
    if (!c) return null
    return nextClassFrom(data, c.date, c.end) ?? null
  }

  const current = today.find((c) => c.start <= t && t < c.end)
  if (current) {
    const next = today.find((c) => c.start >= current.end) ?? null
    return {
      kind: 'now',
      cls: current,
      left: current.end - t,
      progress: (t - current.start) / (current.end - current.start),
      next,
      after: next ? null : nextAfter(current),
    }
  }

  const upcoming = today.find((c) => c.start > t)
  if (upcoming) {
    const before = today.filter((c) => c.end <= t)
    const until = upcoming.start - t
    if (until <= SOON) return { kind: 'soon', cls: upcoming, until, first: before.length === 0 }
    if (before.length === 0) return { kind: 'later', cls: upcoming, until }
    return { kind: 'break', cls: upcoming, until, since: before[before.length - 1].end }
  }

  const next = nextClassFrom(data, addDays(now.date, 1), 0)
  const holidays = next ? holidaysBetween(data, now.date, next.date) : []
  if (today.length) return { kind: 'done', next, holidays }
  const holiday = holidayOf(data, now.date)
  return {
    kind: 'off',
    why: holiday ? 'holiday' : isWeekend(now.date) ? 'weekend' : 'none',
    holiday,
    next,
    holidays,
  }
}

/** Each state has its own shape; a change of state morphs the badge. */
export const STATE_SHAPES: Record<DayState['kind'], ShapeName> = {
  soon: 'verySunny',
  later: 'cookie12',
  now: 'cookie9',
  break: 'square',
  done: 'circle',
  off: 'clover4',
}

/** Gaps of 30 minutes or more between two classes of the day. */
export function breaksOf(classes: Cls[]): { from: number; to: number; before: Cls }[] {
  const out: { from: number; to: number; before: Cls }[] = []
  for (let i = 1; i < classes.length; i++) {
    const gap = classes[i].start - classes[i - 1].end
    if (gap >= 30) out.push({ from: classes[i - 1].end, to: classes[i].start, before: classes[i] })
  }
  return out
}

/* ── Rooms ───────────────────────────────────────────────────────────────────────────────── */

export const DAY_END = 20 * 60
export const DAY_START = 8 * 60

export const roomDates = (data: DemoData) => {
  const any = Object.values(data.roomTimetables)[0]
  return any ? Object.keys(any).sort() : []
}

export function roomDay(data: DemoData, code: string, date: string): RoomOccurrence[] | null {
  const byDate = data.roomTimetables[code]
  if (!byDate) return null
  const day = byDate[date]
  if (!day) return null
  return [...day.occurrences].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

export type RoomStatus =
  | { known: false }
  | { known: true; free: true; until: number | null; freeFor: number }
  | { known: true; free: false; until: number; current: RoomOccurrence; freeFor: number }

/** Free or in use at `minutes`, merging back-to-back classes into one "in use until". */
export function roomStatus(
  data: DemoData,
  code: string,
  date: string,
  minutes: number,
): RoomStatus {
  const occ = roomDay(data, code, date)
  if (!occ) return { known: false }
  const spans = occ.map((o) => ({ o, s: minutesOf(o.startsAt), e: minutesOf(o.endsAt) }))
  const current = spans.find((x) => x.s <= minutes && minutes < x.e)
  if (current) {
    let until = current.e
    for (const x of spans) if (x.s <= until && x.e > until) until = x.e
    const nextBusy = spans.find((x) => x.s > until)
    const freeTo = nextBusy ? nextBusy.s : Math.max(DAY_END, until)
    return { known: true, free: false, until, current: current.o, freeFor: freeTo - until }
  }
  const nextBusy = spans.find((x) => x.s > minutes)
  if (nextBusy) return { known: true, free: true, until: nextBusy.s, freeFor: nextBusy.s - minutes }
  return { known: true, free: true, until: null, freeFor: Math.max(DAY_END - minutes, 0) }
}

/** Rooms with nothing on between `from` and `to`. */
export function freeBetween(data: DemoData, date: string, from: number, to: number): string[] {
  return data.rooms
    .map((r) => r.code)
    .filter((code) => {
      const occ = roomDay(data, code, date)
      if (!occ) return false
      return !occ.some((o) => minutesOf(o.startsAt) < to && minutesOf(o.endsAt) > from)
    })
}

/** The code-prefix group (a guess, not a building: the data has no buildings). */
export const groupOf = buildingOf

/* ── Deadlines ───────────────────────────────────────────────────────────────────────────── */

/** Campus wall-clock date + minutes of an ISO time (the offset is campus time already). */
export function wallOf(iso: string): { date: string; minutes: number } {
  return { date: iso.slice(0, 10), minutes: minutesOf(iso.slice(11, 16)) }
}

/** Minutes from now until a wall-clock moment (negative = in the past). */
export function minutesUntil(now: WallTime, at: { date: string; minutes: number }): number {
  return daysBetween(now.date, at.date) * 1440 + at.minutes - now.minutes
}

export type Urgency = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'done'

export const URGENCY_TITLES: Record<Urgency, string> = {
  overdue: 'Overdue',
  today: 'Due today',
  tomorrow: 'Due tomorrow',
  week: 'This week',
  later: 'Later',
  done: 'Submitted and graded',
}

export function urgencyOf(a: Assignment, now: WallTime): Urgency {
  if (a.status === 'submitted' || a.status === 'graded') return 'done'
  const due = wallOf(a.dueAt)
  const left = minutesUntil(now, due)
  if (left < 0) return 'overdue'
  const days = daysBetween(now.date, due.date)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days < 7) return 'week'
  return 'later'
}

/** "in 6 h", "in 3 days", "12 h late", "2 days late" */
export function relativeDue(a: Assignment, now: WallTime): string {
  const left = minutesUntil(now, wallOf(a.dueAt))
  const abs = Math.abs(left)
  const amount =
    abs < 60
      ? `${abs} min`
      : abs < 48 * 60
        ? `${Math.round(abs / 60)} h`
        : `${Math.round(abs / 1440)} days`
  return left < 0 ? `${amount} late` : `in ${amount}`
}

/** "Mon 23:59" this week, else "Tue 1 Dec 23:59" */
export function dueLabel(iso: string, now: WallTime): string {
  const w = wallOf(iso)
  const d = daysBetween(now.date, w.date)
  const day =
    d === 0
      ? 'Today'
      : d === 1
        ? 'Tomorrow'
        : Math.abs(d) < 7
          ? weekdayShort(w.date)
          : shortDate(w.date)
  return `${day} ${hhmm(w.minutes)}`
}

export const STATUS_TEXT: Record<Assignment['status'], string> = {
  notsubmitted: 'No submission yet',
  draft: 'Draft, not submitted for grading',
  submitted: 'Submitted for grading',
  graded: 'Graded',
}

export function cutoffState(a: Assignment, now: WallTime): 'open' | 'late-ok' | 'closed' {
  const left = minutesUntil(now, wallOf(a.dueAt))
  if (left >= 0) return 'open'
  if (!a.cutoffAt) return 'late-ok'
  return minutesUntil(now, wallOf(a.cutoffAt)) >= 0 ? 'late-ok' : 'closed'
}

export function bytes(n: number): string {
  return n >= 1048576 ? `${Math.round(n / 1048576)} MB` : `${Math.round(n / 1024)} KB`
}

export function fileTypesText(types: string[]): string {
  const names = types.map((t) => t.replace('.', '').toUpperCase())
  if (names.length === 1) return `${names[0]} only`
  return `${names.slice(0, -1).join(', ')} or ${names.at(-1)}`
}
