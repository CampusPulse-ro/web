import { m } from 'motion/react'
import { useId, useRef, type ReactNode } from 'react'
import { haptic } from '../haptics'
import { Icon, type IconName } from '../icons'
import { springs } from '../motion'

/**
 * A standard segmented control: a track with a thumb that slides to the chosen option (a spring,
 * so a fast second tap retargets it mid-way). A radio group: arrow keys move the choice.
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
  const id = useId()
  const move = (dir: number) => {
    const enabled = options.filter((o) => !o.disabled)
    const i = enabled.findIndex((o) => o.value === value)
    const next = enabled[(i + dir + enabled.length) % enabled.length]
    haptic('selection')
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
            onClick={() => {
              if (o.value !== value) haptic('selection')
              onChange(o.value)
            }}
          >
            {on && (
              <m.span
                layoutId={`seg-${id}`}
                className="cx-seg-thumb"
                transition={springs.spatialFast}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {o.icon && <Icon name={o.icon} size={18} />}
              {o.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Two or more views side by side that slide in the direction the selection moves: picking a
 * later option moves the content left to right, an earlier one right to left. Every page keeps
 * its own spring, so toggling fast just turns the motion around mid-way. Reduced motion: a fade.
 */
export function Pager({ index, pages }: { index: number; pages: ReactNode[] }) {
  return (
    <div className="relative overflow-x-clip">
      {pages.map((p, i) => {
        const active = i === index
        return (
          <m.div
            key={i}
            className={active ? 'relative' : 'absolute inset-x-0 top-0'}
            initial={false}
            animate={{ x: `${(index - i) * 100}%`, opacity: active ? 1 : 0 }}
            transition={{ x: springs.spatialDefault, opacity: springs.effectsDefault }}
            aria-hidden={!active}
            inert={!active}
            style={{ pointerEvents: active ? 'auto' : 'none' }}
          >
            {p}
          </m.div>
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
      onClick={() => {
        if (!checked) haptic('success')
        onChange(!checked)
      }}
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
