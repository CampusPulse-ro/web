import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

export type BannerTone = 'info' | 'warn' | 'error' | 'success'

const tones: Record<BannerTone, { box: string; icon: string; iconName: IconName }> = {
  info: { box: 'bg-accent/15', icon: 'text-accent', iconName: 'info' },
  warn: { box: 'bg-warn/15', icon: 'text-warn', iconName: 'warn' },
  error: { box: 'bg-danger/15', icon: 'text-danger', iconName: 'error' },
  success: { box: 'bg-success/15', icon: 'text-success', iconName: 'success' },
}

export interface BannerProps {
  tone: BannerTone
  children: ReactNode
  /** A button or link after the message (e.g. "Link UPT"). */
  action?: ReactNode
  /** Shows a close button with this label. */
  dismissLabel?: string
  onDismiss?: () => void
  /** Read out when it appears: `alert` for errors the student must see, `status` for the rest. */
  role?: 'alert' | 'status'
  className?: string
}

/** A message that sits in the page, tinted with its tone (docs/design-system.md, "Tones"). */
export function Banner({
  tone,
  children,
  action,
  dismissLabel,
  onDismiss,
  role,
  className,
}: BannerProps) {
  const style = tones[tone]
  return (
    <div
      role={role}
      className={`flex items-start gap-3 rounded-md px-4 py-3 text-body-small text-ink sm:items-center ${style.box} ${className ?? ''}`}
    >
      <Icon name={style.iconName} size={18} className={`mt-px shrink-0 sm:mt-0 ${style.icon}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">{children}</div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {onDismiss && dismissLabel && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="-m-1 shrink-0 cursor-pointer rounded-sm p-1 text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
        >
          <Icon name="close" size={16} />
        </button>
      )}
    </div>
  )
}
