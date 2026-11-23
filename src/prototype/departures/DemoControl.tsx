/**
 * The demo-time control. Not part of the design: it's deliberately styled as a tool (light, system
 * font), so nobody mistakes it for the app. Pick a shared scenario, or nudge the clock to watch the
 * digits roll, a class end and fold away, or the hero change state.
 */
import { useState } from 'react'
import { scenarios, type Scenario, type WallTime } from '../clock'
import { classesOn, type DemoData } from '../data'
import { endOf, startOf } from './model'
import { clock, nowMinutes, shortDate, wallMs } from './time'

export function DemoControl({
  data,
  now,
  scenario,
  onScenario,
  onJump,
}: {
  data: DemoData | null
  now: WallTime
  scenario: string | null
  onScenario: (s: Scenario) => void
  onJump: (ms: number) => void
}) {
  const [open, setOpen] = useState(false)
  const t = nowMinutes(now)
  const base = wallMs(now)

  // The next moment something changes today (a class starts or ends): jump to a minute before it.
  let nextChange: number | null = null
  if (data) {
    const marks = classesOn(data.timetable, now.date)
      .flatMap((c) => [startOf(c), endOf(c)])
      .filter((m) => m - 1 > t)
      .sort((a, b) => a - b)
    if (marks.length) nextChange = base + (marks[0] - 1 - t) * 60_000
  }

  return (
    <div className="dp-demo" data-open={open}>
      {open && (
        <div className="dp-demo-panel" id="dp-demo-panel" role="group" aria-label="Demo time">
          <p className="dp-demo-intro">
            The prototype runs on its own clock, starting from the moment you pick and ticking on in
            real time.
          </p>
          <ul className="dp-demo-list">
            {scenarios.map((s) => {
              const at = s.at.slice(11)
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-pressed={scenario === s.id}
                    onClick={() => {
                      onScenario(s)
                      setOpen(false)
                    }}
                  >
                    <span>{s.label}</span>
                    <span className="dp-demo-at">
                      {shortDate(s.at.slice(0, 10))} {at}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="dp-demo-skip" role="group" aria-label="Move the clock">
            <button type="button" onClick={() => onJump(base + 60_000)}>
              +1 min
            </button>
            <button type="button" onClick={() => onJump(base + 15 * 60_000)}>
              +15 min
            </button>
            <button
              type="button"
              disabled={nextChange === null}
              onClick={() => nextChange !== null && onJump(nextChange)}
              title="Jump to one minute before the next class starts or ends today"
            >
              Next change −1 min
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        className="dp-demo-pill"
        aria-expanded={open}
        aria-controls="dp-demo-panel"
        onClick={() => setOpen(!open)}
      >
        <span className="dp-demo-tag">Demo time</span>
        <span className="dp-demo-now">
          {shortDate(now.date).slice(0, 3)} {clock(now.minutes)}
        </span>
      </button>
    </div>
  )
}
