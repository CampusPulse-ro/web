/** Small shared pieces: a segmented control, a switch and a live region. */
import type { ReactNode } from 'react'
import { m } from 'motion/react'

export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  id,
}: {
  label: string
  value: T
  options: { value: T; label: string; disabled?: boolean }[]
  onChange: (v: T) => void
  id: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full bg-sunken p-1">
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={`relative min-h-12 flex-1 rounded-full px-3 text-label transition-colors disabled:opacity-40 ${
              on ? 'text-ink' : 'text-ink-muted hover:text-ink-soft'
            }`}
          >
            {on ? (
              <m.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-raised"
                transition={{ type: 'spring', duration: 0.3, bounce: 0.15 }}
              />
            ) : null}
            <span className="relative">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
  about,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  about?: ReactNode
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex min-h-12 w-full items-center gap-4 py-2 text-left"
    >
      <span className="flex flex-1 flex-col">
        <span className="text-body text-ink">{label}</span>
        {about ? <span className="text-caption text-ink-muted">{about}</span> : null}
      </span>
      <span
        aria-hidden
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-accent' : 'bg-line-strong'
        }`}
      >
        <span
          className={`absolute top-1 left-1 size-5 rounded-full bg-ink transition-transform duration-150 ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </button>
  )
}

/** A visually hidden live region. */
export function LiveText({ text }: { text: string }) {
  return (
    <p aria-live="polite" className="sr-only">
      {text}
    </p>
  )
}
