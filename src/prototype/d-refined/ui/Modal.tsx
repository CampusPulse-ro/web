import { AnimatePresence, m, useDragControls, type PanInfo } from 'motion/react'
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { springs } from '../motion'

type Variant = 'bottom' | 'side' | 'center'

/**
 * A modal surface on a native <dialog> (focus trap, Esc, an inert page and focus return come from
 * the platform). `bottom` is the M3 modal bottom sheet: a real drag handle, follows the finger,
 * flings closed, no Close button. `side` is the M3 modal side sheet for wide windows. `center` is
 * a basic dialog.
 */
export function Modal({
  open,
  onClose,
  label,
  variant,
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  variant: Variant
  children: ReactNode
}) {
  return (
    <AnimatePresence>
      {open && (
        <Surface key="modal" onClose={onClose} label={label} variant={variant}>
          {children}
        </Surface>
      )}
    </AnimatePresence>
  )
}

function Surface({
  onClose,
  label,
  variant,
  children,
}: {
  onClose: () => void
  label: string
  variant: Variant
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const drag = useDragControls()

  useLayoutEffect(() => {
    const d = ref.current
    if (!d) return
    if (!d.open) d.showModal()
    return () => d.close()
  }, [])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 700) onClose()
  }

  const panel =
    variant === 'bottom'
      ? {
          className: 'cx-sheet',
          initial: { y: '100%' },
          animate: { y: 0, transition: springs.spatialDefault },
          exit: { y: '100%', transition: springs.effectsDefault },
        }
      : variant === 'side'
        ? {
            className: 'cx-side-sheet',
            initial: { x: '105%' },
            animate: { x: 0, transition: springs.spatialDefault },
            exit: { x: '105%', transition: springs.effectsDefault },
          }
        : {
            className: 'cx-basic-dialog',
            initial: { opacity: 0, scale: 0.9, x: '-50%', y: '-50%' },
            animate: {
              opacity: 1,
              scale: 1,
              x: '-50%',
              y: '-50%',
              transition: springs.spatialFast,
            },
            exit: {
              opacity: 0,
              scale: 0.95,
              x: '-50%',
              y: '-50%',
              transition: springs.effectsFast,
            },
          }

  return (
    <dialog
      ref={ref}
      className="cx-dialog"
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <m.div
        className="cx-scrim"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        exit={{ opacity: 0 }}
        transition={springs.effectsDefault}
        onClick={onClose}
      />
      <m.div
        className={panel.className}
        tabIndex={-1}
        autoFocus
        style={{ outline: 'none' }}
        initial={panel.initial}
        animate={panel.animate}
        exit={panel.exit}
        {...(variant === 'bottom'
          ? {
              drag: 'y' as const,
              dragControls: drag,
              dragListener: false,
              dragConstraints: { top: 0, bottom: 0 },
              dragElastic: { top: 0.04, bottom: 0.8 },
              onDragEnd,
            }
          : {})}
      >
        {variant === 'bottom' && (
          <button
            type="button"
            className="cx-sheet-handle"
            aria-label="Close"
            onPointerDown={(e) => drag.start(e)}
            onClick={onClose}
          >
            <span />
          </button>
        )}
        {variant === 'bottom' ? (
          <SheetBody onHeaderPointerDown={(e) => drag.start(e)}>{children}</SheetBody>
        ) : (
          children
        )}
      </m.div>
    </dialog>
  )
}

/**
 * The sheet's scroll area. While its content fits, a drag anywhere in it moves the sheet; once it
 * scrolls, only the handle does, so scrolling still works.
 */
function SheetBody({
  children,
  onHeaderPointerDown,
}: {
  children: ReactNode
  onHeaderPointerDown: (e: React.PointerEvent) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [scrolls, setScrolls] = useState(false)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => setScrolls(el.scrollHeight > el.clientHeight + 1)
    const ro = new ResizeObserver(check)
    ro.observe(el)
    check()
    return () => ro.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className="cx-sheet-body"
      style={{ touchAction: scrolls ? 'pan-y' : 'none' }}
      onPointerDown={(e) => {
        if (!scrolls && e.pointerType !== 'mouse') onHeaderPointerDown(e)
      }}
    >
      {children}
    </div>
  )
}
