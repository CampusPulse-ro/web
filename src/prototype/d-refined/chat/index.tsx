/**
 * The CampusPulse agent chat (prototype only): a launcher and, once opened, the chat panel (loaded
 * on demand). It exists only where the agent's backend answers `/api/health`, which is the
 * examiner page on the Pi; on the public previews nothing renders.
 */
import { AnimatePresence, m } from 'motion/react'
import { lazy, Suspense, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useWindowClass } from '../ctx'
import { Icon } from '../icons'
import { springs } from '../motion'
import { useChatHealth } from './health'
// Read `?chat=coach` now, while the URL still has it (the prototype's links drop it).
import './mode'

const ChatPanel = lazy(() => import('./ChatPanel'))

export function ChatHost() {
  const health = useChatHealth()
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const launcher = useRef<HTMLButtonElement>(null)
  const { compact } = useWindowClass()
  const { pathname } = useLocation()
  if (!health) return null

  // Clear of the demo-time note (bottom-left on the phone, bottom-right on wide windows), the
  // phone's navigation bar and the Deadlines "Add" button.
  const detail = /\/(deadlines|courses)\/[^/]+$|\/profile$|\/sign-in$/.test(pathname)
  const bottom = compact ? (detail ? 16 : pathname.endsWith('/deadlines') ? 168 : 96) : 68
  const pos = compact
    ? { right: 16, bottom: `calc(${bottom}px + env(safe-area-inset-bottom))` }
    : { right: 20, bottom }

  return (
    <>
      <AnimatePresence>
        {!open && (
          <m.button
            ref={launcher}
            key="launcher"
            type="button"
            className="cx-fab cx-state"
            style={{
              ...pos,
              zIndex: 50,
              ...(compact ? { width: 56, padding: 0, justifyContent: 'center' } : {}),
            }}
            aria-label="Ask the CampusPulse agent about this screen"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8, transition: springs.effectsFast }}
            transition={springs.spatialFast}
            onClick={() => {
              setLoaded(true)
              setOpen(true)
            }}
          >
            <Icon name="forum" />
            {!compact && 'Ask'}
          </m.button>
        )}
      </AnimatePresence>
      {loaded && (
        <Suspense fallback={null}>
          <ChatPanel
            open={open}
            health={health}
            onClose={() => {
              setOpen(false)
              window.setTimeout(() => launcher.current?.focus({ preventScroll: true }), 250)
            }}
          />
        </Suspense>
      )}
    </>
  )
}
