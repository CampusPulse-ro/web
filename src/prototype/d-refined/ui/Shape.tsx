import { m } from 'motion/react'
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { useReducedMotionPref } from '../ctx'
import { springs } from '../motion'
import { loadingSequence, shapePath, type ShapeName } from '../shapes'

/**
 * The signature: a shape that morphs (and turns) when what it stands for changes. Each state of
 * the day has its own shape, so the badge reads at a glance even before its number does.
 */
export function ShapeBadge({
  shape,
  size,
  fill,
  turn = 72,
  className,
  style,
  children,
}: {
  shape: ShapeName
  size: number
  fill: string
  /** Degrees the outline turns on each morph. */
  turn?: number
  className?: string
  style?: CSSProperties
  children?: ReactNode
}) {
  const reduced = useReducedMotionPref()
  const [prev, setPrev] = useState(shape)
  const [rotation, setRotation] = useState(0)
  // Adjust-state-while-rendering: a new shape adds a turn, so the morph also rotates.
  if (prev !== shape) {
    setPrev(shape)
    setRotation((r) => r + turn)
  }
  return (
    <span
      className={`relative grid flex-none place-items-center ${className ?? ''}`}
      style={{ width: size, height: size, ...style }}
    >
      <m.svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        style={{ color: fill, overflow: 'visible' }}
        initial={false}
        animate={{ rotate: reduced ? 0 : rotation }}
        transition={springs.spatialSlow}
      >
        <m.path
          fill="currentColor"
          initial={false}
          animate={{ d: shapePath(shape) }}
          transition={reduced ? { duration: 0 } : springs.spatialDefault}
        />
      </m.svg>
      <span className="relative grid place-items-center">{children}</span>
    </span>
  )
}

/** A subject's identity: its colour and its own static shape, with the short name inside. */
export function SubjectAvatar({
  short,
  tone,
  shape,
  size = 40,
  past = false,
}: {
  short: string
  tone: string
  shape: ShapeName
  size?: number
  past?: boolean
}) {
  return (
    <span
      aria-hidden="true"
      className="relative grid flex-none place-items-center"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        <path
          d={shapePath(shape)}
          fill={
            past ? 'var(--md-sys-color-surface-container-highest)' : `var(--cx-${tone}-container)`
          }
        />
      </svg>
      <span
        className="t-narrow relative font-bold"
        style={{
          fontSize: short.length > 3 ? 11 : 12,
          lineHeight: '16px',
          letterSpacing: 0.3,
          color: past ? 'var(--md-sys-color-on-surface-variant)' : `var(--cx-${tone}-on-container)`,
        }}
      >
        {short}
      </span>
    </span>
  )
}

/**
 * M3 Expressive's loading indicator: the shape library cycling and turning. Used only for waits
 * the person started (pull to refresh); first loads get a skeleton instead.
 */
export function LoadingIndicator({ size = 48, label }: { size?: number; label: string }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setI((x) => x + 1), 650)
    return () => clearInterval(id)
  }, [])
  return (
    <span
      role="progressbar"
      aria-label={label}
      className="grid place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: 'var(--md-sys-color-primary-container)',
      }}
    >
      <ShapeBadge
        shape={loadingSequence[i % loadingSequence.length]}
        size={Math.round(size * 0.66)}
        fill="var(--md-sys-color-on-primary-container)"
        turn={140}
      />
    </span>
  )
}
