/**
 * Shared state for the prototype: the demo data, the demo "now", subject looks, the window class
 * (phone / medium / expanded) and URL helpers. The URL is the state where it's cheap: the screen,
 * the day or week shown, the open sheet, room filters. `?scenario=` / `?at=` ride along on every
 * link so a reload keeps the demo moment.
 */
import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import type { WallTime } from '../clock'
import type { DemoData } from '../data'
import type { CampusState, DueItem } from './campus'
import type { CellStyle } from './cells'
import type { SubjectLook } from './model'

export const BASE = '/prototype'

/** The CampusPulse account: its own (email code), with UPT linked or not. */
export interface Account {
  email: string
  via: 'upt' | 'email'
  uptLinked: boolean
}

export interface Proto {
  data: DemoData
  now: WallTime
  looks: Map<string, SubjectLook>
  /** Demo time restarts (a scenario pick) bump this, so screens can reset to "today". */
  epoch: number
  /** Which block opened the class detail (`<surface>-<key>`), so it can expand into the panel. */
  origin: string | null
  setOrigin: (o: string | null) => void
  campus: CampusState
  /** Apply an in-app change to a deadline (saved draft, submission, reply, done). */
  patchDue: (id: string, p: Partial<DueItem>) => void
  addDue: (d: DueItem) => void
  account: Account | null
  setAccount: (a: Account | null) => void
  /** Prototype-only switch between the two cell designs (Demo time control). */
  cellStyle: CellStyle
  setCellStyle: (s: CellStyle) => void
}

export const ProtoContext = createContext<Proto | null>(null)

/** Shows an M3 snackbar with a short confirmation. */
export const SnackbarContext = createContext<(text: string) => void>(() => {})
export const useSnackbar = () => useContext(SnackbarContext)

export function useProto(): Proto {
  const p = useContext(ProtoContext)
  if (!p) throw new Error('useProto outside the prototype')
  return p
}

function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

/** M3 window classes: compact ≤ 640 px is the phone app; expanded ≥ 1024 px gets two panes. */
export function useWindowClass() {
  const compact = useMedia('(max-width: 640px)')
  const expanded = useMedia('(min-width: 1024px)')
  return { compact, expanded, medium: !compact && !expanded }
}

export function useReducedMotionPref() {
  return useMedia('(prefers-reduced-motion: reduce)')
}

const DEMO_KEYS = ['scenario', 'at', 'cells']

/** Build a prototype URL that keeps the demo moment. */
export function useHref() {
  const [params] = useSearchParams()
  return (path: string, extra: Record<string, string | null | undefined> = {}) => {
    const q = new URLSearchParams()
    for (const k of DEMO_KEYS) {
      const v = params.get(k)
      if (v) q.set(k, v)
    }
    for (const [k, v] of Object.entries(extra)) if (v) q.set(k, v)
    const s = q.toString()
    return `${BASE}${path}${s ? `?${s}` : ''}`
  }
}

/** Read and write one search param on the current screen (push = a history entry, for sheets). */
export function useParam(key: string) {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const value = params.get(key)
  const set = (v: string | null, { push = false } = {}) => {
    const q = new URLSearchParams(location.search)
    if (v === null) q.delete(key)
    else q.set(key, v)
    const s = q.toString()
    navigate(`${location.pathname}${s ? `?${s}` : ''}`, { replace: !push })
  }
  return [value, set] as const
}

let lastClose = 0

/** Open/close a sheet through the URL, so Back closes it (the web's predictive back). */
export function useSheetParam(key: string) {
  const [value, set] = useParam(key)
  const navigate = useNavigate()
  const location = useLocation()
  const pushed = (location.state as { sheet?: string } | null)?.sheet === key
  const open = (v: string) => {
    const q = new URLSearchParams(location.search)
    q.set(key, v)
    navigate(`${location.pathname}?${q}`, { state: { sheet: key } })
  }
  const close = () => {
    // Idempotent: a scrim tap and Esc in the same moment must not go back twice.
    const t = performance.now()
    if (t - lastClose < 500) return
    lastClose = t
    if (pushed) navigate(-1)
    else set(null)
  }
  return [value, open, close] as const
}

/** True once `ms` have passed since `active` became true (skeleton show-delay). */
export function useDelayed(active: boolean, ms: number) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    if (!active) return
    const t = setTimeout(() => setShown(true), ms)
    return () => {
      clearTimeout(t)
      setShown(false)
    }
  }, [active, ms])
  return active && shown
}

/**
 * Desktop keys (←/→, T…). Ignored while typing, inside a radio group (arrows move the choice
 * there) or while a sheet or dialog is open.
 */
export function useKeys(map: Record<string, () => void>, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t?.closest('input, textarea, select, [role=radiogroup], [contenteditable=true]')) return
      if (document.querySelector('dialog[open], [data-cx-panel]')) return
      const fn = map[e.key] ?? map[e.key.toLowerCase()]
      if (fn) {
        e.preventDefault()
        fn()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
}

/** The prototype's app shell; it goes inert while a panel or sheet is open. */
export const APP_ID = 'cx-app'

/** Reads a theme colour, so Motion can tween from a subject colour to the panel's. */
export function themeColor(name: string): string {
  const root = document.querySelector('.cx') ?? document.documentElement
  return getComputedStyle(root).getPropertyValue(name).trim() || 'transparent'
}
