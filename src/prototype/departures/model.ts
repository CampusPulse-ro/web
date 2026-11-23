/**
 * What prototype A says, worked out from the demo data and the demo clock: the hero's state, the
 * day's board rows and breaks, room status, deadline groups. No React here.
 */
import type { CSSProperties } from 'react'
import type { components } from '../../api/schema'
import { addDays, minutesOf, weekdayIndex, type WallTime } from '../clock'
import {
  buildingOf,
  classesOn,
  type Assignment,
  type DemoData,
  type Occurrence,
  type RoomOccurrence,
  type RoomTimetable,
} from '../data'
import {
  clock,
  dateRange,
  dayMonth,
  daysBetween,
  duration,
  nowMinutes,
  parseWall,
  shortDate,
} from './time'

type ActivityKind = components['schemas']['ActivityKind']

/** Classes run from 08:00 to 20:00; the room strips and "free for the rest of the day" use this. */
export const DAY_START = 8 * 60
export const DAY_END = 20 * 60
/** A class this close is "go now" (room first); further away, the hero says how long you're free. */
export const SOON = 30
/** Breaks shorter than this aren't worth a row. */
export const MIN_GAP = 30

const KIND: Record<ActivityKind, string> = {
  course: 'Course',
  lab: 'Lab',
  seminar: 'Seminar',
  project: 'Project',
  facultative: 'Optional activity',
}

export function kindLabel(kinds: ActivityKind[]): string {
  if (kinds.length === 0) return 'Class'
  const words = kinds.map((k) => KIND[k])
  return [words[0], ...words.slice(1).map((w) => w.toLowerCase())].join(' and ')
}

export function shortOf(o: { shortName: string | null; subject: string }): string {
  if (o.shortName) return o.shortName
  return o.subject
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .map((w) => w[0].toUpperCase())
    .join('')
    .slice(0, 4)
}

/** A stable id for one class on one day, for the URL. */
export function classKey(o: Occurrence): string {
  return `${o.date}_${o.startsAt.slice(0, 2)}${o.startsAt.slice(3, 5)}`
}

export function findClass(data: DemoData, key: string | null): Occurrence | null {
  if (!key) return null
  return data.timetable.occurrences.find((o) => classKey(o) === key) ?? null
}

export const startOf = (o: { startsAt: string }) => minutesOf(o.startsAt)
export const endOf = (o: { endsAt: string }) => minutesOf(o.endsAt)

// ── Subject colour (borrowed from direction B) ───────────────────────────────────────────────
// One hue per subject, kept away from the hues that carry meaning: blue (live), amber (in use),
// green (free) and red (late). Lightness and chroma are fixed in CSS, so every hue has the same
// contrast on the page. The mapping is deterministic: a fixed table for this snapshot, a hash else.
const HUES: Record<string, number> = { CAD: 195, MER: 62, MM: 286, MSA: 318, SSV: 352, VVHS: 128 }
const SPARE_HUES = [195, 62, 318, 128, 352, 286, 100, 335]

export function subjectHue(short: string): number {
  if (short in HUES) return HUES[short]
  let h = 0
  for (const c of short) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return SPARE_HUES[h % SPARE_HUES.length]
}

/** `style` for an element whose CSS reads `--hue`. */
export function hueStyle(short: string): CSSProperties {
  return { '--hue': subjectHue(short) } as CSSProperties
}

// ── Calendar ─────────────────────────────────────────────────────────────────────────────────

export function weekOf(data: DemoData, date: string): number | null {
  let found: number | null = null
  for (const w of data.semester.weeks) {
    if (w.startsOn <= date && daysBetween(w.startsOn, date) < 7) found = w.number
  }
  return found
}

/** Why there's no teaching on a date (a public holiday or a break), or null. */
export function nonTeaching(data: DemoData, date: string): string | null {
  const day = data.semester.nonTeachingDays.find((d) => d.date === date)
  if (day) return day.reason.en
  const brk = data.semester.breaks.find((b) => b.from <= date && date <= b.to)
  if (brk) return brk.name?.en ?? 'Semester break'
  return null
}

export const isWeekend = (date: string) => weekdayIndex(date) >= 5

/** The days the pager can show: the timetable's range, plus today if the demo clock is outside it. */
export function pagerDays(data: DemoData, today: string): string[] {
  const from = today < data.timetable.from ? today : data.timetable.from
  const to = today > data.timetable.to ? today : data.timetable.to
  return dateRange(from, to)
}

export const inTimetable = (data: DemoData, date: string) =>
  data.timetable.from <= date && date <= data.timetable.to

// ── The hero ─────────────────────────────────────────────────────────────────────────────────

/** The first class on a later day, and the weekday holidays skipped on the way to it. */
export interface NextDay {
  occ: Occurrence
  skipped: { date: string; reason: string }[]
}

export function nextDayAfter(data: DemoData, date: string): NextDay | null {
  const occ = [...data.timetable.occurrences]
    .filter((o) => o.date > date)
    .sort((a, b) => (a.date + a.startsAt).localeCompare(b.date + b.startsAt))[0]
  if (!occ) return null
  const skipped = dateRange(addDays(date, 1), addDays(occ.date, -1))
    .filter((d) => !isWeekend(d))
    .map((d) => ({ date: d, reason: nonTeaching(data, d) }))
    .filter((d): d is { date: string; reason: string } => d.reason !== null)
  return { occ, skipped }
}

export type Hero =
  /** The next class starts within `SOON` minutes: where to go, how long you have. */
  | { mode: 'soon'; next: Occurrence; until: number; sameRoom: boolean }
  | {
      mode: 'class'
      current: Occurrence
      left: number
      elapsed: number
      total: number
      next: Occurrence | null
      /** Minutes between this class and the next one today. */
      gapAfter: number | null
      later: NextDay | null
    }
  /** A break (or the morning before the first class) of more than `SOON` minutes. */
  | { mode: 'free'; next: Occurrence; until: number; first: boolean }
  | { mode: 'done'; count: number; later: NextDay | null }
  | { mode: 'none'; reason: string; later: NextDay | null }

export function heroState(data: DemoData, now: WallTime): Hero {
  const t = nowMinutes(now)
  const classes = classesOn(data.timetable, now.date)
  const current = classes.find((c) => startOf(c) <= t && t < endOf(c))
  if (current) {
    const next = classes.find((c) => c !== current && startOf(c) >= endOf(current)) ?? null
    return {
      mode: 'class',
      current,
      left: Math.ceil(endOf(current) - t - 1e-6),
      elapsed: t - startOf(current),
      total: endOf(current) - startOf(current),
      next,
      gapAfter: next ? startOf(next) - endOf(current) : null,
      later: next ? null : nextDayAfter(data, now.date),
    }
  }
  const upcoming = classes.find((c) => startOf(c) > t)
  if (upcoming) {
    const until = Math.ceil(startOf(upcoming) - t - 1e-6)
    const before = classes.filter((c) => endOf(c) <= t)
    if (until <= SOON) {
      const prev = before.at(-1)
      return {
        mode: 'soon',
        next: upcoming,
        until,
        sameRoom: !!prev && prev.room === upcoming.room,
      }
    }
    return { mode: 'free', next: upcoming, until, first: before.length === 0 }
  }
  if (classes.length)
    return { mode: 'done', count: classes.length, later: nextDayAfter(data, now.date) }
  let reason: string
  if (!inTimetable(data, now.date)) reason = 'Outside this demo’s timetable'
  else
    reason = nonTeaching(data, now.date) ?? (isWeekend(now.date) ? 'Weekend' : 'No classes today')
  return { mode: 'none', reason, later: nextDayAfter(data, now.date) }
}

/** Changes when the hero shows a different state or class (not when only the minutes change). */
export function heroKey(h: Hero): string {
  switch (h.mode) {
    case 'class':
      return `class-${h.current.date}-${h.current.startsAt}`
    case 'soon':
    case 'free':
      return `${h.mode}-${h.next.date}-${h.next.startsAt}`
    default:
      return h.mode
  }
}

/** What a screen reader hears when the hero's state changes (never every minute). */
export function heroAnnouncement(h: Hero): string {
  switch (h.mode) {
    case 'class':
      return `Class started: ${h.current.subject}, room ${h.current.room ?? 'not set'}.`
    case 'soon':
      return `Next: ${h.next.subject} in room ${h.next.room ?? 'not set'}, in ${duration(h.until)}.`
    case 'free':
      return `Free until ${clock(startOf(h.next))}.`
    case 'done':
      return 'Done for today.'
    case 'none':
      return h.reason
  }
}

// ── The day's board ──────────────────────────────────────────────────────────────────────────

export type RowState = 'past' | 'now' | 'later'

export type BoardItem =
  | { type: 'class'; key: string; occ: Occurrence; state: RowState }
  | {
      type: 'gap'
      key: string
      from: number
      to: number
      now: boolean
      /** The room you're leaving, for "rooms free near …". */
      near: string | null
    }

export interface Board {
  /** Today's finished classes, folded into "Earlier today". */
  earlier: Occurrence[]
  items: BoardItem[]
  count: number
}

export function boardFor(data: DemoData, date: string, now: WallTime): Board {
  const t = nowMinutes(now)
  const classes = classesOn(data.timetable, date)
  const isToday = date === now.date
  const isPast = date < now.date
  const state = (c: Occurrence): RowState => {
    if (isPast) return 'past'
    if (!isToday) return 'later'
    if (endOf(c) <= t) return 'past'
    return startOf(c) <= t ? 'now' : 'later'
  }
  const items: BoardItem[] = []
  const earlier: Occurrence[] = []
  classes.forEach((c, i) => {
    const prev = classes[i - 1]
    if (prev && startOf(c) - endOf(prev) >= MIN_GAP) {
      const from = endOf(prev)
      const to = startOf(c)
      if (!isToday || to > t) {
        items.push({
          type: 'gap',
          key: `gap-${from}`,
          from,
          to,
          now: isToday && from <= t,
          near: prev.room,
        })
      }
    }
    const s = state(c)
    if (isToday && s === 'past') earlier.push(c)
    else items.push({ type: 'class', key: classKey(c), occ: c, state: s })
  })
  return { earlier, items, count: classes.length }
}

// ── Rooms ────────────────────────────────────────────────────────────────────────────────────

interface Block {
  from: number
  to: number
}

/** A room's classes merged into busy blocks (back-to-back classes are one block). */
export function busyBlocks(rt: RoomTimetable): Block[] {
  const sorted = [...rt.occurrences].sort((a, b) => startOf(a) - startOf(b))
  const out: Block[] = []
  for (const o of sorted) {
    const last = out.at(-1)
    if (last && startOf(o) <= last.to) last.to = Math.max(last.to, endOf(o))
    else out.push({ from: startOf(o), to: endOf(o) })
  }
  return out
}

/** The free stretches between 08:00 and 20:00. */
export function freeBlocks(rt: RoomTimetable): Block[] {
  const out: Block[] = []
  let cursor = DAY_START
  for (const b of busyBlocks(rt)) {
    if (b.from > cursor) out.push({ from: cursor, to: Math.min(b.from, DAY_END) })
    cursor = Math.max(cursor, b.to)
  }
  if (cursor < DAY_END) out.push({ from: cursor, to: DAY_END })
  return out
}

export type RoomStatus =
  | { kind: 'free'; until: number | null; freeFor: number }
  | { kind: 'busy'; until: number; current: RoomOccurrence | null; nextFree: Block | null }
  | { kind: 'closed' }
  | { kind: 'unknown' }

export function roomStatus(rt: RoomTimetable | undefined, at: number): RoomStatus {
  if (!rt) return { kind: 'unknown' }
  if (at >= DAY_END) return { kind: 'closed' }
  const blocks = busyBlocks(rt)
  const busy = blocks.find((b) => b.from <= at && at < b.to)
  if (busy) {
    const current = rt.occurrences.find((o) => startOf(o) <= at && at < endOf(o)) ?? null
    const nextFree = freeBlocks(rt).find((f) => f.from >= busy.to) ?? null
    return { kind: 'busy', until: busy.to, current, nextFree }
  }
  const next = blocks.find((b) => b.from > at)
  const from = Math.max(at, DAY_START)
  return next
    ? { kind: 'free', until: next.from, freeFor: next.from - from }
    : { kind: 'free', until: null, freeFor: DAY_END - from }
}

/** Free rooms sorted by how long they stay free, then busy ones by when they free up. */
export function statusRank(s: RoomStatus): number {
  switch (s.kind) {
    case 'free':
      return -s.freeFor
    case 'busy':
      return 10_000 + s.until
    case 'closed':
      return 20_000
    case 'unknown':
      return 30_000
  }
}

export function roomDay(data: DemoData, code: string, date: string): RoomTimetable | undefined {
  return data.roomTimetables[code]?.[date]
}

/** The dates that have room schedules in the snapshot. */
export function roomDates(data: DemoData): string[] {
  const first = Object.values(data.roomTimetables)[0]
  return first ? Object.keys(first).sort() : []
}

/** Rooms in the same code group as `near` that are free for the whole window, or null if unknown. */
export function freeRoomsNear(
  data: DemoData,
  date: string,
  from: number,
  to: number,
  near: string,
): { group: string; rooms: string[] } | null {
  if (!roomDates(data).includes(date)) return null
  const group = buildingOf(near)
  const rooms = data.rooms
    .map((r) => r.code)
    .filter((code) => buildingOf(code) === group)
    .filter((code) => {
      const rt = roomDay(data, code, date)
      return !!rt && !rt.occurrences.some((o) => startOf(o) < to && endOf(o) > from)
    })
  return { group, rooms }
}

/** Code groups with at least three rooms get a section; the rest share "Other rooms". */
export function roomGroups(codes: string[]): { group: string; codes: string[] }[] {
  const by = new Map<string, string[]>()
  for (const c of codes) by.set(buildingOf(c), [...(by.get(buildingOf(c)) ?? []), c])
  const big = [...by.entries()]
    .filter(([, cs]) => cs.length >= 3)
    .sort(([a], [b]) => a.localeCompare(b))
  const other = [...by.entries()].filter(([, cs]) => cs.length < 3).flatMap(([, cs]) => cs)
  const out = big.map(([group, cs]) => ({ group, codes: cs }))
  if (other.length) out.push({ group: '', codes: other })
  return out
}

/** The class of yours (if any) held in a room at a time, for "your class" marks. */
export function yourClassIn(
  data: DemoData,
  code: string,
  date: string,
  o: RoomOccurrence,
): Occurrence | null {
  return (
    data.timetable.occurrences.find(
      (c) => c.date === date && c.room === code && c.startsAt === o.startsAt,
    ) ?? null
  )
}

// ── Deadlines ────────────────────────────────────────────────────────────────────────────────

export type DeadlineGroupId = 'overdue' | 'today' | 'week' | 'later' | 'done'

export const GROUP_LABEL: Record<DeadlineGroupId, string> = {
  overdue: 'Overdue',
  today: 'Due today',
  week: 'This week',
  later: 'Later',
  done: 'Handed in',
}

export interface Deadline {
  a: Assignment
  group: DeadlineGroupId
  /** Minutes from now to the due time; negative when late. */
  until: number
  due: { date: string; minutes: number }
  /** A late submission is still accepted until then. */
  cutoff: { date: string; minutes: number } | null
  cutoffPassed: boolean
}

function minutesUntil(now: WallTime, at: { date: string; minutes: number }): number {
  return daysBetween(now.date, at.date) * 1440 + at.minutes - nowMinutes(now)
}

export function deadlines(data: DemoData, now: WallTime): Deadline[] {
  return data.assignments
    .map((a): Deadline => {
      const due = parseWall(a.dueAt)
      const cutoff = a.cutoffAt ? parseWall(a.cutoffAt) : null
      const until = minutesUntil(now, due)
      const done = a.status === 'submitted' || a.status === 'graded'
      let group: DeadlineGroupId
      if (done) group = 'done'
      else if (until < 0) group = 'overdue'
      else if (due.date === now.date) group = 'today'
      else if (daysBetween(now.date, due.date) < 7) group = 'week'
      else group = 'later'
      return {
        a,
        group,
        until,
        due,
        cutoff,
        cutoffPassed: !!cutoff && minutesUntil(now, cutoff) < 0,
      }
    })
    .sort((x, y) => x.until - y.until)
}

/** "in 3 h 19", "tomorrow", "in 3 days", "15 h late", "2 days late". */
export function dueRelative(d: Deadline, today: string): string {
  if (d.until < 0) {
    const late = -d.until
    if (late < 60) return `${Math.ceil(late)} min late`
    if (late < 1440) return `${Math.floor(late / 60)} h late`
    const days = Math.floor(late / 1440)
    return `${days} ${days === 1 ? 'day' : 'days'} late`
  }
  const days = daysBetween(today, d.due.date)
  if (days === 0) return `in ${duration(d.until)}`
  if (days === 1) return 'tomorrow'
  return `in ${days} days`
}

export function dueExact(at: { date: string; minutes: number }): string {
  return `${shortDate(at.date)}, ${clock(at.minutes)}`
}

export function statusLabel(a: Assignment): string {
  switch (a.status) {
    case 'notsubmitted':
      return 'Not submitted'
    case 'draft':
      return 'Draft, not submitted for grading'
    case 'submitted':
      return 'Submitted for grading'
    case 'graded':
      return a.grade ? `Graded: ${a.grade}` : 'Graded'
  }
}

/** "1 file, PDF, up to 10 MB" */
export function limitsText(a: Assignment): string {
  const files = a.maxFiles === 1 ? '1 file' : `Up to ${a.maxFiles} files`
  const types = a.fileTypes.length
    ? a.fileTypes.map((t) => (t.length <= 4 ? t.slice(1).toUpperCase() : t)).join(', ')
    : 'any type'
  const mb = Math.round(a.maxBytes / 1048576)
  const words = a.wordLimit ? `, at most ${a.wordLimit} words` : ''
  return `${files}, ${types}, up to ${mb} MB${a.maxFiles === 1 ? '' : ' each'}${words}`
}

export function cvUrlFor(data: DemoData, short: string): string | null {
  return data.timetable.occurrences.find((o) => o.shortName === short)?.campusVirtualUrl ?? null
}

/** The open deadline of a class's subject, if any, for the class sheet. */
export function deadlineFor(list: Deadline[], short: string): Deadline | null {
  return list.find((d) => d.a.shortName === short && d.group !== 'done') ?? null
}

/** "Tomorrow, week 9" under a day's heading ("Week 9" for today). */
export function daySub(data: DemoData, date: string, today: string): string {
  const week = weekOf(data, date)
  const rel = date === today ? null : relativeDayWord(date, today)
  const parts = [rel, week ? `week ${week}` : null].filter(Boolean).join(', ')
  return parts.charAt(0).toUpperCase() + parts.slice(1)
}

function relativeDayWord(date: string, today: string): string {
  const d = daysBetween(today, date)
  if (d === 1) return 'tomorrow'
  if (d === -1) return 'yesterday'
  if (d > 1) return `in ${d} days`
  return `${-d} days ago`
}

/** "23 to 27 November", "30 November to 4 December" (Monday to Friday). */
export function weekRange(monday: string): string {
  const friday = addDays(monday, 4)
  const a = dayMonth(monday)
  const b = dayMonth(friday)
  return monday.slice(5, 7) === friday.slice(5, 7) ? `${a.split(' ')[0]} to ${b}` : `${a} to ${b}`
}
