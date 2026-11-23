import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiError, type Me } from '../api/client'
import { useMe, useUnlinkUpt } from '../api/useAccount'
import { useAuth } from '../auth'
import { ProblemMessage } from '../auth/ProblemMessage'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { DeleteAccount } from '../components/DeleteAccount'
import { Dialog } from '../components/Dialog'
import { Icon } from '../components/Icon'
import { useDateTimeFormat } from '../i18n/format'

/** The account: how the student signs in (email, UPT), deleting it, and signing out. */
export function AccountPage() {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  // Re-read on every visit: UPT may have been linked or unlinked on another device.
  useMe()
  if (!user) return null

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-10">
      <header className="flex flex-col gap-2">
        <h1 className="m-0 text-title text-ink">{t('account.title')}</h1>
        <p className="m-0 text-body text-ink-muted">{user.displayName}</p>
      </header>

      <SignInMethods user={user} />

      <section aria-labelledby="account-delete" className="flex flex-col gap-3">
        <h2 id="account-delete" className="m-0 text-heading text-danger">
          {t('deleteAccount.title')}
        </h2>
        <p className="m-0 max-w-prose text-body-small text-ink-soft">{t('deleteAccount.body')}</p>
        <DeleteAccount user={user} />
      </section>

      <div className="border-t border-line pt-6">
        <Button variant="secondary" onClick={() => void signOut()}>
          <Icon name="logout" size={18} />
          {t('auth.signOut')}
        </Button>
      </div>
    </section>
  )
}

function SignInMethods({ user }: { user: Me }) {
  const { t } = useTranslation()
  const format = useDateTimeFormat()
  const { linkUpt, uptBusy, uptOutcome, clearUptOutcome } = useAuth()
  const unlink = useUnlinkUpt()
  const [confirming, setConfirming] = useState(false)
  const upt = user.identities.find((item) => item.provider === 'upt-microsoft')
  const linkOutcome = uptOutcome?.intent === 'link' ? uptOutcome : null
  // Without an email, UPT is the only way back in: the API refuses to unlink it.
  const canUnlink = user.email !== null

  const unlinkRefusal =
    unlink.error instanceof ApiError && unlink.error.type === 'last-sign-in-method'
      ? t('account.upt.lastMethod')
      : unlink.isError
        ? t('account.upt.unlinkFailed')
        : null

  return (
    <section aria-labelledby="account-methods" className="flex flex-col gap-4">
      <h2 id="account-methods" className="m-0 text-heading text-ink">
        {t('account.methodsTitle')}
      </h2>

      {linkOutcome && (
        <Banner
          tone={linkOutcome.problem ? 'error' : 'success'}
          role={linkOutcome.problem ? 'alert' : 'status'}
          dismissLabel={t('signIn.dismiss')}
          onDismiss={clearUptOutcome}
        >
          {linkOutcome.problem ? (
            <ProblemMessage problem={linkOutcome.problem} />
          ) : (
            t('account.upt.linked')
          )}
        </Banner>
      )}
      {unlinkRefusal && (
        <Banner tone="error" role="alert">
          {unlinkRefusal}
        </Banner>
      )}
      {unlink.isSuccess && !upt && (
        <Banner tone="success" role="status">
          {t('account.upt.unlinked')}
        </Banner>
      )}

      <dl className="m-0 flex flex-col divide-y divide-line border-y border-line">
        <div className="flex flex-col gap-1 py-4">
          <dt className="text-label text-ink">{t('account.email.label')}</dt>
          <dd className="m-0 text-body-small break-all text-ink-soft">
            {user.email ?? t('account.email.none')}
          </dd>
        </div>

        <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <dt className="text-label text-ink">{t('account.upt.label')}</dt>
            <dd className="m-0 flex flex-col gap-0.5 text-body-small text-ink-soft">
              {upt ? (
                <>
                  <span className="break-all">{upt.email ?? t('account.upt.linkedNoEmail')}</span>
                  <span className="text-caption text-ink-muted">
                    {t('account.upt.linkedOn', { date: format.date(Date.parse(upt.linkedAt)) })}
                  </span>
                </>
              ) : (
                <>
                  <span>{t('account.upt.notLinked')}</span>
                  <span className="text-ink-muted">{t('account.upt.why')}</span>
                </>
              )}
            </dd>
          </div>
          {upt ? (
            <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
              <Button
                variant="secondary"
                size="sm"
                disabled={!canUnlink}
                onClick={() => {
                  unlink.reset()
                  setConfirming(true)
                }}
              >
                {t('account.upt.unlink')}
              </Button>
              {!canUnlink && (
                <span className="max-w-60 text-caption text-ink-muted sm:text-right">
                  {t('account.upt.lastMethod')}
                </span>
              )}
            </div>
          ) : (
            <Button
              size="sm"
              className="shrink-0"
              loading={uptBusy}
              onClick={() => {
                unlink.reset()
                void linkUpt()
              }}
            >
              {t('account.upt.link')}
            </Button>
          )}
        </div>
      </dl>

      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        busy={unlink.isPending}
        title={t('account.upt.unlinkTitle')}
        description={t('account.upt.unlinkBody', { email: user.email ?? '' })}
      >
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={() => setConfirming(false)}
            disabled={unlink.isPending}
            data-autofocus
          >
            {t('account.upt.cancel')}
          </Button>
          <Button
            variant="danger"
            loading={unlink.isPending}
            onClick={() => {
              clearUptOutcome()
              unlink.mutate(undefined, { onSettled: () => setConfirming(false) })
            }}
          >
            {t('account.upt.unlinkConfirm')}
          </Button>
        </div>
      </Dialog>
    </section>
  )
}
