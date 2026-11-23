/** The frame: a bottom tab bar on the phone, a top bar with the views side by side on desktop. */
import { useEffect, useState, type ComponentType, type SVGProps } from 'react'
import { classesOn } from '../data'
import { DeadlinesScreen } from './Deadlines'
import { IconDay, IconDue, IconRooms, IconWeek, IconYou } from './icons'
import { blocksOf, deadlinesOf, hhmm, kindWord, phaseOf, type Phase } from './model'
import { ProfileScreen } from './Profile'
import { RoomDayScreen, RoomsDesktop, RoomsScreen } from './Rooms'
import { useNav, useProto, type View } from './state'
import { TimetableDesktop, TodayScreen, WeekScreen } from './Timetable'
import { LiveText } from './ui'

interface Tab {
  view: View
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
  also?: View[]
}

const PHONE_TABS: Tab[] = [
  { view: 'today', label: 'Today', Icon: IconDay },
  { view: 'week', label: 'Week', Icon: IconWeek },
  { view: 'rooms', label: 'Rooms', Icon: IconRooms, also: ['room'] },
  { view: 'deadlines', label: 'Deadlines', Icon: IconDue },
  { view: 'profile', label: 'Profile', Icon: IconYou },
]

const DESK_TABS: Tab[] = [
  { view: 'today', label: 'Timetable', Icon: IconDay, also: ['week'] },
  { view: 'rooms', label: 'Rooms', Icon: IconRooms, also: ['room'] },
  { view: 'deadlines', label: 'Deadlines', Icon: IconDue },
  { view: 'profile', label: 'Profile', Icon: IconYou },
]

function useLateCount(): number {
  const { data, now } = useProto()
  return deadlinesOf(data.assignments, now).filter(
    (d) => (d.urgency === 'overdue' && !(d.cutoff?.passed ?? false)) || d.urgency === 'today',
  ).length
}

function phaseText(p: Phase): string {
  switch (p.kind) {
    case 'in': {
      const o = p.current.occ
      return `${o.shortName ?? o.subject} ${kindWord(o)} has started in ${o.room ?? 'its room'}, until ${hhmm(p.current.end)}.`
    }
    case 'gap':
      return `Break. Free until ${hhmm(p.next.start)}.`
    case 'after':
      return 'Classes are over for today.'
    case 'before':
      return `First class at ${hhmm(p.next.start)}.`
    case 'none':
      return ''
  }
}

/** Says out loud when a class starts or ends, never every minute. */
function Announcer() {
  const { data, now } = useProto()
  const phase = phaseOf(blocksOf(classesOn(data.timetable, now.date)), now.minutes)
  const key =
    phase.kind === 'in'
      ? `in-${phase.current.id}`
      : phase.kind === 'gap'
        ? `gap-${phase.next.id}`
        : phase.kind
  const [last, setLast] = useState(key)
  const [text, setText] = useState('')
  if (key !== last) {
    setLast(key)
    setText(phaseText(phase))
  }
  return <LiveText text={text} />
}

export function Shell() {
  const { wide } = useProto()
  return wide ? <Desktop /> : <Phone />
}

function Phone() {
  const [nav, go] = useNav()
  const late = useLateCount()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [nav.view])

  let screen
  switch (nav.view) {
    case 'week':
      screen = <WeekScreen />
      break
    case 'rooms':
      screen = <RoomsScreen />
      break
    case 'room':
      screen = <RoomDayScreen />
      break
    case 'deadlines':
      screen = <DeadlinesScreen />
      break
    case 'profile':
      screen = <ProfileScreen />
      break
    default:
      screen = <TodayScreen />
  }

  return (
    <>
      <Announcer />
      <main>{screen}</main>
      <nav
        aria-label="Main"
        className="b-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-line bg-page/90 backdrop-blur-md"
      >
        <ul className="mx-auto flex max-w-xl">
          {PHONE_TABS.map((t) => {
            const on = nav.view === t.view || (t.also?.includes(nav.view) ?? false)
            return (
              <li key={t.view} className="flex-1">
                <button
                  type="button"
                  aria-current={on ? 'page' : undefined}
                  onClick={() => go({ view: t.view, cls: null, due: null, room: null })}
                  className={`flex min-h-16 w-full flex-col items-center justify-center gap-1 ${
                    on ? 'text-ink' : 'text-ink-muted'
                  }`}
                >
                  <span
                    className={`relative grid h-8 w-14 place-items-center rounded-full transition-colors ${
                      on ? 'bg-raised' : ''
                    }`}
                  >
                    <t.Icon width={22} height={22} />
                    {t.view === 'deadlines' && late ? (
                      <span className="b-num b-badge absolute -top-0.5 right-2 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-page">
                        {late}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-caption">{t.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}

function Desktop() {
  const [nav, go] = useNav()
  const late = useLateCount()
  let screen
  switch (nav.view) {
    case 'rooms':
    case 'room':
      screen = <RoomsDesktop />
      break
    case 'deadlines':
      screen = <DeadlinesScreen />
      break
    case 'profile':
      screen = <ProfileScreen />
      break
    default:
      screen = <TimetableDesktop />
  }
  const scrolls = nav.view === 'deadlines' || nav.view === 'profile'

  return (
    <div className="flex h-dvh flex-col">
      <Announcer />
      <header className="flex h-14 shrink-0 items-center gap-10 border-b border-line px-6">
        <span className="flex items-center gap-2 text-ink">
          <IconDay width={22} height={22} />
          <span className="text-subtitle">CampusPulse</span>
        </span>
        <nav aria-label="Main">
          <ul className="flex gap-1">
            {DESK_TABS.map((t) => {
              const on = nav.view === t.view || (t.also?.includes(nav.view) ?? false)
              return (
                <li key={t.view}>
                  <button
                    type="button"
                    aria-current={on ? 'page' : undefined}
                    onClick={() => go({ view: t.view, cls: null, due: null })}
                    className={`relative flex h-14 items-center gap-2 px-3 text-label transition-colors ${
                      on ? 'text-ink' : 'text-ink-muted hover:text-ink-soft'
                    }`}
                  >
                    {t.label}
                    {t.view === 'deadlines' && late ? (
                      <span className="b-num grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1.5 text-xs font-bold text-page">
                        {late}
                      </span>
                    ) : null}
                    {on ? (
                      <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-ink" />
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
        <span className="ml-auto text-caption text-ink-muted">Prototype B: day spine</span>
      </header>
      <main className={`min-h-0 flex-1 ${scrolls ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        {screen}
      </main>
    </div>
  )
}
