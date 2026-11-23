/**
 * The signature element: a live "next up" board that answers "where do I need to be, and how long
 * do I have?" Its shape changes with the moment: go to a room, time left in class, a free stretch,
 * done for the day, no classes. Only the minute digits move; a state change cross-fades.
 */
import { AnimatePresence, m } from 'motion/react'
import { useApp } from './context'
import {
  heroKey,
  heroState,
  hueStyle,
  kindLabel,
  MIN_GAP,
  shortOf,
  type Hero as HeroT,
  type NextDay,
} from './model'
import {
  capitalise,
  dayMonth,
  duration,
  hm,
  longDate,
  relativeDay,
  spokenDuration,
  weekday,
} from './time'
import { Countdown, Dot } from './ui'
import type { Occurrence } from '../data'

const EASE = [0.2, 0.8, 0.2, 1] as const

export function Hero() {
  const { data, now } = useApp()
  const h = heroState(data, now)
  return (
    <section className="dp-hero" aria-label="Next up" data-mode={h.mode}>
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={heroKey(h)}
          className="dp-hero-body"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: EASE }}
        >
          {h.mode === 'soon' && <Soon h={h} />}
          {h.mode === 'class' && <InClass h={h} />}
          {h.mode === 'free' && <Free h={h} />}
          {(h.mode === 'done' || h.mode === 'none') && <Later h={h} />}
        </m.div>
      </AnimatePresence>
    </section>
  )
}

const roomOf = (o: Occurrence) => o.room ?? 'Room not set'

function Soon({ h }: { h: Extract<HeroT, { mode: 'soon' }> }) {
  const { openClass } = useApp()
  const o = h.next
  return (
    <button
      type="button"
      className="dp-hero-main"
      style={hueStyle(shortOf(o))}
      onClick={() => openClass(o)}
      aria-label={`Next class: ${o.subject}, ${kindLabel(o.kinds).toLowerCase()}, room ${roomOf(o)}, at ${hm(o.startsAt)}, in ${spokenDuration(h.until)}. Show details.`}
    >
      <span className="dp-hero-label">
        <span>Next class</span>
        <span className="dp-hero-at dp-num">{hm(o.startsAt)}</span>
      </span>
      <span className="dp-hero-room dp-num">{roomOf(o)}</span>
      <span className="dp-hero-count">
        <span className="dp-hero-pre">in</span>
        <Countdown minutes={h.until} unitClass="dp-hero-unit" />
      </span>
      <span className="dp-hero-subject">{o.subject}</span>
      <span className="dp-hero-meta">
        {kindLabel(o.kinds)} until {hm(o.endsAt)}
        {h.sameRoom && '. Same room as your last class.'}
      </span>
    </button>
  )
}

function InClass({ h }: { h: Extract<HeroT, { mode: 'class' }> }) {
  const { openClass } = useApp()
  const o = h.current
  const frac = Math.min(1, Math.max(0, h.elapsed / h.total))
  let note: string | null = null
  if (h.next && h.gapAfter === 0)
    note = h.next.room === o.room ? 'Straight after, same room' : 'Straight after, no break'
  else if (h.next && h.gapAfter !== null && h.gapAfter >= MIN_GAP)
    note = `After ${duration(h.gapAfter)} free`
  return (
    <>
      <button
        type="button"
        className="dp-hero-main"
        style={hueStyle(shortOf(o))}
        onClick={() => openClass(o)}
        aria-label={`In class: ${o.subject}, room ${roomOf(o)}, ${spokenDuration(h.left)} left, ends at ${hm(o.endsAt)}. Show details.`}
      >
        <span className="dp-hero-label">
          <span>
            <Dot kind="live" />
            In class in <span className="dp-num dp-hero-label-room">{roomOf(o)}</span>
          </span>
        </span>
        <span className="dp-hero-count">
          <Countdown minutes={h.left} unitClass="dp-hero-unit" />
          <span className="dp-hero-post">left</span>
        </span>
        <span className="dp-progress" aria-hidden="true">
          <span className="dp-progress-track">
            <span className="dp-progress-fill" style={{ transform: `scaleX(${frac})` }} />
          </span>
          <span className="dp-progress-ends dp-num">
            <span>{hm(o.startsAt)}</span>
            <span>{hm(o.endsAt)}</span>
          </span>
        </span>
        <span className="dp-hero-subject">{o.subject}</span>
        <span className="dp-hero-meta">{kindLabel(o.kinds)}</span>
      </button>
      {h.next ? <Then o={h.next} word="then" note={note} /> : <LastClass later={h.later} />}
    </>
  )
}

function Free({ h }: { h: Extract<HeroT, { mode: 'free' }> }) {
  const o = h.next
  return (
    <>
      <div
        className="dp-hero-main dp-hero-static"
        role="group"
        aria-label={
          h.first
            ? `First class in ${spokenDuration(h.until)}, at ${hm(o.startsAt)}.`
            : `Free for ${spokenDuration(h.until)}, until ${hm(o.startsAt)}.`
        }
      >
        <span className="dp-hero-label">
          {h.first ? (
            <span>First class</span>
          ) : (
            <span>
              <Dot kind="free" />
              Free
            </span>
          )}
          <span className="dp-hero-at dp-num">until {hm(o.startsAt)}</span>
        </span>
        <span className="dp-hero-count" aria-hidden="true">
          {h.first && <span className="dp-hero-pre">in</span>}
          <Countdown minutes={h.until} unitClass="dp-hero-unit" />
        </span>
      </div>
      <Then o={o} word="next" note={null} />
    </>
  )
}

function skippedText(later: NextDay): string | null {
  if (!later.skipped.length) return null
  const parts = later.skipped.map((s) => `${weekday(s.date)} ${dayMonth(s.date)} (${s.reason})`)
  return `No classes on ${parts.join(' and ')}.`
}

function Later({ h }: { h: Extract<HeroT, { mode: 'done' | 'none' }> }) {
  const { today, selectDay } = useApp()
  const later = h.later
  let label: string
  if (h.mode === 'done') label = 'Done for today'
  else if (h.reason === 'Weekend') label = 'No classes this weekend'
  else if (h.reason === 'No classes today') label = h.reason
  else label = `${h.reason}, no classes`
  const o = later?.occ
  const when = o ? `${capitalise(relativeDay(o.date, today))} ${hm(o.startsAt)}` : ''
  const note = later && skippedText(later)
  return (
    <>
      <p className="dp-hero-label dp-hero-label-solo">{label}</p>
      {o ? (
        <button
          type="button"
          className="dp-hero-main"
          style={hueStyle(shortOf(o))}
          onClick={() => selectDay(o.date)}
          aria-label={`Next class ${when}, ${longDate(o.date)}: ${o.subject}, room ${roomOf(o)}. Show that day.`}
        >
          <span className="dp-hero-when dp-num">{when}</span>
          <span className="dp-hero-room dp-num">{roomOf(o)}</span>
          <span className="dp-hero-subject">{o.subject}</span>
          <span className="dp-hero-meta">
            {kindLabel(o.kinds)}
            {relativeDay(o.date, today) !== 'tomorrow' && `, ${longDate(o.date)}`}
          </span>
        </button>
      ) : (
        <p className="dp-hero-meta">Nothing after this in the demo’s timetable.</p>
      )}
      {note && <p className="dp-hero-note">{note}</p>}
    </>
  )
}

function Then({ o, word, note }: { o: Occurrence; word: string; note: string | null }) {
  const { openClass } = useApp()
  return (
    <button
      type="button"
      className="dp-then"
      style={hueStyle(shortOf(o))}
      onClick={() => openClass(o)}
      aria-label={`${capitalise(word)}: ${o.subject} at ${hm(o.startsAt)}, room ${roomOf(o)}${note ? `. ${note}` : ''}. Show details.`}
    >
      <span className="dp-then-word">{word}</span>
      <span className="dp-then-time dp-num">{hm(o.startsAt)}</span>
      <span className="dp-then-room dp-num">{roomOf(o)}</span>
      <span className="dp-then-subject">{o.subject}</span>
      {note && <span className="dp-then-note">{note}</span>}
    </button>
  )
}

function LastClass({ later }: { later: NextDay | null }) {
  const { today, selectDay } = useApp()
  if (!later) return <p className="dp-then-last">Last class in the demo’s timetable.</p>
  const o = later.occ
  const day = capitalise(relativeDay(o.date, today))
  return (
    <button
      type="button"
      className="dp-then dp-then-later"
      style={hueStyle(shortOf(o))}
      onClick={() => selectDay(o.date)}
      aria-label={`Last class today. Next: ${day} ${hm(o.startsAt)}, ${o.subject}, room ${roomOf(o)}. Show that day.`}
    >
      <span className="dp-then-word">Last class today, next</span>
      <span className="dp-then-time dp-num">
        {day} {hm(o.startsAt)}
      </span>
      <span className="dp-then-room dp-num">{roomOf(o)}</span>
      <span className="dp-then-subject">{o.subject}</span>
    </button>
  )
}
