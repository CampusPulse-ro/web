/**
 * The agent's HTTP contract (served only on the examiner page on the Pi, same origin):
 * `POST /api/chat` answers with server-sent events (`start`, `delta`, `tool`, `done`, `error`).
 * EventSource can't POST, so the stream is read from fetch().
 */
import type { ChatContext } from './context'

export type ChatEvent =
  | { type: 'start'; sessionId: string; mode: string }
  | { type: 'delta'; text: string }
  | { type: 'tool'; tool: string; detail: string }
  | { type: 'done'; sessionId: string; elapsedMs: number | null }
  | { type: 'error'; error: string; message: string }

/** A refusal before the stream started (busy, rate limited, unknown session, …). */
export class ChatHttpError extends Error {
  readonly status: number
  readonly code: string
  readonly retryAfter: number | null
  constructor(status: number, code: string, message: string, retryAfter: number | null = null) {
    super(message)
    this.status = status
    this.code = code
    this.retryAfter = retryAfter
  }
}

export interface ChatRequest {
  /** The only mode the backend serves. */
  mode: 'examiner'
  sessionId: string | null
  message: string
  context: ChatContext
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

function toEvent(name: string, data: unknown): ChatEvent | null {
  const d = (data ?? {}) as Record<string, unknown>
  switch (name) {
    case 'start':
      return { type: 'start', sessionId: str(d.sessionId), mode: str(d.mode) }
    case 'delta':
      return { type: 'delta', text: str(d.text) }
    case 'tool':
      return { type: 'tool', tool: str(d.tool), detail: str(d.detail) }
    case 'done':
      return {
        type: 'done',
        sessionId: str(d.sessionId),
        elapsedMs: typeof d.elapsedMs === 'number' ? d.elapsedMs : null,
      }
    case 'error':
      return { type: 'error', error: str(d.error), message: str(d.message) }
    default:
      return null
  }
}

/** One SSE block: `event:` and `data:` lines; `:` lines are keep-alive comments. */
function parseBlock(block: string): ChatEvent | null {
  let name = 'message'
  const data: string[] = []
  for (const line of block.split('\n')) {
    if (!line || line.startsWith(':')) continue
    const colon = line.indexOf(':')
    const field = colon < 0 ? line : line.slice(0, colon)
    let value = colon < 0 ? '' : line.slice(colon + 1)
    if (value.startsWith(' ')) value = value.slice(1)
    if (field === 'event') name = value
    else if (field === 'data') data.push(value)
  }
  if (!data.length) return null
  try {
    return toEvent(name, JSON.parse(data.join('\n')))
  } catch {
    return null
  }
}

async function refusal(res: Response): Promise<ChatHttpError> {
  let code = `http_${res.status}`
  let message = ''
  try {
    const body = (await res.json()) as { error?: unknown; message?: unknown }
    code = str(body.error) || code
    message = str(body.message)
  } catch {
    // not JSON: keep the status
  }
  const after = Number(res.headers.get('retry-after'))
  return new ChatHttpError(
    res.status,
    code,
    message,
    Number.isFinite(after) && after > 0 ? after : null,
  )
}

/** Sends one question and calls `onEvent` for every event until the stream ends. */
export async function streamChat(
  req: ChatRequest,
  onEvent: (e: ChatEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
    body: JSON.stringify(req),
    signal,
  })
  if (!res.ok) throw await refusal(res)
  if (!(res.headers.get('content-type') ?? '').includes('text/event-stream') || !res.body)
    throw new ChatHttpError(res.status, 'bad_response', 'The assistant sent an unexpected answer.')
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
  let buf = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += value.replace(/\r\n?/g, '\n')
    let cut = buf.indexOf('\n\n')
    while (cut >= 0) {
      const ev = parseBlock(buf.slice(0, cut))
      buf = buf.slice(cut + 2)
      if (ev) onEvent(ev)
      cut = buf.indexOf('\n\n')
    }
  }
  const last = parseBlock(buf)
  if (last) onEvent(last)
}

/* ── History: this browser's earlier chats (the server keys them by client) ─────────────────── */

export interface SessionSummary {
  id: string
  createdAt: string
  lastActivity: string
  firstQuestion: string
  turns: number
}

export interface SessionTurn {
  question: string
  answer: string
  askedAt: string
  /** The server's short label for where it was asked (old turns have no raw context). */
  where: string | null
  context: ChatContext | null
  status: 'ok' | 'failed' | 'timeout'
  error: string | null
}

export interface SessionDetail {
  id: string
  createdAt: string
  turns: SessionTurn[]
}

const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' ? (v as Record<string, unknown>) : {}

async function getJson(url: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
    signal,
  })
  if (!res.ok) throw await refusal(res)
  if (!(res.headers.get('content-type') ?? '').includes('application/json'))
    throw new ChatHttpError(res.status, 'bad_response', 'The server sent an unexpected answer.')
  return obj(await res.json())
}

/** Newest first, as the server sends them. */
export async function listSessions(signal?: AbortSignal): Promise<SessionSummary[]> {
  const body = await getJson('/api/sessions', signal)
  const rows = Array.isArray(body.sessions) ? body.sessions : []
  return rows
    .map(obj)
    .filter((r) => str(r.id))
    .map((r) => ({
      id: str(r.id),
      createdAt: str(r.createdAt),
      lastActivity: str(r.lastActivity),
      firstQuestion: str(r.firstQuestion),
      turns: typeof r.turns === 'number' ? r.turns : 0,
    }))
}

export async function loadSession(id: string, signal?: AbortSignal): Promise<SessionDetail> {
  const body = await getJson(`/api/sessions/${encodeURIComponent(id)}`, signal)
  const turns = Array.isArray(body.turns) ? body.turns : []
  return {
    id: str(body.id) || id,
    createdAt: str(body.createdAt),
    turns: turns.map(obj).map((t) => {
      const status = str(t.status)
      return {
        question: str(t.question),
        answer: str(t.answer),
        askedAt: str(t.askedAt),
        where: str(t.where) || null,
        context: t.context && typeof t.context === 'object' ? (t.context as ChatContext) : null,
        status: status === 'failed' || status === 'timeout' ? status : 'ok',
        error: str(t.error) || null,
      }
    }),
  }
}
