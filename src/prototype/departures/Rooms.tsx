/** Rooms as a status board ("Free until 14:00" / "In use until 16:00"), and one room's day. */
import { AnimatePresence, m } from 'motion/react'
import { useState } from 'react'
import { buildingOf, classesOn, type RoomOccurrence, type RoomTimetable } from '../data'
import { useApp } from './context'
import {
  busyBlocks,
  DAY_END,
  DAY_START,
  endOf,
  freeBlocks,
  hueStyle,
  kindLabel,
  roomDates,
  roomDay,
  roomGroups,
  roomStatus,
  shortOf,
  startOf,
  statusRank,
  yourClassIn,
  type RoomStatus,
} from './model'
import { clock, duration, hm, longDate, nowMinutes, shortDate, weekday } from './time'
import { Dot, IconChevron, IconClose, IconSearch } from './ui'

const EASE = [0.2, 0.8, 0.2, 1] as const

/** Half-hour steps for "Free at…" (a native picker on phones, 24-hour like the campus). */
const SLOTS = Array.from({ length: (DAY_END - DAY_START) / 30 }, (_, i) => DAY_START + i * 30)

function words(status: RoomStatus, rt: RoomTimetable | undefined): { text: string; sub: string } {
  switch (status.kind) {
    case 'free':
      if (status.until !== null)
        return { text: `Free until ${clock(status.until)}`, sub: `for ${duration(status.freeFor)}` }
      return rt && rt.occurrences.length === 0
        ? { text: 'Free all day', sub: '' }
        : { text: 'Free to the end of the day', sub: '' }
    case 'busy': {
      // The board answers "when can I get in?": free at…, then for how long.
      const nf = status.nextFree
      if (!nf) return { text: 'In use to the end of the day', sub: '' }
      return {
        text: `Free at ${clock(nf.from)}`,
        sub: nf.to >= DAY_END ? 'then to the end of the day' : `until ${clock(nf.to)}`,
      }
    }
    case 'closed':
      return { text: 'No more classes today', sub: '' }
    case 'unknown':
      return { text: 'No schedule for this day', sub: '' }
  }
}

function dotKind(s: RoomStatus): 'free' | 'busy' | null {
  return s.kind === 'free' ? 'free' : s.kind === 'busy' ? 'busy' : null
}

export function RoomsList({
  selected,
  onPick,
}: {
  selected?: string | null
  onPick: (code: string, date: string) => void
}) {
  const { data, now, today, roomFilter: f, setRoomFilter } = useApp()
  const covered = roomDates(data)
  const date = f.date ?? (covered.includes(today) ? today : null)
  const isToday = date === today
  const t = nowMinutes(now)
  const mode = !isToday && f.mode === 'now' ? 'all' : f.mode
  const at = isToday && mode !== 'at' ? t : f.at

  if (!date) {
    return (
      <div className="dp-rooms">
        <RoomsHead sub={longDate(today)} />
        <div className="dp-notice">
          <p>
            No room schedules for {weekday(today)} {shortDate(today).slice(4)}.
          </p>
          <p className="dp-notice-sub">
            This demo has every room’s week from Monday 23 to Friday 27 November. Pick a day to look
            at:
          </p>
          <div className="dp-chips">
            {covered.map((d) => (
              <button
                key={d}
                type="button"
                className="dp-chip"
                onClick={() => setRoomFilter({ ...f, date: d, mode: 'at', near: null })}
              >
                {shortDate(d)}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const q = f.query.trim().toUpperCase()
  const statusOf = (code: string) => roomStatus(roomDay(data, code, date), at)
  const near = f.near
  const passes = (code: string) => {
    if (q && !code.toUpperCase().includes(q)) return false
    const rt = roomDay(data, code, date)
    if (near) {
      if (buildingOf(code) !== near.group || !rt) return false
      return !rt.occurrences.some((o) => startOf(o) < near.until && endOf(o) > at)
    }
    if (mode === 'all') return true
    return statusOf(code).kind === 'free'
  }
  const yours = near
    ? []
    : [
        ...new Set(
          classesOn(data.timetable, date)
            .map((c) => c.room)
            .filter((r): r is string => !!r),
        ),
      ].filter((code) => !q || code.toUpperCase().includes(q))
  const rest = data.rooms.map((r) => r.code).filter((c) => !yours.includes(c) && passes(c))
  const groups = roomGroups(rest).map((g) => ({
    ...g,
    codes: [...g.codes].sort((a, b) => statusRank(statusOf(a)) - statusRank(statusOf(b))),
  }))
  const yourClass = (code: string) =>
    classesOn(data.timetable, date).find((c) => c.room === code && (!isToday || endOf(c) > t))

  const row = (code: string, isYours: boolean) => {
    const rt = roomDay(data, code, date)
    const s = statusOf(code)
    const w = words(s, rt)
    const yc = isYours ? yourClass(code) : undefined
    const dk = dotKind(s)
    return (
      <m.li
        key={code}
        layout="position"
        className="dp-row-li"
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        transition={{ layout: { duration: 0.25, ease: EASE } }}
      >
        <button
          type="button"
          className="dp-room-row"
          aria-current={selected === code ? 'true' : undefined}
          onClick={() => onPick(code, date)}
          aria-label={`${code}: ${w.text}${w.sub ? `, ${w.sub}` : ''}${yc ? `. Your class at ${hm(yc.startsAt)}` : ''}`}
        >
          <span className="dp-room-code dp-num">{code}</span>
          <span className="dp-room-status" data-kind={s.kind}>
            {dk && <Dot kind={dk} />}
            {w.text}
          </span>
          <span className="dp-room-sub dp-num">
            {yc ? (
              <span className="dp-room-yours" style={hueStyle(shortOf(yc))}>
                Your {shortOf(yc)} at {hm(yc.startsAt)}
              </span>
            ) : (
              w.sub
            )}
          </span>
        </button>
      </m.li>
    )
  }

  const setMode = (next: 'now' | 'at' | 'all') => {
    const nextAt =
      next === 'at' && f.mode !== 'at'
        ? Math.min(DAY_END - 60, Math.max(DAY_START, Math.ceil(t / 60) * 60))
        : f.at
    setRoomFilter({ ...f, mode: next, at: nextAt, near: null })
  }

  const total = groups.reduce((n, g) => n + g.codes.length, 0)
  return (
    <div className="dp-rooms">
      <RoomsHead
        sub={`${longDate(date)}, ${isToday && mode !== 'at' ? `now ${clock(Math.floor(t))}` : `at ${clock(at)}`}`}
      />
      <div className="dp-rooms-controls">
        <label className="dp-search">
          <IconSearch />
          <span className="dp-sr">Find a room</span>
          <input
            type="search"
            value={f.query}
            placeholder="Find a room, e.g. B528A"
            autoComplete="off"
            onChange={(e) => setRoomFilter({ ...f, query: e.target.value })}
          />
        </label>
        <div className="dp-segmented" role="radiogroup" aria-label="Show">
          {(
            [
              ['now', 'Free now'],
              ['at', 'Free at…'],
              ['all', 'All'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={!near && mode === id}
              disabled={id === 'now' && !isToday}
              onClick={() => setMode(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === 'at' && !near && (
          <div className="dp-at">
            <label className="dp-at-label">
              Free at
              <select
                className="dp-num"
                value={f.at}
                onChange={(e) => setRoomFilter({ ...f, at: Number(e.target.value) })}
              >
                {SLOTS.map((m) => (
                  <option key={m} value={m}>
                    {clock(m)}
                  </option>
                ))}
              </select>
            </label>
            <div className="dp-chips">
              {[10, 12, 14, 16, 18].map((h) => (
                <button
                  key={h}
                  type="button"
                  className="dp-chip dp-num"
                  aria-pressed={f.at === h * 60}
                  onClick={() => setRoomFilter({ ...f, at: h * 60 })}
                >
                  {h}:00
                </button>
              ))}
            </div>
          </div>
        )}
        {(near || f.date) && (
          <div className="dp-chips">
            {near && (
              <button
                type="button"
                className="dp-chip dp-chip-on"
                onClick={() => setRoomFilter({ ...f, near: null })}
                aria-label={`Showing rooms free near ${near.room} until ${clock(near.until)}. Remove this filter.`}
              >
                <span>
                  Near <span className="dp-num">{near.room}</span>, free until{' '}
                  <span className="dp-num">{clock(near.until)}</span>
                </span>
                <IconClose />
              </button>
            )}
            {f.date && (
              <button
                type="button"
                className="dp-chip dp-chip-on"
                onClick={() => setRoomFilter({ ...f, date: null, mode: 'all' })}
                aria-label={`Showing ${longDate(f.date)}. Back to today.`}
              >
                {shortDate(f.date)}
                <IconClose />
              </button>
            )}
          </div>
        )}
      </div>

      {yours.length > 0 && (
        <section className="dp-room-group" aria-labelledby="dp-rg-yours">
          <h2 className="dp-group-title" id="dp-rg-yours">
            Your rooms {isToday ? 'today' : `on ${weekday(date)}`}
          </h2>
          <ul className="dp-rows">
            <AnimatePresence initial={false}>{yours.map((c) => row(c, true))}</AnimatePresence>
          </ul>
        </section>
      )}
      {groups.map((g) => {
        const free = g.codes.filter((c) => statusOf(c).kind === 'free').length
        const id = `dp-rg-${g.group || 'other'}`
        return (
          <section key={g.group || 'other'} className="dp-room-group" aria-labelledby={id}>
            <h2 className="dp-group-title" id={id}>
              {g.group ? (
                <>
                  <span className="dp-num">{g.group}</span> rooms
                </>
              ) : (
                'Other rooms'
              )}
              <span className="dp-group-count">
                {mode === 'all' && !near ? `${free} of ${g.codes.length} free` : g.codes.length}
              </span>
            </h2>
            <ul className="dp-rows">
              <AnimatePresence initial={false}>{g.codes.map((c) => row(c, false))}</AnimatePresence>
            </ul>
          </section>
        )
      })}
      {total === 0 && (
        <div className="dp-notice">
          <p>
            {near
              ? `No room near ${near.room} stays free until ${clock(near.until)}.`
              : q
                ? `No room matches “${f.query.trim()}”.`
                : `No room is free at ${clock(at)}.`}
          </p>
          <button
            type="button"
            className="dp-text-link"
            onClick={() => setRoomFilter({ ...f, near: null, query: '', mode: 'all' })}
          >
            Show all rooms
          </button>
        </div>
      )}
      <p className="dp-footnote">
        From the official timetable, so a room can still be taken by something that isn’t on it. The
        groups follow the room code: the timetable doesn’t say which building a room is in.
      </p>
    </div>
  )
}

function RoomsHead({ sub }: { sub: string }) {
  return (
    <header className="dp-title-head">
      <h1 className="dp-title">Rooms</h1>
      <p className="dp-title-sub">{sub}</p>
    </header>
  )
}

// ── One room's day ───────────────────────────────────────────────────────────────────────────

function nearest(dates: string[], wanted: string): string {
  if (!dates.length) return wanted
  if (wanted < dates[0]) return dates[0]
  return [...dates].reverse().find((d) => d <= wanted) ?? dates[dates.length - 1]
}

export function RoomDay({
  code,
  initialDate,
  onBack,
}: {
  code: string
  initialDate: string | null
  onBack?: () => void
}) {
  const { data, now, today } = useApp()
  const covered = roomDates(data)
  const wanted = initialDate ?? today
  const [date, setDate] = useState(() =>
    covered.includes(wanted) ? wanted : nearest(covered, wanted),
  )
  const rt = roomDay(data, code, date)
  const isToday = date === today
  const t = nowMinutes(now)
  const status = isToday ? roomStatus(rt, t) : null
  const group = buildingOf(code)
  const idx = covered.indexOf(date)
  const known = data.rooms.some((r) => r.code === code)
  const free = rt ? freeBlocks(rt) : []

  let big: { text: string; kind: 'free' | 'busy' | 'calm' }
  let sub = ''
  if (status?.kind === 'busy') {
    big = { text: `In use until ${clock(status.until)}`, kind: 'busy' }
    const nf = status.nextFree
    sub = nf ? `Free next ${clock(nf.from)} to ${clock(nf.to)}` : 'No free time left today'
  } else if (status?.kind === 'free') {
    big = {
      text:
        status.until === null
          ? 'Free for the rest of the day'
          : `Free until ${clock(status.until)}`,
      kind: 'free',
    }
    const block =
      rt && status.until !== null ? busyBlocks(rt).find((b) => b.from === status.until) : null
    sub = `${duration(status.freeFor)} free${block ? `, then in use until ${clock(block.to)}` : ''}`
  } else if (status?.kind === 'closed') {
    big = { text: 'No more classes today', kind: 'calm' }
  } else {
    big = { text: longDate(date), kind: 'calm' }
    sub = !rt
      ? 'No schedule for this day'
      : free.length === 0
        ? 'In use all day'
        : free.length === 1 && free[0].from === DAY_START && free[0].to === DAY_END
          ? 'Free all day'
          : `Free ${free.map((b) => `${clock(b.from)} to ${clock(b.to)}`).join(', ')}`
  }

  return (
    <div className="dp-roomday">
      {onBack && (
        <div className="dp-push-head">
          <button type="button" className="dp-back" onClick={onBack}>
            <IconChevron dir="left" />
            Back
          </button>
        </div>
      )}
      <header className="dp-roomday-head">
        <h1 className="dp-roomday-code dp-num">{code}</h1>
        {group !== code && (
          <p className="dp-roomday-group">
            Probably building {group}, going by the code. The timetable doesn’t record buildings.
          </p>
        )}
        {!known && <p className="dp-roomday-group">This room isn’t in the room list.</p>}
        {wanted !== date && (
          <p className="dp-roomday-note">
            No room schedule for {longDate(wanted)} in this demo, so this is {longDate(date)}.
          </p>
        )}
        <p className="dp-roomday-status" data-kind={big.kind}>
          {big.kind !== 'calm' && <Dot kind={big.kind} />}
          {big.text}
        </p>
        {sub && <p className="dp-roomday-sub dp-num">{sub}</p>}
      </header>

      <div className="dp-roomday-nav">
        <button
          type="button"
          className="dp-icon-button"
          aria-label="Previous day"
          disabled={idx <= 0}
          onClick={() => setDate(covered[idx - 1])}
        >
          <IconChevron dir="left" />
        </button>
        <span className="dp-roomday-date">
          {isToday ? 'Today' : weekday(date)}{' '}
          <span className="dp-num">{shortDate(date).slice(4)}</span>
        </span>
        <button
          type="button"
          className="dp-icon-button"
          aria-label="Next day"
          disabled={idx < 0 || idx >= covered.length - 1}
          onClick={() => setDate(covered[idx + 1])}
        >
          <IconChevron dir="right" />
        </button>
      </div>

      {rt && <RoomStrip rt={rt} nowMin={isToday ? t : null} />}

      {rt && rt.occurrences.length > 0 && (
        <ul className="dp-rows" aria-label={`Classes in ${code}, ${longDate(date)}`}>
          {[...rt.occurrences]
            .sort((a, b) => startOf(a) - startOf(b))
            .map((o) => (
              <li key={o.startsAt + o.subject} className="dp-row-li">
                <RoomOccRow
                  o={o}
                  code={code}
                  date={date}
                  state={
                    date < today || (isToday && endOf(o) <= t)
                      ? 'past'
                      : isToday && startOf(o) <= t
                        ? 'now'
                        : 'later'
                  }
                />
              </li>
            ))}
        </ul>
      )}
      {rt && rt.occurrences.length === 0 && (
        <p className="dp-summary">
          No classes in {code} on {weekday(date)}.
        </p>
      )}
    </div>
  )
}

function RoomOccRow({
  o,
  code,
  date,
  state,
}: {
  o: RoomOccurrence
  code: string
  date: string
  state: 'past' | 'now' | 'later'
}) {
  const { data, openClass } = useApp()
  const yours = yourClassIn(data, code, date, o)
  const who = o.groups.length
    ? o.groups.join(', ')
    : o.offered
      ? 'For the students who pick this slot'
      : ''
  const inner = (
    <>
      <span className="dp-row-time dp-num">
        <span className="dp-row-start">{hm(o.startsAt)}</span>
        <span className="dp-row-end">{hm(o.endsAt)}</span>
      </span>
      <span className="dp-row-main">
        <span className="dp-row-subject">{o.subject}</span>
        <span className="dp-row-kind">
          {state === 'now' && <span className="dp-now-tag">Now</span>}
          {kindLabel(o.kinds)}
          {who && <span className="dp-row-teacher">{who}</span>}
        </span>
      </span>
      {yours && <span className="dp-row-yours">Yours</span>}
    </>
  )
  if (yours)
    return (
      <button
        type="button"
        className="dp-row"
        data-state={state}
        style={hueStyle(shortOf(yours))}
        onClick={() => openClass(yours)}
        aria-label={`Your class: ${yours.subject}, ${hm(o.startsAt)} to ${hm(o.endsAt)}${state === 'now' ? ', now' : ''}. Show details.`}
      >
        {inner}
      </button>
    )
  return (
    <div className="dp-row dp-row-static" data-state={state}>
      {inner}
    </div>
  )
}

function RoomStrip({ rt, nowMin }: { rt: RoomTimetable; nowMin: number | null }) {
  const span = DAY_END - DAY_START
  const pct = (m: number) => `${((m - DAY_START) / span) * 100}%`
  const width = (a: number, b: number) => `${((b - a) / span) * 100}%`
  return (
    <div className="dp-rstrip" aria-hidden="true">
      <div className="dp-rstrip-bar">
        {freeBlocks(rt).map((b) => (
          <span
            key={`f${b.from}`}
            className="dp-rstrip-free"
            style={{ left: pct(b.from), width: width(b.from, b.to) }}
          />
        ))}
        {busyBlocks(rt).map((b) => (
          <span
            key={`b${b.from}`}
            className="dp-rstrip-busy"
            style={{ left: pct(b.from), width: width(b.from, Math.min(b.to, DAY_END)) }}
          />
        ))}
        {nowMin !== null && nowMin >= DAY_START && nowMin <= DAY_END && (
          <span className="dp-rstrip-now" style={{ left: pct(nowMin) }} />
        )}
      </div>
      <div className="dp-rstrip-hours dp-num">
        {[8, 10, 12, 14, 16, 18, 20].map((h) => (
          <span key={h} style={{ left: pct(h * 60) }}>
            {String(h).padStart(2, '0')}
          </span>
        ))}
      </div>
      <div className="dp-rstrip-key">
        <span>
          <span className="dp-rstrip-swatch" data-kind="free" />
          Free
        </span>
        <span>
          <span className="dp-rstrip-swatch" data-kind="busy" />
          In use
        </span>
      </div>
    </div>
  )
}
