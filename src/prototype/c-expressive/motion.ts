/**
 * M3 Expressive motion: springs, not durations. Damping ratio ζ and stiffness k from the M3 spec,
 * turned into Motion's absolute damping (c = 2ζ√k, mass 1). The same curves exist as CSS linear()
 * easings in theme.css for CSS transitions.
 *
 * Spatial springs move things (position, size, shape) and may overshoot a little; effects springs
 * change colour and opacity and never overshoot.
 */
import type { Transition } from 'motion/react'

function spring(dampingRatio: number, stiffness: number): Transition {
  return { type: 'spring', stiffness, damping: 2 * dampingRatio * Math.sqrt(stiffness), mass: 1 }
}

export const springs = {
  spatialFast: spring(0.6, 800),
  spatialDefault: spring(0.8, 380),
  spatialSlow: spring(0.8, 200),
  effectsFast: spring(1, 3800),
  effectsDefault: spring(1, 1600),
  effectsSlow: spring(1, 800),
} as const

/** For things that only fade (reduced motion turns movement into this). */
export const fade: Transition = { duration: 0.15, ease: [0.2, 0, 0, 1] }

/** The same springs as WAAPI/CSS easing strings (for NumberFlow, which animates with WAAPI). */
export const easing = {
  spatialDefault:
    'linear(0, 0.05, 0.16, 0.296, 0.435, 0.565, 0.681, 0.774, 0.848, 0.904, 0.945, 0.974, 0.993, 1.005, 1.011, 1.014, 1.014, 1.013, 1.012, 1.01, 1.008, 1.006, 1.004, 1.003, 1)',
} as const
