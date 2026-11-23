/**
 * The demo-time control. Tooling, not design: it lists the shared scenarios, shows the demo time and
 * can play the day forward fast, so the now-line can be watched moving through it.
 */
import { AnimatePresence, m } from 'motion/react'
import { useEffect, useState } from 'react'
import { scenarios, scenarioStart, type Scenario, type WallTime } from '../clock'
import { IconClock, IconClose, IconPause, IconPlay } from './icons'
import { dayOfMonth, hhmm, monthName, weekdayShort } from './model'
import { useNav } from './state'

interface Props {
  start: number
  setStart: (f: (s: number) => number) => void
  now: WallTime
  playing: boolean
  setPlaying: (p: boolean) => void
  wide: boolean
}

function when(s: Scenario): string {
  const date = s.at.slice(0, 10)
  return `${weekdayShort(date)} ${s.at.slice(11, 16)}`
}

export function DemoControl({ start, setStart, now, playing, setPlaying, wide }: Props) {
  const [open, setOpen] = useState(false)
  const [, go] = useNav()
  const current = scenarios.find((s) => scenarioStart(s) === start)

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setStart((s) => s + 60_000), 110)
    return () => window.clearInterval(id)
  }, [playing, setStart])

  useEffect(() => {
    if (playing && now.minutes >= 21 * 60) setPlaying(false)
  }, [playing, now.minutes, setPlaying])

  const pick = (s: Scenario) => {
    setPlaying(false)
    setStart(() => scenarioStart(s))
    go(
      {
        scenario: s.id,
        at: null,
        day: null,
        cls: null,
        due: null,
        rday: null,
        free: null,
        from: null,
        until: null,
        grp: null,
      },
      { replace: true },
    )
  }

  const label = `${weekdayShort(now.date)} ${dayOfMonth(now.date)} ${monthName(now.date).slice(0, 3)}, ${hhmm(now.minutes)}`

  return (
    <div
      className={`fixed right-3 z-60 ${wide ? 'bottom-4' : ''}`}
      style={wide ? undefined : { bottom: 'calc(76px + env(safe-area-inset-bottom))' }}
    >
      <AnimatePresence initial={false} mode="wait">
        {open ? (
          <m.div
            key="panel"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="b-demo w-72 rounded-2xl p-3"
            role="dialog"
            aria-label="Demo time"
          >
            <div className="flex items-start justify-between gap-2 px-1">
              <div>
                <p className="text-caption text-ink-muted">Demo time, not part of the design</p>
                <p className="b-num text-subtitle text-ink">{label}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Hide demo time"
                className="grid size-10 place-items-center rounded-full text-ink-soft hover:bg-raised hover:text-ink"
              >
                <IconClose width={18} height={18} />
              </button>
            </div>
            <ul className="mt-2" aria-label="Scenarios">
              {scenarios.map((s) => {
                const on = current?.id === s.id
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => pick(s)}
                      className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-2.5 text-left text-sm ${
                        on ? 'bg-raised text-ink' : 'text-ink-soft hover:bg-raised/60'
                      }`}
                    >
                      <span>{s.label}</span>
                      <span className="b-num text-xs text-ink-muted">{when(s)}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <button
              type="button"
              onClick={() => setPlaying(!playing)}
              className="mt-2 flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-sm font-semibold text-ink hover:bg-raised"
            >
              {playing ? <IconPause width={16} height={16} /> : <IconPlay width={16} height={16} />}
              {playing ? 'Pause' : 'Play the day fast'}
              <span className="ml-auto text-xs font-normal text-ink-muted">1 min = 0.1 s</span>
            </button>
          </m.div>
        ) : (
          <m.button
            key="pill"
            type="button"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            aria-label={`Demo time ${label}. Change it`}
            className="b-demo flex min-h-10 items-center gap-2 rounded-full py-1.5 pr-3.5 pl-2.5 text-sm text-ink"
          >
            <IconClock width={16} height={16} className="text-ink-muted" />
            <span className="text-xs text-ink-muted">Demo</span>
            <span className="b-num font-semibold">
              {weekdayShort(now.date)} {hhmm(now.minutes)}
            </span>
            {playing ? <span className="size-1.5 rounded-full bg-success" /> : null}
          </m.button>
        )}
      </AnimatePresence>
    </div>
  )
}
