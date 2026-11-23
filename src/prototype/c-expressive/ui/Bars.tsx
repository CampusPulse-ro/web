import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useHref } from '../ctx'
import { Icon, type IconName } from '../icons'

/**
 * M3 large top app bar: the headline scrolls away under a sticky 64 px bar, whose small title
 * fades in and whose container lifts to surface-container once content runs under it.
 * `large={false}` is the small bar (desktop panes).
 */
export function TopAppBar({
  title,
  smallTitle,
  subtitle,
  leading,
  actions,
  below,
  large = true,
}: {
  title: ReactNode
  smallTitle?: ReactNode
  subtitle?: ReactNode
  leading?: ReactNode
  actions?: ReactNode
  below?: ReactNode
  large?: boolean
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    const el = heading.current
    if (!large || !el) return
    const io = new IntersectionObserver(([e]) => setCollapsed(!e.isIntersecting), {
      root: el.closest('.cx-pane'),
      rootMargin: '-64px 0px 0px 0px',
      threshold: 0,
    })
    io.observe(el)
    return () => io.disconnect()
  }, [large])

  return (
    <>
      <div className="cx-appbar" data-collapsed={large ? collapsed : false}>
        {leading ?? <span className="w-2" />}
        {large ? (
          <div className="cx-appbar-title t-title-l truncate" aria-hidden="true">
            {smallTitle ?? title}
          </div>
        ) : (
          <div className="min-w-0 flex-1 px-2">
            <h1 className="t-title-l truncate">{title}</h1>
            {subtitle && <p className="t-body-s c-muted truncate">{subtitle}</p>}
          </div>
        )}
        <div className="flex flex-none items-center gap-1 pr-1">{actions}</div>
      </div>
      {large && (
        <div className="cx-appbar-large">
          <h1 ref={heading} className="t-headline-m">
            {title}
          </h1>
          {subtitle && <p className="t-body-l c-muted mt-1">{subtitle}</p>}
          {below}
        </div>
      )}
      {!large && below && <div className="px-4 pb-3">{below}</div>}
    </>
  )
}

interface Destination {
  path: string
  label: string
  icon: IconName
  iconSelected: IconName
}

const destinations: Destination[] = [
  { path: '', label: 'Today', icon: 'today', iconSelected: 'todayFill' },
  { path: '/week', label: 'Week', icon: 'calendarViewWeek', iconSelected: 'calendarViewWeekFill' },
  { path: '/rooms', label: 'Rooms', icon: 'meetingRoom', iconSelected: 'meetingRoomFill' },
  { path: '/deadlines', label: 'Deadlines', icon: 'assignment', iconSelected: 'assignmentFill' },
]

function useCurrent() {
  const { pathname } = useLocation()
  const rest = pathname.replace(/^\/prototype/, '')
  return (d: Destination) =>
    d.path === '' ? rest === '' || rest === '/' : rest === d.path || rest.startsWith(`${d.path}/`)
}

function NavItems() {
  const href = useHref()
  const isCurrent = useCurrent()
  return destinations.map((d) => {
    const current = isCurrent(d)
    return (
      <Link
        key={d.path}
        to={href(d.path)}
        className="cx-nav-item"
        aria-current={current ? 'page' : undefined}
      >
        <span className="cx-nav-ind">
          <Icon name={current ? d.iconSelected : d.icon} />
        </span>
        <span className="cx-nav-label t-label-m">{d.label}</span>
      </Link>
    )
  })
}

/** Phone: the M3 navigation bar. */
export function NavBar() {
  return (
    <nav className="cx-navbar" aria-label="Main">
      <NavItems />
    </nav>
  )
}

/** Medium and expanded windows: the M3 navigation rail, profile at the bottom. */
export function NavRail({ top, bottom }: { top?: ReactNode; bottom?: ReactNode }) {
  return (
    <nav className="cx-rail" aria-label="Main">
      <div className="mb-6">{top}</div>
      <NavItems />
      <div className="mt-auto">{bottom}</div>
    </nav>
  )
}
