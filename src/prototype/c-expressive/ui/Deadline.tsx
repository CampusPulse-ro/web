import type { Assignment } from '../../data'
import { useProto } from '../ctx'
import { Icon, type IconName } from '../icons'
import {
  bytes,
  cutoffState,
  dueLabel,
  fileTypesText,
  hhmm,
  longDate,
  relativeDue,
  STATUS_TEXT,
  urgencyOf,
  wallOf,
} from '../model'
import { SubjectAvatar } from './Shape'

const STATUS_ICON: Record<Assignment['status'], IconName> = {
  notsubmitted: 'radioButtonUnchecked',
  draft: 'editNote',
  submitted: 'checkCircle',
  graded: 'star',
}

/** One assignment: course shape, name, Moodle state; how long left (or late) trailing. */
export function AssignmentRow({
  a,
  onOpen,
  selected = false,
}: {
  a: Assignment
  onOpen: (a: Assignment) => void
  selected?: boolean
}) {
  const { now, looks } = useProto()
  const urgency = urgencyOf(a, now)
  const look = looks.get(a.shortName)
  const late = urgency === 'overdue'
  const cut = cutoffState(a, now)
  const status = a.status === 'graded' && a.grade ? `Graded ${a.grade}` : STATUS_TEXT[a.status]
  return (
    <button
      type="button"
      className={`cx-item cx-item--three cx-state ${selected ? 'cx-item--selected' : ''}`}
      aria-current={selected ? 'true' : undefined}
      onClick={() => onOpen(a)}
    >
      {look ? (
        <SubjectAvatar
          short={a.shortName}
          tone={look.tone}
          shape={look.shape}
          past={urgency === 'done'}
        />
      ) : (
        <span className="cx-item-lead">
          <Icon name="assignment" />
        </span>
      )}
      <span className="cx-item-body">
        <span className="t-body-l line-clamp-2">{a.name}</span>
        <span className="t-body-m c-muted flex items-center gap-1.5 truncate">
          <Icon name={STATUS_ICON[a.status]} size={16} />
          <span className="truncate">{status}</span>
        </span>
      </span>
      <span className="cx-item-trail">
        {urgency === 'done' ? (
          <span className="t-body-s c-muted tnum">{dueLabel(a.dueAt, now)}</span>
        ) : (
          <>
            <span
              className={`t-label-l t-e tnum ${late ? 'c-error' : urgency === 'today' ? 'c-live' : ''}`}
            >
              {relativeDue(a, now)}
            </span>
            <span className="t-body-s c-muted tnum">
              {late && cut === 'late-ok'
                ? 'still accepted'
                : late && cut === 'closed'
                  ? 'closed'
                  : dueLabel(a.dueAt, now)}
            </span>
          </>
        )}
      </span>
    </button>
  )
}

/** The assignment's detail: when, what Moodle says, and the limits up front. */
export function AssignmentDetail({ a }: { a: Assignment }) {
  const { now, looks } = useProto()
  const look = looks.get(a.shortName)
  const due = wallOf(a.dueAt)
  const cut = cutoffState(a, now)
  const urgency = urgencyOf(a, now)
  const done = urgency === 'done'

  return (
    <div>
      <div className="flex items-center gap-3">
        {look && (
          <SubjectAvatar short={a.shortName} tone={look.tone} shape={look.shape} size={52} />
        )}
        <span className="t-body-m c-muted">{a.course}</span>
      </div>
      <h2 className="t-headline-s mt-3">{a.name}</h2>
      <p
        className={`t-title-m mt-1 ${urgency === 'overdue' ? 'c-error' : done ? 'c-muted' : 'c-live'}`}
      >
        {done
          ? a.status === 'graded'
            ? `Graded: ${a.grade ?? 'see Campus Virtual'}`
            : 'Submitted for grading'
          : urgency === 'overdue'
            ? `Due ${relativeDue(a, now).replace(' late', ' ago')}`
            : `Due ${relativeDue(a, now)}`}
      </p>

      <h3 className="cx-section-title">When</h3>
      <ul className="cx-list">
        <li className="cx-item">
          <span className="cx-item-lead">
            <Icon name="schedule" />
          </span>
          <span className="cx-item-body">
            <span className="t-body-l tnum">
              {longDate(due.date)}, {hhmm(due.minutes)}
            </span>
            <span className="t-body-m c-muted">Due date</span>
          </span>
        </li>
        {a.cutoffAt && (
          <li className="cx-item">
            <span className="cx-item-lead">
              <Icon name="lock" />
            </span>
            <span className="cx-item-body">
              <span className="t-body-l tnum">
                {longDate(wallOf(a.cutoffAt).date)}, {hhmm(wallOf(a.cutoffAt).minutes)}
              </span>
              <span className="t-body-m c-muted">
                {cut === 'late-ok'
                  ? 'Cut-off: late work is still accepted until then'
                  : cut === 'closed'
                    ? 'Cut-off passed: Campus Virtual takes nothing more'
                    : 'Cut-off: nothing can be submitted after it'}
              </span>
            </span>
          </li>
        )}
      </ul>

      <h3 className="cx-section-title">Your submission</h3>
      <ul className="cx-list">
        <li className="cx-item">
          <span className="cx-item-lead">
            <Icon name={STATUS_ICON[a.status]} />
          </span>
          <span className="cx-item-body">
            <span className="t-body-l">{STATUS_TEXT[a.status]}</span>
            <span className="t-body-m c-muted tnum">
              {a.status === 'submitted' && a.submittedAt
                ? `Sent ${longDate(wallOf(a.submittedAt).date)}, ${hhmm(wallOf(a.submittedAt).minutes)}`
                : a.status === 'draft'
                  ? 'Saved on Campus Virtual, your teacher can’t grade it yet'
                  : a.status === 'graded'
                    ? (a.grade ?? '')
                    : 'Nothing uploaded'}
            </span>
          </span>
        </li>
        <li className="cx-item">
          <span className="cx-item-lead">
            <Icon name="uploadFile" />
          </span>
          <span className="cx-item-body">
            <span className="t-body-l">
              {a.maxFiles === 1 ? '1 file' : `Up to ${a.maxFiles} files`}, {bytes(a.maxBytes)} each
            </span>
            <span className="t-body-m c-muted">{fileTypesText(a.fileTypes)}</span>
          </span>
        </li>
      </ul>
      <p className="t-body-s c-muted mt-3 px-1">
        Submitting from the app isn’t part of this prototype. In the app it asks for confirmation,
        checks these limits first and waits for Campus Virtual to confirm.
      </p>
      <a
        href={`https://cv.upt.ro/mod/assign/view.php?id=${a.id}`}
        target="_blank"
        rel="noreferrer"
        className="cx-btn cx-btn--tonal cx-btn--lg cx-state mt-5 w-full"
      >
        <Icon name="openInNew" size={20} />
        Open in Campus Virtual
      </a>
    </div>
  )
}
