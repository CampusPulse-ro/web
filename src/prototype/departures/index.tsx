/**
 * UI prototype A, "Departures": the campus as a live departure board. The next class, its room
 * ("platform") and how long until it is the hero; the rest of the day sits below as board rows.
 * Borrowed: subject colour and the day pager from B, native mechanics (sheets, stack, haptics) from C.
 */
import '@fontsource-variable/mona-sans/standard.css'
import './departures.css'
import { LazyMotion, MotionConfig } from 'motion/react'
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { initialStart, scenarioStart, scenarios, useDemoClock, type Scenario } from '../clock'
import { buildingOf, useDemoData, type Occurrence } from '../data'
import { AppContext, useApp, type AppState, type RoomFilter } from './context'
import { DemoControl } from './DemoControl'
import {
  classKey,
  deadlines as listDeadlines,
  heroAnnouncement,
  heroKey,
  heroState,
  pagerDays,
} from './model'
import { useIsPhone, useNav } from './nav'
import { DesktopApp, PhoneApp } from './Shells'
import { Skeleton } from './Skeleton'
import { atParam } from './time'

const loadFeatures = () => import('./motionFeatures').then((r) => r.default)

export default function DeparturesPrototype() {
  useEffect(() => {
    const title = document.title
    document.title = 'CampusPulse, prototype A: Departures'
    return () => {
      document.title = title
    }
  }, [])
  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={loadFeatures} strict>
        <ErrorBoundary>
          <Prototype />
        </ErrorBoundary>
      </LazyMotion>
    </MotionConfig>
  )
}

/** Blank for 200 ms, then a skeleton shaped like the screen for at least 400 ms: no flash, no spinner. */
function useLoadingGate(loaded: boolean): 'blank' | 'skeleton' | 'ready' {
  const [phase, setPhase] = useState<'blank' | 'skeleton' | 'ready'>('blank')
  const shownAt = useRef(0)
  useEffect(() => {
    if (loaded) return
    const id = setTimeout(() => {
      shownAt.current = Date.now()
      setPhase('skeleton')
    }, 200)
    return () => clearTimeout(id)
  }, [loaded])
  useEffect(() => {
    if (!loaded || phase !== 'skeleton') return
    const wait = Math.max(0, 400 - (Date.now() - shownAt.current))
    const id = setTimeout(() => setPhase('ready'), wait)
    return () => clearTimeout(id)
  }, [loaded, phase])
  return loaded && phase === 'blank' ? 'ready' : phase
}

function Prototype() {
  const data = useDemoData()
  const [params, setParams] = useSearchParams()
  const [start, setStart] = useState(() => initialStart())
  const [scenario, setScenario] = useState<string | null>(() =>
    params.get('at')
      ? null
      : (scenarios.find((s) => s.id === params.get('scenario'))?.id ?? scenarios[0].id),
  )
  const now = useDemoClock(start)
  const phone = useIsPhone()
  const [nav, go] = useNav()
  const phase = useLoadingGate(!!data)
  const [roomFilter, setRoomFilter] = useState<RoomFilter>({
    mode: 'all',
    at: 10 * 60,
    date: null,
    near: null,
    query: '',
  })
  // Overlays opened by a push in this session: closing them goes back in history.
  const [pushed] = useState(() => new Set<string>())

  const today = now.date
  const days = useMemo(() => (data ? pagerDays(data, today) : []), [data, today])
  const selectedDay = nav.day && days.includes(nav.day) ? nav.day : today

  const setClock = useCallback(
    (ms: number, s: Scenario | null) => {
      setStart(ms)
      setScenario(s?.id ?? null)
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('day')
          if (s) {
            next.set('scenario', s.id)
            next.delete('at')
          } else {
            next.set('at', atParam(ms))
            next.delete('scenario')
          }
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const app = useMemo<AppState | null>(() => {
    if (!data) return null
    const selectDay = (date: string) => go({ day: date === today ? null : date }, { replace: true })
    const openClass = (o: Occurrence) => {
      pushed.add('cls')
      go({ cls: classKey(o), due: null })
    }
    const openRoom = (code: string, date?: string | null) => {
      pushed.add('room')
      if (phone) go({ room: code, roomDay: date ?? null, cls: null, due: null })
      else go({ view: 'rooms', room: code, roomDay: date ?? null, cls: null, due: null })
    }
    const openDue = (id: number) => {
      pushed.add('due')
      go({ due: id, cls: null })
    }
    const close = (what: 'cls' | 'due' | 'room') => {
      if (pushed.has(what)) {
        pushed.delete(what)
        window.history.back()
      } else {
        go(what === 'room' ? { room: null, roomDay: null } : { [what]: null }, { replace: true })
      }
    }
    const roomsNear = (room: string, until: number) => {
      setRoomFilter((f) => ({
        ...f,
        mode: 'now',
        date: null,
        query: '',
        near: { group: buildingOf(room), room, until },
      }))
      go({ view: 'rooms', room: null, cls: null, due: null })
    }
    return {
      data,
      now,
      today,
      phone,
      nav,
      go,
      deadlines: listDeadlines(data, now),
      roomFilter,
      setRoomFilter,
      selectedDay,
      selectDay,
      openClass,
      openRoom,
      openDue,
      close,
      roomsNear,
    }
  }, [data, now, today, phone, nav, go, roomFilter, selectedDay, pushed])

  // Keyboard (web idiom): ←/→ change the day, T goes to today, Esc closes the top overlay.
  useEffect(() => {
    if (!app) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, select, [contenteditable="true"]')) return
      if (e.key === 'Escape') {
        if (app.nav.cls) app.close('cls')
        else if (app.nav.due !== null) app.close('due')
        else if (app.nav.room && app.phone) app.close('room')
        return
      }
      if (app.nav.cls || app.nav.due !== null) return
      const onToday = app.nav.view === 'today' || (!app.phone && app.nav.view === 'week')
      if (!onToday) return
      const i = days.indexOf(app.selectedDay)
      if (e.key === 'ArrowLeft' && i > 0) app.selectDay(days[i - 1])
      else if (e.key === 'ArrowRight' && i < days.length - 1) app.selectDay(days[i + 1])
      else if (e.key === 't' || e.key === 'T') app.selectDay(app.today)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [app, days])

  return (
    <div className="dp-root" data-phone={phone}>
      {app && phase === 'ready' ? (
        <AppContext.Provider value={app}>
          {phone ? <PhoneApp /> : <DesktopApp />}
          <Announcer />
        </AppContext.Provider>
      ) : (
        phase === 'skeleton' && <Skeleton phone={phone} />
      )}
      <DemoControl
        data={data}
        now={now}
        scenario={scenario}
        onScenario={(s) => setClock(scenarioStart(s), s)}
        onJump={(ms) => setClock(ms, null)}
      />
    </div>
  )
}

/** Tells screen readers when the hero's state changes (a class starts, you're done), never every minute. */
function Announcer() {
  const { data, now } = useApp()
  const [text, setText] = useState('')
  const h = heroState(data, now)
  const key = heroKey(h)
  const last = useRef(key)
  useEffect(() => {
    if (key !== last.current) setText(heroAnnouncement(h))
    last.current = key
  }, [key, h])
  return (
    <div className="dp-sr" aria-live="polite" role="status">
      {text}
    </div>
  )
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (this.state.error)
      return (
        <div className="dp-root dp-error">
          <p className="dp-error-title">The demo data didn’t load.</p>
          <p className="dp-error-sub">{this.state.error.message}</p>
          <button type="button" className="dp-primary" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      )
    return this.props.children
  }
}
