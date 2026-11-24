import { useEffect, useState } from 'react'

export interface ChatHealth {
  modes: string[]
  maxMessageChars: number
}

/**
 * Whether the agent's backend is here. Only the examiner page on the Pi serves `/api/health`; a
 * Cloudflare Pages preview answers that path with index.html (200), so the body is checked too.
 * Null (no chat at all) until a real answer arrives.
 */
export function useChatHealth(): ChatHealth | null {
  const [health, setHealth] = useState<ChatHealth | null>(null)
  useEffect(() => {
    const ctl = new AbortController()
    fetch('/api/health', {
      signal: ctl.signal,
      headers: { accept: 'application/json' },
      cache: 'no-store',
    })
      .then(async (r) => {
        if (!r.ok || !(r.headers.get('content-type') ?? '').includes('application/json')) return
        const b = (await r.json()) as Record<string, unknown>
        if (b.service !== 'campuspulse-examiner' || b.ok !== true) return
        setHealth({
          modes: Array.isArray(b.modes)
            ? b.modes.filter((x): x is string => typeof x === 'string')
            : ['examiner'],
          maxMessageChars: typeof b.maxMessageChars === 'number' ? b.maxMessageChars : 4000,
        })
      })
      .catch(() => {
        // no backend (or offline): the chat stays hidden
      })
    return () => ctl.abort()
  }, [])
  return health
}
