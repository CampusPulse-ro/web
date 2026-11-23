import { AnimatePresence, m } from 'motion/react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHref, useProto, useWindowClass } from '../ctx'
import { haptic } from '../haptics'
import { Icon } from '../icons'
import { springs } from '../motion'
import { ShapeBadge } from '../ui/Shape'

type Step = 'start' | 'email' | 'code'

/**
 * Signing in to CampusPulse. "Continue with UPT" is the main way: it makes the CampusPulse account
 * and links UPT (Campus Virtual) in one go. "Continue with email" makes the account with a code
 * sent by email; UPT can be linked later, and the app nudges for it where Campus Virtual data would be.
 */
export function SignInScreen() {
  const { setAccount } = useProto()
  const { compact } = useWindowClass()
  const navigate = useNavigate()
  const href = useHref()
  const [step, setStep] = useState<Step>('start')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [dir, setDir] = useState(1)
  const go = (s: Step, d: number) => {
    setDir(d)
    setStep(s)
  }
  const done = (uptLinked: boolean) => {
    setAccount({
      email: uptLinked ? 'd.student@student.upt.ro' : email.trim(),
      via: uptLinked ? 'upt' : 'email',
      uptLinked,
    })
    haptic('success')
    navigate(href(''))
  }
  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())
  const field = 't-body-l mt-1 w-full rounded-2xl px-4 py-3.5 outline-none'
  const fieldStyle = { background: 'var(--md-sys-color-surface-container-high)' }

  const form = (
    <div className="relative w-full max-w-[400px] overflow-x-clip">
      <AnimatePresence mode="popLayout" initial={false} custom={dir}>
        <m.div
          key={step}
          custom={dir}
          variants={{
            enter: (d: number) => ({ x: d * 40, opacity: 0 }),
            center: { x: 0, opacity: 1 },
            exit: (d: number) => ({ x: d * -40, opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ x: springs.spatialDefault, opacity: springs.effectsDefault }}
        >
          {step === 'start' && (
            <div className="flex flex-col gap-3">
              <h1 className="t-headline-m">Sign in</h1>
              <p className="t-body-l c-muted mb-4">
                Use your UPT account to bring in Campus Virtual: courses, deadlines, grades and
                handing in.
              </p>
              <button
                type="button"
                className="cx-btn cx-btn--filled cx-btn--lg cx-state w-full"
                onClick={() => done(true)}
              >
                <Icon name="school" size={20} />
                Continue with UPT
              </button>
              <button
                type="button"
                className="cx-btn cx-btn--tonal cx-btn--lg cx-state w-full"
                onClick={() => go('email', 1)}
              >
                <Icon name="mail" size={20} />
                Continue with email
              </button>
              <p className="t-body-s c-muted mt-3">
                With email you get your timetable and your own deadlines; you can link UPT any time.
              </p>
            </div>
          )}
          {step === 'email' && (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (emailOk) go('code', 1)
              }}
            >
              <button
                type="button"
                className="cx-icon-btn cx-state -ml-2"
                aria-label="Back"
                onClick={() => go('start', -1)}
              >
                <Icon name="arrowBack" />
              </button>
              <h1 className="t-headline-m">Your email</h1>
              <p className="t-body-l c-muted">We send a 6-digit code there. No password.</p>
              <label className="mt-2">
                <span className="t-label-l">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={field}
                  style={fieldStyle}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                />
              </label>
              <button
                type="submit"
                className="cx-btn cx-btn--filled cx-btn--lg cx-state mt-2 w-full"
                disabled={!emailOk}
                style={emailOk ? undefined : { opacity: 0.38 }}
              >
                Send the code
              </button>
            </form>
          )}
          {step === 'code' && (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (code.length === 6) done(false)
              }}
            >
              <button
                type="button"
                className="cx-icon-btn cx-state -ml-2"
                aria-label="Back"
                onClick={() => go('email', -1)}
              >
                <Icon name="arrowBack" />
              </button>
              <h1 className="t-headline-m">Check your email</h1>
              <p className="t-body-l c-muted">
                We sent a code to <b className="font-semibold">{email.trim()}</b>. In this prototype
                any 6 digits work.
              </p>
              <label className="mt-2">
                <span className="t-label-l">Code</span>
                <input
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className={`${field} tnum text-center tracking-[0.5em]`}
                  style={{ ...fieldStyle, fontSize: 24 }}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  autoFocus
                />
              </label>
              <button
                type="submit"
                className="cx-btn cx-btn--filled cx-btn--lg cx-state mt-2 w-full"
                disabled={code.length !== 6}
                style={code.length === 6 ? undefined : { opacity: 0.38 }}
              >
                Continue
              </button>
            </form>
          )}
        </m.div>
      </AnimatePresence>
    </div>
  )

  return (
    <div className="flex min-h-dvh" style={{ flexDirection: compact ? 'column' : 'row' }}>
      <div
        className="flex flex-col justify-between gap-8 p-8"
        style={
          compact
            ? { paddingTop: 56 }
            : {
                flex: '1 1 0',
                margin: 16,
                borderRadius: 32,
                background: 'var(--md-sys-color-surface-container-low)',
                padding: 56,
              }
        }
      >
        <div className="flex items-center gap-3">
          <ShapeBadge shape="cookie12" size={44} fill="var(--md-sys-color-primary)">
            <span
              className="t-narrow font-bold"
              style={{ color: 'var(--md-sys-color-on-primary)', fontSize: 15 }}
            >
              cp
            </span>
          </ShapeBadge>
          <span className="t-title-l">CampusPulse</span>
        </div>
        {!compact && (
          <div className="max-w-[520px]">
            <p className="t-display-s">
              Where to be next, what’s due, and Campus Virtual, in one app.
            </p>
            <p className="t-body-l c-muted mt-4">
              For UPT students, made by UPT students. Not an official UPT app.
            </p>
          </div>
        )}
      </div>
      <div
        className="flex flex-1 items-start justify-center px-6 pb-10"
        style={compact ? undefined : { alignItems: 'center' }}
      >
        {form}
      </div>
    </div>
  )
}
