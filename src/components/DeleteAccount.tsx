import { useState, type FormEvent } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { Me } from '../api/client'
import { useDeleteAccount } from '../api/useAccount'
import { accountDeleted } from '../auth/session'
import { Banner } from './Banner'
import { Button } from './Button'
import { Dialog } from './Dialog'
import { Input } from './Input'

/** What the student types to confirm: the account's email, else its UPT email, else its name. */
function confirmationOf(user: Me): string {
  return user.email ?? user.identities.find((item) => item.email)?.email ?? user.displayName
}

/**
 * "Delete account" with a named confirmation: the dialog says what goes and asks for the account's
 * email typed out. After the API's 204 this device is signed out and lands on /account-deletion,
 * which says it's done.
 */
export function DeleteAccount({ user }: { user: Me }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const remove = useDeleteAccount()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const expected = confirmationOf(user)
  const matches = typed.trim().toLowerCase() === expected.trim().toLowerCase()

  const close = () => {
    setOpen(false)
    setTyped('')
    remove.reset()
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!matches) return
    remove
      .mutateAsync()
      .then(() => {
        // Leave the page first: signing out unmounts a page that needs a session (/account).
        navigate('/account-deletion', { replace: true })
        accountDeleted()
      })
      .catch(() => {
        // `remove.isError` shows it in the dialog.
      })
  }

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)} className="w-fit">
        {t('deleteAccount.button')}
      </Button>

      <Dialog
        open={open}
        onClose={close}
        busy={remove.isPending}
        title={t('deleteAccount.confirmTitle')}
        description={t('deleteAccount.confirmBody')}
      >
        <form onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Input
            label={
              <Trans
                t={t}
                i18nKey="deleteAccount.typeToConfirm"
                values={{ value: expected }}
                components={{ value: <strong className="font-semibold break-all text-ink" /> }}
              />
            }
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            data-autofocus
          />
          {remove.isError && (
            <Banner tone="error" role="alert">
              {t('deleteAccount.failed')}
            </Banner>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={close} disabled={remove.isPending}>
              {t('deleteAccount.cancel')}
            </Button>
            <Button type="submit" variant="danger" disabled={!matches} loading={remove.isPending}>
              {t('deleteAccount.confirm')}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
