import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useHref, useProto, useSnackbar, useWindowClass } from '../ctx'
import { Icon } from '../icons'
import { TopAppBar } from '../ui/Bars'
import { Segmented, SwitchRow } from '../ui/Controls'
import { Modal } from '../ui/Modal'
import { Avatar, PaneLayout } from './common'

/** Profile as Android settings: grouped lists, sign out at the bottom, delete in its own section. */
export function ProfileScreen() {
  const { data } = useProto()
  const { compact } = useWindowClass()
  const navigate = useNavigate()
  const href = useHref()
  const snack = useSnackbar()
  const [reminders, setReminders] = useState(true)
  const [lead, setLead] = useState('10')
  const [deleting, setDeleting] = useState(false)
  const g = data.timetable.studyGroup
  const optional = new Set(
    data.timetable.occurrences.filter((o) => o.optional).map((o) => o.subjectId),
  ).size

  return (
    <PaneLayout compact={compact}>
      <div className="cx-pane" style={{ paddingBottom: compact ? 96 : 32 }}>
        <div className="mx-auto max-w-[680px]">
          <TopAppBar
            large={compact}
            title="Profile"
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
          <div className="px-4">
            <ul className="cx-list">
              <li className="cx-item cx-item--three">
                <Avatar size={48} />
                <span className="cx-item-body">
                  <span className="t-title-m">Demo Student</span>
                  <span className="t-body-m c-muted">
                    Signed in with your UPT Microsoft account
                  </span>
                </span>
              </li>
            </ul>

            <h2 className="cx-section-title">Timetable</h2>
            <ul className="cx-list">
              <li>
                <button
                  type="button"
                  className="cx-item cx-item--three cx-state"
                  onClick={() => snack('Group setup isn’t part of this prototype')}
                >
                  <span className="cx-item-lead">
                    <Icon name="groups" />
                  </span>
                  <span className="cx-item-body">
                    <span className="t-body-l">
                      {g ? `${g.programmeCode}, year ${g.year}, group ${g.label}` : 'No group yet'}
                    </span>
                    <span className="t-body-m c-muted">{g?.programmeName}</span>
                  </span>
                  <span className="t-label-l c-primary">Change</span>
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="cx-item cx-state"
                  onClick={() => snack('Subject setup isn’t part of this prototype')}
                >
                  <span className="cx-item-lead">
                    <Icon name="school" />
                  </span>
                  <span className="cx-item-body">
                    <span className="t-body-l">Optional subjects</span>
                    <span className="t-body-m c-muted">{optional} chosen</span>
                  </span>
                  <Icon name="chevronRight" className="c-muted" />
                </button>
              </li>
            </ul>

            <h2 className="cx-section-title">Reminders</h2>
            <ul className="cx-list">
              <li>
                <SwitchRow
                  checked={reminders}
                  onChange={setReminders}
                  icon={reminders ? 'notificationsActive' : 'notificationsOff'}
                  label="Class reminders"
                  supporting={
                    reminders
                      ? 'A notification before each class, with its room'
                      : 'Off for every class'
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
            </ul>

            <h2 className="cx-section-title">Campus Virtual</h2>
            <ul className="cx-list">
              <li className="cx-item cx-item--three">
                <span className="cx-item-lead c-free">
                  <Icon name="checkCircle" />
                </span>
                <span className="cx-item-body">
                  <span className="t-body-l">Connected</span>
                  <span className="t-body-m c-muted">
                    Deadlines and submissions come from cv.upt.ro
                  </span>
                </span>
              </li>
              <li>
                <button
                  type="button"
                  className="cx-item cx-state"
                  onClick={() => snack('Disconnecting isn’t part of this prototype')}
                >
                  <span className="cx-item-lead">
                    <Icon name="link" />
                  </span>
                  <span className="cx-item-body t-body-l">Disconnect Campus Virtual</span>
                </button>
              </li>
            </ul>

            <h2 className="cx-section-title">Language</h2>
            <ul className="cx-list">
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
            </ul>

            <h2 className="cx-section-title">About</h2>
            <ul className="cx-list">
              <li className="cx-item cx-item--three">
                <span className="cx-item-lead">
                  <Icon name="info" />
                </span>
                <span className="cx-item-body">
                  <span className="t-body-l">Where the timetable comes from</span>
                  <span className="t-body-m c-muted">
                    The official UPT timetable. CampusPulse is a student project, not a UPT app.
                  </span>
                </span>
              </li>
              <li>
                <Link to="/privacy" className="cx-item cx-state">
                  <span className="cx-item-lead">
                    <Icon name="lock" />
                  </span>
                  <span className="cx-item-body t-body-l">Privacy policy</span>
                  <Icon name="openInNew" className="c-muted" size={20} />
                </Link>
              </li>
            </ul>

            <button
              type="button"
              className="cx-btn cx-btn--tonal cx-btn--lg cx-state mt-8 w-full"
              onClick={() => navigate(href(''))}
            >
              <Icon name="logout" size={20} />
              Sign out
            </button>

            <h2 className="cx-section-title mt-6" style={{ color: 'var(--md-sys-color-error)' }}>
              Delete account
            </h2>
            <ul className="cx-list">
              <li>
                <button
                  type="button"
                  className="cx-item cx-item--three cx-state"
                  onClick={() => setDeleting(true)}
                >
                  <span className="cx-item-lead c-error">
                    <Icon name="delete" />
                  </span>
                  <span className="cx-item-body">
                    <span className="t-body-l c-error">Delete my CampusPulse account</span>
                    <span className="t-body-m c-muted">
                      Your settings and reminders go. Campus Virtual isn’t touched.
                    </span>
                  </span>
                </button>
              </li>
            </ul>
          </div>
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
          This removes your group, optional subjects and reminders from CampusPulse, and signs you
          out on every device. Your Campus Virtual account and coursework stay as they are.
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
