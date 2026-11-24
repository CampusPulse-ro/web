/**
 * The agent chat. Wide windows: a floating panel on the right that leaves the page usable (and
 * steps left of an open class panel when there is room), above the demo-time note's corner. Phone:
 * a full-height sheet that follows the finger from its handle, like D's sheets. Answers stream in.
 * The conversation lives here and survives closing the panel; "New chat" starts over.
 */
import './chat.css'
import { AnimatePresence, m, useDragControls, type PanInfo } from 'motion/react'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import { useLocation } from 'react-router-dom'
import { useProto, useWindowClass } from '../ctx'
import { Icon } from '../icons'
import { findClass } from '../model'
import { springs } from '../motion'
import { Segmented } from '../ui/Controls'
import { ShapeBadge } from '../ui/Shape'
import { ChatHttpError, streamChat } from './api'
import { useWhere, type ChatContext } from './context'
import type { ChatHealth } from './health'
import { Markdown } from './markdown'
import { launchMode, saveMode, type ChatMode } from './mode'
import { suggestionsFor } from './suggestions'

interface Msg {
  id: number
  role: 'user' | 'assistant' | 'notice'
  text: string
  /** user: the screen it was asked on */
  where?: string
  status?: 'streaming' | 'done' | 'error'
  /** what the agent is reading right now */
  tool?: string
  error?: string
}

const TOOL_VERB: Record<string, string> = {
  Read: 'Reading',
  Grep: 'Searching for',
  Glob: 'Looking for files',
}

function toolLine(tool: string, detail: string): string {
  return `${TOOL_VERB[tool] ?? tool}${detail ? ` ${detail}` : ''}`
}

function errorText(e: unknown, max: number): string {
  if (e instanceof ChatHttpError) {
    switch (e.code) {
      case 'busy':
        return 'Still answering the previous question. Wait for it to finish.'
      case 'rate_limited':
        return `Too many questions in a short time. Try again in ${e.retryAfter ?? 'a few'} seconds.`
      case 'too_long':
        return `That message is too long (at most ${max} characters).`
      default:
        return e.message || 'The assistant is unavailable right now.'
    }
  }
  return 'Couldn’t reach the assistant. Check the connection and try again.'
}

export default function ChatPanel({
  open,
  onClose,
  health,
}: {
  open: boolean
  onClose: () => void
  health: ChatHealth
}) {
  const { compact, expanded } = useWindowClass()
  const { data } = useProto()
  const { search } = useLocation()
  const where = useWhere()
  const whereRef = useRef(where)
  useEffect(() => {
    whereRef.current = where
  })
  const coachAvailable = launchMode.unlocked && health.modes.includes('coach')
  const [mode, setMode] = useState<ChatMode>(coachAvailable ? launchMode.mode : 'examiner')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState('')
  const session = useRef<string | null>(null)
  const epoch = useRef(0)
  const abort = useRef<AbortController | null>(null)
  const nextId = useRef(1)
  const input = useRef<HTMLTextAreaElement>(null)
  const log = useRef<HTMLDivElement>(null)
  const pinned = useRef(true)
  const drag = useDragControls()

  // Focus the question box when the panel opens.
  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => input.current?.focus({ preventScroll: true }), 60)
    return () => window.clearTimeout(t)
  }, [open])

  // Keep the newest text in view while the reader is at the bottom.
  useLayoutEffect(() => {
    const el = log.current
    if (el && pinned.current) el.scrollTop = el.scrollHeight
  }, [msgs, open])

  // Grow the question box with its text, up to its max height.
  useLayoutEffect(() => {
    const el = input.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [draft, open])

  const newChat = () => {
    epoch.current++
    abort.current?.abort()
    abort.current = null
    session.current = null
    setMsgs([])
    setBusy(false)
    pinned.current = true
    input.current?.focus({ preventScroll: true })
  }

  const switchMode = (next: ChatMode) => {
    if (next === mode) return
    setMode(next)
    saveMode(next)
    newChat()
  }

  const send = async (raw: string) => {
    const text = raw.trim()
    if (!text || busy) return
    if (text.length > health.maxMessageChars) {
      setMsgs((ms) => [
        ...ms,
        {
          id: nextId.current++,
          role: 'notice',
          text: `That message is too long (at most ${health.maxMessageChars} characters).`,
        },
      ])
      return
    }
    const mine = epoch.current
    const w = whereRef.current
    const context: ChatContext = {
      ...w.context,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        layout: compact ? 'phone' : 'web',
      },
    }
    const aid = nextId.current + 1
    nextId.current += 2
    setMsgs((ms) => [
      ...ms,
      { id: aid - 1, role: 'user', text, where: w.label },
      { id: aid, role: 'assistant', text: '', status: 'streaming' },
    ])
    setDraft('')
    setBusy(true)
    pinned.current = true
    const patch = (p: (msg: Msg) => Partial<Msg>) => {
      if (epoch.current !== mine) return
      setMsgs((ms) => ms.map((x) => (x.id === aid ? { ...x, ...p(x) } : x)))
    }
    const ctl = new AbortController()
    abort.current = ctl

    const run = async (sid: string | null, retried: boolean): Promise<void> => {
      let ended = false
      try {
        await streamChat(
          { mode, sessionId: sid, message: text, context },
          (ev) => {
            if (epoch.current !== mine) return
            switch (ev.type) {
              case 'start':
                if (ev.sessionId) session.current = ev.sessionId
                break
              case 'delta':
                patch((x) => ({ text: x.text + ev.text, tool: undefined }))
                break
              case 'tool':
                patch(() => ({ tool: toolLine(ev.tool, ev.detail) }))
                break
              case 'done':
                ended = true
                if (ev.sessionId) session.current = ev.sessionId
                patch(() => ({ status: 'done', tool: undefined }))
                break
              case 'error':
                ended = true
                patch(() => ({
                  status: 'error',
                  tool: undefined,
                  error: ev.message || 'The assistant stopped with an error.',
                }))
                break
            }
          },
          ctl.signal,
        )
        if (!ended)
          patch((x) =>
            x.text
              ? { status: 'done', tool: undefined }
              : { status: 'error', tool: undefined, error: 'The answer stopped early. Try again.' },
          )
      } catch (e) {
        if (ctl.signal.aborted || epoch.current !== mine) return
        if (e instanceof ChatHttpError && e.code === 'unknown_session' && !retried) {
          session.current = null
          patch(() => ({ tool: 'That chat had expired, so a new one started' }))
          return run(null, true)
        }
        patch(() => ({
          status: 'error',
          tool: undefined,
          error: errorText(e, health.maxMessageChars),
        }))
      }
    }

    await run(session.current, false)
    if (epoch.current === mine) setBusy(false)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    void send(draft)
  }

  const classOpen = !!findClass(data, new URLSearchParams(search).get('class'))
  // Beside an open class panel (440 px + margins) when the window has room for both.
  const right = classOpen && expanded ? 16 + 440 + 12 : 16
  const suggestions = suggestionsFor(where.context.screen, mode)
  const empty = msgs.length === 0

  const body = (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1 pt-3 pr-2 pb-1 pl-5">
        <div className="min-w-0 flex-1">
          <p className="t-title-m">Ask about CampusPulse</p>
          <p className="t-label-m c-muted truncate">
            {mode === 'coach' ? 'Coach mode' : 'Examiner mode'} · answers from the code
          </p>
        </div>
        <button
          type="button"
          className="cx-icon-btn cx-state"
          aria-label="New chat"
          title="New chat"
          onClick={newChat}
          disabled={empty && !busy}
        >
          <Icon name="edit" size={22} />
        </button>
        <button
          type="button"
          className="cx-icon-btn cx-state"
          aria-label="Close the chat"
          title="Close"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {coachAvailable && (
        <div className="px-4 pt-1 pb-1">
          <Segmented<ChatMode>
            small
            label="Chat mode"
            value={mode}
            onChange={switchMode}
            options={[
              { value: 'examiner', label: 'Examiner' },
              { value: 'coach', label: 'Coach' },
            ]}
          />
        </div>
      )}
      <p className="t-label-m c-muted flex items-center gap-1.5 px-5 pt-1 pb-2" title={where.label}>
        <Icon name="visibility" size={16} />
        <span className="truncate">Looking at: {where.label}</span>
      </p>

      <div
        ref={log}
        className="cx-chat-log flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pt-2 pb-4"
        onScroll={(e) => {
          const el = e.currentTarget
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48
        }}
      >
        {empty ? (
          <Intro mode={mode} suggestions={suggestions} onPick={(q) => void send(q)} />
        ) : (
          msgs.map((msg) => <Message key={msg.id} msg={msg} />)
        )}
      </div>

      <div className="px-3 pb-3">
        {!empty && !busy && (
          <div className="cx-chat-chips -mx-3 flex gap-2 overflow-x-auto px-3 pb-2">
            {suggestions.map((q) => (
              <button
                key={q}
                type="button"
                className="cx-chip cx-state"
                onClick={() => void send(q)}
              >
                {q}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={onSubmit} className="flex items-end gap-2">
          <textarea
            ref={input}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                void send(draft)
              }
            }}
            className="cx-chat-input"
            placeholder={busy ? 'Answering…' : 'Ask about this screen or the code'}
            aria-label="Your question"
          />
          <button
            type="submit"
            className="cx-icon-btn cx-icon-btn--lg cx-state cx-chat-send"
            aria-label="Send"
            disabled={busy || !draft.trim()}
          >
            <Icon name="send" />
          </button>
        </form>
        {draft.length > health.maxMessageChars * 0.8 && (
          <p
            className={`t-label-s px-3 pt-1 ${draft.length > health.maxMessageChars ? 'c-error' : 'c-muted'}`}
          >
            {draft.length} / {health.maxMessageChars}
          </p>
        )}
      </div>
    </div>
  )

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    // Only the chat closes: an open class panel behind it stays.
    e.preventDefault()
    e.stopPropagation()
    onClose()
  }

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) onClose()
  }

  return (
    <AnimatePresence>
      {open &&
        (compact ? (
          <div key="sheet" onKeyDown={onKeyDown}>
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
            <m.div
              role="dialog"
              aria-modal="true"
              aria-label="Ask about CampusPulse"
              className="cx-chat--sheet fixed inset-x-0 z-50 flex flex-col"
              style={{
                top: 'calc(8px + env(safe-area-inset-top))',
                bottom: -48,
                paddingBottom: 48,
              }}
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
              <div className="cx-chat-surface" />
              <div
                className="relative grid flex-none cursor-grab touch-none place-items-center select-none"
                style={{ height: 22 }}
                onPointerDown={(e) => {
                  e.preventDefault()
                  drag.start(e)
                }}
              >
                <span
                  className="mt-2 block h-1 w-8 rounded-full"
                  style={{ background: 'var(--md-sys-color-on-surface-variant)' }}
                />
              </div>
              <div
                className="relative flex min-h-0 flex-1 flex-col"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
              >
                {body}
              </div>
            </m.div>
          </div>
        ) : (
          <m.div
            key="panel"
            role="dialog"
            aria-label="Ask about CampusPulse"
            className="cx-chat fixed z-50 flex flex-col"
            style={{
              top: 16,
              bottom: 68,
              right,
              width: 'min(420px, calc(100vw - 32px))',
              transition:
                'right var(--cx-motion-spatial-default-duration) var(--cx-motion-spatial-default)',
            }}
            initial={{ x: 48, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 48, opacity: 0, transition: springs.effectsFast }}
            transition={springs.spatialDefault}
            onKeyDown={onKeyDown}
          >
            <div className="cx-chat-surface" />
            {body}
          </m.div>
        ))}
    </AnimatePresence>
  )
}

function Intro({
  mode,
  suggestions,
  onPick,
}: {
  mode: ChatMode
  suggestions: string[]
  onPick: (q: string) => void
}) {
  return (
    <m.div
      className="flex flex-col gap-3 pt-2"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.spatialDefault}
    >
      <ShapeBadge shape="cookie9" size={56} fill="var(--md-sys-color-primary-container)">
        <span style={{ color: 'var(--md-sys-color-on-primary-container)' }}>
          <Icon name="forum" size={26} />
        </span>
      </ShapeBadge>
      <p className="t-title-l">
        {mode === 'coach' ? 'Rehearse with the coach' : 'Ask about what you see'}
      </p>
      <p className="t-body-m c-muted">
        {mode === 'coach'
          ? 'It knows the talk, the drill questions and the code. Ask it to explain a part, drill you or check how you would say something.'
          : 'An AI agent that has read CampusPulse’s three repositories and its architecture notes. It knows which screen you are on, answers from the code and points to the lines. It can only read: it changes and runs nothing.'}
      </p>
      <div className="mt-1 flex flex-col gap-2">
        {suggestions.map((q) => (
          <button key={q} type="button" className="cx-chat-sugg cx-state" onClick={() => onPick(q)}>
            {q}
          </button>
        ))}
      </div>
    </m.div>
  )
}

function Message({ msg }: { msg: Msg }) {
  if (msg.role === 'notice') return <p className="t-label-m c-muted text-center">{msg.text}</p>
  if (msg.role === 'user')
    return (
      <m.div
        className="flex flex-col items-end gap-1"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springs.spatialFast}
      >
        <div className="cx-chat-user t-body-m">{msg.text}</div>
        {msg.where && <span className="t-label-s c-muted pr-1">on {msg.where}</span>}
      </m.div>
    )
  const waiting = msg.status === 'streaming' && !msg.text
  return (
    <m.div
      className="flex flex-col gap-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={springs.effectsDefault}
      aria-busy={msg.status === 'streaming'}
    >
      {msg.text && <Markdown text={msg.text} />}
      {waiting && (
        <span className="cx-chat-dots" aria-label="Thinking">
          <span />
          <span />
          <span />
        </span>
      )}
      {msg.status === 'streaming' && msg.tool && (
        <p className="t-label-m c-muted flex items-center gap-1.5">
          <Icon name="search" size={16} />
          <span className="truncate">{msg.tool}</span>
        </p>
      )}
      {msg.status === 'error' && (
        <div className="cx-chat-error t-body-m" role="alert">
          <Icon name="error" size={20} />
          <span>{msg.error}</span>
        </div>
      )}
    </m.div>
  )
}
