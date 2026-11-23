import NumberFlow from '@number-flow/react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useHref, useProto } from '../ctx'
import { Icon, type IconName } from '../icons'
import {
  dayClasses,
  durationSpoken,
  freeBetween,
  groupOf,
  hhmm,
  kindOf,
  relativeDay,
  shortOf,
  STATE_SHAPES,
  weekday,
  type Cls,
  type DayState,
} from '../model'
import { easing } from '../motion'
import { VisuallyHidden } from './Controls'
import { ShapeBadge } from './Shape'
import { WavyProgress } from './WavyProgress'

type Look = 'live' | 'calm' | 'rest'

const LOOKS: Record<
  Look,
  { bg: string; fg: string; badge: string; onBadge: string; track: string }
> = {
  live: {
    bg: 'var(--cx-live-container)',
    fg: 'var(--cx-on-live-container)',
    badge: 'var(--cx-on-live-container)',
    onBadge: 'var(--cx-live-container)',
    track: 'color-mix(in srgb, var(--cx-on-live-container) 22%, transparent)',
  },
  calm: {
    bg: 'var(--md-sys-color-primary-container)',
    fg: 'var(--md-sys-color-on-primary-container)',
    badge: 'var(--md-sys-color-primary)',
    onBadge: 'var(--md-sys-color-on-primary)',
    track: 'color-mix(in srgb, var(--md-sys-color-on-primary-container) 25%, transparent)',
  },
  rest: {
    bg: 'var(--md-sys-color-surface-container-high)',
    fg: 'var(--md-sys-color-on-surface)',
    badge: 'var(--md-sys-color-secondary-container)',
    onBadge: 'var(--md-sys-color-on-secondary-container)',
    track: 'var(--md-sys-color-surface-container-highest)',
  },
}

const lookOf = (s: DayState): Look =>
  s.kind === 'now' || s.kind === 'soon'
    ? 'live'
    : s.kind === 'later' || s.kind === 'break'
      ? 'calm'
      : 'rest'

/** "12" + "min", or "2" + "h 30" once it's long; the unit line carries the meaning. */
function amount(min: number, suffix: string): { big: number; unit: string } {
  if (min < 100) return { big: min, unit: `min ${suffix}`.trim() }
  const m = min % 60
  return { big: Math.floor(min / 60), unit: `h${m ? ` ${m}` : ''} ${suffix}`.trim() }
}

/**
 * The "next class" card, styled like an Android home-screen widget: what the day is doing right
 * now, in one glance. Its badge is the signature: a shape per state (soon, in class, free, done,
 * day off) that morphs when the state changes, with the minutes rolling inside it.
 */
export function DayCard({
  state,
  onOpen,
  compact,
}: {
  state: DayState
  onOpen: (c: Cls) => void
  compact: boolean
}) {
  const { data, now } = useProto()
  const href = useHref()
  const look = LOOKS[lookOf(state)]
  const target: Cls | null = state.kind === 'done' || state.kind === 'off' ? state.next : state.cls

  let eyebrow: string
  let line: ReactNode
  let badge: ReactNode
  let announce: string
  let main: ReactNode
  let footer: ReactNode = null

  const roomBlock = (c: Cls) => (
    <>
      <p
        className="t-narrow tnum mt-3 font-semibold"
        style={{ fontSize: compact ? 44 : 52, lineHeight: 1.05, letterSpacing: -0.5 }}
      >
        {c.o.room ?? 'Room not set'}
      </p>
      <p className="t-title-l mt-2">{c.o.subject}</p>
      <p className="t-body-l mt-0.5" style={{ opacity: 0.86 }}>
        {kindOf(c)}, {hhmm(c.start)} to {hhmm(c.end)}
        {c.o.teacher ? ` with ${c.o.teacher}` : ''}
      </p>
    </>
  )

  const number = (min: number, suffix: string) => {
    const a = amount(min, suffix)
    return (
      <span className="flex flex-col items-center" style={{ color: look.onBadge }}>
        <NumberFlow
          value={a.big}
          trend={-1}
          className="t-narrow tnum font-semibold"
          style={{ fontSize: compact ? 36 : 40, lineHeight: 1 }}
          format={{ useGrouping: false }}
          spinTiming={{ duration: 410, easing: easing.spatialDefault }}
          transformTiming={{ duration: 410, easing: easing.spatialDefault }}
        />
        <span className="t-label-m t-narrow mt-0.5">{a.unit}</span>
      </span>
    )
  }
  const glyph = (name: IconName) => (
    <span style={{ color: look.onBadge }}>
      <Icon name={name} size={40} />
    </span>
  )

  const nextLine = (c: Cls | null, lead: string) =>
    c ? (
      <>
        {lead}{' '}
        {relativeDay(c.date, now.date) === 'today'
          ? ''
          : `${capital(relativeDay(c.date, now.date))} `}
        <b className="tnum font-semibold">{hhmm(c.start)}</b> {shortOf(c.o)} in{' '}
        <b className="font-semibold">{c.o.room}</b>
      </>
    ) : null

  switch (state.kind) {
    case 'soon':
    case 'later': {
      const c = state.cls
      eyebrow =
        state.kind === 'soon'
          ? state.until <= 5
            ? 'Starting now'
            : 'Next class'
          : 'First class today'
      line = (
        <>
          Starts at <span className="tnum">{hhmm(c.start)}</span>
        </>
      )
      badge = number(state.until, '')
      announce = `${shortOf(c.o)} in ${c.o.room} at ${hhmm(c.start)}`
      main = roomBlock(c)
      const then = dayClasses(data, c.date).find((x) => x.start >= c.end)
      footer = then
        ? nextLine(then, 'Then')
        : state.kind === 'soon' && state.first
          ? 'Your first class today'
          : 'Your only class today'
      break
    }
    case 'now': {
      const c = state.cls
      eyebrow = 'In class now'
      line = (
        <>
          Until <span className="tnum">{hhmm(c.end)}</span>
        </>
      )
      badge = number(state.left, 'left')
      announce = `${shortOf(c.o)} in ${c.o.room} until ${hhmm(c.end)}`
      main = (
        <>
          {roomBlock(c)}
          <div className="mt-4">
            <WavyProgress
              value={state.progress}
              label="Class progress"
              valueText={`${durationSpoken(state.left)} left`}
              color={look.fg}
              track={look.track}
            />
          </div>
        </>
      )
      footer = state.next
        ? nextLine(state.next, state.next.start === c.end ? 'Straight after:' : 'Next:')
        : nextLine(state.after, 'Last class today. Next:')
      break
    }
    case 'break': {
      const c = state.cls
      eyebrow = 'Free time'
      line = (
        <>
          Until <span className="tnum">{hhmm(c.start)}</span>
        </>
      )
      badge = number(state.until, 'free')
      announce = `next ${shortOf(c.o)} in ${c.o.room} at ${hhmm(c.start)}`
      main = (
        <>
          <p className="t-body-l mt-3" style={{ opacity: 0.86 }}>
            Next class
          </p>
          {roomBlock(c)}
        </>
      )
      const group = c.o.room ? groupOf(c.o.room) : null
      const free = group
        ? freeBetween(data, now.date, now.minutes, c.start).filter(
            (r) => groupOf(r) === group && r !== c.o.room,
          )
        : []
      footer =
        group && free.length > 0 ? (
          <Link
            to={href('/rooms', { show: 'free', group })}
            className="cx-btn cx-btn--tonal cx-state relative z-10 mt-1 -ml-1"
            style={{ background: look.badge, color: look.onBadge }}
          >
            <Icon name="doorOpen" size={18} />
            {free.length} {group} {free.length === 1 ? 'room is' : 'rooms are'} free until{' '}
            {hhmm(c.start)}
          </Link>
        ) : null
      break
    }
    case 'done': {
      eyebrow = 'Done for today'
      {
        const n = dayClasses(data, now.date).length
        line = n === 1 ? 'Your one class is over' : `All ${n} classes are over`
      }
      badge = glyph('taskAlt')
      announce = state.next
        ? `next class ${relativeDay(state.next.date, now.date)} at ${hhmm(state.next.start)}`
        : ''
      main = nextDay(state.next, now.date)
      footer = holidayNote(state.holidays)
      break
    }
    case 'off': {
      eyebrow =
        state.why === 'holiday'
          ? (state.holiday ?? 'Holiday')
          : state.why === 'weekend'
            ? 'Weekend'
            : 'No classes today'
      line = state.why === 'holiday' ? 'No classes: public holiday' : `${weekday(now.date)} is free`
      badge = glyph(
        state.why === 'holiday'
          ? 'celebration'
          : state.why === 'weekend'
            ? 'weekend'
            : 'eventAvailable',
      )
      announce = state.next
        ? `next class ${relativeDay(state.next.date, now.date)} at ${hhmm(state.next.start)}`
        : ''
      main = nextDay(state.next, now.date)
      footer = holidayNote(state.holidays)
      break
    }
  }

  return (
    <article
      className="relative overflow-hidden"
      style={{
        background: look.bg,
        color: look.fg,
        borderRadius: 'var(--cx-shape-xl-inc)',
        padding: compact ? '18px 20px 20px' : '22px 24px 24px',
        transition:
          'background-color var(--cx-motion-effects-default-duration) var(--cx-motion-effects-default), color var(--cx-motion-effects-default-duration) var(--cx-motion-effects-default)',
      }}
    >
      {target && (
        <button
          type="button"
          className="cx-state absolute inset-0 z-0 rounded-[inherit]"
          aria-label={`Details: ${target.o.subject}, ${kindOf(target)} ${hhmm(target.start)} in ${target.o.room}`}
          onClick={() => onOpen(target)}
        />
      )}
      <div className="pointer-events-none relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 pt-1">
            <h2 className="t-title-m t-e">{eyebrow}</h2>
            <p className="t-body-m mt-0.5" style={{ opacity: 0.86 }}>
              {line}
            </p>
          </div>
          <ShapeBadge shape={STATE_SHAPES[state.kind]} size={compact ? 100 : 112} fill={look.badge}>
            {badge}
          </ShapeBadge>
        </div>
        {main}
        {footer && <div className="t-body-l pointer-events-auto mt-4">{footer}</div>}
      </div>
      <VisuallyHidden live>{`${eyebrow}: ${announce}`}</VisuallyHidden>
    </article>
  )
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function nextDay(next: Cls | null, today: string) {
  if (!next) return <p className="t-title-l mt-3">Nothing else in this timetable.</p>
  const when = relativeDay(next.date, today)
  return (
    <>
      <p className="t-body-l mt-3" style={{ opacity: 0.86 }}>
        Next class
      </p>
      <p className="t-narrow tnum mt-1 font-semibold" style={{ fontSize: 40, lineHeight: 1.1 }}>
        {capital(when)} {hhmm(next.start)}
      </p>
      <p className="t-title-l mt-2">
        {shortOf(next.o)} in {next.o.room}
      </p>
      <p className="t-body-l mt-0.5" style={{ opacity: 0.86 }}>
        {next.o.subject}, {kindOf(next).toLowerCase()} until {hhmm(next.end)}
      </p>
    </>
  )
}

function holidayNote(holidays: { date: string; reason: string }[]) {
  if (holidays.length === 0) return null
  return (
    <span className="flex items-start gap-2">
      <Icon name="celebration" size={20} />
      <span>
        {holidays.map((h, i) => (
          <span key={h.date}>
            {i > 0 && (i === holidays.length - 1 ? ' and ' : ', ')}
            {weekday(h.date)} is {h.reason}
          </span>
        ))}
        , no classes.
      </span>
    </span>
  )
}
