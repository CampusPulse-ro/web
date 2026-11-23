import NumberFlow, { NumberFlowGroup } from '@number-flow/react'
import type { ReactNode, SVGProps } from 'react'

// ── Icons: 24 px, drawn for this prototype (stroke, currentColor) ────────────────────────────

function Svg({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

/** Today: a board with a departure row lit. */
export const IconToday = () => (
  <Svg>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <path d="M7 9.5h6M7 14.5h10" />
    <circle cx="17" cy="9.5" r="1.25" fill="currentColor" stroke="none" />
  </Svg>
)
export const IconWeek = () => (
  <Svg>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4M9 9.5V20M15 9.5V20" />
  </Svg>
)
export const IconRooms = () => (
  <Svg>
    <path d="M5 20.5V4.5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M3 20.5h18M15 7.5h3a1 1 0 0 1 1 1v12" />
    <circle cx="12" cy="12.5" r="0.9" fill="currentColor" stroke="none" />
  </Svg>
)
export const IconDue = () => (
  <Svg>
    <path d="M6 3.5h8.5L19 8v12.5H6z" />
    <path d="M14 3.5V8h5M9.5 13.5l2 2 3.5-4" />
  </Svg>
)
export const IconChevron = ({ dir = 'right' }: { dir?: 'left' | 'right' | 'down' | 'up' }) => {
  const d = {
    right: 'M9 6l6 6-6 6',
    left: 'M15 6l-6 6 6 6',
    down: 'M6 9l6 6 6-6',
    up: 'M6 15l6-6 6 6',
  }[dir]
  return (
    <Svg width="20" height="20">
      <path d={d} />
    </Svg>
  )
}
export const IconClose = () => (
  <Svg width="20" height="20">
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
)
export const IconExternal = () => (
  <Svg width="18" height="18">
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Svg>
)
export const IconSearch = () => (
  <Svg width="20" height="20">
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </Svg>
)

// ── The countdown: minute digits roll like an odometer ───────────────────────────────────────

const ROLL = {
  transformTiming: { duration: 200, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
  spinTiming: { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
  opacityTiming: { duration: 150, easing: 'ease-out' },
}

/** "12 min", "1 h 05" or "2 h", with tabular digits that roll when they change. Hidden from screen readers. */
export function Countdown({ minutes, unitClass }: { minutes: number; unitClass?: string }) {
  const m = Math.max(0, minutes)
  const h = Math.floor(m / 60)
  const r = m % 60
  return (
    <span className="dp-countdown" aria-hidden="true">
      <NumberFlowGroup>
        {h > 0 && (
          <>
            <NumberFlow value={h} {...ROLL} />
            <span className={unitClass}>h</span>
          </>
        )}
        {(h === 0 || r > 0) && (
          <NumberFlow value={r} format={{ minimumIntegerDigits: h > 0 ? 2 : 1 }} {...ROLL} />
        )}
        {h === 0 && <span className={unitClass}>min</span>}
      </NumberFlowGroup>
    </span>
  )
}

/** A small count that rolls too ("Earlier today (2)"). */
export function RollingCount({ value }: { value: number }) {
  return <NumberFlow value={value} {...ROLL} />
}

export function Sr({ children }: { children: ReactNode }) {
  return <span className="dp-sr">{children}</span>
}

/** A coloured status dot that always sits next to words (colour is never the only signal). */
export function Dot({ kind }: { kind: 'free' | 'busy' | 'live' | 'late' }) {
  return <span className={`dp-dot dp-dot-${kind}`} aria-hidden="true" />
}

export function Switch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description?: ReactNode
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="dp-switch-row"
      onClick={() => onChange(!checked)}
    >
      <span className="dp-switch-text">
        <span className="dp-switch-label">{label}</span>
        {description && <span className="dp-switch-desc">{description}</span>}
      </span>
      <span className="dp-switch" data-on={checked}>
        <span className="dp-switch-knob" />
      </span>
    </button>
  )
}
