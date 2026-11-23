import { AnimatePresence, m, useDragControls, type PanInfo } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'
import { APP_ID, themeColor } from '../ctx'
import { Icon } from '../icons'
import { springs } from '../motion'

/**
 * The class (or deadline) detail surface.
 * - Phone: a bottom sheet. It rises on a spring, follows the finger from its handle and top, flings
 *   closed, and has no Close button. Its background runs past the bottom edge, so the spring's small
 *   overshoot never shows a gap.
 * - Wide: a side panel. With `layoutId` it grows out of the calendar block that opened it (the block's
 *   own fill moves into place and settles into the panel colour, then the content fades in);
 *   without one it slides in from the right.
 * Esc and the scrim close it, the page behind is inert while it's open, and reduced motion turns
 * every movement into a fade.
 */
export function Panel({
  open,
  onClose,
  label,
  wide,
  layoutId,
  fromColor,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  wide: boolean
  layoutId?: string
  /** The colour the morph starts from (the block's fill). */
  fromColor?: string
  /** Wide panels show it beside the Close button. */
  title?: string
  children: ReactNode
}) {
  return (
    <AnimatePresence>
      {open && (
        <Surface
          key="panel"
          onClose={onClose}
          label={label}
          wide={wide}
          layoutId={layoutId}
          fromColor={fromColor}
          title={title}
        >
          {children}
        </Surface>
      )}
    </AnimatePresence>
  )
}

function Surface({
  onClose,
  label,
  wide,
  layoutId,
  fromColor,
  title,
  children,
}: {
  onClose: () => void
  label: string
  wide: boolean
  layoutId?: string
  fromColor?: string
  title?: string
  children: ReactNode
}) {
  const content = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  const drag = useDragControls()
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    content.current?.focus({ preventScroll: true })
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

  const panelColor = themeColor('--md-sys-color-surface-container-low')
  const morph = wide && !!layoutId

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) onClose()
  }

  return (
    <div data-cx-panel="">
      <m.div
        aria-hidden="true"
        className="fixed inset-0 z-50"
        style={{ background: 'var(--md-sys-color-scrim)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.45 }}
        exit={{ opacity: 0 }}
        transition={springs.effectsDefault}
        onClick={onClose}
      />
      {wide ? (
        <m.div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="fixed top-4 right-4 bottom-4 z-50 flex flex-col"
          style={{ width: 'min(440px, calc(100vw - 32px))' }}
          initial={morph ? { opacity: 1 } : { x: '110%' }}
          animate={morph ? { opacity: 1 } : { x: 0 }}
          exit={
            morph
              ? { opacity: 0, transition: { duration: 0.18 } }
              : { x: '110%', transition: springs.effectsDefault }
          }
          transition={springs.spatialDefault}
        >
          <m.div
            layoutId={morph ? layoutId : undefined}
            className="absolute inset-0"
            style={{ borderRadius: 28 }}
            initial={morph && fromColor ? { backgroundColor: fromColor } : false}
            animate={{ backgroundColor: panelColor }}
            transition={{
              layout: springs.spatialDefault,
              // the block's colour rides along while it moves, then settles into the panel's
              backgroundColor: { duration: 0.32, delay: 0.22, ease: [0.2, 0, 0, 1] },
            }}
          />
          <m.div
            className="relative flex min-h-0 flex-1 flex-col"
            initial={morph ? { opacity: 0 } : false}
            animate={{
              opacity: 1,
              transition: { ...springs.effectsDefault, delay: morph ? 0.12 : 0 },
            }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
          >
            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
              <span className="t-title-l flex-1 px-2">{title}</span>
              <button
                type="button"
                className="cx-icon-btn cx-state"
                aria-label="Close"
                onClick={onClose}
              >
                <Icon name="close" />
              </button>
            </div>
            <div
              ref={content}
              tabIndex={-1}
              className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 outline-none"
            >
              {children}
            </div>
          </m.div>
        </m.div>
      ) : (
        <m.div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="fixed inset-x-0 z-50 flex flex-col"
          style={{ bottom: -48, paddingBottom: 48, maxHeight: 'calc(92dvh + 48px)' }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%', transition: springs.effectsDefault }}
          transition={springs.spatialDefault}
          drag="y"
          dragControls={drag}
          dragListener={false}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.04, bottom: 0.9 }}
          onDragEnd={onDragEnd}
        >
          <div
            className="absolute inset-0"
            style={{
              background: 'var(--md-sys-color-surface-container-low)',
              borderRadius: '28px 28px 0 0',
            }}
          />
          <div
            className="relative grid flex-none cursor-grab touch-none place-items-center select-none"
            style={{ height: 40 }}
            onPointerDown={(e) => {
              // no text selection while the sheet is dragged by mouse
              e.preventDefault()
              drag.start(e)
            }}
          >
            <button
              type="button"
              className="grid h-10 w-24 place-items-center"
              aria-label="Close"
              onClick={onClose}
            >
              <span
                className="block h-1 w-8 rounded-full"
                style={{ background: 'var(--md-sys-color-on-surface-variant)' }}
              />
            </button>
          </div>
          <div
            ref={content}
            tabIndex={-1}
            className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-6 outline-none"
            style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}
          >
            {children}
          </div>
        </m.div>
      )}
    </div>
  )
}
