/**
 * Two shells, one codebase. Phone (≤ 640 px) is the mobile app: tab bar, a swipeable day pager,
 * rooms pushed on a stack, bottom sheets. Wider is the web app: Today and the week side by side,
 * master-detail rooms, a side panel, keyboard and URL state.
 */
import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import { useState, type ComponentType } from 'react'
import { addDays } from '../clock'
import type { Occurrence } from '../data'
import { DayPage } from './Board'
import { ClassDetail } from './ClassDetail'
import { useApp } from './context'
import { DeadlinesView, DueDetail } from './Deadlines'
import { daySub, findClass, heroState, isWeekend, pagerDays, weekOf, weekRange } from './model'
import { tick, type View } from './nav'
import { Panel, Sheet } from './Overlay'
import { BackToToday, DayStrip, SnapPager } from './Pager'
import { RoomDay, RoomsList } from './Rooms'
import { clock, longDate, mondayOf } from './time'
import { IconChevron, IconDue, IconRooms, IconToday, IconWeek } from './ui'
import { Legend, WeekGrid } from './Week'

// ── Shared ───────────────────────────────────────────────────────────────────────────────────

function Overlays() {
  const { data, nav, phone, close } = useApp()
  const occ = findClass(data, nav.cls)
  // Keep showing the last item while the sheet animates out.
  const [shownOcc, setShownOcc] = useState<Occurrence | null>(occ)
  const [shownDue, setShownDue] = useState<number | null>(nav.due)
  if (occ && occ !== shownOcc) setShownOcc(occ)
  if (nav.due !== null && nav.due !== shownDue) setShownDue(nav.due)
  const Wrap = phone ? Sheet : Panel
  return (
    <>
      <Wrap
        open={!!occ}
        onClose={() => close('cls')}
        label={shownOcc ? `${shownOcc.subject}, class details` : 'Class details'}
      >
        {shownOcc && <ClassDetail key={`${shownOcc.date}-${shownOcc.startsAt}`} occ={shownOcc} />}
      </Wrap>
      <Wrap open={nav.due !== null} onClose={() => close('due')} label="Deadline details">
        {shownDue !== null && <DueDetail id={shownDue} />}
      </Wrap>
    </>
  )
}

function useDueCount(): number {
  const { deadlines } = useApp()
  return deadlines.filter((d) => d.group === 'overdue' || d.group === 'today').length
}

// ── Phone ────────────────────────────────────────────────────────────────────────────────────

const TABS: [View, string, ComponentType][] = [
  ['today', 'Today', IconToday],
  ['week', 'Week', IconWeek],
  ['rooms', 'Rooms', IconRooms],
  ['deadlines', 'Deadlines', IconDue],
]

export function PhoneApp() {
  const { nav, openRoom } = useApp()
  return (
    <div className="dp-phone">
      <main className="dp-phone-main">
        {nav.view === 'today' && <PhoneToday />}
        {nav.view === 'week' && <PhoneWeek />}
        {nav.view === 'rooms' && (
          <div className="dp-scroll">
            <RoomsList onPick={(code, date) => openRoom(code, date)} />
          </div>
        )}
        {nav.view === 'deadlines' && (
          <div className="dp-scroll">
            <DeadlinesView />
          </div>
        )}
        <PushedRoom />
      </main>
      <TabBar />
      <Overlays />
    </div>
  )
}

function TabBar() {
  const { nav, go } = useApp()
  const due = useDueCount()
  return (
    <nav className="dp-tabbar" aria-label="Sections">
      {TABS.map(([id, label, Icon]) => (
        <button
          key={id}
          type="button"
          className="dp-tab"
          aria-current={nav.view === id ? 'page' : undefined}
          aria-label={id === 'deadlines' && due ? `${label}, ${due} need attention` : label}
          // Tabs switch instantly, never slide (the platform's own tab bar doesn't either).
          onClick={() => go({ view: id, room: null, cls: null, due: null }, { replace: true })}
        >
          <span className="dp-tab-icon">
            <Icon />
            {id === 'deadlines' && due > 0 && <span className="dp-tab-badge dp-num">{due}</span>}
          </span>
          <span className="dp-tab-label">{label}</span>
        </button>
      ))}
    </nav>
  )
}

function PhoneToday() {
  const { data, today, selectedDay, selectDay } = useApp()
  const days = pagerDays(data, today)
  const idx = Math.max(0, days.indexOf(selectedDay))
  return (
    <div className="dp-today">
      <DayStrip days={days} selected={selectedDay} />
      <SnapPager
        items={days}
        index={idx}
        itemKey={(d) => d}
        label="Days: swipe to change the day"
        onIndex={(i) => {
          selectDay(days[i])
          if (days[i] === today) tick()
        }}
        render={(d) => <DayPage date={d} />}
      />
      <BackToToday show={selectedDay !== today} ahead={selectedDay > today} />
    </div>
  )
}

function PhoneWeek() {
  const { data, today, selectedDay } = useApp()
  const mondays = [...new Set(pagerDays(data, today).map(mondayOf))]
  const [i, setI] = useState(() => {
    const own = mondayOf(selectedDay)
    const next = isWeekend(selectedDay) ? mondays.indexOf(addDays(own, 7)) : -1
    return next >= 0 ? next : Math.max(0, mondays.indexOf(own))
  })
  const monday = mondays[i] ?? mondays[0]
  const week = weekOf(data, monday)
  return (
    <div className="dp-weekview">
      <header className="dp-title-head dp-title-row">
        <div>
          <h1 className="dp-title">{week ? `Week ${week}` : 'Week'}</h1>
          <p className="dp-title-sub">{weekRange(monday)}</p>
        </div>
        <div className="dp-title-actions">
          <button
            type="button"
            className="dp-icon-button"
            aria-label="Previous week"
            disabled={i === 0}
            onClick={() => setI(i - 1)}
          >
            <IconChevron dir="left" />
          </button>
          <button
            type="button"
            className="dp-icon-button"
            aria-label="Next week"
            disabled={i >= mondays.length - 1}
            onClick={() => setI(i + 1)}
          >
            <IconChevron dir="right" />
          </button>
        </div>
      </header>
      <SnapPager
        items={mondays}
        index={i}
        itemKey={(d) => d}
        label="Weeks: swipe to change the week"
        onIndex={setI}
        render={(mon) => (
          <div className="dp-week-page">
            <WeekGrid monday={mon} compact />
            <Legend monday={mon} />
          </div>
        )}
      />
    </div>
  )
}

/** A room's day pushed over the current tab, like a native stack (slides in from the right). */
function PushedRoom() {
  const { nav, close } = useApp()
  const reduced = useReducedMotion()
  return (
    <AnimatePresence>
      {nav.room && (
        <m.div
          key={`${nav.room}-${nav.roomDay ?? ''}`}
          className="dp-push"
          initial={reduced ? { opacity: 0 } : { x: '100%' }}
          animate={reduced ? { opacity: 1 } : { x: 0 }}
          exit={reduced ? { opacity: 0 } : { x: '100%' }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        >
          <div className="dp-scroll">
            <RoomDay code={nav.room} initialDate={nav.roomDay} onBack={() => close('room')} />
          </div>
        </m.div>
      )}
    </AnimatePresence>
  )
}

// ── Desktop ──────────────────────────────────────────────────────────────────────────────────

export function DesktopApp() {
  const { nav, go, now } = useApp()
  const due = useDueCount()
  const view = nav.view === 'week' ? 'today' : nav.view
  const links: [View, string][] = [
    ['today', 'Today'],
    ['rooms', 'Rooms'],
    ['deadlines', 'Deadlines'],
  ]
  return (
    <div className="dp-desk">
      <header className="dp-topbar">
        <span className="dp-wordmark">CampusPulse</span>
        <nav className="dp-topnav" aria-label="Sections">
          {links.map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-current={view === id ? 'page' : undefined}
              onClick={() => go({ view: id, cls: null, due: null, room: null, roomDay: null })}
            >
              {label}
              {id === 'deadlines' && due > 0 && (
                <span className="dp-topnav-badge dp-num" aria-label={`${due} need attention`}>
                  {due}
                </span>
              )}
            </button>
          ))}
        </nav>
        <p className="dp-topclock">
          <span>Now</span>
          <span className="dp-num dp-topclock-time">{clock(now.minutes)}</span>
        </p>
      </header>
      <main className="dp-desk-main">
        {view === 'today' && <DeskToday />}
        {view === 'rooms' && <DeskRooms />}
        {view === 'deadlines' && (
          <div className="dp-desk-narrow">
            <DeadlinesView />
          </div>
        )}
      </main>
      <Overlays />
    </div>
  )
}

function DeskToday() {
  const { data, today, selectedDay, selectDay } = useApp()
  const days = pagerDays(data, today)
  const i = days.indexOf(selectedDay)
  // On a weekend the week just gone is history: show the coming one.
  const shownMonday = isWeekend(selectedDay)
    ? addDays(mondayOf(selectedDay), 7)
    : mondayOf(selectedDay)
  const monday = days.some((d) => mondayOf(d) === shownMonday) ? shownMonday : mondayOf(selectedDay)
  const week = weekOf(data, monday)
  const step = (by: number) => {
    const next = days[i + by]
    if (next) selectDay(next)
  }
  const stepWeek = (by: number) => {
    const target = addDays(monday, by * 7)
    const wanted = days.filter((d) => mondayOf(d) === target && !isWeekend(d))
    const same = addDays(selectedDay, by * 7)
    if (wanted.length) selectDay(wanted.includes(same) ? same : wanted[0])
  }
  const sub = daySub(selectedDay, today)
  return (
    <div className="dp-desk-today">
      <section className="dp-desk-day" aria-label="The day">
        <div className="dp-daynav">
          <div className="dp-daynav-text">
            <h1 className="dp-day-title">{longDate(selectedDay)}</h1>
            {sub && <p className="dp-day-sub">{sub}</p>}
          </div>
          <div className="dp-daynav-actions">
            {selectedDay !== today && (
              <button type="button" className="dp-today-button" onClick={() => selectDay(today)}>
                Today
              </button>
            )}
            <button
              type="button"
              className="dp-icon-button"
              aria-label="Previous day"
              aria-keyshortcuts="ArrowLeft"
              disabled={i <= 0}
              onClick={() => step(-1)}
            >
              <IconChevron dir="left" />
            </button>
            <button
              type="button"
              className="dp-icon-button"
              aria-label="Next day"
              aria-keyshortcuts="ArrowRight"
              disabled={i >= days.length - 1}
              onClick={() => step(1)}
            >
              <IconChevron dir="right" />
            </button>
          </div>
        </div>
        <DayPage date={selectedDay} heading={false} />
      </section>
      <section className="dp-desk-week" aria-label={week ? `Week ${week}` : 'Week'}>
        <div className="dp-weekhead">
          <h2 className="dp-weekhead-title">{week ? `Week ${week}` : 'Week'}</h2>
          <span className="dp-weekhead-range">{weekRange(monday)}</span>
          <div className="dp-weekhead-actions">
            <button
              type="button"
              className="dp-icon-button"
              aria-label="Previous week"
              disabled={!days.some((d) => d < monday)}
              onClick={() => stepWeek(-1)}
            >
              <IconChevron dir="left" />
            </button>
            <button
              type="button"
              className="dp-icon-button"
              aria-label="Next week"
              disabled={!days.some((d) => mondayOf(d) > monday)}
              onClick={() => stepWeek(1)}
            >
              <IconChevron dir="right" />
            </button>
          </div>
        </div>
        <WeekGrid monday={monday} compact={false} selected={selectedDay} onSelectDay={selectDay} />
        <Legend monday={monday} />
        <p className="dp-keys">
          <kbd>←</kbd> <kbd>→</kbd> change the day, <kbd>T</kbd> goes back to today, <kbd>Esc</kbd>{' '}
          closes a panel
        </p>
      </section>
    </div>
  )
}

function DeskRooms() {
  const { data, now, nav, go } = useApp()
  const h = heroState(data, now)
  const fallback =
    (h.mode === 'class'
      ? h.current.room
      : h.mode === 'soon' || h.mode === 'free'
        ? h.next.room
        : null) ??
    data.rooms[0]?.code ??
    ''
  const code = nav.room ?? fallback
  return (
    <div className="dp-desk-rooms">
      <div className="dp-desk-rooms-list">
        <RoomsList
          selected={code}
          onPick={(c, date) => go({ room: c, roomDay: date }, { replace: true })}
        />
      </div>
      <div className="dp-desk-rooms-detail">
        {code && (
          <RoomDay key={`${code}-${nav.roomDay ?? ''}`} code={code} initialDate={nav.roomDay} />
        )}
      </div>
    </div>
  )
}
