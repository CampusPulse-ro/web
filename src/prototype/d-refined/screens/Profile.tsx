import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useHref, useProto, useSnackbar, useWindowClass } from '../ctx'
import { haptic } from '../haptics'
import { Icon, type IconName } from '../icons'
import { TopAppBar } from '../ui/Bars'
import { Segmented, SwitchRow } from '../ui/Controls'
import { Modal } from '../ui/Modal'
import { Avatar, PaneLayout } from './common'

function Group({
  title,
  children,
  danger,
}: {
  title: string
  children: ReactNode
  danger?: boolean
}) {
  return (
    <section aria-label={title} className="break-inside-avoid">
      <h2
        className="cx-section-title"
        style={danger ? { color: 'var(--md-sys-color-error)' } : undefined}
      >
        {title}
      </h2>
      <ul className="cx-list">{children}</ul>
    </section>
  )
}

function Row({
  icon,
  title,
  sub,
  trail,
  onClick,
  tone,
}: {
  icon: IconName
  title: ReactNode
  sub?: ReactNode
  trail?: ReactNode
  onClick?: () => void
  tone?: 'error' | 'free'
}) {
  const inner = (
    <>
      <span
        className={`cx-item-lead ${tone === 'error' ? 'c-error' : tone === 'free' ? 'c-free' : ''}`}
      >
        <Icon name={icon} />
      </span>
      <span className="cx-item-body">
        <span className={`t-body-l ${tone === 'error' ? 'c-error' : ''}`}>{title}</span>
        {sub && <span className="t-body-m c-muted">{sub}</span>}
      </span>
      {trail}
    </>
  )
  return (
    <li>
      {onClick ? (
        <button
          type="button"
          className={`cx-item cx-state ${sub ? 'cx-item--three' : ''}`}
          onClick={onClick}
        >
          {inner}
        </button>
      ) : (
        <div className={`cx-item ${sub ? 'cx-item--three' : ''}`}>{inner}</div>
      )}
    </li>
  )
}

/**
 * Profile as Android settings on the phone; on a wide window, the account on the left and the
 * settings in columns on the right. The account is CampusPulse's own (email code); UPT is a linked
 * account that brings Campus Virtual in.
 */
export function ProfileScreen() {
  const { data, account, setAccount } = useProto()
  const { compact, expanded } = useWindowClass()
  const navigate = useNavigate()
  const href = useHref()
  const snack = useSnackbar()
  const [reminders, setReminders] = useState(true)
  const [lead, setLead] = useState('10')
  const [offline, setOffline] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const g = data.timetable.studyGroup
  const optional = new Set(
    data.timetable.occurrences.filter((o) => o.optional).map((o) => o.subjectId),
  ).size
  if (!account) return null
  const linked = account.uptLinked

  const accountCard = (
    <div
      className="flex flex-col gap-4 p-5"
      style={{ background: 'var(--md-sys-color-surface-container)', borderRadius: 28 }}
    >
      <div className="flex items-center gap-4">
        <Avatar size={compact ? 56 : 72} />
        <div className="min-w-0">
          <p className="t-title-l">Demo Student</p>
          <p className="t-body-m c-muted truncate">{account.email}</p>
        </div>
      </div>
      <p className="t-body-m c-muted">
        Your CampusPulse account.{' '}
        {account.via === 'upt'
          ? 'You sign in with UPT.'
          : 'You sign in with a code sent to your email.'}
      </p>
    </div>
  )

  const linkedGroup = (
    <Group title="Linked accounts">
      {linked ? (
        <Row
          icon="school"
          title="UPT"
          sub={
            <>
              d.student@student.upt.ro
              <br />
              Campus Virtual is connected: courses, deadlines, grades
            </>
          }
          trail={
            <button
              type="button"
              className="cx-btn cx-btn--text cx-state flex-none"
              onClick={() => {
                setAccount({ ...account, uptLinked: false, via: 'email' })
                snack('UPT unlinked: Campus Virtual data is gone from the app')
              }}
            >
              Unlink
            </button>
          }
        />
      ) : (
        <li
          className="cx-item flex-col !items-start gap-3 py-4"
          style={{ background: 'var(--md-sys-color-primary-container)' }}
        >
          <span style={{ color: 'var(--md-sys-color-on-primary-container)' }}>
            <span className="t-title-m block">Link your UPT account</span>
            <span className="t-body-m block">
              Your courses, deadlines and grades from Campus Virtual, and handing in from the app.
            </span>
          </span>
          <button
            type="button"
            className="cx-btn cx-btn--filled cx-state"
            onClick={() => {
              setAccount({ ...account, uptLinked: true })
              haptic('success')
              snack('UPT account linked')
            }}
          >
            <Icon name="school" size={18} />
            Continue with UPT
          </button>
        </li>
      )}
    </Group>
  )

  const settings = [
    <Group key="tt" title="Timetable">
      <Row
        icon="groups"
        title={g ? `${g.programmeCode}, year ${g.year}, group ${g.label}` : 'No group yet'}
        sub={g?.programmeName}
        onClick={() => snack('Group setup isn’t part of this prototype')}
        trail={<span className="t-label-l c-primary flex-none">Change</span>}
      />
      <Row
        icon="school"
        title="Optional subjects"
        sub={`${optional} chosen`}
        onClick={() => snack('Subject setup isn’t part of this prototype')}
        trail={<Icon name="chevronRight" className="c-muted" />}
      />
    </Group>,
    <Group key="rem" title="Reminders">
      <li>
        <SwitchRow
          checked={reminders}
          onChange={setReminders}
          icon={reminders ? 'notificationsActive' : 'notificationsOff'}
          label="Class reminders"
          supporting={
            reminders ? 'Before each class, with the room and building' : 'Off for every class'
          }
        />
      </li>
      {reminders && (
        <li className="cx-item flex-col !items-stretch !gap-3 py-4">
          <span className="t-body-l">How long before</span>
          <Segmented
            label="How long before"
            small
            value={lead}
            onChange={setLead}
            options={['5', '10', '15', '30'].map((v) => ({ value: v, label: `${v} min` }))}
          />
        </li>
      )}
    </Group>,
    <Group key="cv" title="Campus Virtual">
      <Row
        icon={linked ? 'cloudDone' : 'linkOff'}
        tone={linked ? 'free' : undefined}
        title={linked ? 'Synced' : 'Not linked'}
        sub={linked ? 'Courses, deadlines and grades, every 15 minutes' : 'Link UPT above to sync'}
      />
      {linked && (
        <li>
          <SwitchRow
            checked={offline}
            onChange={setOffline}
            icon="cloudDone"
            label="Keep course files offline"
            supporting="This week’s files, on Wi-Fi only"
          />
        </li>
      )}
    </Group>,
    <Group key="lang" title="Language">
      <li className="cx-item py-4">
        <Segmented
          label="Language"
          className="w-full"
          value="en"
          onChange={(v) => v === 'ro' && snack('The prototype is in English only')}
          options={[
            { value: 'en', label: 'English' },
            { value: 'ro', label: 'Română' },
          ]}
        />
      </li>
    </Group>,
    <Group key="about" title="About">
      <Row
        icon="info"
        title="Where the data comes from"
        sub="The official UPT timetable and your Campus Virtual. CampusPulse is a student project, not a UPT app."
      />
      <li>
        <Link to="/privacy" className="cx-item cx-state">
          <span className="cx-item-lead">
            <Icon name="lock" />
          </span>
          <span className="cx-item-body t-body-l">Privacy policy</span>
          <Icon name="openInNew" className="c-muted" size={20} />
        </Link>
      </li>
    </Group>,
  ]

  const signOut = (
    <button
      type="button"
      className="cx-btn cx-btn--tonal cx-btn--lg cx-state mt-8 w-full"
      onClick={() => {
        setAccount(null)
        navigate(href('/sign-in'))
      }}
    >
      <Icon name="logout" size={20} />
      Sign out
    </button>
  )
  const danger = (
    <Group title="Delete account" danger>
      <Row
        icon="delete"
        tone="error"
        title="Delete my CampusPulse account"
        sub="Your settings, reminders and own deadlines go. Campus Virtual isn’t touched."
        onClick={() => setDeleting(true)}
      />
    </Group>
  )

  return (
    <PaneLayout compact={compact}>
      <div className="cx-pane" style={{ paddingBottom: compact ? 96 : 40 }}>
        <div className={compact ? '' : 'mx-auto max-w-[1180px] px-6'}>
          <TopAppBar
            large={compact}
            title="Profile and settings"
            smallTitle="Profile"
            leading={
              compact ? (
                <button
                  type="button"
                  className="cx-icon-btn cx-state ml-1"
                  aria-label="Back"
                  onClick={() => navigate(-1)}
                >
                  <Icon name="arrowBack" />
                </button>
              ) : undefined
            }
          />
          {compact ? (
            <div className="px-4">
              {accountCard}
              {linkedGroup}
              {settings}
              {signOut}
              {danger}
            </div>
          ) : (
            <div
              className="grid gap-8 px-2"
              style={{
                gridTemplateColumns: expanded ? '360px minmax(0, 1fr)' : '300px minmax(0, 1fr)',
              }}
            >
              <aside className="flex flex-col">
                {accountCard}
                {linkedGroup}
                {signOut}
                {danger}
              </aside>
              <div className={expanded ? 'columns-2 gap-6' : ''}>{settings}</div>
            </div>
          )}
        </div>
      </div>
      <Modal
        open={deleting}
        onClose={() => setDeleting(false)}
        label="Delete your account?"
        variant="center"
      >
        <span className="c-error">
          <Icon name="delete" />
        </span>
        <h2 className="t-headline-s mt-4">Delete your CampusPulse account?</h2>
        <p className="t-body-m c-muted mt-4">
          This removes your group, optional subjects, reminders and your own deadlines, unlinks UPT
          and signs you out on every device. Your Campus Virtual account and coursework stay as they
          are.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="cx-btn cx-btn--text cx-state"
            onClick={() => setDeleting(false)}
            autoFocus
          >
            Cancel
          </button>
          <button
            type="button"
            className="cx-btn cx-btn--danger cx-state"
            onClick={() => {
              setDeleting(false)
              snack('Not in the prototype: nothing was deleted')
            }}
          >
            Delete account
          </button>
        </div>
      </Modal>
    </PaneLayout>
  )
}
