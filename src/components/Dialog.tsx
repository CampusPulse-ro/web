import { useEffect, useId, useRef, type ReactNode } from 'react'

export interface DialogProps {
  open: boolean
  /** Escape, a click outside, or a Cancel button: the parent sets `open` to false. */
  onClose: () => void
  title: ReactNode
  /** A line under the title. */
  description?: ReactNode
  children?: ReactNode
  /** Blocks closing (Escape, outside clicks) while something is being saved. */
  busy?: boolean
}

/**
 * A modal dialog (Dialog, variant confirm) on the native `<dialog>`: the browser traps focus,
 * closes it on Escape and puts focus back where it was. The element marked `data-autofocus`
 * gets focus when it opens (else the first control).
 */
export function Dialog({ open, onClose, title, description, children, busy = false }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  // Only a click that also started outside the panel closes it (not a text selection dragged out).
  const pressedOutside = useRef(false)
  // Where focus was when it opened. The browser puts it back on close, but not when the focused
  // control inside was removed first (the panel unmounts with `open`), so this does it then.
  const opener = useRef<HTMLElement | null>(null)
  // The latest `open` and `onClose`, for the native close event below.
  const latest = useRef({ open, onClose })
  useEffect(() => {
    latest.current = { open, onClose }
  })
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
      const first =
        dialog.querySelector<HTMLElement>('[data-autofocus]') ??
        dialog.querySelector<HTMLElement>('input, textarea, select, button')
      first?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
      const back = opener.current
      opener.current = null
      if (
        back?.isConnected &&
        (document.activeElement === document.body || !document.activeElement)
      ) {
        back.focus()
      }
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault() // the parent closes it, so `open` stays the truth
        if (!busy) onClose()
      }}
      onClose={() => {
        // The browser closed it on its own (a second Escape while `busy` can't be stopped):
        // let the parent know, so `open` and the dialog agree again.
        if (latest.current.open) latest.current.onClose()
      }}
      onMouseDown={(event) => {
        // The dialog element itself is the margin around the panel (and the backdrop).
        pressedOutside.current = event.target === event.currentTarget
      }}
      onClick={(event) => {
        if (pressedOutside.current && event.target === event.currentTarget && !busy) onClose()
      }}
      className="m-auto w-full max-w-md bg-transparent p-4 text-ink backdrop:bg-page/80"
    >
      {open && (
        <div className="flex flex-col gap-5 rounded-lg border border-line bg-raised p-6">
          <div className="flex flex-col gap-1.5">
            <h2 id={titleId} className="m-0 text-heading text-ink">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="m-0 text-body-small text-ink-soft">
                {description}
              </p>
            )}
          </div>
          {children}
        </div>
      )}
    </dialog>
  )
}
