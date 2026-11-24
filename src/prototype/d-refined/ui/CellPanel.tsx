import { m } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cellKind, cellVars } from '../cells'
import { APP_ID, useProto, useReducedMotionPref } from '../ctx'
import { Icon } from '../icons'
import { phaseOf, shortOf, type Cls } from '../model'
import { springs } from '../motion'
import { CellHeaderText, CellText } from './Cell'
import { ClassDetail } from './ClassBits'

interface Box {
  left: number
  top: number
  width: number
  height: number
}

const boxOf = (el: Element | null): Box | null => {
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { left: r.left, top: r.top, width: r.width, height: r.height }
}
const cellBox = (lid: string) => boxOf(document.querySelector(`[data-cell="${lid}"]`))
const style = (b: Box, radius: number) => ({ ...b, borderRadius: radius })

const CELL_PAD = '6px 8px 6px 11px'
const HEAD_PAD = '16px 18px 16px 22px'

/**
 * A calendar cell opening into the class panel (wide windows). The cell itself flies: one moving
 * element carries the cell's fill, edge and text from its place in the grid to the panel's header,
 * its small text crossfading into the header's larger text as it grows. The panel's surface opens
 * downwards from the header, and the rest of the panel fades in once the header has landed.
 * Closing runs the same flight backwards, and the cell reappears only where the flight lands, so
 * nothing pops into place early. Reduced motion: no flight, the panel just appears.
 */
export function CellPanel({
  c,
  lid,
  open,
  onClose,
  onDone,
}: {
  c: Cls
  lid: string
  /** False starts the flight back; `onDone` runs when it lands. */
  open: boolean
  onClose: () => void
  onDone: () => void
}) {
  const { now, looks, cellStyle } = useProto()
  const reduced = useReducedMotionPref()
  const panel = useRef<HTMLDivElement>(null)
  const slot = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'opening' | 'open' | 'closing' | 'gone'>(
    reduced ? 'open' : 'opening',
  )
  const [cell, setCell] = useState<Box | null>(() => cellBox(lid))
  const [head, setHead] = useState<Box | null>(null)
  const [frame, setFrame] = useState<Box | null>(null)
  const closeRef = useRef(onClose)
  const doneRef = useRef(onDone)
  useEffect(() => {
    closeRef.current = onClose
    doneRef.current = onDone
  })

  useLayoutEffect(() => {
    setHead(boxOf(slot.current))
    setFrame(boxOf(panel.current))
  }, [])

  // Esc closes, the page behind is inert, focus goes into the panel
  useEffect(() => {
    panel.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        closeRef.current()
      }
    }
    window.addEventListener('keydown', onKey)
    const app = document.getElementById(APP_ID)
    app?.setAttribute('inert', '')
    return () => {
      window.removeEventListener('keydown', onKey)
      app?.removeAttribute('inert')
    }
  }, [])

  // Closing: fly back to wherever the cell is now (or just finish if it's gone)
  const [wasOpen, setWasOpen] = useState(open)
  if (wasOpen !== open) {
    setWasOpen(open)
    if (!open) {
      const to = cellBox(lid)
      if (to && head && !reduced) {
        setCell(to)
        setPhase('closing')
      } else setPhase('gone')
    }
  }
  useEffect(() => {
    if (phase === 'gone') doneRef.current()
  }, [phase])

  const look = looks.get(shortOf(c.o))
  const vars = cellVars(look?.tone ?? 's1', phaseOf(c, now.date, now.minutes) === 'past')
  const closing = phase === 'closing' || phase === 'gone'
  const flying = (phase === 'opening' || phase === 'closing') && cell && head
  const headClip =
    head && frame
      ? `inset(${head.top - frame.top}px ${frame.left + frame.width - head.left - head.width}px ${
          frame.top + frame.height - head.top - head.height
        }px ${head.left - frame.left}px round 20px)`
      : 'inset(0px 0px 100% 0px round 20px)'

  return (
    <div data-cx-panel="">
      <m.div
        aria-hidden="true"
        className="fixed inset-0 z-50"
        style={{ background: 'var(--md-sys-color-scrim)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: closing ? 0 : 0.45 }}
        transition={springs.effectsDefault}
        onClick={onClose}
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={c.o.subject}
        tabIndex={-1}
        className="fixed top-4 right-4 bottom-4 z-50 flex flex-col outline-none"
        style={{ width: 'min(440px, calc(100vw - 32px))' }}
      >
        {head && frame && (
          <m.div
            className="absolute inset-0"
            style={{ background: 'var(--md-sys-color-surface-container-low)', borderRadius: 28 }}
            initial={{ clipPath: reduced ? 'inset(0px 0px 0px 0px round 28px)' : headClip }}
            animate={{ clipPath: closing ? headClip : 'inset(0px 0px 0px 0px round 28px)' }}
            transition={springs.spatialDefault}
          />
        )}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <m.div
            className="flex items-center gap-2 px-4 pt-3 pb-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'open' ? 1 : 0 }}
            transition={springs.effectsDefault}
          >
            <span className="t-title-l flex-1 px-2">Class</span>
            <button
              type="button"
              className="cx-icon-btn cx-state"
              aria-label="Close"
              onClick={onClose}
            >
              <Icon name="close" />
            </button>
          </m.div>
          {/* the header: the cell, grown up; hidden while the flying copy is in the air */}
          <div
            ref={slot}
            data-kind={cellKind(c)}
            data-style={cellStyle}
            className="cx-blk relative mx-4 flex flex-col overflow-hidden"
            style={{
              ...vars,
              borderRadius: 20,
              padding: HEAD_PAD,
              color: 'var(--b-ink)',
              visibility: phase === 'open' ? 'visible' : 'hidden',
            }}
          >
            <CellHeaderText c={c} />
          </div>
          <m.div
            className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase === 'open' ? 1 : 0 }}
            transition={phase === 'open' ? springs.effectsDefault : { duration: 0.08 }}
          >
            <ClassDetail c={c} headless />
          </m.div>
        </div>
      </div>

      {flying && (
        <m.div
          aria-hidden="true"
          data-kind={cellKind(c)}
          data-style={cellStyle}
          className="cx-blk fixed z-[60] overflow-hidden"
          style={vars}
          initial={closing ? style(head, 20) : style(cell, 12)}
          animate={closing ? style(cell, 12) : style(head, 20)}
          transition={springs.spatialDefault}
          onAnimationComplete={() => (closing ? doneRef.current() : setPhase('open'))}
        >
          {/* the cell's own text, travelling with it, crossfading with the header's */}
          <m.span
            className="absolute inset-0 flex flex-col"
            style={{ padding: CELL_PAD, color: 'var(--b-ink)' }}
            initial={{ opacity: closing ? 0 : 1 }}
            animate={{ opacity: closing ? 1 : 0 }}
            transition={closing ? { duration: 0.2, delay: 0.14 } : { duration: 0.14 }}
          >
            <CellText c={c} compact={false} height={cell.height} />
          </m.span>
          <m.span
            className="absolute top-0 left-0 flex flex-col"
            style={{ width: head.width, padding: HEAD_PAD, color: 'var(--b-ink)' }}
            initial={{ opacity: closing ? 1 : 0 }}
            animate={{ opacity: closing ? 0 : 1 }}
            transition={closing ? { duration: 0.12 } : { duration: 0.2, delay: 0.12 }}
          >
            <CellHeaderText c={c} />
          </m.span>
        </m.div>
      )}
    </div>
  )
}
