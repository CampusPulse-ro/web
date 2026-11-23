import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'
import { Banner } from '../components/Banner'
import { DeleteAccount } from '../components/DeleteAccount'
import { buttonClasses, textLinkClasses } from '../components/styles'

const contactEmail = 'campuspulse@thorsp.net'
const deletedItems = ['account', 'methods', 'sessions', 'deadlines', 'settings', 'devices'] as const

/**
 * How to delete a CampusPulse account and what goes (Google Play links here). A signed-in student
 * can delete it right here; signed out, they sign in first or write to us.
 */
export function AccountDeletionPage() {
  const { t } = useTranslation()
  const { user, signedOutReason, clearSignedOutReason } = useAuth()

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="m-0 text-title text-ink">{t('accountDeletion.title')}</h1>
        <p className="m-0 text-body text-ink-muted">{t('accountDeletion.intro')}</p>
      </header>

      {signedOutReason === 'accountDeleted' && (
        <Banner
          tone="success"
          role="status"
          dismissLabel={t('signIn.dismiss')}
          onDismiss={clearSignedOutReason}
        >
          {t('accountDeletion.done')}
        </Banner>
      )}

      <section aria-labelledby="deletion-what" className="flex flex-col gap-3">
        <h2 id="deletion-what" className="m-0 text-heading text-ink">
          {t('accountDeletion.whatTitle')}
        </h2>
        <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-body text-ink-soft">
          {deletedItems.map((item) => (
            <li key={item}>{t(`accountDeletion.what.${item}`)}</li>
          ))}
        </ul>
        <p className="m-0 text-body-small text-ink-muted">{t('accountDeletion.campusVirtual')}</p>
      </section>

      <section aria-labelledby="deletion-kept" className="flex flex-col gap-3">
        <h2 id="deletion-kept" className="m-0 text-heading text-ink">
          {t('accountDeletion.keptTitle')}
        </h2>
        <p className="m-0 text-body text-ink-soft">{t('accountDeletion.kept')}</p>
      </section>

      <section aria-labelledby="deletion-how" className="flex flex-col gap-3">
        <h2 id="deletion-how" className="m-0 text-heading text-ink">
          {t('accountDeletion.howTitle')}
        </h2>
        {user ? (
          <>
            <p className="m-0 text-body text-ink-soft">
              <Trans
                t={t}
                i18nKey="accountDeletion.signedInAs"
                values={{ name: user.email ?? user.displayName }}
                components={{ name: <strong className="font-semibold break-all text-ink" /> }}
              />
            </p>
            <DeleteAccount user={user} />
          </>
        ) : (
          <>
            <p className="m-0 text-body text-ink-soft">{t('accountDeletion.signInFirst')}</p>
            <Link
              to="/sign-in?next=/account-deletion"
              className={`${buttonClasses('secondary')} w-fit`}
            >
              {t('auth.signIn')}
            </Link>
          </>
        )}
        <p className="m-0 text-body-small text-ink-muted">
          <Trans
            t={t}
            i18nKey="accountDeletion.contact"
            values={{ email: contactEmail }}
            components={{ mail: <a href={`mailto:${contactEmail}`} className={textLinkClasses} /> }}
          />
        </p>
      </section>
    </section>
  )
}
