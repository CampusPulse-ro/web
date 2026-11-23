import type { CSSProperties } from 'react'

/** Custom properties for a `style` prop: `style={vars({ '--sub': color })}`. */
export function vars(v: Record<string, string | number>, extra?: CSSProperties): CSSProperties {
  return { ...(v as CSSProperties), ...extra }
}
