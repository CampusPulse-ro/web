import { useId, type ComponentProps, type ReactNode } from 'react'
import { inputClasses } from './styles'

export interface InputProps extends Omit<ComponentProps<'input'>, 'id'> {
  label: ReactNode
  /** A line under the field that helps fill it in. */
  hint?: ReactNode
  /** What's wrong with the value; turns the field red and is read out with it. */
  error?: ReactNode
  /** Extra classes for the input itself (size, text). */
  inputClassName?: string
}

/** A labelled text field (Input, variant text) with its hint and error tied to it for screen readers. */
export function Input({ label, hint, error, inputClassName, className, ...rest }: InputProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ')

  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <label htmlFor={id} className="text-label text-ink">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`h-11 ${inputClasses(Boolean(error))} ${inputClassName ?? ''}`}
        {...rest}
      />
      {error && (
        <p id={errorId} className="m-0 text-body-small text-danger">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="m-0 text-caption text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
