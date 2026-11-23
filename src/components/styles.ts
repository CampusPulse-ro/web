/**
 * Class lists shared by components and by links that look like them (a `<Link>` styled as a
 * button). The states follow docs/design-system.md ("States").
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

const buttonBase =
  'inline-flex cursor-pointer items-center justify-center gap-2 text-label no-underline transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed'

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-8 rounded-sm px-3',
  md: 'h-11 rounded-md px-4',
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-on-accent hover:opacity-90 disabled:bg-line disabled:text-ink-muted disabled:hover:opacity-100',
  secondary:
    'border border-line-strong text-ink hover:bg-raised disabled:border-line disabled:text-ink-muted disabled:hover:bg-transparent',
  ghost: 'text-ink-soft hover:bg-raised hover:text-ink disabled:text-ink-muted',
  danger:
    'bg-danger text-on-accent hover:opacity-90 disabled:bg-line disabled:text-ink-muted disabled:hover:opacity-100',
}

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return `${buttonBase} ${buttonSizes[size]} ${buttonVariants[variant]}`
}

/** A text field's box. An error turns the edge `danger`; focus turns it `accent`, 2 px wide. */
export function inputClasses(invalid = false) {
  return `w-full rounded-md border bg-sunken px-3 text-body text-ink placeholder:text-ink-muted focus:ring-1 focus:outline-none disabled:border-line disabled:text-ink-muted ${
    invalid
      ? 'border-danger focus:border-danger focus:ring-danger'
      : 'border-line-strong focus:border-accent focus:ring-accent'
  }`
}

/** A text link inside a sentence. */
export const textLinkClasses =
  'text-accent underline underline-offset-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
