/**
 * Day spine: the pure model. Days become blocks and gaps on one time axis, rooms get a status for a
 * moment, deadlines get an urgency group. No React here, so every view reads the same answers.
 */
import { addDays, formatMinutes, minutesOf, weekdayIndex, type WallTime } from '../clock'
import {
  buildingOf,
  classesOn,
  type Assignment,
  type DemoData,
  type Occurrence,
  type RoomOccurrence,
  type Semester,
  type Timetable,
} from '../data'

// ---------- subjects and their colours ----------

/** Curated for the dark page, in assignment order (neighbours on a real day stay far apart). */
const PALETTE = ['teal', 'orange', 'violet', 'indigo', 'rose', 'green', 'sand', 'sky'] as const

export interface Subject {
  id: string
  name: string
  short: string
  /** A CSS colour (a prototype-local custom property). */
  color: string
}

export interface Subjects {
  list: Subject[]
  byId: Map<string, Subject>
  byShort: Map<string, Subject>
}

/** Deterministic: subjects sorted by name take the palette in order, so a subject keeps its colour. */
export function subjectsOf(timetable: Timetable): Subjects {
  const seen = new Map<string, Occurrence>()
  for (const o of timetable.occurrences) if (!seen.has(o.subjectId)) seen.set(o.subjectId, o)
  const list = [...seen.values()]
    .sort((a, b) => a.subject.localeCompare(b.subject))
    .map((o, i) => ({
      id: o.subjectId,
      name: o.subject,
      short: o.shortName ?? o.subject.slice(0, 4),
      color: `var(--b-sub-${PALETTE[i % PALETTE.length]})`,
    }))
  return {
    list,
    byId: new Map(list.map((s) => [s.id, s])),
    byShort: new Map(list.map((s) => [s.short, s])),
  }
}

export const NEUTRAL = 'var(--b-sub-neutral)'

// ---------- formatting ----------

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

export const hhmm = formatMinutes

export function weekdayName(date: string): string {
  return WEEKDAYS[weekdayIndex(date)]
}

export function weekdayShort(date: string): string {
  return WEEKDAYS[weekdayIndex(date)].slice(0, 3)
}

export function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10))
}

export function monthName(date: string): string {
  return MONTHS[Number(date.slice(5, 7)) - 1]
}

/** "24 November" */
export function dayMonth(date: string): string {
  return `${dayOfMonth(date)} ${monthName(date)}`
}

/** "Tuesday 24 November" */
export function longDate(date: string): string {
  return `${weekdayName(date)} ${dayMonth(date)}`
}

/** "45 min", "2 h", "1 h 20" */
export function duration(min: number): string {
  const m = Math.max(0, Math.round(min))
  if (m < 60) return `${m} min`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h} h ${r}` : `${h} h`
}

/** "today", "tomorrow", "yesterday", "Friday", "Wednesday 2 December" relative to `today`. */
export function relativeDay(date: string, today: string): string {
  const diff = daysBetween(today, date)
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff === -1) return 'yesterday'
  if (diff > 1 && diff < 7 && weekdayIndex(date) > weekdayIndex(today)) return weekdayName(date)
  return longDate(date)
}

export function daysBetween(a: string, b: string): number {
  const ms = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))
  return Math.round((ms(b) - ms(a)) / 864e5)
}

export function mondayOf(date: string): string {
  return addDays(date, -weekdayIndex(date))
}

export function kindLabel(o: { kinds: string[] }): string {
  const k = o.kinds[0] ?? 'class'
  const names: Record<string, string> = {
    course: 'Course',
    lab: 'Lab',
    seminar: 'Seminar',
    project: 'Project',
    facultative: 'Optional course',
  }
  return names[k] ?? 'Class'
}

/** Lower-case kind, for sentences: "SSV lab". */
export function kindWord(o: { kinds: string[] }): string {
  return kindLabel(o).toLowerCase()
}

// ---------- the calendar ----------

export function teachingWeek(semester: Semester, date: string): number | null {
  let found: number | null = null
  for (const w of semester.weeks) {
    if (w.startsOn <= date && daysBetween(w.startsOn, date) < 7) found = w.number
  }
  return found
}

export function nonTeachingReason(semester: Semester, date: string): string | null {
  const day = semester.nonTeachingDays.find((d) => d.date === date)
  if (day) return day.reason.en
  const brk = semester.breaks.find((b) => b.from <= date && date <= b.to)
  return brk ? (brk.name?.en ?? 'Break') : null
}

export function isWeekend(date: string): boolean {
  return weekdayIndex(date) >= 5
}

export function inTimetable(timetable: Timetable, date: string): boolean {
  return timetable.from <= date && date <= timetable.to
}

// ---------- a day as blocks and gaps ----------

export interface ClassBlock {
  type: 'class'
  id: string
  occ: Occurrence
  start: number
  end: number
}

export interface GapSpan {
  type: 'gap'
  start: number
  end: number
}

export function occId(o: Occurrence): string {
  return `${o.date}T${o.startsAt.slice(0, 5)}-${o.shortName ?? o.subjectId.slice(-6)}`
}

export function findOcc(timetable: Timetable, id: string | null): Occurrence | null {
  if (!id) return null
  return timetable.occurrences.find((o) => occId(o) === id) ?? null
}

export function blocksOf(classes: Occurrence[]): ClassBlock[] {
  return classes.map((occ) => ({
    type: 'class',
    id: occId(occ),
    occ,
    start: minutesOf(occ.startsAt),
    end: minutesOf(occ.endsAt),
  }))
}

/** Gaps of at least `min` minutes between consecutive blocks. */
export function gapsOf(blocks: ClassBlock[], min = 30): GapSpan[] {
  const gaps: GapSpan[] = []
  for (let i = 1; i < blocks.length; i++) {
    const start = blocks[i - 1].end
    const end = blocks[i].start
    if (end - start >= min) gaps.push({ type: 'gap', start, end })
  }
  return gaps
}

/** Where `now` is relative to a day: before it, inside it, or after it (whole minutes). */
export type Elapsed = 'past' | 'future' | number

export function elapsedFor(date: string, now: WallTime): Elapsed {
  if (date < now.date) return 'past'
  if (date > now.date) return 'future'
  return now.minutes
}

export type Phase =
  | { kind: 'none' }
  | { kind: 'before'; next: ClassBlock }
  | { kind: 'in'; current: ClassBlock; next: ClassBlock | null }
  | { kind: 'gap'; prev: ClassBlock; next: ClassBlock }
  | { kind: 'after'; last: ClassBlock }

export function phaseOf(blocks: ClassBlock[], minute: number): Phase {
  if (blocks.length === 0) return { kind: 'none' }
  if (minute < blocks[0].start) return { kind: 'before', next: blocks[0] }
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i]
    if (minute >= b.start && minute < b.end)
      return { kind: 'in', current: b, next: blocks[i + 1] ?? null }
    const n = blocks[i + 1]
    if (n && minute >= b.end && minute < n.start) return { kind: 'gap', prev: b, next: n }
  }
  return { kind: 'after', last: blocks[blocks.length - 1] }
}

/** The first class strictly after (date, minute), searching forward through the timetable. */
export function nextClassAfter(
  timetable: Timetable,
  date: string,
  minute: number,
): Occurrence | null {
  const later = timetable.occurrences
    .filter((o) => o.date > date || (o.date === date && minutesOf(o.startsAt) > minute))
    .sort((a, b) => (a.date + a.startsAt).localeCompare(b.date + b.startsAt))
  return later[0] ?? null
}

/** The same subject and kind, next time after this occurrence. */
export function nextTimeOf(timetable: Timetable, occ: Occurrence): Occurrence | null {
  const later = timetable.occurrences
    .filter(
      (o) =>
        o.subjectId === occ.subjectId &&
        o.kinds[0] === occ.kinds[0] &&
        (o.date + o.startsAt).localeCompare(occ.date + occ.startsAt) > 0,
    )
    .sort((a, b) => (a.date + a.startsAt).localeCompare(b.date + b.startsAt))
  return later[0] ?? null
}

export function dayClasses(data: DemoData, date: string): Occurrence[] {
  return classesOn(data.timetable, date)
}

/** The spine's visible range for a day: whole hours around the classes (and `now`, today). */
export function dayRange(blocks: ClassBlock[], elapsed: Elapsed): [number, number] {
  let start = blocks.length ? blocks[0].start : 8 * 60
  let end = blocks.length ? blocks[blocks.length - 1].end : 20 * 60
  if (typeof elapsed === 'number' && blocks.length) {
    start = Math.min(start, elapsed)
    end = Math.max(end, elapsed + 20)
  }
  return [Math.floor(start / 60) * 60, Math.ceil(end / 60) * 60]
}

// ---------- rooms ----------

export interface RoomStatus {
  state: 'free' | 'busy'
  /** Free: when it gets used next (null = free for the rest of the day). Busy: when it frees up. */
  until: number | null
  /** Busy: what's on now. */
  current?: RoomOccurrence[]
  /** Busy: the next free window after `until` (end null = rest of day). */
  nextFree?: { start: number; end: number | null }
}

interface Busy {
  start: number
  end: number
}

/** A room's busy windows on a day, overlapping and touching occurrences merged. */
export function busyWindows(occs: RoomOccurrence[]): Busy[] {
  const spans = occs
    .map((o) => ({ start: minutesOf(o.startsAt), end: minutesOf(o.endsAt) }))
    .sort((a, b) => a.start - b.start)
  const out: Busy[] = []
  for (const s of spans) {
    const last = out[out.length - 1]
    if (last && s.start <= last.end) last.end = Math.max(last.end, s.end)
    else out.push({ ...s })
  }
  return out
}

export function roomDay(data: DemoData, code: string, date: string): RoomOccurrence[] | null {
  const day = data.roomTimetables[code]?.[date]
  return day ? day.occurrences : null
}

export function hasRoomData(data: DemoData, date: string): boolean {
  return Object.values(data.roomTimetables).some((d) => date in d)
}

export const ROOM_DATES = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27']

export function roomStatus(occs: RoomOccurrence[], minute: number): RoomStatus {
  const busy = busyWindows(occs)
  const now = busy.find((b) => minute >= b.start && minute < b.end)
  if (now) {
    const after = busy.find((b) => b.start >= now.end)
    return {
      state: 'busy',
      until: now.end,
      current: occs.filter((o) => minute >= minutesOf(o.startsAt) && minute < minutesOf(o.endsAt)),
      nextFree: { start: now.end, end: after ? after.start : null },
    }
  }
  const next = busy.find((b) => b.start > minute)
  return { state: 'free', until: next ? next.start : null }
}

/** Free for the whole window [from, to)? */
export function freeDuring(occs: RoomOccurrence[], from: number, to: number): boolean {
  return busyWindows(occs).every((b) => b.end <= from || b.start >= to)
}

/** Rooms in the same code group as `code` that are free for the whole window, longest free first. */
export function freeRoomsNear(
  data: DemoData,
  code: string,
  date: string,
  from: number,
  to: number,
): string[] {
  const group = buildingOf(code)
  return data.rooms
    .map((r) => r.code)
    .filter((c) => c !== code && buildingOf(c) === group)
    .filter((c) => {
      const occs = roomDay(data, c, date)
      return occs !== null && freeDuring(occs, from, to)
    })
}

export function groupLabel(group: string): string {
  return group.length > 3 ? group : `${group} group`
}

// ---------- deadlines ----------

export type Urgency = 'overdue' | 'today' | 'week' | 'later' | 'done'

export interface Deadline {
  a: Assignment
  date: string
  minute: number
  urgency: Urgency
  /** Late but still accepted until the cut-off. */
  cutoff: { date: string; minute: number; passed: boolean } | null
}

function localParts(iso: string): { date: string; minute: number } {
  return { date: iso.slice(0, 10), minute: minutesOf(iso.slice(11, 16)) }
}

function before(a: { date: string; minute: number }, b: { date: string; minute: number }) {
  return a.date < b.date || (a.date === b.date && a.minute < b.minute)
}

export function deadlinesOf(assignments: Assignment[], now: WallTime): Deadline[] {
  const nowP = { date: now.date, minute: now.minutes }
  const sunday = addDays(mondayOf(now.date), 6)
  return assignments
    .map((a) => {
      const due = localParts(a.dueAt)
      const cut = a.cutoffAt ? localParts(a.cutoffAt) : null
      const done = a.status === 'submitted' || a.status === 'graded'
      let urgency: Urgency
      if (done) urgency = 'done'
      else if (before(due, nowP)) urgency = 'overdue'
      else if (due.date === now.date) urgency = 'today'
      else if (due.date <= sunday) urgency = 'week'
      else urgency = 'later'
      return {
        a,
        ...due,
        urgency,
        cutoff: cut ? { ...cut, passed: before(cut, nowP) } : null,
      }
    })
    .sort((x, y) => (x.date + hhmm(x.minute)).localeCompare(y.date + hhmm(y.minute)))
}

/** Minutes from now until (date, minute); negative when it has passed. */
export function minutesUntil(now: WallTime, date: string, minute: number): number {
  return daysBetween(now.date, date) * 1440 + minute - now.minutes
}

/** "in 5 h", "in 40 min", "Friday", "2 days late" */
export function dueRelative(d: Deadline, now: WallTime): string {
  const m = minutesUntil(now, d.date, d.minute)
  if (d.urgency === 'done') return ''
  if (m < 0) {
    const late = -m
    if (late < 60) return `${late} min late`
    if (late < 1440) return `${Math.floor(late / 60)} h late`
    const days = Math.floor(late / 1440)
    return `${days} ${days === 1 ? 'day' : 'days'} late`
  }
  if (m < 60) return `in ${m} min`
  if (d.date === now.date) return `in ${duration(Math.round(m / 10) * 10)}`
  const days = daysBetween(now.date, d.date)
  if (days === 1) return 'tomorrow'
  if (days < 7) return weekdayName(d.date)
  return `in ${days} days`
}

/** "Mon 23:59" or "Tue 1 Dec 23:59" for further dates. */
export function dueExact(date: string, minute: number, today: string): string {
  const days = Math.abs(daysBetween(today, date))
  const day =
    days < 7
      ? weekdayShort(date)
      : `${weekdayShort(date)} ${dayOfMonth(date)} ${monthName(date).slice(0, 3)}`
  return `${day} ${hhmm(minute)}`
}

export function statusText(a: Assignment, today: string): string {
  switch (a.status) {
    case 'notsubmitted':
      return 'Not submitted'
    case 'draft':
      return 'Draft saved, not submitted'
    case 'submitted': {
      if (!a.submittedAt) return 'Submitted'
      const p = localParts(a.submittedAt)
      return `Submitted ${dueExact(p.date, p.minute, today)}`
    }
    case 'graded':
      return a.grade ? `Graded ${a.grade}` : 'Graded'
  }
}

export function fileLimits(a: Assignment): string {
  const mb = Math.round(a.maxBytes / 1048576)
  const files = a.maxFiles === 1 ? 'one file' : `up to ${a.maxFiles} files`
  return `${files[0].toUpperCase()}${files.slice(1)}, ${mb} MB each, ${a.fileTypes.join(' ')}`
}

export function urgencyTitle(u: Urgency): string {
  return {
    overdue: 'Late',
    today: 'Due today',
    week: 'This week',
    later: 'Later',
    done: 'Handed in',
  }[u]
}

/** The most urgent open items, for Today: late ones still accepted, then today and this week. */
export function urgentDeadlines(all: Deadline[], max = 3): Deadline[] {
  return all
    .filter(
      (d) =>
        (d.urgency === 'overdue' && !(d.cutoff?.passed ?? false)) ||
        d.urgency === 'today' ||
        d.urgency === 'week',
    )
    .slice(0, max)
}

export function blockLabel(o: Occurrence, state: string): string {
  const where = o.room ? `room ${o.room}` : 'room not listed'
  const time = `${o.startsAt.slice(0, 5)} to ${o.endsAt.slice(0, 5)}`
  return `${o.subject}, ${kindWord(o)}, ${longDate(o.date)}, ${time}, ${where}${state ? `, ${state}` : ''}`
}

/** Past, now or later, for a block on a day whose elapsed state is known. */
export function blockState(b: { start: number; end: number }, elapsed: Elapsed) {
  if (elapsed === 'past') return { past: true, current: false }
  if (elapsed === 'future') return { past: false, current: false }
  return { past: b.end <= elapsed, current: b.start <= elapsed && elapsed < b.end }
}

// ---------- the week ----------

export function weekDays(monday: string, hasClass: (d: string) => boolean): string[] {
  const days = [0, 1, 2, 3, 4].map((i) => addDays(monday, i))
  for (const i of [5, 6]) if (hasClass(addDays(monday, i))) days.push(addDays(monday, i))
  return days
}

export function weekTitle(monday: string, week: number | null): { title: string; range: string } {
  const fri = addDays(monday, 4)
  const range =
    monday.slice(5, 7) === fri.slice(5, 7)
      ? `${dayOfMonth(monday)}–${dayMonth(fri)}`
      : `${dayOfMonth(monday)} ${monthName(monday)} – ${dayMonth(fri)}`
  return { title: week ? `Week ${week}` : 'No teaching week', range }
}

/** How much of [start, end) is lived, in px, for a fill. */
export function livedPx(start: number, end: number, elapsed: Elapsed, scale: number): number {
  if (elapsed === 'past') return (end - start) * scale
  if (elapsed === 'future') return 0
  return Math.max(0, Math.min(end, elapsed) - start) * scale
}

/** "tonight 23:59", "today 12:00", "tomorrow 18:00", else "Fri 23:59". */
export function whenShort(date: string, minute: number, today: string): string {
  const days = daysBetween(today, date)
  if (days === 0) return `${minute >= 18 * 60 ? 'tonight' : 'today'} ${hhmm(minute)}`
  if (days === 1) return `tomorrow ${hhmm(minute)}`
  return dueExact(date, minute, today)
}

/** Deadlines with a time on this day that the day's spine shows: not done, in the day, not under a class. */
export function onSpine(
  all: Deadline[],
  blocks: ClassBlock[],
  from: number,
  date: string,
): Deadline[] {
  return all.filter(
    (d) =>
      d.date === date &&
      d.urgency !== 'done' &&
      d.minute >= from &&
      d.minute <= 21 * 60 &&
      !blocks.some((b) => d.minute > b.start && d.minute < b.end),
  )
}
