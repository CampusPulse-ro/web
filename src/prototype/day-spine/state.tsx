/** Shared state for the prototype: the data, the demo clock, the URL and the screen width. */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from 'react'
import { useSearchParams } from 'react-router-dom'
import type { WallTime } from '../clock'
import type { DemoData, Occurrence } from '../data'
import { NEUTRAL, type Subjects } from './model'

export interface Proto {
  data: DemoData
  subjects: Subjects
  now: WallTime
  /** Wall-clock ms the demo clock started from; changes when a scenario is picked. */
  start: number
  wide: boolean
  /** The demo player is fast-forwarding the clock. */
  playing: boolean
  /** Which block opened the detail (`<surface>-<id>`), so the block can expand into it. */
  origin: string | null
  setOrigin: (origin: string | null) => void
}

export const ProtoContext = createContext<Proto | null>(null)

export function useProto(): Proto {
  const p = useContext(ProtoContext)
  if (!p) throw new Error('useProto outside the prototype')
  return p
}

export function useColorOf(): (o: Occurrence) => string {
  const { subjects } = useProto()
  return (o) => subjects.byId.get(o.subjectId)?.color ?? NEUTRAL
}

// ---------- width ----------

const WIDE = '(min-width: 641px)'

function subscribeWide(cb: () => void) {
  const mq = window.matchMedia(WIDE)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

export function useIsWide(): boolean {
  return useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => false,
  )
}

// ---------- URL as state ----------

export type View = 'today' | 'week' | 'rooms' | 'room' | 'deadlines' | 'profile'
export type FreeMode = 'now' | 'at' | 'all'

export interface Nav {
  view: View
  /** The selected day (`YYYY-MM-DD`), or null for today. */
  day: string | null
  cls: string | null
  room: string | null
  rday: string | null
  free: FreeMode
  from: string | null
  until: string | null
  grp: string | null
  due: string | null
}

/** A change to the URL; `scenario` and `at` are the demo clock's own parameters. */
type Patch = Partial<{ [K in keyof Nav]: Nav[K] | null }> & {
  scenario?: string | null
  at?: string | null
}

const VIEWS: View[] = ['today', 'week', 'rooms', 'room', 'deadlines', 'profile']

export function useNav(): [Nav, (patch: Patch, opts?: { replace?: boolean }) => void] {
  const [params, setParams] = useSearchParams()
  const v = params.get('view') as View | null
  const free = params.get('free')
  const nav: Nav = {
    view: v && VIEWS.includes(v) ? v : 'today',
    day: params.get('day'),
    cls: params.get('cls'),
    room: params.get('room'),
    rday: params.get('rday'),
    free: free === 'at' || free === 'all' ? free : 'now',
    from: params.get('from'),
    until: params.get('until'),
    grp: params.get('grp'),
    due: params.get('due'),
  }
  const go = useCallback(
    (patch: Patch, opts?: { replace?: boolean }) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, val] of Object.entries(patch)) {
            if (val === null || val === undefined || val === '') next.delete(k)
            else next.set(k, String(val))
          }
          if (next.get('view') === 'today') next.delete('view')
          if (next.get('free') === 'now') next.delete('free')
          return next
        },
        { replace: opts?.replace ?? false },
      )
    },
    [setParams],
  )
  return [nav, go]
}

// ---------- small hooks ----------

/**
 * The now-line glides on a minute tick but jumps on a scenario switch or a day change. Attach the ref
 * to the element whose subtree glides: on a jump its transitions are switched off for one style pass.
 */
export function useNoGlideOnJump<T extends HTMLElement>(key: string, value: number, max = 3) {
  const el = useRef<T>(null)
  const last = useRef<{ key: string; value: number } | null>(null)
  useLayoutEffect(() => {
    const prev = last.current
    last.current = { key, value }
    const node = el.current
    if (!node || (prev && prev.key === key && Math.abs(prev.value - value) <= max)) return
    node.classList.add('b-jump')
    void node.offsetHeight // apply the new position with transitions off
    node.classList.remove('b-jump')
  }, [key, value, max])
  return el
}

/** Runs `fn` on these keys, ignoring typing in form fields. */
export function useKeys(handler: (e: KeyboardEvent) => void, enabled = true) {
  const ref = useRef(handler)
  useEffect(() => {
    ref.current = handler
  })
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      ref.current(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [enabled])
}
