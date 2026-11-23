/**
 * Phone: a bottom sheet that follows the finger and closes on a downward drag (no "Close" button,
 * like a native sheet; the grabber closes it from the keyboard). Desktop: a side panel with a close
 * button. Both trap focus, close on Esc (handled by the shell) and hand focus back on close.
 */
import { AnimatePresence, m, useDragControls, useReducedMotion } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { IconClose } from './ui'

function useDialogFocus(open: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const back = document.activeElement as HTMLElement | null
    ref.current?.focus({ preventScroll: true })
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !ref.current) return
      const items = ref.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input, [tabindex]:not([tabindex="-1"])',
      )
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (
        e.shiftKey &&
        (document.activeElement === first || document.activeElement === ref.current)
      ) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', trap)
    return () => {
      document.removeEventListener('keydown', trap)
      back?.focus?.({ preventScroll: true })
    }
  }, [open])
  return ref
}

interface OverlayProps {
  open: boolean
  onClose: () => void
  label: string
  children: ReactNode
}

export function Sheet({ open, onClose, label, children }: OverlayProps) {
  const controls = useDragControls()
  const reduced = useReducedMotion()
  const ref = useDialogFocus(open)
  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            key="scrim"
            className="dp-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <m.div
            key="sheet"
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            className="dp-sheet"
            initial={reduced ? { opacity: 0 } : { y: '100%' }}
            animate={reduced ? { opacity: 1 } : { y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: '100%' }}
            transition={{ type: 'spring', duration: 0.32, bounce: 0 }}
            drag={reduced ? false : 'y'}
            dragControls={controls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 1 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) onClose()
            }}
            onPointerDown={(e) => {
              // Drag from the grabber or the coloured header, so the body still scrolls.
              if ((e.target as HTMLElement).closest('[data-drag-handle], .dp-grabber'))
                controls.start(e)
            }}
          >
            <button
              type="button"
              className="dp-grabber"
              aria-label="Close"
              onClick={(e) => {
                // A tap on the grabber shouldn't close it (drag does); Enter or Space does.
                if (e.detail === 0) onClose()
              }}
            >
              <span />
            </button>
            <div className="dp-sheet-body">{children}</div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}

export function Panel({ open, onClose, label, children }: OverlayProps) {
  const ref = useDialogFocus(open)
  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div
            key="scrim"
            className="dp-scrim dp-scrim-light"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <m.div
            key="panel"
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            tabIndex={-1}
            className="dp-panel"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <button type="button" className="dp-panel-close" aria-label="Close" onClick={onClose}>
              <IconClose />
            </button>
            <div className="dp-panel-body">{children}</div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}
