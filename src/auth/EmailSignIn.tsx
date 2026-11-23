import { useEffect, useRef, useState, type ClipboardEvent, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { ApiError } from '../api/client'
import { useSendEmailCode, useVerifyEmailCode } from '../api/useEmailSignIn'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { currentLanguage, isLanguage } from '../i18n'
import { useDateTimeFormat } from '../i18n/format'
import { isUnreachable } from './problems'

const codeLength = 6

type Step =
  | { name: 'email' }
  | { name: 'code'; email: string; expiresAt: number; resendAt: number; resent: boolean }

/** Where a refusal is shown: under the field it concerns, or above the form. */
interface Refusal {
  field: 'email' | 'code' | null
  message: string
}

/** The first six digits in what was typed or pasted ("123 456", "Your code: 123456"). */
function digitsOf(text: string): string {
  return text.replace(/\D/g, '').slice(0, codeLength)
}

/** A plain address like name@example.com; the API checks it properly. */
function looksLikeEmail(text: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)
}

/** Ticks every second while `active`, for the resend countdown and the code's expiry. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [active])
  return now
}

/**
 * "Or use your email": the address, then the 6-digit code from the email. A typed or pasted code
 * signs in as soon as it has six digits; a new code can be asked for after the API's cooldown.
 */
export function EmailSignIn() {
  const { t, i18n } = useTranslation()
  const format = useDateTimeFormat()
  const send = useSendEmailCode()
  const verify = useVerifyEmailCode()

  const [step, setStep] = useState<Step>({ name: 'email' })
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [refusal, setRefusal] = useState<Refusal | null>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const codeRef = useRef<HTMLInputElement>(null)
  const now = useNow(step.name === 'code')

  // Focus follows the step: the code field once the email is sent, the email field on the way back.
  useEffect(() => {
    if (step.name === 'code') codeRef.current?.focus()
    else emailRef.current?.focus()
  }, [step.name])

  const language = isLanguage(i18n.resolvedLanguage) ? i18n.resolvedLanguage : currentLanguage()

  const refusalOf = (err: unknown): Refusal => {
    if (err instanceof ApiError) {
      // A wait of hours (the daily limit) needs the day too, not only the time.
      const seconds = err.retryAfterSeconds
      const after = seconds
        ? seconds > 12 * 3600
          ? format.dateTime(Date.now() + seconds * 1000)
          : format.time(Date.now() + seconds * 1000)
        : null
      switch (err.type) {
        case 'invalid-email':
          return { field: 'email', message: t('signIn.email.errors.invalidEmail') }
        case 'invalid-code':
          return { field: 'code', message: t('signIn.email.errors.invalidCode') }
        case 'code-burned':
          return { field: 'code', message: t('signIn.email.errors.codeBurned') }
        case 'too-many-codes':
          return {
            field: null,
            message: after
              ? t('signIn.email.errors.tooManyCodesUntil', { time: after })
              : t('signIn.email.errors.tooManyCodes'),
          }
        case 'email-unavailable':
          return { field: null, message: t('signIn.email.errors.emailUnavailable') }
        case 'sign-in-unavailable':
          return { field: null, message: t('signIn.problems.sign-in-unavailable') }
      }
      if (err.status === 429) {
        return {
          field: null,
          message: after
            ? t('signIn.email.errors.rateLimitedUntil', { time: after })
            : t('signIn.problems.rate-limited'),
        }
      }
    }
    if (isUnreachable(err)) return { field: null, message: t('signIn.problems.unreachable') }
    return { field: null, message: t('signIn.problems.unknown') }
  }

  const sendCode = (address: string, resend: boolean) => {
    setRefusal(null)
    send.mutate(
      { email: address, language },
      {
        onSuccess: (sent) => {
          const at = Date.now()
          setCode('')
          setStep({
            name: 'code',
            email: address,
            expiresAt: at + sent.expiresInSeconds * 1000,
            resendAt: at + sent.resendAfterSeconds * 1000,
            resent: resend,
          })
          if (resend) codeRef.current?.focus()
        },
        onError: (err) => setRefusal(refusalOf(err)),
      },
    )
  }

  const submitEmail = (event: FormEvent) => {
    event.preventDefault()
    const address = email.trim()
    if (!looksLikeEmail(address)) {
      setRefusal({
        field: 'email',
        message: address
          ? t('signIn.email.errors.invalidEmail')
          : t('signIn.email.errors.emailRequired'),
      })
      emailRef.current?.focus()
      return
    }
    sendCode(address, false)
  }

  const verifyCode = (value: string) => {
    if (step.name !== 'code' || verify.isPending) return
    setRefusal(null)
    verify.mutate(
      { email: step.email, code: value },
      {
        onError: (err) => {
          const next = refusalOf(err)
          setRefusal(next)
          if (next.field === 'code') {
            // Burned: the code is dead, so clear it. Wrong: keep it selected, so typing replaces it.
            if (err instanceof ApiError && err.type === 'code-burned') setCode('')
            window.setTimeout(() => {
              codeRef.current?.focus()
              codeRef.current?.select()
            })
          }
        },
      },
    )
  }

  const changeCode = (text: string) => {
    const digits = digitsOf(text)
    setCode(digits)
    if (refusal?.field === 'code') setRefusal(null)
    if (digits.length === codeLength) verifyCode(digits)
  }

  const pasteCode = (event: ClipboardEvent<HTMLInputElement>) => {
    // Pasted text may hold spaces or words around the code; take its digits whole.
    event.preventDefault()
    changeCode(event.clipboardData.getData('text'))
  }

  const banner = refusal && refusal.field === null && (
    <Banner tone="error" role="alert">
      {refusal.message}
    </Banner>
  )

  if (step.name === 'email') {
    return (
      <form onSubmit={submitEmail} noValidate className="flex flex-col gap-4">
        {banner}
        <Input
          ref={emailRef}
          label={t('signIn.email.label')}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            if (refusal?.field === 'email') setRefusal(null)
          }}
          error={refusal?.field === 'email' ? refusal.message : undefined}
        />
        <Button type="submit" variant="secondary" loading={send.isPending}>
          {t('signIn.email.send')}
        </Button>
      </form>
    )
  }

  const secondsToResend = Math.max(0, Math.ceil((step.resendAt - now) / 1000))
  const expired = now >= step.expiresAt

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (code.length === codeLength) verifyCode(code)
        else codeRef.current?.focus()
      }}
      noValidate
      className="flex flex-col gap-4"
    >
      <p className="m-0 text-body text-ink-soft">
        <Trans
          t={t}
          i18nKey="signIn.email.codeSentTo"
          values={{ email: step.email }}
          components={{ email: <strong className="font-semibold break-words text-ink" /> }}
        />
      </p>

      {step.resent && !refusal && (
        <p role="status" className="m-0 text-body-small text-ink-muted">
          {t('signIn.email.resent')}
        </p>
      )}
      {banner}

      <Input
        ref={codeRef}
        label={t('signIn.email.codeLabel')}
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        spellCheck={false}
        value={code}
        onChange={(event) => changeCode(event.target.value)}
        onPaste={pasteCode}
        readOnly={verify.isPending}
        error={
          refusal?.field === 'code'
            ? refusal.message
            : expired
              ? t('signIn.email.errors.expired')
              : undefined
        }
        hint={
          expired ? undefined : t('signIn.email.codeHint', { time: format.time(step.expiresAt) })
        }
        inputClassName="h-14 text-center text-title tracking-widest tabular-nums"
      />

      <Button type="submit" loading={verify.isPending}>
        {t('signIn.email.verify')}
      </Button>

      <div className="flex flex-col items-start gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          onClick={() => {
            setRefusal(null)
            setStep({ name: 'email' })
          }}
        >
          {t('signIn.email.differentEmail')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3"
          disabled={secondsToResend > 0}
          loading={send.isPending}
          onClick={() => sendCode(step.email, true)}
        >
          {secondsToResend > 0
            ? t('signIn.email.resendIn', { seconds: secondsToResend })
            : t('signIn.email.resend')}
        </Button>
      </div>
    </form>
  )
}
