/**
 * Where the user is in the prototype, sent with every question so the agent can answer about the
 * screen in front of them: the screen, what is open on it (class, deadline, course), the demo
 * time and the window size.
 */
import { useLocation } from 'react-router-dom'
import { defaultScenario, scenarios } from '../../clock'
import { allDue, isDone, minutesToDue, statusLine } from '../campus'
import { BASE, useProto, useWindowClass } from '../ctx'
import { findClass, hhmm, kindOf, longDate, shortDate, shortOf } from '../model'

export interface ChatContext {
  route: string
  screen: string
  selection?: {
    class?: {
      subject: string
      kind?: string
      day?: string
      start?: string
      end?: string
      room?: string
      teacher?: string
    }
    deadline?: { title: string; course?: string; due?: string; status?: string }
    course?: { name: string; code?: string }
  }
  demoTime: { now: string; scenario?: string }
  viewport: { width: number; height: number; layout: 'phone' | 'web' }
}

export interface Where {
  context: ChatContext
  /** A short human line for the panel: "Class detail · Data Mining, Lab". */
  label: string
}

const SCREENS: Record<string, string> = {
  '': 'Today',
  week: 'Week',
  deadlines: 'Deadlines',
  courses: 'Courses',
  profile: 'Profile',
  'sign-in': 'Sign in',
}

function decode(s: string): string {
  try {
    return decodeURIComponent(s)
  } catch {
    return s
  }
}

/** "2026-11-24T23:59" → "Tue 24 Nov 23:59" */
const wallText = (iso: string) => `${shortDate(iso.slice(0, 10))} ${iso.slice(11, 16)}`

export function useWhere(): Where {
  const { pathname, search } = useLocation()
  const { data, now, campus, account } = useProto()
  const { compact } = useWindowClass()
  const q = new URLSearchParams(search)
  const rel = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname
  const [first = '', second] = rel.split('/').filter(Boolean).map(decode)
  let screen = SCREENS[first] ?? (rel || 'Today')
  let detail = ''
  const selection: NonNullable<ChatContext['selection']> = {}

  if (first === 'deadlines') {
    const items = allDue(data, campus, !!account?.uptLinked)
    let d = second ? items.find((x) => x.id === second) : undefined
    if (second) screen = 'Deadline detail'
    // On a wide window the list shows the first open deadline beside it, as the screen does.
    if (!d && !compact)
      d =
        items
          .filter((x) => !isDone(x))
          .sort((a, b) => minutesToDue(a, now) - minutesToDue(b, now))[0] ?? items[0]
    if (d) {
      selection.deadline = {
        title: d.name,
        course: d.course ?? undefined,
        due: wallText(d.dueAt),
        status: statusLine(d),
      }
      if (second || !compact) detail = d.name
    }
  }

  if (first === 'courses' && second) {
    screen = 'Course detail'
    const o = data.timetable.occurrences.find((x) => shortOf(x) === second)
    selection.course = { name: o?.subject ?? second, code: second }
    detail = o?.subject ?? second
  }

  const c = findClass(data, q.get('class'))
  if (c) {
    screen = 'Class detail'
    selection.class = {
      subject: c.o.subject,
      kind: kindOf(c),
      day: longDate(c.date),
      start: hhmm(c.start),
      end: hhmm(c.end),
      room: c.o.room ?? undefined,
      teacher: c.o.teacher ?? undefined,
    }
    detail = `${c.o.subject}, ${kindOf(c)}, ${hhmm(c.start)}–${hhmm(c.end)}`
  } else if (first === '' && q.get('day')) {
    detail = longDate(q.get('day')!)
  }

  const at = q.get('at')
  const picked = scenarios.find((s) => s.id === q.get('scenario'))
  const scenario = picked?.id ?? (at ? undefined : defaultScenario.id)
  const time = `${now.date}T${hhmm(now.minutes)}`

  return {
    context: {
      route: `${pathname}${search}`,
      screen,
      ...(Object.keys(selection).length ? { selection } : {}),
      demoTime: { now: time, ...(scenario ? { scenario } : {}) },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        layout: compact ? 'phone' : 'web',
      },
    },
    label: `${screen}${detail ? ` · ${detail}` : ''} · ${wallText(time)}`,
  }
}
