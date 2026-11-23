/**
 * Navigation state lives in the URL (cheap, shareable, and the browser's back closes a sheet or
 * a pushed room the way a phone's back gesture does). `scenario` and `at` belong to the demo clock.
 */
import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { useSearchParams } from 'react-router-dom'

export type View = 'today' | 'week' | 'rooms' | 'deadlines'
const VIEWS: View[] = ['today', 'week', 'rooms', 'deadlines']

export interface Nav {
  view: View
  /** The day the Today board shows (`YYYY-MM-DD`); null = today. */
  day: string | null
  /** An open room's day (phone: a pushed screen; desktop: the Rooms detail pane). */
  room: string | null
  /** The date that room's day opens on. */
  roomDay: string | null
  /** An open class sheet (`classKey`). */
  cls: string | null
  /** An open deadline sheet (assignment id). */
  due: number | null
}

const KEYS = { view: 'view', day: 'day', room: 'room', roomDay: 'rday', cls: 'class', due: 'due' }

export function useNav(): [Nav, (patch: Partial<Nav>, opts?: { replace?: boolean }) => void] {
  const [params, setParams] = useSearchParams()
  const nav = useMemo<Nav>(() => {
    const view = params.get(KEYS.view) as View | null
    const due = params.get(KEYS.due)
    return {
      view: view && VIEWS.includes(view) ? view : 'today',
      day: params.get(KEYS.day),
      room: params.get(KEYS.room),
      roomDay: params.get(KEYS.roomDay),
      cls: params.get(KEYS.cls),
      due: due ? Number(due) : null,
    }
  }, [params])

  const go = useCallback(
    (patch: Partial<Nav>, opts: { replace?: boolean } = {}) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(patch) as [keyof Nav, Nav[keyof Nav]][]) {
            const key = KEYS[k]
            if (v === null || v === undefined || (k === 'view' && v === 'today')) next.delete(key)
            else next.set(key, String(v))
          }
          return next
        },
        { replace: opts.replace ?? false },
      )
    },
    [setParams],
  )
  return [nav, go]
}

/** Phone layout at 640 px and below. */
const PHONE = '(max-width: 640px)'

function subscribe(cb: () => void) {
  const mq = window.matchMedia(PHONE)
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}

export function useIsPhone(): boolean {
  return useSyncExternalStore(subscribe, () => window.matchMedia(PHONE).matches)
}

/** A short buzz where the browser supports it (Android Chrome): the "selection" haptic. */
export function tick() {
  if ('vibrate' in navigator) navigator.vibrate(8)
}
