/**
 * This browser's earlier chats with the agent. A view that fills the panel (phone, and the
 * collapsed panel on wide windows), or a popover under the history button (expanded panel).
 * Picking a row loads that chat into the panel and resumes it; Escape or Back changes nothing.
 */
import { m } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '../icons'
import { springs } from '../motion'
import { ChatHttpError, listSessions, type SessionSummary } from './api'

const WHEN = new Intl.DateTimeFormat('ro-RO', {
  timeZone: 'Europe/Bucharest',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function when(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : WHEN.format(d)
}

function BackIcon() {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  )
}

type State =
  { kind: 'loading' } | { kind: 'failed' } | { kind: 'ready'; sessions: SessionSummary[] }

export function History({
  currentId,
  onPick,
  onBack,
  popover,
}: {
  currentId: string | null
  /** Loads the chat into the panel; rejects when it can't. */
  onPick: (id: string) => Promise<void>
  onBack: () => void
  popover: boolean
}) {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [opening, setOpening] = useState<string | null>(null)
  const [pickError, setPickError] = useState<string | null>(null)
  const first = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const ctl = new AbortController()
    listSessions(ctl.signal)
      .then((sessions) => setState({ kind: 'ready', sessions }))
      .catch(() => {
        if (!ctl.signal.aborted) setState({ kind: 'failed' })
      })
    return () => ctl.abort()
  }, [attempt])

  // Focus lands inside the list when it opens, so Escape and the arrow-free tab order work.
  useEffect(() => {
    first.current?.focus({ preventScroll: true })
  }, [])

  const pick = async (id: string) => {
    if (opening) return
    setOpening(id)
    setPickError(null)
    try {
      await onPick(id)
    } catch (e) {
      setPickError(
        e instanceof ChatHttpError && e.code === 'unknown_session'
          ? 'That chat is no longer available.'
          : 'Couldn’t open that chat. Try again.',
      )
      setOpening(null)
    }
  }

  const list = (
    <>
      {pickError && (
        <div className="cx-chat-error t-body-m mx-4 mb-2" role="alert">
          <Icon name="error" size={20} />
          <span>{pickError}</span>
        </div>
      )}
      {state.kind === 'loading' && (
        <div className="flex flex-col gap-2 px-4 pb-4" aria-busy="true" aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <div key={i} className="cx-skel h-[64px] w-full" style={{ borderRadius: 16 }} />
          ))}
        </div>
      )}
      {state.kind === 'failed' && (
        <div className="flex flex-col items-start gap-3 px-5 pb-4">
          <p className="t-body-m c-muted">Couldn’t load the earlier chats.</p>
          <button
            type="button"
            className="cx-btn cx-btn--tonal cx-state"
            onClick={() => {
              setState({ kind: 'loading' })
              setAttempt((a) => a + 1)
            }}
          >
            Try again
          </button>
        </div>
      )}
      {state.kind === 'ready' && state.sessions.length === 0 && (
        <p className="t-body-m c-muted px-5 pb-5">No earlier chats yet.</p>
      )}
      {state.kind === 'ready' && state.sessions.length > 0 && (
        <ul className="flex flex-col gap-0.5 px-3 pb-3">
          {state.sessions.map((s, i) => {
            const current = s.id === currentId
            const busy = opening === s.id
            const n = s.turns === 1 ? '1 question' : `${s.turns} questions`
            return (
              <m.li
                key={s.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springs.spatialFast, delay: Math.min(i, 8) * 0.02 }}
              >
                <button
                  type="button"
                  className={`cx-chat-hrow cx-state ${current ? 'cx-chat-hrow--current' : ''}`}
                  aria-current={current ? 'true' : undefined}
                  aria-busy={busy}
                  disabled={!!opening && !busy}
                  onClick={() => void pick(s.id)}
                >
                  <span className="t-body-m line-clamp-2 text-left">
                    {s.firstQuestion || 'Untitled chat'}
                  </span>
                  <span className="t-label-m c-muted flex items-center gap-1.5">
                    {current && (
                      <span className="cx-chip cx-chip--small cx-chip--selected">Current</span>
                    )}
                    <span>{when(s.createdAt)}</span>
                    {s.turns > 0 && <span aria-hidden="true">·</span>}
                    {s.turns > 0 && <span>{n}</span>}
                    {busy && (
                      <span className="cx-chat-dots ml-1" aria-label="Opening">
                        <span />
                        <span />
                        <span />
                      </span>
                    )}
                  </span>
                </button>
              </m.li>
            )
          })}
        </ul>
      )}
    </>
  )

  if (popover)
    return (
      <>
        {/* a click anywhere else closes the popover */}
        <div className="fixed inset-0" style={{ zIndex: 9 }} aria-hidden="true" onClick={onBack} />
        <m.div
          role="dialog"
          aria-label="Chat history"
          className="cx-chat-pop absolute top-full right-0 mt-2 flex flex-col"
          style={{ zIndex: 10, transformOrigin: 'top right' }}
          initial={{ opacity: 0, scale: 0.92, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={springs.spatialFast}
        >
          <p
            ref={(el) => {
              first.current = el
            }}
            tabIndex={-1}
            className="t-title-s px-5 pt-4 pb-2 outline-none"
          >
            Chat history
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto">{list}</div>
        </m.div>
      </>
    )

  return (
    <m.div
      className="relative flex min-h-0 flex-1 flex-col"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={springs.spatialDefault}
    >
      <div className="flex items-center gap-1 pt-3 pr-5 pb-2 pl-2">
        <button
          ref={(el) => {
            first.current = el
          }}
          type="button"
          className="cx-icon-btn cx-state"
          aria-label="Back to the chat"
          title="Back"
          onClick={onBack}
        >
          <BackIcon />
        </button>
        <p className="t-title-m flex-1 px-1">Chat history</p>
      </div>
      <div className="cx-chat-log min-h-0 flex-1 overflow-y-auto pt-1">{list}</div>
    </m.div>
  )
}
