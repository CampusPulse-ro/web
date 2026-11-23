import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { useAuth } from './context'
import { EmailSignIn } from './EmailSignIn'
import { ProblemMessage } from './ProblemMessage'

/**
 * Signing in: "Continue with UPT" first (UPT brings deadlines and Campus Virtual), then "Or use
 * your email". Shows why the student was signed out, and why a UPT sign-in didn't finish.
 */
export function SignInCard() {
  const { t } = useTranslation()
  const {
    signInWithUpt,
    uptBusy,
    uptOutcome,
    clearUptOutcome,
    signedOutReason,
    clearSignedOutReason,
  } = useAuth()
  const [emailOpen, setEmailOpen] = useState(false)
  const uptProblem = uptOutcome?.intent === 'sign-in' ? uptOutcome.problem : null

  return (
    <section
      aria-labelledby="sign-in-title"
      className="mx-auto flex w-full max-w-sm flex-col gap-8 py-4 sm:py-10"
    >
      <header className="flex flex-col gap-2">
        <h1 id="sign-in-title" className="m-0 text-title text-ink">
          {t('signIn.title')}
        </h1>
        <p className="m-0 text-body text-ink-muted">{t('signIn.subtitle')}</p>
      </header>

      {signedOutReason && (
        <Banner
          tone={signedOutReason === 'accountDeleted' ? 'success' : 'warn'}
          role="status"
          dismissLabel={t('signIn.dismiss')}
          onDismiss={clearSignedOutReason}
        >
          {t(`signIn.reasons.${signedOutReason}`)}
        </Banner>
      )}

      {uptProblem && (
        <Banner
          tone="error"
          role="alert"
          dismissLabel={t('signIn.dismiss')}
          onDismiss={clearUptOutcome}
        >
          <ProblemMessage problem={uptProblem} />
        </Banner>
      )}

      <div className="flex flex-col gap-2">
        <Button onClick={() => void signInWithUpt()} loading={uptBusy}>
          {t('signIn.continueWithUpt')}
        </Button>
        <p className="m-0 text-center text-body-small text-ink-muted">{t('signIn.uptWhy')}</p>
      </div>

      <div className="flex flex-col gap-4 border-t border-line pt-6">
        {emailOpen ? (
          <>
            <h2 className="m-0 text-subtitle text-ink">{t('signIn.emailTitle')}</h2>
            <EmailSignIn />
          </>
        ) : (
          <Button variant="ghost" onClick={() => setEmailOpen(true)}>
            {t('signIn.useEmail')}
          </Button>
        )}
      </div>
    </section>
  )
}
