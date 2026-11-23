import { m } from 'motion/react'
import { useState, type ReactNode } from 'react'
import { useReducedMotionPref } from '../ctx'
import { springs } from '../motion'
import { takeOrigin } from './origin'

/**
 * M3's container transform for list → detail on the phone: the tapped row's rectangle grows into
 * the detail screen while the detail's content fades in. The row's rect is remembered on tap
 * (`rememberOrigin` in origin.ts) and the next detail screen consumes it once.
 */
export function ContainerTransform({ children }: { children: ReactNode }) {
  const [rect] = useState(takeOrigin)
  const reduced = useReducedMotionPref()
  if (!rect || reduced) return <>{children}</>
  const vw = window.innerWidth
  const vh = window.innerHeight
  const from = `inset(${rect.top}px ${vw - rect.right}px ${vh - rect.bottom}px ${rect.left}px round 20px)`
  return (
    <m.div
      initial={{ clipPath: from, backgroundColor: 'var(--md-sys-color-surface-container)' }}
      animate={{
        clipPath: 'inset(0px 0px 0px 0px round 0px)',
        backgroundColor: 'var(--md-sys-color-surface)',
      }}
      transition={{ clipPath: springs.spatialDefault, backgroundColor: springs.effectsSlow }}
    >
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...springs.effectsDefault, delay: 0.07 }}
      >
        {children}
      </m.div>
    </m.div>
  )
}
