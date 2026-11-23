import { useRef, type ReactNode } from 'react'
import { Icon, type IconName } from '../icons'

/**
 * Segmented buttons, drawn as M3 Expressive's connected button group: tonal segments with 2 px
 * gaps; the selected one turns fully round (a shape change, not just a colour) and shows a check.
 * A radio group: arrow keys move the choice.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  small = false,
  className,
}: {
  options: { value: T; label: ReactNode; icon?: IconName; disabled?: boolean }[]
  value: T
  onChange: (v: T) => void
  label: string
  small?: boolean
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const move = (dir: number) => {
    const enabled = options.filter((o) => !o.disabled)
    const i = enabled.findIndex((o) => o.value === value)
    const next = enabled[(i + dir + enabled.length) % enabled.length]
    onChange(next.value)
    requestAnimationFrame(() =>
      ref.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus(),
    )
  }
  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label={label}
      className={`cx-seg ${small ? 'cx-seg--sm' : ''} ${className ?? ''}`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault()
          move(1)
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault()
          move(-1)
        }
      }}
    >
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            disabled={o.disabled}
            className="cx-state"
            onClick={() => onChange(o.value)}
          >
            {o.icon && !on ? (
              <Icon name={o.icon} size={18} />
            ) : (
              <span className="cx-seg-check">
                <Icon name="check" size={18} />
              </span>
            )}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** A list row that is one big switch (M3: the whole item toggles). */
export function SwitchRow({
  checked,
  onChange,
  icon,
  label,
  supporting,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  icon?: IconName
  label: ReactNode
  supporting?: ReactNode
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="cx-item cx-state"
      onClick={() => onChange(!checked)}
    >
      {icon && (
        <span className="cx-item-lead">
          <Icon name={icon} />
        </span>
      )}
      <span className="cx-item-body">
        <span className="t-body-l">{label}</span>
        {supporting && <span className="t-body-m c-muted">{supporting}</span>}
      </span>
      <span className="cx-switch">
        <span className="cx-switch-thumb">
          <Icon name="check" size={16} />
        </span>
      </span>
    </button>
  )
}

/** Visually hidden, still read. */
export function VisuallyHidden({ children, live }: { children: ReactNode; live?: boolean }) {
  return (
    <span
      aria-live={live ? 'polite' : undefined}
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        overflow: 'hidden',
        clip: 'rect(0 0 0 0)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  )
}
