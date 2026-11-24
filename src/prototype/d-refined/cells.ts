/**
 * How a calendar cell looks: its subject's colours as CSS variables, and its kind group. A course
 * is one treatment; a lab or a seminar (the subject's "activity" part) is the other.
 */
import type { CSSProperties } from 'react'
import { classKind, type Cls } from './model'

export type CellStyle = 'edge' | 'raised'
export type CellKind = 'course' | 'activity'

export const cellKind = (c: Cls): CellKind => (classKind(c) === 'course' ? 'course' : 'activity')

/** The cell's fill, tint, edge and ink for its subject (or neutral once the class is over). */
export function cellVars(tone: string, past: boolean): CSSProperties {
  return (
    past
      ? {
          '--b-fill': 'var(--md-sys-color-surface-container-high)',
          '--b-tint': 'var(--md-sys-color-surface-container)',
          '--b-line': 'var(--md-sys-color-outline)',
          '--b-edge': 'var(--md-sys-color-outline-variant)',
          '--b-sheen': 'transparent',
          '--b-ink': 'var(--md-sys-color-on-surface-variant)',
        }
      : {
          '--b-fill': `var(--cx-${tone}-container)`,
          '--b-tint': `color-mix(in srgb, var(--cx-${tone}-container) 42%, var(--md-sys-color-surface))`,
          '--b-line': `var(--cx-${tone}-color)`,
          '--b-edge': `color-mix(in srgb, var(--cx-${tone}-color) 50%, transparent)`,
          '--b-sheen': `color-mix(in srgb, var(--cx-${tone}-on-container) 10%, transparent)`,
          '--b-ink': `var(--cx-${tone}-on-container)`,
        }
  ) as CSSProperties
}
