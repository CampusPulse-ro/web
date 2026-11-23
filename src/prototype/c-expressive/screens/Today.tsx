import { AnimatePresence, m } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addDays } from '../../clock'
import {
  useHref,
  useKeys,
  useParam,
  useProto,
  useSheetParam,
  useSnackbar,
  useWindowClass,
} from '../ctx'
import { haptic } from '../haptics'
import { Icon } from '../icons'
import {
  breaksOf,
  cutoffState,
  dateRange,
  dayClasses,
  dayState,
  duration,
  freeBetween,
  groupOf,
  hhmm,
  holidayOf,
  isWeekend,
  longDate,
  mondayOf,
  nextClassFrom,
  relativeDay,
  shortDate,
  shortOf,
  urgencyOf,
  weekCount,
  weekNumber,
  type Cls,
} from '../model'
import { springs } from '../motion'
import { TopAppBar } from '../ui/Bars'
import { ClassRow } from '../ui/ClassBits'
import { DayCard } from '../ui/DayCard'
import { AssignmentRow } from '../ui/Deadline'
import { LoadingIndicator, ShapeBadge } from '../ui/Shape'
import { SubjectLegend, WeekGrid } from '../ui/WeekGrid'
import { AccountButton, PaneLayout } from './common'

const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Step to the previous/next teaching-calendar day, skipping weekends. */
function stepDay(date: string, dir: 1 | -1) {
  let d = addDays(date, dir)
  while (isWeekend(d)) d = addDays(d, dir)
  return d
}

export function TodayScreen() {
  const { now } = useProto()
  const { compact, expanded } = useWindowClass()
  const [dayParam, setDay] = useParam('day')
  const [, openClass] = useSheetParam('class')
  const day = dayParam && DATE.test(dayParam) ? dayParam : now.date
  const go = (d: string) => {
    if (d === now.date && day !== now.date) haptic('selection')
    setDay(d === now.date ? null : d)
  }

  useKeys({
    ArrowLeft: () => go(stepDay(day, -1)),
    ArrowRight: () => go(stepDay(day, 1)),
    t: () => go(now.date),
  })

  const open = (c: Cls) => openClass(c.key)
  const today = <TodayPane day={day} go={go} onOpen={open} compact={compact} desktop={!compact} />
  if (!expanded) return <PaneLayout compact={compact}>{today}</PaneLayout>
  return (
    <PaneLayout compact={false} side={today}>
      <WeekPane day={day} onSelectDay={go} onOpen={open} />
    </PaneLayout>
  )
}

function TodayPane({
  day,
  go,
  onOpen,
  compact,
  desktop,
}: {
  day: string
  go: (d: string) => void
  onOpen: (c: Cls) => void
  compact: boolean
  desktop: boolean
}) {
  const { data, now } = useProto()
  const href = useHref()
  const navigate = useNavigate()
  const snack = useSnackbar()
  const isToday = day === now.date
  const week = weekNumber(data, day)
  const [updated, setUpdated] = useState(now.minutes)
  const pane = useRef<HTMLDivElement>(null)
  const [dir, setDir] = useState(1)
  const [prevDay, setPrevDay] = useState(day)
  if (prevDay !== day) {
    setPrevDay(day)
    setDir(day > prevDay ? 1 : -1)
  }

  const refresh = () => {
    setUpdated(now.minutes)
    snack('Timetable is up to date')
  }
  const pull = usePullToRefresh(pane, compact, refresh)

  const nav = (
    <>
      <button
        type="button"
        className="cx-icon-btn cx-state"
        aria-label="Previous day"
        onClick={() => go(stepDay(day, -1))}
      >
        <Icon name="chevronLeft" />
      </button>
      <button
        type="button"
        className="cx-icon-btn cx-state"
        aria-label="Next day"
        onClick={() => go(stepDay(day, 1))}
      >
        <Icon name="chevronRight" />
      </button>
    </>
  )

  return (
    <div ref={pane} className="cx-pane relative" style={{ paddingBottom: compact ? 96 : 32 }}>
      <PullIndicator pull={pull.pull} busy={pull.busy} />
      <TopAppBar
        large={compact}
        title={longDate(day)}
        smallTitle={shortDate(day)}
        subtitle={
          isToday
            ? `Today${week ? `, week ${week} of ${weekCount(data)}` : ''}`
            : week
              ? `Week ${week} of ${weekCount(data)}`
              : undefined
        }
        actions={
          <>
            {nav}
            {desktop ? (
              <RefreshButton busy={pull.busy} onClick={() => pull.trigger()} />
            ) : (
              <AccountButton />
            )}
          </>
        }
        below={
          !isToday && (
            <button
              type="button"
              className="cx-chip cx-chip--selected cx-state mt-3"
              onClick={() => go(now.date)}
            >
              <Icon name="today" size={18} />
              Back to today
              {desktop && <kbd className="t-label-s c-muted ml-1">T</kbd>}
            </button>
          )
        }
      />
      <div className="relative overflow-x-clip px-4">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <m.div
            key={isToday ? 'today' : day}
            custom={dir}
            variants={{
              enter: (d: number) => ({ x: d * 48, opacity: 0 }),
              center: { x: 0, opacity: 1 },
              exit: (d: number) => ({ x: d * -48, opacity: 0 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ x: springs.spatialDefault, opacity: springs.effectsDefault }}
            drag={compact ? 'x' : false}
            dragDirectionLock
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              if (info.offset.x < -70 || info.velocity.x < -500) go(stepDay(day, 1))
              else if (info.offset.x > 70 || info.velocity.x > 500) go(stepDay(day, -1))
            }}
          >
            <DayBody day={day} onOpen={onOpen} compact={compact} />
          </m.div>
        </AnimatePresence>
        <p className="t-body-s c-muted mt-8 flex items-start gap-1.5 px-1">
          <Icon name="history" size={16} />
          <span>
            From the official timetable. Updated at <span className="tnum">{hhmm(updated)}</span>.
            {compact && ' Pull down to refresh.'}
          </span>
        </p>
        {desktop && (
          <p className="t-body-s c-muted mt-2 flex items-start gap-1.5 px-1">
            <Icon name="keyboard" size={16} />
            <span>
              <kbd>←</kbd> <kbd>→</kbd> change the day, <kbd>T</kbd> back to today.
            </span>
          </p>
        )}
      </div>
      {/* the week is one tap away on the phone */}
      {compact && !isToday && (
        <div className="px-4 pt-2">
          <button
            type="button"
            className="cx-btn cx-btn--text cx-state"
            onClick={() => navigate(href('/week', { week: String(weekNumber(data, day) ?? '') }))}
          >
            <Icon name="calendarViewWeek" size={18} />
            See the whole week
          </button>
        </div>
      )}
    </div>
  )
}

function DayBody({
  day,
  onOpen,
  compact,
}: {
  day: string
  onOpen: (c: Cls) => void
  compact: boolean
}) {
  const { data, now } = useProto()
  const href = useHref()
  const navigate = useNavigate()
  const isToday = day === now.date
  const classes = dayClasses(data, day)
  const [showEarlier, setShowEarlier] = useState(false)
  const past = isToday ? classes.filter((c) => c.end <= now.minutes) : []
  const rest = classes.filter((c) => !past.includes(c))
  const breaks = breaksOf(classes).filter((b) => !isToday || b.to > now.minutes)
  const due = isToday
    ? data.assignments
        .filter((a) => ['overdue', 'today', 'tomorrow'].includes(urgencyOf(a, now)))
        .filter((a) => cutoffState(a, now) !== 'closed')
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
        .slice(0, 3)
    : []

  // split the remaining classes into runs between breaks, so each run is one grouped list
  const runs: { cls: Cls[]; breakBefore: (typeof breaks)[number] | null }[] = []
  for (const c of rest) {
    const br = breaks.find((b) => b.before.key === c.key) ?? null
    if (runs.length === 0 || br) runs.push({ cls: [c], breakBefore: runs.length === 0 ? null : br })
    else runs[runs.length - 1].cls.push(c)
  }

  return (
    <div>
      {isToday ? (
        <DayCard state={dayState(data, now)} onOpen={onOpen} compact={compact} />
      ) : (
        <OtherDaySummary day={day} classes={classes} />
      )}

      {due.length > 0 && (
        <section aria-labelledby="due-soon">
          <h2 id="due-soon" className="cx-section-title">
            <span>Due soon</span>
            <Link
              to={href('/deadlines')}
              className="t-label-l c-primary cx-state -mr-2 rounded-full px-2 py-1"
            >
              All deadlines
            </Link>
          </h2>
          <ul className="cx-list">
            {due.map((a) => (
              <li key={a.id}>
                <AssignmentRow a={a} onOpen={(x) => navigate(href(`/deadlines/${x.id}`))} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {classes.length > 0 && (
        <section aria-labelledby="classes">
          <h2 id="classes" className="cx-section-title">
            <span>{isToday ? 'Today’s classes' : 'Classes'}</span>
            <span className="t-body-s c-muted tnum font-normal">
              {hhmm(classes[0].start)} to {hhmm(classes[classes.length - 1].end)}
            </span>
          </h2>
          {past.length > 0 && (
            <ul className="cx-list mb-2">
              <li>
                <button
                  type="button"
                  className="cx-item cx-item--past cx-state"
                  aria-expanded={showEarlier}
                  onClick={() => setShowEarlier((v) => !v)}
                >
                  <span className="cx-item-lead">
                    <Icon name="history" />
                  </span>
                  <span className="cx-item-body t-body-l c-muted">
                    Earlier today ({past.length})
                    {past.length === classes.length ? ', all done' : ''}
                  </span>
                  <m.span
                    animate={{ rotate: showEarlier ? 180 : 0 }}
                    transition={springs.spatialFast}
                    className="c-muted grid"
                  >
                    <Icon name="keyboardArrowDown" />
                  </m.span>
                </button>
              </li>
              <AnimatePresence initial={false}>
                {showEarlier &&
                  past.map((c) => (
                    <m.li
                      key={c.key}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{
                        height: springs.spatialDefault,
                        opacity: springs.effectsDefault,
                      }}
                      style={{ overflow: 'hidden' }}
                    >
                      <ClassRow c={c} onOpen={onOpen} />
                    </m.li>
                  ))}
              </AnimatePresence>
            </ul>
          )}
          {runs.map((run) => (
            <div key={run.cls[0].key}>
              {run.breakBefore && (
                <BreakRow
                  from={run.breakBefore.from}
                  to={run.breakBefore.to}
                  next={run.breakBefore.before}
                  day={day}
                />
              )}
              <ul className="cx-list">
                <AnimatePresence initial={false}>
                  {run.cls.map((c) => (
                    <m.li
                      key={c.key}
                      layout="position"
                      exit={{ opacity: 0, height: 0 }}
                      transition={{
                        layout: springs.spatialDefault,
                        height: springs.spatialDefault,
                        opacity: springs.effectsFast,
                      }}
                      style={{ overflow: 'hidden' }}
                    >
                      <ClassRow c={c} onOpen={onOpen} />
                    </m.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

/** A gap of 30 min or more is information: how long, and which rooms are free for it. */
function BreakRow({ from, to, next, day }: { from: number; to: number; next: Cls; day: string }) {
  const { data } = useProto()
  const href = useHref()
  const group = next.o.room ? groupOf(next.o.room) : null
  const free = group ? freeBetween(data, day, from, to).filter((r) => groupOf(r) === group) : []
  const body = (
    <>
      <span className="cx-item-lead">
        <Icon name="localCafe" />
      </span>
      <span className="cx-item-body">
        <span className="t-body-l">
          <span className="tnum">{duration(to - from)}</span> free
          <span className="c-muted">
            , <span className="tnum">{hhmm(from)}</span> to <span className="tnum">{hhmm(to)}</span>
          </span>
        </span>
        {free.length > 0 && (
          <span className="t-body-m c-free">
            {free.length} {group} {free.length === 1 ? 'room' : 'rooms'} free for all of it
          </span>
        )}
      </span>
    </>
  )
  return free.length > 0 ? (
    <Link
      to={href('/rooms', { show: 'free', group, day, at: null })}
      className="cx-item cx-item--quiet cx-state my-1 rounded-2xl"
    >
      {body}
      <Icon name="chevronRight" className="c-muted" />
    </Link>
  ) : (
    <div className="cx-item cx-item--quiet my-1">{body}</div>
  )
}

function OtherDaySummary({ day, classes }: { day: string; classes: Cls[] }) {
  const { data, now } = useProto()
  const holiday = holidayOf(data, day)
  let text: ReactNode
  if (classes.length) {
    text = (
      <>
        {classes.length === 1 ? 'One class' : `${classes.length} classes`}, the first at{' '}
        <span className="tnum">{hhmm(classes[0].start)}</span> in {classes[0].o.room}.
      </>
    )
  } else {
    const next = nextClassFrom(data, addDays(day, 1), 0)
    text = (
      <>
        {holiday ? `${holiday}: no classes.` : 'No classes this day.'}
        {next && (
          <>
            {' '}
            Next: {relativeDay(next.date, now.date)}{' '}
            <span className="tnum">{hhmm(next.start)}</span>, {shortOf(next.o)} in {next.o.room}.
          </>
        )}
      </>
    )
  }
  return (
    <div
      className="flex items-center gap-4 p-5"
      style={{
        background: 'var(--md-sys-color-surface-container)',
        borderRadius: 'var(--cx-shape-xl)',
      }}
    >
      <ShapeBadge
        shape={classes.length ? 'cookie12' : 'clover4'}
        size={56}
        fill="var(--md-sys-color-secondary-container)"
      >
        <span style={{ color: 'var(--md-sys-color-on-secondary-container)' }}>
          <Icon name={classes.length ? 'event' : holiday ? 'celebration' : 'eventAvailable'} />
        </span>
      </ShapeBadge>
      <p className="t-body-l">{text}</p>
    </div>
  )
}

function WeekPane({
  day,
  onSelectDay,
  onOpen,
}: {
  day: string
  onSelectDay: (d: string) => void
  onOpen: (c: Cls) => void
}) {
  const { data } = useProto()
  const monday = mondayOf(day)
  const week = weekNumber(data, monday)
  const dates = Array.from({ length: 5 }, (_, i) => addDays(monday, i))
  return (
    <div className="px-6 pt-5 pb-8">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <div>
          <h2 className="t-headline-s">{week ? `Week ${week}` : 'This week'}</h2>
          <p className="t-body-m c-muted">{dateRange(dates[0], dates[4])}</p>
        </div>
        <p className="t-body-s c-muted">Pick a day to see it on the left</p>
      </div>
      <WeekGrid
        monday={monday}
        selected={day}
        onSelectDay={onSelectDay}
        onOpen={onOpen}
        compact={false}
      />
      <SubjectLegend dates={dates} />
    </div>
  )
}

function RefreshButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return busy ? (
    <span className="grid h-10 w-10 place-items-center">
      <LoadingIndicator size={36} label="Refreshing the timetable" />
    </span>
  ) : (
    <button type="button" className="cx-icon-btn cx-state" aria-label="Refresh" onClick={onClick}>
      <Icon name="refresh" />
    </button>
  )
}

/* ── Pull to refresh, with M3 Expressive's loading indicator ─────────────────────────────── */

function usePullToRefresh(
  ref: React.RefObject<HTMLDivElement | null>,
  enabled: boolean,
  onDone: () => void,
) {
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  })
  const busyRef = useRef(false)

  const trigger = () => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setPull(72)
    setTimeout(() => {
      busyRef.current = false
      setBusy(false)
      setPull(0)
      done.current()
    }, 1400)
  }
  const triggerRef = useRef(trigger)
  useEffect(() => {
    triggerRef.current = trigger
  })

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return
    let startY: number | null = null
    let current = 0
    const onStart = (e: TouchEvent) => {
      if (el.scrollTop <= 0 && !busyRef.current) startY = e.touches[0].clientY
    }
    const onMove = (e: TouchEvent) => {
      if (startY === null) return
      const dy = e.touches[0].clientY - startY
      current = dy > 0 ? Math.min(128, dy * 0.5) : 0
      setPull(current)
    }
    const onEnd = () => {
      if (startY === null) return
      startY = null
      if (current >= 64) triggerRef.current()
      else setPull(0)
      current = 0
    }
    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: true })
    el.addEventListener('touchend', onEnd)
    el.addEventListener('touchcancel', onEnd)
    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, [ref, enabled])

  return { pull, busy, trigger }
}

function PullIndicator({ pull, busy }: { pull: number; busy: boolean }) {
  if (pull <= 0 && !busy) return null
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center"
      style={{
        transform: `translateY(${Math.max(pull - 40, -40)}px)`,
        opacity: Math.min(1, pull / 48),
      }}
    >
      {busy ? (
        <LoadingIndicator size={48} label="Refreshing the timetable" />
      ) : (
        <span
          className="grid h-12 w-12 place-items-center rounded-full"
          style={{
            background: 'var(--md-sys-color-primary-container)',
            transform: `rotate(${pull * 2.4}deg)`,
          }}
        >
          <ShapeBadge
            shape={pull >= 64 ? 'cookie9' : 'softBurst'}
            size={32}
            fill="var(--md-sys-color-on-primary-container)"
          />
        </span>
      )}
    </div>
  )
}
