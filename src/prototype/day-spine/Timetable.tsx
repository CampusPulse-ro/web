/**
 * Today and the week. Phone: Today pages day by day under a day strip, the week pages week by week.
 * Desktop: the day spine and the week side by side, driven by the keyboard (←/→ days, T today).
 */
import { AnimatePresence, m, type PanInfo } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { addDays } from '../clock'
import { classesOn } from '../data'
import { DayBody } from './Day'
import { IconBack, IconNext } from './icons'
import {
  blocksOf,
  dayMonth,
  dayOfMonth,
  mondayOf,
  nonTeachingReason,
  teachingWeek,
  weekdayName,
  weekdayShort,
  weekDays,
  weekTitle,
} from './model'
import { useColorOf, useKeys, useNav, useProto } from './state'
import { SubjectLegend, WeekGrid } from './Week'

const page = {
  enter: (d: number) => ({ x: `${d * 55}%`, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { type: 'spring' as const, duration: 0.34, bounce: 0 } },
  exit: (d: number) => ({ x: `${d * -55}%`, opacity: 0, transition: { duration: 0.2 } }),
}

function swipeStep(info: PanInfo): number {
  if (info.offset.x < -64 || info.velocity.x < -450) return 1
  if (info.offset.x > 64 || info.velocity.x > 450) return -1
  return 0
}

/** The selected day and how to move it; out-of-timetable days are skipped. */
function useDay() {
  const { data, now } = useProto()
  const [nav, go] = useNav()
  const [dir, setDir] = useState(0)
  const day = nav.day ?? now.date
  const tt = data.timetable
  const setDay = (d: string) => {
    if (d === day) return
    setDir(d > day ? 1 : -1)
    go({ day: d === now.date ? null : d, cls: null, due: null }, { replace: true })
  }
  const can = (n: number) => {
    const d = addDays(day, n)
    return d >= tt.from && d <= tt.to
  }
  const step = (n: number) => {
    if (can(n)) setDay(addDays(day, n))
  }
  return { day, dir, setDay, step, can, isToday: day === now.date }
}

/** Brings the now-line into view when it's hidden, after a day or scenario change. */
function useRevealNow(key: string) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // After the frame, so a tab switch's scroll-to-top has happened first.
    const id = requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      if (r.top < 120 || r.bottom > window.innerHeight - 140) el.scrollIntoView({ block: 'center' })
    })
    return () => cancelAnimationFrame(id)
  }, [key])
  return ref
}

function MiniDay({ date }: { date: string }) {
  const { data } = useProto()
  const colorOf = useColorOf()
  const blocks = blocksOf(classesOn(data.timetable, date))
  const reason = nonTeachingReason(data.semester, date)
  if (reason)
    return <span aria-hidden className="b-holiday block h-1 w-8 rounded-full bg-line/40" />
  if (!blocks.length) return <span aria-hidden className="block h-1 w-8" />
  return (
    <span aria-hidden className="relative block h-1 w-8 overflow-hidden rounded-full bg-line">
      {blocks.map((b) => (
        <span
          key={b.id}
          className="absolute inset-y-0"
          style={{
            left: `${((b.start - 480) / 720) * 100}%`,
            width: `${((b.end - b.start) / 720) * 100}%`,
            background: colorOf(b.occ),
          }}
        />
      ))}
    </span>
  )
}

function DayStrip({ day, onPick }: { day: string; onPick: (d: string) => void }) {
  const { data, now } = useProto()
  const monday = mondayOf(day)
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(monday, i))
  return (
    <div className="-mx-2 mt-5 grid grid-cols-7">
      {days.map((d) => {
        const inTt = d >= data.timetable.from && d <= data.timetable.to
        const n = classesOn(data.timetable, d).length
        const reason = nonTeachingReason(data.semester, d)
        return (
          <button
            key={d}
            type="button"
            disabled={!inTt}
            onClick={() => onPick(d)}
            aria-pressed={d === day}
            aria-label={`${weekdayName(d)} ${dayMonth(d)}${d === now.date ? ', today' : ''}, ${
              reason ?? (n ? `${n} ${n === 1 ? 'class' : 'classes'}` : 'no classes')
            }`}
            className="relative flex min-h-16 flex-col items-center gap-1.5 rounded-md py-2 disabled:opacity-35"
          >
            {d === day ? (
              <m.span
                layoutId="strip-selected"
                className="absolute inset-0 rounded-md bg-raised"
                transition={{ type: 'spring', duration: 0.32, bounce: 0.12 }}
              />
            ) : null}
            <span className="relative text-caption text-ink-muted">{weekdayShort(d)}</span>
            <span
              className={`b-num relative min-w-7 rounded-full px-1.5 text-center text-label ${
                d === now.date ? 'b-now-pill' : 'text-ink'
              }`}
            >
              {dayOfMonth(d)}
            </span>
            <span className="relative">
              <MiniDay date={d} />
            </span>
          </button>
        )
      })}
    </div>
  )
}

function NavButton({
  dirn,
  label,
  onClick,
  disabled,
}: {
  dirn: -1 | 1
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-11 place-items-center rounded-full text-ink-soft transition-colors hover:bg-raised hover:text-ink disabled:opacity-30"
    >
      {dirn < 0 ? <IconBack width={20} height={20} /> : <IconNext width={20} height={20} />}
    </button>
  )
}

// ---------- phone ----------

export function TodayScreen() {
  const { data, now, start } = useProto()
  const { day, dir, setDay, step, isToday } = useDay()
  const week = teachingWeek(data.semester, day)
  const nowRef = useRevealNow(`${day}|${start}`)

  return (
    <div className="pb-32">
      <header className="px-5 pt-7">
        <div className="flex min-h-14 items-start justify-between gap-3">
          <div>
            <h1 className="b-title">{weekdayName(day)}</h1>
            <p className="mt-1 text-body-small text-ink-muted">
              {dayMonth(day)}
              {week ? `, week ${week}` : ''}
            </p>
          </div>
          <AnimatePresence initial={false}>
            {!isToday ? (
              <m.button
                type="button"
                onClick={() => setDay(now.date)}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="mt-1 min-h-10 rounded-full bg-raised px-4 text-label text-ink hover:bg-line"
              >
                Back to today
              </m.button>
            ) : null}
          </AnimatePresence>
        </div>
        <DayStrip day={day} onPick={setDay} />
      </header>

      <div className="relative overflow-x-clip">
        <AnimatePresence initial={false} mode="popLayout" custom={dir}>
          <m.div
            key={day}
            custom={dir}
            variants={page}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragDirectionLock
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              const s = swipeStep(info)
              if (s) step(s)
            }}
            style={{ touchAction: 'pan-y' }}
            className="w-full pt-5"
          >
            <DayBody date={day} scale={1} nowRef={nowRef} />
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export function WeekScreen() {
  const { data, now } = useProto()
  const [, go] = useNav()
  const { day, dir, step, can } = useDay()
  const monday = mondayOf(day)
  const { title, range } = weekTitle(monday, teachingWeek(data.semester, monday))
  const dates = weekDays(monday, (d) => classesOn(data.timetable, d).length > 0)

  return (
    <div className="px-4 pt-7 pb-32">
      <header className="flex items-start justify-between gap-2 px-1">
        <div>
          <h1 className="b-title">{title}</h1>
          <p className="mt-1 text-body-small text-ink-muted">{range}</p>
        </div>
        <div className="flex">
          <NavButton dirn={-1} label="Previous week" onClick={() => step(-7)} disabled={!can(-7)} />
          <NavButton dirn={1} label="Next week" onClick={() => step(7)} disabled={!can(7)} />
        </div>
      </header>
      <div className="relative mt-4 overflow-x-clip">
        <AnimatePresence initial={false} mode="popLayout" custom={dir}>
          <m.div
            key={monday}
            custom={dir}
            variants={page}
            initial="enter"
            animate="center"
            exit="exit"
            drag="x"
            dragDirectionLock
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              const s = swipeStep(info)
              if (s) step(s * 7)
            }}
            style={{ touchAction: 'pan-y' }}
            className="w-full"
          >
            <WeekGrid
              monday={monday}
              selected={null}
              onPickDay={(d) => go({ view: 'today', day: d === now.date ? null : d })}
              scale={0.74}
              compact
            />
          </m.div>
        </AnimatePresence>
      </div>
      <div className="px-1">
        <SubjectLegend dates={dates} />
      </div>
    </div>
  )
}

// ---------- desktop ----------

export function TimetableDesktop() {
  const { data, now, start } = useProto()
  const [nav] = useNav()
  const { day, dir, setDay, step, can, isToday } = useDay()
  const week = teachingWeek(data.semester, day)
  const monday = mondayOf(day)
  const wk = weekTitle(monday, teachingWeek(data.semester, monday))
  const dates = weekDays(monday, (d) => classesOn(data.timetable, d).length > 0)
  const nowRef = useRevealNow(`${day}|${start}`)

  useKeys((e) => {
    if (e.key === 'ArrowLeft') step(-1)
    else if (e.key === 'ArrowRight') step(1)
    else if (e.key === 't' || e.key === 'T') setDay(now.date)
    else return
    e.preventDefault()
  }, !nav.cls && !nav.due)

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(360px,420px)_minmax(0,1fr)]">
      <section aria-label="Day" className="min-h-0 overflow-y-auto border-r border-line pb-16">
        <header className="sticky top-0 z-40 flex items-start justify-between gap-2 bg-page/95 px-5 pt-6 pb-4 backdrop-blur">
          <div>
            <h1 className="b-title">{weekdayName(day)}</h1>
            <p className="mt-1 text-body-small text-ink-muted">
              {dayMonth(day)}
              {week ? `, week ${week}` : ''}
            </p>
          </div>
          <div className="flex items-center">
            <NavButton
              dirn={-1}
              label="Previous day"
              onClick={() => step(-1)}
              disabled={!can(-1)}
            />
            <button
              type="button"
              onClick={() => setDay(now.date)}
              disabled={isToday}
              aria-keyshortcuts="T"
              className="min-h-11 rounded-full px-3 text-label text-ink transition-colors hover:bg-raised disabled:opacity-40"
            >
              Today
            </button>
            <NavButton dirn={1} label="Next day" onClick={() => step(1)} disabled={!can(1)} />
          </div>
        </header>
        <div className="relative overflow-x-clip">
          <AnimatePresence initial={false} mode="popLayout" custom={dir}>
            <m.div
              key={day}
              custom={dir}
              initial={{ opacity: 0, x: dir * 18 }}
              animate={{
                opacity: 1,
                x: 0,
                transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
              }}
              exit={{ opacity: 0, x: dir * -18, transition: { duration: 0.12 } }}
              className="w-full"
            >
              <DayBody date={day} scale={1} nowRef={nowRef} />
            </m.div>
          </AnimatePresence>
        </div>
      </section>

      <section aria-label="Week" className="min-h-0 overflow-y-auto px-8 pt-6 pb-16">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-heading text-ink">{wk.title}</h2>
            <p className="text-body-small text-ink-muted">{wk.range}</p>
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden text-caption text-ink-muted lg:block">
              <Kbd>←</Kbd> <Kbd>→</Kbd> days <Kbd>T</Kbd> today
            </p>
            <div className="flex">
              <NavButton
                dirn={-1}
                label="Previous week"
                onClick={() => step(-7)}
                disabled={!can(-7)}
              />
              <NavButton dirn={1} label="Next week" onClick={() => step(7)} disabled={!can(7)} />
            </div>
          </div>
        </header>
        <div className="mt-5">
          <WeekGrid monday={monday} selected={day} onPickDay={setDay} scale={0.8} compact={false} />
        </div>
        <SubjectLegend dates={dates} />
      </section>
    </div>
  )
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="b-num inline-grid min-w-6 place-items-center rounded bg-raised px-1.5 py-0.5 font-sans text-ink-soft">
      {children}
    </kbd>
  )
}
