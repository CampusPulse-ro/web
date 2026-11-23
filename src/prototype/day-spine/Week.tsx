/**
 * The week in the same block language as the day: every column is a small spine with its blocks
 * hanging off it, filled up to now, and the now-line crosses today's column.
 */
import { m } from 'motion/react'
import { classesOn } from '../data'
import { vars } from './css'
import {
  blockLabel,
  blocksOf,
  blockState,
  dayMonth,
  dayOfMonth,
  weekDays,
  duration,
  elapsedFor,
  hhmm,
  kindLabel,
  nonTeachingReason,
  weekdayShort,
  type ClassBlock,
  type Elapsed,
} from './model'
import { useColorOf, useNav, useNoGlideOnJump, useProto } from './state'

interface Props {
  monday: string
  selected: string | null
  onPickDay: (date: string) => void
  /** Pixels per minute. */
  scale: number
  compact: boolean
}

export function WeekGrid({ monday, selected, onPickDay, scale, compact }: Props) {
  const { data, now, start } = useProto()
  const tt = data.timetable
  const days = weekDays(monday, (d) => classesOn(tt, d).length > 0)
  const all = days.flatMap((d) => blocksOf(classesOn(tt, d)))
  const rs = Math.floor(Math.min(8 * 60, ...all.map((b) => b.start)) / 60) * 60
  const re = Math.ceil(Math.max(20 * 60, ...all.map((b) => b.end)) / 60) * 60
  const height = (re - rs) * scale
  const axis = compact ? 34 : 52
  const cols = `${axis}px repeat(${days.length}, minmax(0, 1fr))`
  const hours: number[] = []
  for (let h = rs; h <= re; h += 60) hours.push(h)
  const root = useNoGlideOnJump<HTMLDivElement>(`${monday}|${start}`, now.minutes)

  return (
    <div ref={root}>
      <div className="grid" style={{ gridTemplateColumns: cols }}>
        <div />
        {days.map((d) => {
          const isToday = d === now.date
          const isSel = d === selected
          return (
            <button
              key={d}
              type="button"
              onClick={() => onPickDay(d)}
              aria-pressed={isSel}
              aria-label={`${weekdayShort(d)} ${dayMonth(d)}${isToday ? ', today' : ''}`}
              className={`flex min-h-12 flex-col items-center justify-center rounded-md transition-colors ${
                isSel ? 'bg-raised' : 'hover:bg-raised/60'
              }`}
            >
              <span className="text-caption text-ink-muted">{weekdayShort(d)}</span>
              <span
                className={`b-num mt-0.5 min-w-7 rounded-full px-1.5 text-label ${
                  isToday ? 'b-now-pill' : 'text-ink'
                }`}
              >
                {dayOfMonth(d)}
              </span>
            </button>
          )
        })}
      </div>

      <div className="relative mt-2 grid" style={{ gridTemplateColumns: cols, height }}>
        {/* hour lines behind everything */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {hours.map((h) => (
            <div
              key={h}
              className="absolute right-0 border-t border-line"
              style={{ top: (h - rs) * scale, left: axis }}
            />
          ))}
        </div>
        <div aria-hidden className="relative">
          {hours.map((h, i) =>
            compact && i % 2 ? null : (
              <span
                key={h}
                className="b-num absolute right-2 -translate-y-1/2 text-caption text-ink-muted"
                style={{ top: (h - rs) * scale }}
              >
                {compact ? String(h / 60).padStart(2, '0') : hhmm(h)}
              </span>
            ),
          )}
        </div>
        {days.map((d) => (
          <DayColumn
            key={d}
            selected={d === selected}
            date={d}
            rs={rs}
            scale={scale}
            height={height}
            compact={compact}
            reason={nonTeachingReason(data.semester, d)}
          />
        ))}
      </div>
    </div>
  )
}

function DayColumn({
  selected,
  date,
  rs,
  scale,
  height,
  compact,
  reason,
}: {
  selected: boolean
  date: string
  rs: number
  scale: number
  height: number
  compact: boolean
  reason: string | null
}) {
  const { data, now } = useProto()
  const blocks = blocksOf(classesOn(data.timetable, date))
  const elapsed = elapsedFor(date, now)
  const isToday = typeof elapsed === 'number'
  const y = (min: number) => (min - rs) * scale

  return (
    <div
      className={`relative rounded-md ${reason ? 'b-holiday' : ''} ${selected ? 'bg-raised/45' : ''}`}
    >
      {reason ? (
        <p
          className="b-vertical absolute top-4 left-1/2 -translate-x-1/2 text-caption text-ink-soft"
          style={{ whiteSpace: 'nowrap' }}
        >
          {reason}
        </p>
      ) : null}

      {isToday && typeof elapsed === 'number' && elapsed >= rs && elapsed <= rs + height / scale ? (
        <div
          aria-hidden
          className="b-glide pointer-events-none absolute -right-0.5 -left-1 z-30"
          style={{ top: 0, transform: `translateY(${y(elapsed)}px)` }}
        >
          <div
            className="absolute right-0 left-0 h-0.5 -translate-y-1/2 rounded-full"
            style={{ background: 'var(--b-live)', boxShadow: '0 0 0 1px var(--color-page)' }}
          />
          <span
            className="absolute left-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: 'var(--b-live)', boxShadow: '0 0 0 2px var(--color-page)' }}
          />
        </div>
      ) : null}

      {blocks.map((b) => (
        <WeekBlock
          key={b.id}
          block={b}
          top={y(b.start)}
          height={(b.end - b.start) * scale}
          elapsed={elapsed}
          scale={scale}
          compact={compact}
        />
      ))}
    </div>
  )
}

function WeekBlock({
  block,
  top,
  height,
  elapsed,
  scale,
  compact,
}: {
  block: ClassBlock
  top: number
  height: number
  elapsed: Elapsed
  scale: number
  compact: boolean
}) {
  const { origin, setOrigin } = useProto()
  const [nav, go] = useNav()
  const colorOf = useColorOf()
  const o = block.occ
  const { past, current } = blockState(block, elapsed)
  const lid = `week-${block.id}`
  const expanded = nav.cls === block.id && origin === lid
  const left = current && typeof elapsed === 'number' ? block.end - elapsed : 0

  return (
    <button
      type="button"
      aria-label={blockLabel(o, current ? `now, ${duration(left)} left` : past ? 'over' : '')}
      onClick={() => {
        setOrigin(lid)
        go({ cls: block.id, due: null })
      }}
      className="absolute inset-x-0.5 z-20 text-left"
      style={vars({ '--sub': colorOf(o) }, { top: top + 1, height: height - 2 })}
    >
      {!expanded ? (
        <m.span
          layoutId={lid}
          data-past={past}
          className="b-block absolute inset-0"
          style={{ borderRadius: compact ? 11 : 14 }}
          transition={{ type: 'spring', duration: 0.42, bounce: 0.1 }}
        />
      ) : null}
      {current && typeof elapsed === 'number' && !expanded ? (
        <span
          aria-hidden
          className="b-block-fill b-glide-h absolute inset-x-0 top-0"
          style={{
            height: Math.max(0, (elapsed - block.start) * scale),
            borderTopLeftRadius: compact ? 11 : 14,
            borderTopRightRadius: compact ? 11 : 14,
          }}
        />
      ) : null}
      <span
        className={`relative flex h-full min-w-0 flex-col overflow-hidden ${compact ? 'px-1.5 py-1' : 'px-2.5 py-2'}`}
        style={{ opacity: expanded ? 0 : 1 }}
      >
        <span
          className={`b-num truncate font-semibold ${compact ? 'b-wk-short' : 'text-label'} ${
            past ? 'text-ink-soft' : 'text-ink'
          }`}
        >
          {o.shortName ?? o.subject}
        </span>
        <span
          className={`b-num truncate ${compact ? 'b-wk-room' : 'text-body-small'} ${
            past ? 'text-ink-muted' : 'text-ink-soft'
          }`}
        >
          {o.room ?? 'No room'}
        </span>
        {!compact && height >= 70 ? (
          <span className="truncate text-caption text-ink-muted">{kindLabel(o)}</span>
        ) : null}
      </span>
    </button>
  )
}

export function SubjectLegend({ dates }: { dates: string[] }) {
  const { data, subjects } = useProto()
  const ids = new Set(dates.flatMap((d) => classesOn(data.timetable, d).map((o) => o.subjectId)))
  const list = subjects.list.filter((s) => ids.has(s.id))
  if (!list.length) return null
  return (
    <section aria-labelledby="legend" className="mt-6">
      <h2 id="legend" className="text-label text-ink-soft">
        Subjects this week
      </h2>
      <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((s) => (
          <li key={s.id} className="flex items-baseline gap-3">
            <span
              aria-hidden
              className="b-swatch inline-block size-2.5 shrink-0 rounded-full"
              style={vars({ '--sub': s.color })}
            />
            <span className="b-num w-11 shrink-0 text-label text-ink">{s.short}</span>
            <span className="text-body-small text-ink-muted">{s.name}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
