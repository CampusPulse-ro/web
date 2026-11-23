/** A day as a departure board: hairline rows (time, class, room), breaks as rows, finished classes folded. */
import { AnimatePresence, m } from 'motion/react'
import { useState } from 'react'
import { classesOn, type Occurrence } from '../data'
import { useApp } from './context'
import { DeadlineRow } from './Deadlines'
import { Hero } from './Hero'
import {
  boardFor,
  classKey,
  daySub,
  freeRoomsNear,
  hueStyle,
  inTimetable,
  isWeekend,
  kindLabel,
  nextDayAfter,
  nonTeaching,
  shortOf,
  type BoardItem,
  type RowState,
} from './model'
import { capitalise, clock, duration, hm, longDate, nowMinutes, relativeDay, weekday } from './time'
import { IconChevron, RollingCount } from './ui'

const EASE = [0.2, 0.8, 0.2, 1] as const

/** One day: its heading, the live hero (today) or a summary, the board, and what's due (today). */
export function DayPage({ date, heading = true }: { date: string; heading?: boolean }) {
  const { data, today } = useApp()
  const isToday = date === today
  const sub = daySub(data, date, today)
  return (
    <div className="dp-day">
      {heading && (
        <header className="dp-day-head">
          <h1 className="dp-day-title">{longDate(date)}</h1>
          {sub && <p className="dp-day-sub">{sub}</p>}
        </header>
      )}
      {isToday ? <Hero /> : <DaySummary date={date} />}
      <BoardList date={date} />
      {isToday && <DueSoon />}
    </div>
  )
}

function DaySummary({ date }: { date: string }) {
  const { data, today, selectDay } = useApp()
  const classes = classesOn(data.timetable, date)
  if (classes.length) {
    const first = classes[0]
    const last = classes[classes.length - 1]
    return (
      <p className="dp-summary">
        {classes.length === 1 ? '1 class' : `${classes.length} classes`}, {hm(first.startsAt)} to{' '}
        {hm(last.endsAt)}
        {date < today && <span className="dp-summary-past">. This day is over.</span>}
      </p>
    )
  }
  let reason: string
  if (!inTimetable(data, date)) reason = 'This demo’s timetable covers 23 November to 6 December.'
  else {
    const off = nonTeaching(data, date)
    reason = off
      ? `${off}. No classes.`
      : isWeekend(date)
        ? `No classes on ${weekday(date)}.`
        : 'No classes this day.'
  }
  const next = nextDayAfter(data, date)
  return (
    <div className="dp-summary dp-summary-empty">
      <p>{reason}</p>
      {next && (
        <button
          type="button"
          className="dp-next-link"
          style={hueStyle(shortOf(next.occ))}
          onClick={() => selectDay(next.occ.date)}
        >
          <span className="dp-next-word">Next</span>
          <span className="dp-num dp-next-when">
            {capitalise(relativeDay(next.occ.date, today))} {hm(next.occ.startsAt)}
          </span>
          <span className="dp-num dp-next-room">{next.occ.room}</span>
          <span className="dp-next-subject">{next.occ.subject}</span>
          <IconChevron />
        </button>
      )}
    </div>
  )
}

function BoardList({ date }: { date: string }) {
  const { data, now } = useApp()
  const board = boardFor(data, date, now)
  if (board.count === 0) return null
  return (
    <div className="dp-board">
      <div className="dp-board-head" aria-hidden="true">
        <span>Time</span>
        <span>Class</span>
        <span>Room</span>
      </div>
      {board.earlier.length > 0 && <EarlierFold items={board.earlier} />}
      <ul className="dp-rows" aria-label={`Classes, ${longDate(date)}`}>
        <AnimatePresence initial={false}>
          {board.items.map((item) => (
            <m.li
              key={item.key}
              layout="position"
              className="dp-row-li"
              exit={{ opacity: 0, height: 0, transition: { duration: 0.25, ease: EASE } }}
              transition={{ layout: { duration: 0.25, ease: EASE } }}
            >
              {item.type === 'class' ? (
                <ClassRow occ={item.occ} state={item.state} />
              ) : (
                <GapRow gap={item} date={date} />
              )}
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}

function classAria(o: Occurrence, state: RowState): string {
  const when = { past: ', finished', now: ', now', later: '' }[state]
  return `${o.subject}, ${kindLabel(o.kinds).toLowerCase()}, ${hm(o.startsAt)} to ${hm(o.endsAt)}, room ${o.room ?? 'not set'}${when}`
}

export function ClassRow({ occ, state }: { occ: Occurrence; state: RowState }) {
  const { openClass } = useApp()
  return (
    <button
      type="button"
      className="dp-row"
      data-state={state}
      style={hueStyle(shortOf(occ))}
      onClick={() => openClass(occ)}
      aria-label={classAria(occ, state)}
    >
      <span className="dp-row-time dp-num">
        <span className="dp-row-start">{hm(occ.startsAt)}</span>
        <span className="dp-row-end">{hm(occ.endsAt)}</span>
      </span>
      <span className="dp-row-main">
        <span className="dp-row-subject">{occ.subject}</span>
        <span className="dp-row-kind">
          {state === 'now' && <span className="dp-now-tag">Now</span>}
          {kindLabel(occ.kinds)}
          {occ.teacher && <span className="dp-row-teacher">{occ.teacher}</span>}
        </span>
      </span>
      <span className="dp-row-room dp-num">{occ.room ?? '–'}</span>
    </button>
  )
}

function GapRow({ gap, date }: { gap: Extract<BoardItem, { type: 'gap' }>; date: string }) {
  const { data, now, roomsNear } = useApp()
  const from = gap.now ? nowMinutes(now) : gap.from
  const left = gap.to - from
  const near = gap.near ? freeRoomsNear(data, date, Math.ceil(from), gap.to, gap.near) : null
  return (
    <div className="dp-gap" data-now={gap.now}>
      <span className="dp-gap-len dp-num">{duration(left)}</span>
      <span className="dp-gap-main">
        <span className="dp-gap-text">
          {gap.now ? 'Free now' : 'Free'}, {clock(gap.from)} to {clock(gap.to)}
        </span>
        {near && near.rooms.length > 0 && gap.near && (
          <button
            type="button"
            className="dp-gap-link"
            onClick={() => roomsNear(gap.near!, gap.to)}
          >
            {near.rooms.length} {near.rooms.length === 1 ? 'room' : 'rooms'} free near{' '}
            <span className="dp-num">{gap.near}</span> until {clock(gap.to)}
            <IconChevron />
          </button>
        )}
      </span>
    </div>
  )
}

function EarlierFold({ items }: { items: Occurrence[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="dp-fold">
      <button
        type="button"
        className="dp-fold-button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span>
          Earlier today (<RollingCount value={items.length} />)
        </span>
        <IconChevron dir={open ? 'up' : 'down'} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <m.ul
            className="dp-rows dp-fold-rows"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            {items.map((o) => (
              <li key={classKey(o)} className="dp-row-li">
                <ClassRow occ={o} state="past" />
              </li>
            ))}
          </m.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

function DueSoon() {
  const { deadlines, go } = useApp()
  const soon = deadlines
    .filter((d) => d.group === 'overdue' || d.group === 'today' || d.group === 'week')
    .slice(0, 3)
  if (!soon.length) return null
  return (
    <section className="dp-section" aria-labelledby="dp-due-soon">
      <div className="dp-section-head">
        <h2 className="dp-section-title" id="dp-due-soon">
          Due soon
        </h2>
        <button
          type="button"
          className="dp-text-link"
          onClick={() => go({ view: 'deadlines', day: null }, { replace: true })}
        >
          All deadlines
        </button>
      </div>
      <ul className="dp-rows">
        {soon.map((d) => (
          <li key={d.a.id} className="dp-row-li">
            <DeadlineRow d={d} />
          </li>
        ))}
      </ul>
    </section>
  )
}
