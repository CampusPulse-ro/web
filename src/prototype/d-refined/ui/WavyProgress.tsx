import { useId, useLayoutEffect, useRef, useState } from 'react'

/**
 * M3 Expressive's wavy linear progress indicator: the done part is a wave that keeps travelling
 * while the class is on (it means "live"); the rest is a flat track ending in a stop dot.
 * Under reduced motion the wave stands still.
 */
export function WavyProgress({
  value,
  label,
  valueText,
  color,
  track,
}: {
  value: number
  label: string
  valueText: string
  color: string
  track: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(0)
  const id = `cxw${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  const H = 14
  const amp = 3
  const len = 22
  const stroke = 4
  const gap = 6
  const v = Math.min(Math.max(value, 0), 1)
  const p = v * w
  let d = ''
  for (let x = -len; x <= p + len; x += 2) {
    const y = H / 2 + amp * Math.sin((2 * Math.PI * x) / len)
    d += `${d ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(2)}`
  }
  const trackStart = Math.min(p + gap, w)

  return (
    <div
      ref={ref}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      aria-valuetext={valueText}
      style={{ height: H }}
    >
      {w > 0 && (
        <svg
          width={w}
          height={H}
          aria-hidden="true"
          style={{ display: 'block', overflow: 'visible' }}
        >
          <defs>
            <clipPath id={id}>
              <rect
                x={-stroke}
                y={-stroke}
                width={Math.max(p, 0) + stroke / 2}
                height={H + 2 * stroke}
              />
            </clipPath>
          </defs>
          {trackStart < w - stroke && (
            <line
              x1={trackStart + stroke / 2}
              x2={w - stroke / 2}
              y1={H / 2}
              y2={H / 2}
              stroke={track}
              strokeWidth={stroke}
              strokeLinecap="round"
            />
          )}
          <circle cx={w - stroke / 2} cy={H / 2} r={stroke / 2} fill={color} />
          <g clipPath={`url(#${id})`}>
            <path
              className="cx-wave"
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              style={{ ['--cx-wave-length' as string]: `${len}px` }}
            />
          </g>
        </svg>
      )}
    </div>
  )
}
