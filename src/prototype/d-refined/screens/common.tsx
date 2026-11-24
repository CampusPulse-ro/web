import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useHref, useProto, useSnackbar } from '../ctx'
import { haptic } from '../haptics'
import { Icon } from '../icons'

/**
 * Window-class layouts. Compact: the screen is the page. Medium/expanded: the rail sits left, and
 * expanded screens with a `side` get M3's list-detail: a plain pane plus a contained detail pane.
 */
export function PaneLayout({
  compact,
  side,
  children,
}: {
  compact: boolean
  side?: ReactNode
  children: ReactNode
}) {
  if (compact) return <>{children}</>
  if (!side) return <div style={{ paddingLeft: 96 }}>{children}</div>
  return (
    <div className="flex gap-6 pr-4" style={{ paddingLeft: 96 }}>
      <div className="min-w-0 flex-none" style={{ width: 'clamp(360px, 32vw, 460px)' }}>
        {side}
      </div>
      <div className="cx-pane cx-pane--card min-w-0 flex-1">{children}</div>
    </div>
  )
}

/** The account avatar, top right on the phone (as in Google's own apps). Opens Profile. */
export function AccountButton() {
  const href = useHref()
  return (
    <Link to={href('/profile')} className="cx-icon-btn cx-state" aria-label="Profile and settings">
      <Avatar size={32} />
    </Link>
  )
}

export function Avatar({ size }: { size: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid place-items-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: 'var(--md-sys-color-primary-fixed-dim)',
        color: 'var(--md-sys-color-on-primary-fixed)',
      }}
    >
      DS
    </span>
  )
}

/** The nudge an email-only account sees where Campus Virtual data would be. */
export function LinkUptNudge({ text }: { text: string }) {
  const { account, setAccount } = useProto()
  const snack = useSnackbar()
  if (!account || account.uptLinked) return null
  return (
    <div
      className="mt-2 mb-2 flex flex-col gap-3 p-5 sm:flex-row sm:items-center"
      style={{ background: 'var(--md-sys-color-primary-container)', borderRadius: 24 }}
    >
      <span style={{ color: 'var(--md-sys-color-on-primary-container)' }} className="flex-1">
        <span className="t-title-m block">Link your UPT account</span>
        <span className="t-body-m block">{text}</span>
      </span>
      <button
        type="button"
        className="cx-btn cx-btn--filled cx-state self-start sm:self-center"
        onClick={() => {
          setAccount({ ...account, uptLinked: true })
          haptic('success')
          snack('UPT account linked')
        }}
      >
        <Icon name="school" size={18} />
        Continue with UPT
      </button>
    </div>
  )
}
