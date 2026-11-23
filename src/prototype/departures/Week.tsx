/** The week grid: subject colour with a legend (from B), a now-line that glides, one element per block. */
import type { CSSProperties } from 'react'
import { addDays } from '../clock'
import { classesOn, type Occurrence } from '../data'
import { useApp } from './context'
import {
  DAY_END,
  DAY_START,
  endOf,
  hueStyle,
  kindLabel,
  nonTeaching,
  shortOf,
  startOf,
} from './model'
import { clock, dateRange, dayOfMonth, hm, longDate, nowMinutes, weekdayShort } from './time'

const HOURS = (DAY_END - DAY_START) / 60

export function WeekGrid({
  monday,
  compact,
  selected,
  onSelectDay,
}: {
  monday: string
  compact: boolean
  selected?: string
  onSelectDay?: (date: string) => void
}) {
  const { data, now, today, openClass } = useApp()
  const days = dateRange(monday, addDays(monday, 4))
  const t = nowMinutes(now)
  const showNow = days.includes(today) && t >= DAY_START && t <= DAY_END
  const nowY = (t - DAY_START) / 60
  const hours = Array.from({ length: HOURS + 1 }, (_, i) => DAY_START / 60 + i)
  return (
    <div
      className="dp-grid"
      data-compact={compact}
      style={{ '--hours': HOURS } as CSSProperties}
      role="group"
      aria-label={`Week of ${longDate(monday)}`}
    >
      <div className="dp-grid-corner" aria-hidden="true" />
      {days.map((d) => {
        const isToday = d === today
        const inner = (
          <>
            <span className="dp-grid-wd">{weekdayShort(d)}</span>
            <span className="dp-grid-num dp-num">{dayOfMonth(d)}</span>
          </>
        )
        return onSelectDay ? (
          <button
            key={d}
            type="button"
            className="dp-grid-head"
            data-today={isToday}
            data-selected={d === selected}
            aria-pressed={d === selected}
            aria-label={`${longDate(d)}${isToday ? ', today' : ''}`}
            onClick={() => onSelectDay(d)}
          >
            {inner}
          </button>
        ) : (
          <div
            key={d}
            className="dp-grid-head"
            data-today={isToday}
            aria-label={`${longDate(d)}${isToday ? ', today' : ''}`}
          >
            {inner}
          </div>
        )
      })}
      <div className="dp-grid-gutter" aria-hidden="true">
        {hours.map((h) =>
          compact && h % 2 ? null : (
            <span key={h} style={{ top: `calc(var(--hour) * ${h - DAY_START / 60})` }}>
              {String(h).padStart(2, '0')}
            </span>
          ),
        )}
        {showNow && (
          <span
            className="dp-grid-nowlabel dp-num"
            style={{ transform: `translateY(calc(var(--hour) * ${nowY}))` }}
          >
            {clock(Math.floor(t))}
          </span>
        )}
      </div>
      {days.map((d) => {
        const off = nonTeaching(data, d)
        const classes = classesOn(data.timetable, d)
        return (
          <div
            key={d}
            className="dp-grid-col"
            data-today={d === today}
            data-selected={d === selected}
            data-off={!!off}
          >
            {off && <span className="dp-grid-off">{off}</span>}
            {classes.map((o) => (
              <Block
                key={o.startsAt}
                o={o}
                state={blockState(o, today, t)}
                compact={compact}
                onOpen={openClass}
              />
            ))}
            {d === today && showNow && (
              <span
                className="dp-nowline"
                aria-hidden="true"
                style={{ transform: `translateY(calc(var(--hour) * ${nowY}))` }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function blockState(o: Occurrence, today: string, t: number): 'past' | 'now' | 'later' {
  if (o.date < today || (o.date === today && endOf(o) <= t)) return 'past'
  if (o.date === today && startOf(o) <= t) return 'now'
  return 'later'
}

function Block({
  o,
  state,
  compact,
  onOpen,
}: {
  o: Occurrence
  state: 'past' | 'now' | 'later'
  compact: boolean
  onOpen: (o: Occurrence) => void
}) {
  const top = (startOf(o) - DAY_START) / 60
  const height = (endOf(o) - startOf(o)) / 60
  const label = `${o.subject}, ${kindLabel(o.kinds).toLowerCase()}, ${longDate(o.date)} ${hm(o.startsAt)} to ${hm(o.endsAt)}, room ${o.room ?? 'not set'}${state === 'now' ? ', now' : state === 'past' ? ', finished' : ''}`
  return (
    <button
      type="button"
      className="dp-block"
      data-state={state}
      style={{
        ...hueStyle(shortOf(o)),
        top: `calc(var(--hour) * ${top})`,
        height: `calc(var(--hour) * ${height} - 3px)`,
      }}
      aria-label={label}
      onClick={() => onOpen(o)}
    >
      <span className="dp-block-short">{shortOf(o)}</span>
      <span className="dp-block-room dp-num">{o.room}</span>
      {!compact && height >= 2 && (
        <span className="dp-block-kind">
          {state === 'now' ? 'Now, ' : ''}
          {kindLabel(o.kinds)}
        </span>
      )}
    </button>
  )
}

export function Legend({ monday }: { monday: string }) {
  const { data } = useApp()
  const days = dateRange(monday, addDays(monday, 4))
  const seen = new Map<string, string>()
  for (const d of days)
    for (const o of classesOn(data.timetable, d)) seen.set(shortOf(o), o.subject)
  if (!seen.size) return null
  return (
    <ul className="dp-legend" aria-label="Subjects this week">
      {[...seen.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([short, name]) => (
          <li key={short} style={hueStyle(short)}>
            <span className="dp-legend-swatch" aria-hidden="true" />
            <span className="dp-legend-short dp-num">{short}</span>
            <span className="dp-legend-name">{name}</span>
          </li>
        ))}
    </ul>
  )
}
