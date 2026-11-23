import NumberFlow from '@number-flow/react'
import type { ReactNode } from 'react'
import { useProto } from '../ctx'
import { Icon, type IconName } from '../icons'
import {
  dayClasses,
  durationSpoken,
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
import { directionsUrl, placeOf } from '../places'
import { VisuallyHidden } from './Controls'
import { ShapeBadge } from './Shape'
import { WavyProgress } from './WavyProgress'

type Look = 'live' | 'calm' | 'rest'

/**
 * Every state sits in the same quiet card; only the badge changes colour. Live states (a class on
 * or about to start) get the live hue in small doses: a deep live-tone badge, a pulsing dot and the
 * progress wave. No full-card colour.
 */
const LOOKS: Record<Look, { badge: string; onBadge: string }> = {
  live: { badge: 'var(--cx-live-quiet)', onBadge: 'var(--cx-on-live-quiet)' },
  calm: {
    badge: 'var(--md-sys-color-primary-container)',
    onBadge: 'var(--md-sys-color-on-primary-container)',
  },
  rest: {
    badge: 'var(--md-sys-color-secondary-container)',
    onBadge: 'var(--md-sys-color-on-secondary-container)',
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
  const look = LOOKS[lookOf(state)]
  const target: Cls | null = state.kind === 'done' || state.kind === 'off' ? state.next : state.cls

  let eyebrow: string
  let line: ReactNode
  let badge: ReactNode
  let announce: string
  let main: ReactNode
  let footer: ReactNode = null

  const roomBlock = (c: Cls) => {
    const place = placeOf(c.o.room)
    return (
      <>
        <p
          className="t-narrow tnum mt-3 font-semibold"
          style={{ fontSize: compact ? 44 : 52, lineHeight: 1.05, letterSpacing: -0.5 }}
        >
          {c.o.room ?? 'Room not set'}
        </p>
        {place && (
          <p className="t-body-m c-muted mt-1 flex flex-wrap items-center gap-x-2">
            <span>
              {place.building.name}
              {place.floor ? `, ${place.floor}` : ''}
            </span>
            <a
              href={directionsUrl(place)}
              target="_blank"
              rel="noreferrer"
              className="c-primary cx-state pointer-events-auto relative z-10 -mx-1 inline-flex items-center gap-1 rounded-full px-1 font-medium"
            >
              <Icon name="directions" size={16} />
              Directions
            </a>
          </p>
        )}
        <p className="t-title-l mt-3">{c.o.subject}</p>
        <p className="t-body-l c-muted mt-0.5">
          {kindOf(c)}, {hhmm(c.start)} to {hhmm(c.end)}
          {c.o.teacher ? ` with ${c.o.teacher}` : ''}
        </p>
      </>
    )
  }

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
      const only = state.kind === 'later' || state.first
      footer = then
        ? nextLine(then, 'Then')
        : only
          ? 'Your only class today'
          : 'Your last class today'
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
              color="var(--cx-live)"
              track="var(--md-sys-color-surface-container-highest)"
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
          <p className="t-body-l c-muted mt-3">Next class</p>
          {roomBlock(c)}
        </>
      )
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
        background: 'var(--md-sys-color-surface-container-high)',
        borderRadius: 'var(--cx-shape-xl-inc)',
        padding: compact ? '18px 20px 20px' : '22px 24px 24px',
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
            <h2
              className={`t-title-m t-e flex items-center gap-2 ${lookOf(state) === 'live' ? 'c-live' : ''}`}
            >
              {lookOf(state) === 'live' && <span className="cx-live-dot" aria-hidden="true" />}
              {eyebrow}
            </h2>
            <p className="t-body-m c-muted mt-0.5">{line}</p>
          </div>
          <ShapeBadge shape={STATE_SHAPES[state.kind]} size={compact ? 100 : 112} fill={look.badge}>
            {badge}
          </ShapeBadge>
        </div>
        {main}
        {footer && <div className="t-body-l mt-4">{footer}</div>}
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
      <p className="t-body-l c-muted mt-3">Next class</p>
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
