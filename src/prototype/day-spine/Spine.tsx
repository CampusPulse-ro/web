/**
 * The signature: one vertical line for the day. Classes sit on it as capsules sized by their length,
 * the part of the day already lived is filled, and the now-line glides down it minute by minute.
 */
import type { ReactNode, Ref } from 'react'
import { vars } from './css'
import { hhmm, livedPx, type Elapsed } from './model'
import { useNoGlideOnJump } from './state'

/** Layout of a spine row, in px from the left edge. */
export const GUTTER = 52
export const SPINE_X = 76
export const CAPSULE = 28
export const TEXT_X = 104
const PAD = 14

/** A plain capsule drawn by the spine itself (a room's busy windows). */
export interface Segment {
  key: string
  start: number
  end: number
  color: string
  /** Shifts an overlapping capsule sideways, px. */
  offset?: number
}

interface Props {
  range: [number, number]
  elapsed: Elapsed
  /** Times printed in the gutter (block edges). */
  labels: number[]
  /** Pixels per minute. */
  scale: number
  /** Changes when the day or the scenario changes, so the now-line jumps instead of gliding. */
  jumpKey: string
  segments?: Segment[]
  nowRef?: Ref<HTMLDivElement>
  children?: (y: (minute: number) => number) => ReactNode
}

export function Spine({
  range,
  elapsed,
  labels,
  scale,
  jumpKey,
  segments = [],
  nowRef,
  children,
}: Props) {
  const [start, end] = range
  const height = (end - start) * scale
  const y = (m: number) => PAD + (m - start) * scale
  const nowMinute = typeof elapsed === 'number' ? elapsed : null
  const showNow = nowMinute !== null && nowMinute >= start && nowMinute <= end
  const filled = livedPx(start, end, elapsed, scale)
  const root = useNoGlideOnJump<HTMLDivElement>(`${jumpKey}|${start}|${end}`, nowMinute ?? -1)
  const nearNow = (m: number) => showNow && Math.abs((m - nowMinute) * scale) < 16

  return (
    <div ref={root} className="relative" style={{ height: height + PAD * 2 }}>
      {/* gutter: the times at block edges */}
      <div aria-hidden className="absolute top-0 left-0" style={{ width: GUTTER - 8 }}>
        {labels.map((m) => (
          <span
            key={m}
            className="b-num absolute right-0 -translate-y-1/2 text-caption text-ink-muted transition-opacity"
            style={{ top: y(m), opacity: nearNow(m) ? 0 : 1 }}
          >
            {hhmm(m)}
          </span>
        ))}
      </div>

      {/* the line: thin ahead, filled behind */}
      <div aria-hidden className="b-track" style={{ left: SPINE_X, top: PAD, height }} />
      <div
        aria-hidden
        className="b-lived b-glide-h"
        style={{ left: SPINE_X, top: PAD, height: filled }}
      />

      {segments.map((s) => (
        <div
          key={s.key}
          aria-hidden
          className="b-capsule absolute"
          data-past={livedPx(s.start, s.end, elapsed, scale) >= (s.end - s.start) * scale}
          style={vars(
            { '--sub': s.color },
            {
              left: SPINE_X - CAPSULE / 2 + (s.offset ?? 0),
              width: CAPSULE,
              top: y(s.start) + 2,
              height: (s.end - s.start) * scale - 4,
            },
          )}
        >
          <div
            className="b-capsule-fill b-glide-h absolute inset-x-0 top-0"
            style={{ height: livedPx(s.start, s.end, elapsed, scale) }}
          />
        </div>
      ))}

      <div className="absolute inset-0 z-20">{children?.(y)}</div>

      {showNow ? (
        <div
          ref={nowRef}
          aria-hidden
          className="b-glide pointer-events-none absolute left-0 z-30"
          style={{ top: 0, width: SPINE_X + 24, transform: `translateY(${y(nowMinute)}px)` }}
        >
          <span
            className="b-now-pill b-num absolute -translate-y-1/2 px-1.5 py-0.5 text-caption"
            style={{ right: SPINE_X + 24 - GUTTER + 4 }}
          >
            {hhmm(nowMinute)}
          </span>
          <span
            className="absolute h-0.5 -translate-y-1/2 rounded-full"
            style={{
              left: SPINE_X - 22,
              width: 44,
              background: 'var(--b-live)',
              boxShadow: '0 0 0 1px var(--color-page)',
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
