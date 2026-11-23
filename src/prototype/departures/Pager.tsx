/**
 * The day pager (borrowed from direction B): pages sit side by side in a scroll-snap strip, so a
 * swipe tracks the finger 1:1 and lands with the browser's own momentum, the web's closest thing to
 * native paging. The day strip above follows along on the same axis.
 */
import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { addDays } from '../clock'
import { classesOn } from '../data'
import { useApp } from './context'
import { hueStyle, nonTeaching, shortOf, weekOf } from './model'
import { dateRange, dayMonth, dayOfMonth, longDate, mondayOf, weekdayShort } from './time'
import { IconChevron } from './ui'

export function SnapPager<T>({
  items,
  index,
  onIndex,
  render,
  itemKey,
  label,
}: {
  items: T[]
  index: number
  onIndex: (i: number) => void
  render: (item: T, i: number) => ReactNode
  itemKey: (item: T) => string
  label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const target = useRef<number | null>(null)
  const current = useRef(index)
  const frame = useRef(0)
  const mounted = useRef(false)
  const reduced = useReducedMotion()

  // Follow `index` when it changes from outside (the strip, a button, a key).
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    current.current = index
    const w = el.clientWidth
    if (Math.round(el.scrollLeft / w) === index) return
    const instant = !mounted.current || reduced
    target.current = instant ? null : index
    el.scrollTo({ left: index * w, behavior: instant ? 'instant' : 'smooth' })
    mounted.current = true
    if (!instant) {
      const id = setTimeout(() => (target.current = null), 700)
      return () => clearTimeout(id)
    }
  }, [index, reduced])

  useEffect(() => {
    mounted.current = true
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      el.scrollTo({ left: current.current * el.clientWidth, behavior: 'instant' })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const onScroll = () => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      const i = Math.round(el.scrollLeft / el.clientWidth)
      if (target.current !== null) {
        if (i === target.current) target.current = null
        return
      }
      if (i !== current.current && i >= 0 && i < items.length) {
        current.current = i
        onIndex(i)
      }
    })
  }

  return (
    <div className="dp-pager" ref={ref} onScroll={onScroll} aria-label={label} role="region">
      {items.map((item, i) => (
        <div
          key={itemKey(item)}
          className="dp-pager-page"
          aria-hidden={i !== index}
          inert={i !== index}
        >
          {render(item, i)}
        </div>
      ))}
    </div>
  )
}

/** A week of days above the pager: tap one to page there. Dots are that day's classes. */
export function DayStrip({ days, selected }: { days: string[]; selected: string }) {
  const { data, today, selectDay } = useApp()
  const monday = mondayOf(selected)
  const week = dateRange(monday, addDays(monday, 6))
  const n = weekOf(data, selected)
  const prevWeek = addDays(monday, -7)
  const nextWeek = addDays(monday, 7)
  const canPrev = days.some((d) => d < monday && d >= prevWeek)
  const canNext = days.some((d) => d >= nextWeek)
  return (
    <div className="dp-strip-head">
      <div className="dp-strip-top">
        <span className="dp-strip-week">
          {dayMonth(selected).split(' ')[1]}
          <span className="dp-strip-weekno">{n ? `Week ${n}` : 'Outside the semester'}</span>
        </span>
        <button
          type="button"
          className="dp-icon-button"
          aria-label="Previous week"
          disabled={!canPrev}
          onClick={() => selectDay(days.find((d) => d >= prevWeek) ?? days[0])}
        >
          <IconChevron dir="left" />
        </button>
        <button
          type="button"
          className="dp-icon-button"
          aria-label="Next week"
          disabled={!canNext}
          onClick={() => selectDay(days.find((d) => d >= nextWeek) ?? days[days.length - 1])}
        >
          <IconChevron dir="right" />
        </button>
      </div>
      <div className="dp-strip">
        {week.map((d) => {
          const classes = classesOn(data.timetable, d)
          const off = nonTeaching(data, d)
          const isToday = d === today
          const label = [
            longDate(d),
            isToday ? 'today' : null,
            off,
            classes.length
              ? `${classes.length} ${classes.length === 1 ? 'class' : 'classes'}`
              : 'no classes',
          ]
            .filter(Boolean)
            .join(', ')
          return (
            <button
              key={d}
              type="button"
              className="dp-strip-day"
              data-today={isToday}
              data-off={!!off}
              aria-pressed={d === selected}
              aria-current={isToday ? 'date' : undefined}
              aria-label={label}
              disabled={!days.includes(d)}
              onClick={() => selectDay(d)}
            >
              {d === selected && (
                <m.span
                  layoutId="dp-strip-sel"
                  className="dp-strip-sel"
                  transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                />
              )}
              <span className="dp-strip-wd">{weekdayShort(d)}</span>
              <span className="dp-strip-num dp-num">{dayOfMonth(d)}</span>
              <span className="dp-strip-dots" aria-hidden="true">
                {classes.slice(0, 4).map((c) => (
                  <span key={c.startsAt} style={hueStyle(shortOf(c))} />
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Appears when you've paged away from today. */
export function BackToToday({ show, ahead }: { show: boolean; ahead: boolean }) {
  const { today, selectDay } = useApp()
  return (
    <AnimatePresence>
      {show && (
        <m.button
          type="button"
          className="dp-back-today"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          onClick={() => selectDay(today)}
        >
          {ahead && <IconChevron dir="left" />}
          Back to today
          {!ahead && <IconChevron dir="right" />}
        </m.button>
      )}
    </AnimatePresence>
  )
}
