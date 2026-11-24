/**
 * The demo clock for the UI prototypes. The demo data is a fixed real week (Mon 23 Nov – Fri 4 Dec
 * 2026), so the prototypes run on a wall clock of their own: pick a scenario (or `?at=YYYY-MM-DDTHH:MM`)
 * and it ticks from there in real time, so countdowns move. All times are campus wall-clock time
 * (Timișoara); no time zones are involved anywhere.
 */
import { useEffect, useState } from 'react'

export interface Scenario {
  id: string
  label: string
  /** Campus wall-clock start, `YYYY-MM-DDTHH:MM`. */
  at: string
}

/** The same moments in every prototype, so they can be compared side by side. */
export const scenarios: Scenario[] = [
  { id: 'before', label: 'Before the first class', at: '2026-11-24T11:48' },
  { id: 'in-class', label: 'In class', at: '2026-11-24T14:41' },
  { id: 'last-class', label: 'Last class of the day', at: '2026-11-24T17:20' },
  { id: 'break', label: 'Long break', at: '2026-11-25T10:35' },
  { id: 'evening', label: 'Evening class', at: '2026-11-25T17:52' },
  { id: 'done', label: 'Done for the day', at: '2026-11-26T15:10' },
  { id: 'day-off', label: 'Day without classes', at: '2026-11-23T09:30' },
  { id: 'weekend', label: 'Weekend', at: '2026-11-28T11:00' },
]

export const defaultScenario = scenarios[0]

/** A campus wall-clock moment. `minutes` counts from midnight. */
export interface WallTime {
  /** `YYYY-MM-DD` */
  date: string
  minutes: number
  seconds: number
}

function parseAt(at: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(at)
  if (!m) return null
  // Wall-clock maths in UTC, so a DST change on the viewer's machine can't shift anything.
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])
}

function toWallTime(ms: number): WallTime {
  const d = new Date(ms)
  const date = d.toISOString().slice(0, 10)
  return {
    date,
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
    seconds: d.getUTCSeconds(),
  }
}

/** `HH:MM:SS` or `HH:MM` → minutes from midnight. */
export function minutesOf(time: string): number {
  const [h, m] = time.split(':')
  return Number(h) * 60 + Number(m)
}

/** Minutes → `HH:MM`. */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** `YYYY-MM-DD` ± days. */
export function addDays(date: string, days: number): string {
  const ms = Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) + days * 864e5
  return new Date(ms).toISOString().slice(0, 10)
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(date: string): number {
  const d = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)))
  return (d.getUTCDay() + 6) % 7
}

/** The scenario start from `?at=` or `?scenario=`, else the default. */
export function initialStart(search: string = window.location.search): number {
  const params = new URLSearchParams(search)
  const at = params.get('at')
  const fromAt = at ? parseAt(at) : null
  if (fromAt !== null) return fromAt
  const s = scenarios.find((x) => x.id === params.get('scenario')) ?? defaultScenario
  return parseAt(s.at)!
}

/**
 * The demo "now": starts at `start` (wall-clock ms) and runs in real time from there. It re-renders on
 * each minute boundary (each second with `everySecond`). A new `start` restarts it.
 */
export function useDemoClock(start: number, { everySecond = false } = {}): WallTime {
  const [tick, setTick] = useState({ start, now: start })
  const now = tick.start === start ? tick.now : start

  useEffect(() => {
    const real = Date.now()
    const step = everySecond ? 1000 : 60_000
    const update = () => setTick({ start, now: start + (Date.now() - real) })
    let interval: ReturnType<typeof setInterval> | undefined
    const timeout = setTimeout(
      () => {
        update()
        interval = setInterval(update, step)
      },
      step - (start % step),
    )
    return () => {
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [start, everySecond])

  return toWallTime(now)
}

/** Wall-clock ms for a scenario, for a scenario picker. */
export function scenarioStart(s: Scenario): number {
  return parseAt(s.at)!
}
