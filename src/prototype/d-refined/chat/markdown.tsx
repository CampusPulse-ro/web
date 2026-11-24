/**
 * A small, safe Markdown renderer for the agent's answers: paragraphs, headings, lists (nested),
 * quotes, tables, fenced code, inline code, bold, italic and links. Everything becomes React
 * elements (never HTML strings), and only http(s)/mailto links are kept. Code pointers such as
 * `api/src/X.cs:179` link to the file on GitHub; a later bare `:152-170` links to the same file.
 */
import type { ReactNode } from 'react'

const ORG = 'https://github.com/CampusPulse-ro'
const ROOTS = '(?:api|mobile|web|web-prototype)'
const POINTER = new RegExp(`^(${ROOTS.slice(3, -1)})/([^\\s:\`'"<>]+?)(?::(\\d+)(?:-(\\d+))?)?$`)
const LINES_ONLY = /^:(\d+)(?:-(\d+))?$/
/** Pointers in running text: no spaces or brackets, a file extension, optional lines. */
const TEXT_POINTER = new RegExp(
  `(?<![\\w./-])${ROOTS}/[A-Za-z0-9_.@/-]+\\.[A-Za-z0-9]+(?::\\d+(?:-\\d+)?)?`,
  'g',
)
const BARE_URL = /https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"]/g

interface Target {
  repo: string
  ref: string
  path: string
}

function target(root: string, rest: string): Target {
  return root === 'web-prototype'
    ? { repo: 'web', ref: 'proto/d-refined', path: rest }
    : { repo: root, ref: 'main', path: rest }
}

function githubUrl(t: Target, from?: string, to?: string): string {
  const path = t.path.replace(/\/+$/, '')
  const file = /\.[A-Za-z0-9]+$/.test(path.split('/').pop() ?? '')
  const kind = file ? 'blob' : 'tree'
  const lines = file && from ? `#L${from}${to ? `-L${to}` : ''}` : ''
  return `${ORG}/${t.repo}/${kind}/${t.ref}/${path.split('/').map(encodeURIComponent).join('/')}${lines}`
}

/** `api/src/X.cs:54-77` → its GitHub URL (and the file, for later `:lines` references). */
function pointerLink(text: string): { url: string; target: Target } | null {
  const m = POINTER.exec(text.trim())
  if (!m) return null
  const t = target(m[1], m[2])
  return { url: githubUrl(t, m[3], m[4]), target: t }
}

function safeUrl(url: string): string | null {
  return /^(https?:\/\/|mailto:)/i.test(url.trim()) ? url.trim() : null
}

interface Ctx {
  last: Target | null
  n: number
}

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const

function codeSpan(code: string, ctx: Ctx): ReactNode {
  const k = ctx.n++
  const p = pointerLink(code)
  if (p) {
    ctx.last = p.target
    return (
      <a key={k} href={p.url} {...ext} className="cx-chat-ptr">
        <code>{code}</code>
      </a>
    )
  }
  const lines = LINES_ONLY.exec(code.trim())
  if (lines && ctx.last)
    return (
      <a key={k} href={githubUrl(ctx.last, lines[1], lines[2])} {...ext} className="cx-chat-ptr">
        <code>{code}</code>
      </a>
    )
  return <code key={k}>{code}</code>
}

/** Plain text, with code pointers and bare URLs turned into links. */
function plain(text: string, ctx: Ctx): ReactNode[] {
  const out: ReactNode[] = []
  const hits: { at: number; end: number; node: () => ReactNode }[] = []
  for (const m of text.matchAll(TEXT_POINTER)) {
    const raw = m[0]
    hits.push({
      at: m.index,
      end: m.index + raw.length,
      node: () => {
        const p = pointerLink(raw)
        if (!p) return raw
        ctx.last = p.target
        return (
          <a key={ctx.n++} href={p.url} {...ext} className="cx-chat-ptr">
            {raw}
          </a>
        )
      },
    })
  }
  for (const m of text.matchAll(BARE_URL)) {
    const raw = m[0]
    if (hits.some((h) => m.index < h.end && m.index + raw.length > h.at)) continue
    hits.push({
      at: m.index,
      end: m.index + raw.length,
      node: () => (
        <a key={ctx.n++} href={raw} {...ext}>
          {raw}
        </a>
      ),
    })
  }
  hits.sort((a, b) => a.at - b.at)
  let i = 0
  for (const h of hits) {
    if (h.at < i) continue
    if (h.at > i) out.push(text.slice(i, h.at))
    out.push(h.node())
    i = h.end
  }
  if (i < text.length) out.push(text.slice(i))
  return out
}

function inline(text: string, ctx: Ctx): ReactNode[] {
  const out: ReactNode[] = []
  let buf = ''
  const flush = () => {
    if (buf) out.push(...plain(buf, ctx))
    buf = ''
  }
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch === '\\' && i + 1 < text.length && /[\\`*_[\]()#|>-]/.test(text[i + 1])) {
      buf += text[i + 1]
      i += 2
      continue
    }
    if (ch === '`') {
      let n = 1
      while (text[i + n] === '`') n++
      const end = text.indexOf('`'.repeat(n), i + n)
      if (end > i) {
        flush()
        out.push(codeSpan(text.slice(i + n, end).replace(/^ (.+) $/, '$1'), ctx))
        i = end + n
        continue
      }
    }
    if (ch === '*' && text[i + 1] === '*') {
      const end = text.indexOf('**', i + 2)
      if (end > i + 2) {
        flush()
        out.push(<strong key={ctx.n++}>{inline(text.slice(i + 2, end), ctx)}</strong>)
        i = end + 2
        continue
      }
    }
    if (ch === '*' && text[i + 1] && !/[\s*]/.test(text[i + 1])) {
      const end = text.indexOf('*', i + 1)
      if (end > i + 1 && text[end - 1] !== ' ') {
        flush()
        out.push(<em key={ctx.n++}>{inline(text.slice(i + 1, end), ctx)}</em>)
        i = end + 1
        continue
      }
    }
    if (ch === '[') {
      const m = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(text.slice(i))
      if (m) {
        flush()
        const url = pointerLink(m[2])?.url ?? safeUrl(m[2])
        const label = inline(m[1], ctx)
        out.push(
          url ? (
            <a key={ctx.n++} href={url} {...ext}>
              {label}
            </a>
          ) : (
            <span key={ctx.n++}>{label}</span>
          ),
        )
        i += m[0].length
        continue
      }
    }
    buf += ch
    i++
  }
  flush()
  return out
}

/* ── Blocks ──────────────────────────────────────────────────────────────────────────────── */

interface Item {
  text: string
  ordered: boolean
  n: number
  children: Item[]
}

type Block =
  | { t: 'p'; text: string }
  | { t: 'h'; level: number; text: string }
  | { t: 'code'; text: string }
  | { t: 'list'; items: Item[] }
  | { t: 'quote'; text: string }
  | { t: 'hr' }
  | { t: 'table'; head: string[]; rows: string[][] }

const FENCE = /^\s*(`{3,}|~{3,})/
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/
const HR = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/
const ITEM = /^(\s*)([-*+]|\d{1,3}[.)])\s+(.*)$/
const QUOTE = /^\s{0,3}>\s?(.*)$/
const TABLE_SEP = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/

const cells = (row: string) =>
  row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, '|'))

function parse(src: string): Block[] {
  const lines = src.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  let para: string[] = []
  const endPara = () => {
    if (para.length) blocks.push({ t: 'p', text: para.join(' ') })
    para = []
  }
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const fence = FENCE.exec(line)
    if (fence) {
      endPara()
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith(fence[1])) body.push(lines[i++])
      i++ // the closing fence (or the end, while an answer is still streaming)
      blocks.push({ t: 'code', text: body.join('\n') })
      continue
    }
    if (!line.trim()) {
      endPara()
      i++
      continue
    }
    const h = HEADING.exec(line)
    if (h) {
      endPara()
      blocks.push({ t: 'h', level: h[1].length, text: h[2] })
      i++
      continue
    }
    if (HR.test(line) && !ITEM.exec(line)?.[3]) {
      endPara()
      blocks.push({ t: 'hr' })
      i++
      continue
    }
    if (line.trim().startsWith('|') && i + 1 < lines.length && TABLE_SEP.test(lines[i + 1])) {
      endPara()
      const head = cells(line)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i].trim().startsWith('|')) rows.push(cells(lines[i++]))
      blocks.push({ t: 'table', head, rows })
      continue
    }
    if (QUOTE.test(line)) {
      endPara()
      const body: string[] = []
      while (i < lines.length && QUOTE.test(lines[i])) body.push(QUOTE.exec(lines[i++])![1])
      blocks.push({ t: 'quote', text: body.join('\n') })
      continue
    }
    if (ITEM.test(line)) {
      endPara()
      const root: Item[] = []
      const stack: { indent: number; list: Item[] }[] = [{ indent: -1, list: root }]
      let last: Item | null = null
      while (i < lines.length) {
        const l = lines[i]
        const m = ITEM.exec(l)
        if (m) {
          const indent = m[1].replace(/\t/g, '    ').length
          while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop()
          const ordered = /\d/.test(m[2])
          last = { text: m[3], ordered, n: ordered ? parseInt(m[2], 10) : 0, children: [] }
          stack[stack.length - 1].list.push(last)
          stack.push({ indent, list: last.children })
          i++
        } else if (l.trim() && /^\s+/.test(l) && last) {
          last.text += ` ${l.trim()}` // a wrapped line of the item above
          i++
        } else break
      }
      blocks.push({ t: 'list', items: root })
      continue
    }
    para.push(line.trim())
    i++
  }
  endPara()
  return blocks
}

function list(items: Item[], ctx: Ctx): ReactNode {
  const body = items.map((it) => (
    <li key={ctx.n++}>
      {inline(it.text, ctx)}
      {it.children.length > 0 && list(it.children, ctx)}
    </li>
  ))
  return items[0]?.ordered ? (
    <ol key={ctx.n++} start={items[0].n || 1}>
      {body}
    </ol>
  ) : (
    <ul key={ctx.n++}>{body}</ul>
  )
}

function block(b: Block, ctx: Ctx): ReactNode {
  const k = ctx.n++
  switch (b.t) {
    case 'p':
      return <p key={k}>{inline(b.text, ctx)}</p>
    case 'h': {
      const Tag = b.level <= 2 ? 'h3' : 'h4'
      return <Tag key={k}>{inline(b.text, ctx)}</Tag>
    }
    case 'code':
      return (
        <pre key={k}>
          <code>{b.text}</code>
        </pre>
      )
    case 'list':
      return list(b.items, ctx)
    case 'quote':
      return <blockquote key={k}>{parse(b.text).map((x) => block(x, ctx))}</blockquote>
    case 'hr':
      return <hr key={k} />
    case 'table':
      return (
        <div key={k} className="cx-chat-table">
          <table>
            <thead>
              <tr>
                {b.head.map((c) => (
                  <th key={ctx.n++}>{inline(c, ctx)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r) => (
                <tr key={ctx.n++}>
                  {r.map((c) => (
                    <td key={ctx.n++}>{inline(c, ctx)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
  }
}

export function Markdown({ text }: { text: string }) {
  const ctx: Ctx = { last: null, n: 0 }
  return <div className="cx-chat-md">{parse(text).map((b) => block(b, ctx))}</div>
}
