/**
 * Prototype C, "Native Expressive": CampusPulse as if Google shipped it, in Material 3 Expressive.
 * Phone width is the Android app (navigation bar, bottom sheets); wider is the web app (navigation
 * rail, list-detail panes, keyboard). Served at /prototype, outside the site's Layout.
 */
import '@fontsource-variable/roboto-flex/standard.css'
import './theme.css'
import { AnimatePresence, domMax, LazyMotion, m, MotionConfig } from 'motion/react'
import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { initialStart, scenarios, scenarioStart, useDemoClock, type WallTime } from '../clock'
import { useDemoData } from '../data'
import {
  APP_ID,
  themeColor,
  type Account,
  ProtoContext,
  SnackbarContext,
  useDelayed,
  useHref,
  useProto,
  useSheetParam,
  useWindowClass,
} from './ctx'
import { Icon } from './icons'
import type { CampusState, DueItem } from './campus'
import { findClass, hhmm, shortDate, shortOf, subjectLooks } from './model'
import { springs } from './motion'
import { DeadlinesScreen } from './screens/Deadlines'
import { ProfileScreen } from './screens/Profile'
import { CoursesScreen } from './screens/Courses'
import { SignInScreen } from './screens/SignIn'
import { TodayScreen } from './screens/Today'
import { WeekScreen } from './screens/Week'
import { Avatar } from './screens/common'
import { NavBar, NavRail } from './ui/Bars'
import { ClassDetail } from './ui/ClassBits'
import { Panel } from './ui/Panel'
import { ShapeBadge } from './ui/Shape'

const ACCOUNT_KEY = 'cx-d-account'

/** The demo starts signed in with UPT; signing out and in again is kept for the tab's session. */
function readAccount(): Account | null {
  const fallback: Account = { email: 'd.student@student.upt.ro', via: 'upt', uptLinked: true }
  try {
    const raw = sessionStorage.getItem(ACCOUNT_KEY)
    return raw === null ? fallback : (JSON.parse(raw) as Account | null)
  } catch {
    return fallback
  }
}

export default function PrototypeD() {
  useEffect(() => {
    const prev = document.title
    document.title = 'CampusPulse, prototype D: C refined'
    return () => {
      document.title = prev
    }
  }, [])
  return (
    <div className="cx">
      <Boundary>
        <Root />
      </Boundary>
    </div>
  )
}

function Root() {
  const data = useDemoData()
  const [start, setStart] = useState(() => initialStart())
  const [epoch, setEpoch] = useState(0)
  const now = useDemoClock(start)
  const looks = useMemo(() => (data ? subjectLooks(data) : new Map()), [data])
  const [snack, setSnack] = useState<{ text: string; id: number } | null>(null)
  const show = useCallback((text: string) => setSnack({ text, id: Date.now() }), [])
  const skeleton = useDelayed(!data, 200)
  const navigate = useNavigate()
  const location = useLocation()
  const [origin, setOrigin] = useState<string | null>(null)
  const [campus, setCampus] = useState<CampusState>({ patches: {}, added: [] })
  const [account, setAccountState] = useState<Account | null>(readAccount)
  const setAccount = useCallback((a: Account | null) => {
    setAccountState(a)
    if (a) sessionStorage.setItem(ACCOUNT_KEY, JSON.stringify(a))
    else sessionStorage.setItem(ACCOUNT_KEY, 'null')
  }, [])
  const patchDue = useCallback(
    (id: string, p: Partial<DueItem>) =>
      setCampus((c) => ({ ...c, patches: { ...c.patches, [id]: { ...c.patches[id], ...p } } })),
    [],
  )
  const addDue = useCallback(
    (d: DueItem) => setCampus((c) => ({ ...c, added: [...c.added, d] })),
    [],
  )

  useEffect(() => {
    if (!snack) return
    const t = setTimeout(() => setSnack(null), 4000)
    return () => clearTimeout(t)
  }, [snack])

  if (!data) return skeleton ? <Skeleton /> : null

  const pick = (id: string) => {
    const s = scenarios.find((x) => x.id === id)
    if (!s) return
    setStart(scenarioStart(s))
    setEpoch((e) => e + 1)
    // a new moment starts on "today": drop the day/week being browsed and any open sheet
    navigate(`${location.pathname}?scenario=${s.id}`, { replace: true })
  }

  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        <ProtoContext.Provider
          value={{
            data,
            now,
            looks,
            epoch,
            origin,
            setOrigin,
            campus,
            patchDue,
            addDue,
            account,
            setAccount,
          }}
        >
          <SnackbarContext.Provider value={show}>
            <Shell />
            <DemoTime start={start} now={now} onPick={pick} />
            <Snackbar snack={snack} onClose={() => setSnack(null)} />
          </SnackbarContext.Provider>
        </ProtoContext.Provider>
      </MotionConfig>
    </LazyMotion>
  )
}

function Shell() {
  const { compact } = useWindowClass()
  const { account } = useProto()
  const { pathname } = useLocation()
  const href = useHref()
  const signIn = pathname.endsWith('/sign-in')
  if (!account && !signIn) return <Navigate to={href('/sign-in')} replace />
  if (signIn)
    return (
      <Routes>
        <Route path="sign-in" element={<SignInScreen />} />
      </Routes>
    )
  const detail = /\/(deadlines|courses)\/[^/]+$|\/profile$/.test(pathname)
  return (
    <>
      <div id={APP_ID}>
        {!compact && (
          <NavRail
            top={
              <Link
                to={href('')}
                aria-label="CampusPulse, today"
                className="grid place-items-center"
              >
                <ShapeBadge shape="cookie12" size={48} fill="var(--md-sys-color-primary)">
                  <span
                    className="t-narrow font-bold"
                    style={{ color: 'var(--md-sys-color-on-primary)', fontSize: 16 }}
                  >
                    cp
                  </span>
                </ShapeBadge>
              </Link>
            }
            bottom={
              <Link
                to={href('/profile')}
                className="cx-nav-item"
                aria-current={pathname.endsWith('/profile') ? 'page' : undefined}
              >
                <span className="cx-nav-ind">
                  <Avatar size={28} />
                </span>
                <span className="cx-nav-label t-label-m">Profile</span>
              </Link>
            }
          />
        )}
        <main>
          <Routes>
            <Route index element={<TodayScreen />} />
            <Route path="week" element={<WeekScreen />} />
            <Route path="deadlines" element={<DeadlinesScreen />} />
            <Route path="deadlines/:id" element={<DeadlinesScreen />} />
            <Route path="courses" element={<CoursesScreen />} />
            <Route path="courses/:short" element={<CoursesScreen />} />
            <Route path="profile" element={<ProfileScreen />} />
            <Route path="*" element={<Navigate to={href('')} replace />} />
          </Routes>
        </main>
        {compact && !detail && <NavBar />}
      </div>
      <ClassPanelHost />
    </>
  )
}

/**
 * The class detail. Phone: a bottom sheet. Wide: a side panel that a calendar block grows into
 * (the block's fill moves into place), or slides in when opened from a list.
 */
function ClassPanelHost() {
  const { data, origin, setOrigin, looks } = useProto()
  const { compact } = useWindowClass()
  const [key, , close] = useSheetParam('class')
  const c = findClass(data, key)
  // Remember what had focus when the panel opened, to give it back on close.
  const [opener, setOpener] = useState<{ key: string | null; el: HTMLElement | null }>({
    key: null,
    el: null,
  })
  if (key !== opener.key)
    setOpener({ key, el: key ? (document.activeElement as HTMLElement | null) : opener.el })
  const layoutId = !compact && c && origin === `wk-${c.key}` ? origin : undefined
  const tone = c ? looks.get(shortOf(c.o))?.tone : undefined
  const onClose = () => {
    const el = opener.el
    close()
    window.setTimeout(() => {
      el?.focus({ preventScroll: true })
      setOrigin(null)
    }, 450)
  }
  return (
    <Panel
      open={!!c}
      onClose={onClose}
      label={c ? c.o.subject : 'Class'}
      wide={!compact}
      layoutId={layoutId}
      fromColor={tone ? themeColor(`--cx-${tone}-container`) : undefined}
      title="Class"
    >
      {c && <ClassDetail c={c} />}
    </Panel>
  )
}

function Snackbar({
  snack,
  onClose,
}: {
  snack: { text: string; id: number } | null
  onClose: () => void
}) {
  const { compact } = useWindowClass()
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4"
      style={{ bottom: compact ? 96 : 24 }}
      role="status"
      aria-live="polite"
    >
      <AnimatePresence>
        {snack && (
          <m.div
            key={snack.id}
            className="cx-snackbar pointer-events-auto w-full max-w-[480px]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0, transition: springs.spatialFast }}
            exit={{ opacity: 0, transition: springs.effectsFast }}
          >
            <span className="t-body-m flex-1">{snack.text}</span>
            <button
              type="button"
              className="cx-icon-btn cx-state"
              style={{ color: 'inherit' }}
              aria-label="Dismiss"
              onClick={onClose}
            >
              <Icon name="close" size={20} />
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * The demo clock control. Deliberately not Material: a yellow sticky note, so it never reads as
 * part of the design. Collapses to a small pill.
 */
function DemoTime({
  start,
  now,
  onPick,
}: {
  start: number
  now: WallTime
  onPick: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const { compact } = useWindowClass()
  const { pathname } = useLocation()
  const detail = /\/(deadlines|courses)\/[^/]+$|\/profile$|\/sign-in$/.test(pathname)
  const active = scenarios.find((s) => scenarioStart(s) === start)
  const note = {
    background: '#ffe169',
    color: '#1d1a00',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  }
  const pos = compact ? { left: 12, bottom: detail ? 16 : 92 } : { right: 20, bottom: 20 }
  return (
    <div className="fixed z-50" style={pos}>
      {open ? (
        <div
          className={`rounded-2xl p-3 shadow-2xl ${compact ? 'w-[calc(100vw-24px)]' : 'w-[300px]'}`}
          style={note}
          role="dialog"
          aria-label="Demo time"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-bold tracking-wide">
                Demo time (not part of the design)
              </p>
              <p className="mt-1 text-[15px] font-bold">
                {shortDate(now.date)} {hhmm(now.minutes)}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug">
                Runs on in real time from the moment you pick.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Collapse demo time"
              className="grid h-9 w-9 flex-none place-items-center rounded-lg hover:bg-black/10"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
          <ul className={`mt-2 grid gap-0.5 ${compact ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {scenarios.map((s) => {
              const on = s.id === active?.id
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onPick(s.id)}
                    className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 text-left hover:bg-black/10 ${compact ? 'min-h-9 text-[11.5px]' : 'min-h-10 text-[12.5px]'}`}
                    style={on ? { background: '#1d1a00', color: '#ffe169' } : undefined}
                  >
                    <span>{s.label}</span>
                    <span className={`flex-none opacity-80 ${compact ? 'hidden' : ''}`}>
                      {shortDate(s.at.slice(0, 10)).slice(0, 3)} {s.at.slice(11)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] font-bold shadow-lg"
          style={note}
          aria-label={`Demo time ${shortDate(now.date)} ${hhmm(now.minutes)}. Change it`}
        >
          <Icon name="schedule" size={18} />
          {shortDate(now.date).slice(0, 3)} {hhmm(now.minutes)}
        </button>
      )}
    </div>
  )
}

/** First load: a skeleton shaped like Today (no spinner), shown only after 200 ms. */
function Skeleton() {
  return (
    <div
      className="mx-auto max-w-[480px] px-4 pt-20"
      aria-busy="true"
      aria-label="Loading the timetable"
    >
      <div className="cx-skel h-9 w-64" />
      <div className="cx-skel mt-3 h-5 w-40" />
      <div className="cx-skel mt-6 h-[300px] w-full" style={{ borderRadius: 32 }} />
      <div className="cx-skel mt-8 h-[72px] w-full" style={{ borderRadius: '20px 20px 4px 4px' }} />
      <div className="cx-skel mt-0.5 h-[72px] w-full" style={{ borderRadius: 4 }} />
      <div
        className="cx-skel mt-0.5 h-[72px] w-full"
        style={{ borderRadius: '4px 4px 20px 20px' }}
      />
    </div>
  )
}

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto max-w-[480px] px-6 pt-24">
        <h1 className="t-headline-s">The demo data didn’t load</h1>
        <p className="t-body-l c-muted mt-2">{this.state.error.message}</p>
        <button
          type="button"
          className="cx-btn cx-btn--filled cx-state mt-6"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    )
  }
}
