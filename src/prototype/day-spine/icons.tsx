/** Line icons drawn for this prototype (24 px grid, 1.75 stroke), so nothing comes from an icon kit. */
import type { SVGProps } from 'react'

function Svg(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable={false}
      {...props}
    />
  )
}

/** Today: a short spine with a filled part and a dot. */
export function IconDay(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <path d="M7 3v18" />
      <path d="M7 3v8" strokeWidth={3.5} />
      <circle cx="7" cy="11" r="2.2" fill="currentColor" stroke="none" />
      <path d="M11 6h8M11 15h6" />
    </Svg>
  )
}

export function IconWeek(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <path d="M4 4v16M10 4v16M16 4v16" />
      <path d="M4 6v5M10 9v7M16 5v4M16 13v5" strokeWidth={3.5} />
    </Svg>
  )
}

export function IconRooms(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <path d="M5 21V4.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1V21" />
      <path d="M15 8h3a1 1 0 0 1 1 1v12M3 21h18" />
      <circle cx="12" cy="13" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function IconDue(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <path d="M6 21V4" />
      <path d="M6 4h11l-2.5 4L17 12H6" />
    </Svg>
  )
}

export function IconYou(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20c1.2-3.6 3.8-5.3 7-5.3s5.8 1.7 7 5.3" />
    </Svg>
  )
}

export function IconBack(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <path d="M15 5l-7 7 7 7" />
    </Svg>
  )
}

export function IconNext(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <path d="M9 5l7 7-7 7" />
    </Svg>
  )
}

export function IconExternal(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </Svg>
  )
}

export function IconClock(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Svg>
  )
}

export function IconPlay(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <path d="M8 5.5v13l10-6.5z" fill="currentColor" />
    </Svg>
  )
}

export function IconPause(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <path d="M8.5 5.5v13M15.5 5.5v13" strokeWidth={3} />
    </Svg>
  )
}

export function IconClose(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  )
}

/** Kind glyphs, drawn small inside a class capsule. */
export function IconCourse(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p} strokeWidth={2.2}>
      <path d="M4 6.5c2.6-1.3 5.3-1.3 8 0v12c-2.7-1.3-5.4-1.3-8 0zM12 6.5c2.6-1.3 5.3-1.3 8 0v12c-2.7-1.3-5.4-1.3-8 0z" />
    </Svg>
  )
}

export function IconLab(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p} strokeWidth={2.2}>
      <path d="M9.5 3.5h5M10.5 3.5v5.5L5 18.5a1.3 1.3 0 0 0 1.1 2h11.8a1.3 1.3 0 0 0 1.1-2L13.5 9V3.5" />
      <path d="M7.5 14.5h9" />
    </Svg>
  )
}

export function IconSeminar(p: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...p} strokeWidth={2.2}>
      <path d="M4 5.5h11v8H9l-3.5 3v-3H4z" />
      <path d="M15 9.5h5v7h-1.5v2.5L15.5 16.5H11v-3" />
    </Svg>
  )
}
