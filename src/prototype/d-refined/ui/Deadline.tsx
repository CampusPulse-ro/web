import { AnimatePresence, m } from 'motion/react'
import { useRef, useState, type ReactNode } from 'react'
import {
  cutoffOf,
  DUE_ICON,
  dueWall,
  isDone,
  KIND_TEXT,
  minutesToDue,
  statusLine,
  urgencyOf,
  type DueItem,
} from '../campus'
import { useProto, useSnackbar } from '../ctx'
import { haptic } from '../haptics'
import { Icon } from '../icons'
import { bytes, dueLabel, fileTypesText, hhmm, longDate, relativeDue } from '../model'
import { springs } from '../motion'
import { VisuallyHidden } from './Controls'
import { Modal } from './Modal'
import { LoadingIndicator, SubjectAvatar } from './Shape'

const at = (s: string) => ({
  date: s.slice(0, 10),
  minutes: +s.slice(11, 13) * 60 + +s.slice(14, 16),
})
const nowStamp = (date: string, minutes: number) => `${date}T${hhmm(minutes)}`

/** The deadline's course shape, or a plain mark for one that belongs to no course. */
function DueAvatar({ d, size = 40 }: { d: DueItem; size?: number }) {
  const { looks } = useProto()
  const look = d.short ? looks.get(d.short) : undefined
  if (look && d.short)
    return (
      <SubjectAvatar
        short={d.short}
        tone={look.tone}
        shape={look.shape}
        size={size}
        past={isDone(d)}
      />
    )
  return (
    <span
      className="grid flex-none place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: 'var(--md-sys-color-surface-container-highest)',
        color: 'var(--md-sys-color-on-surface-variant)',
      }}
    >
      <Icon name="checklist" size={size * 0.5} />
    </span>
  )
}

/** One deadline: course shape, name, what kind and where it stands; how long left trailing. */
export function DueRow({
  d,
  onOpen,
  selected = false,
}: {
  d: DueItem
  onOpen: (d: DueItem) => void
  selected?: boolean
}) {
  const { now } = useProto()
  const urgency = urgencyOf(d, now)
  const late = urgency === 'overdue'
  const cut = cutoffOf(d, now)
  return (
    <button
      type="button"
      className={`cx-item cx-item--three cx-state ${selected ? 'cx-item--selected' : ''}`}
      aria-current={selected ? 'true' : undefined}
      onClick={() => onOpen(d)}
    >
      <DueAvatar d={d} />
      <span className="cx-item-body">
        <span className={`t-body-l line-clamp-2 ${isDone(d) ? 'c-muted' : ''}`}>{d.name}</span>
        <span className="t-body-m c-muted flex items-center gap-1.5">
          <Icon name={DUE_ICON[d.kind]} size={16} />
          <span className="truncate">
            <VisuallyHidden>{`${KIND_TEXT[d.kind]}: `}</VisuallyHidden>
            {statusLine(d)}
          </span>
        </span>
      </span>
      <span className="cx-item-trail">
        {urgency === 'done' ? (
          <span className="t-body-s c-muted tnum">{dueLabel(d.dueAt, now)}</span>
        ) : (
          <>
            <span className={`t-label-l t-e tnum ${late ? 'c-error' : ''}`}>
              {relativeDue(minutesToDue(d, now))}
            </span>
            <span className="t-body-s c-muted tnum">
              {late && cut === 'late-ok'
                ? 'still accepted'
                : late && cut === 'closed'
                  ? 'closed'
                  : dueLabel(d.dueAt, now)}
            </span>
          </>
        )}
      </span>
    </button>
  )
}

/**
 * A deadline opened in the app, the way Campus Virtual's own app would show it, plus more: hand
 * in an assignment, start a quiz, reply in a forum, tick off your own deadline. Opening the
 * website is the secondary action.
 */
export function DueDetail({ d, wide = false }: { d: DueItem; wide?: boolean }) {
  const { data, now } = useProto()
  const urgency = urgencyOf(d, now)
  const cut = cutoffOf(d, now)
  const due = dueWall(d)
  const courseUrl = data.timetable.occurrences.find(
    (o) => o.shortName === d.short,
  )?.campusVirtualUrl
  const left = minutesToDue(d, now)

  return (
    <div
      className={wide ? 'grid gap-10' : ''}
      style={wide ? { gridTemplateColumns: 'minmax(0, 1fr) 300px' } : undefined}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <DueAvatar d={d} size={52} />
          <div className="min-w-0">
            <p className="t-body-m c-muted truncate">{d.course ?? 'Your own deadline'}</p>
            <p className="t-label-m c-muted flex items-center gap-1">
              <Icon name={DUE_ICON[d.kind]} size={14} />
              {KIND_TEXT[d.kind]}
            </p>
          </div>
        </div>
        <h2 className="t-headline-s mt-3">{d.name}</h2>
        <p
          className={`t-title-m mt-1 ${urgency === 'overdue' ? 'c-error' : urgency === 'done' ? 'c-muted' : 'c-primary'}`}
        >
          {urgency === 'done'
            ? statusLine(d)
            : left < 0
              ? `Due ${relativeDue(left).replace(' late', ' ago')}${cut === 'late-ok' ? ', late work still accepted' : cut === 'closed' ? ', closed' : ''}`
              : `Due ${relativeDue(left)}`}
        </p>

        {d.kind === 'assign' && <AssignmentActions d={d} closed={cut === 'closed'} />}
        {d.kind === 'quiz' && <QuizActions d={d} closed={cut === 'closed'} />}
        {d.kind === 'forum' && <ForumActions d={d} />}
        {d.kind === 'manual' && <ManualActions d={d} />}
      </div>
      <div className={wide ? 'pt-14' : ''}>
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
              <span className="t-body-m c-muted">{d.kind === 'quiz' ? 'Closes' : 'Due'}</span>
            </span>
          </li>
          {d.cutoffAt && (
            <li className="cx-item">
              <span className="cx-item-lead">
                <Icon name="lock" />
              </span>
              <span className="cx-item-body">
                <span className="t-body-l tnum">
                  {longDate(at(d.cutoffAt).date)}, {hhmm(at(d.cutoffAt).minutes)}
                </span>
                <span className="t-body-m c-muted">
                  {cut === 'late-ok'
                    ? 'Cut-off: late work is still accepted until then'
                    : cut === 'closed'
                      ? 'Cut-off passed: Campus Virtual takes nothing more'
                      : 'Cut-off: nothing can be handed in after it'}
                </span>
              </span>
            </li>
          )}
        </ul>

        {d.kind !== 'manual' && courseUrl && (
          <a
            href={courseUrl}
            target="_blank"
            rel="noreferrer"
            className="cx-btn cx-btn--text cx-state mt-4 -ml-3"
          >
            <Icon name="openInNew" size={18} />
            Open on the Campus Virtual website
          </a>
        )}
      </div>
    </div>
  )
}

function Card({ children }: { children: ReactNode }) {
  return (
    <div
      className="mt-5 p-4"
      style={{ background: 'var(--md-sys-color-surface-container)', borderRadius: 24 }}
    >
      {children}
    </div>
  )
}

/* ── Assignment: hand it in from the app ─────────────────────────────────────────────────── */

function AssignmentActions({ d, closed }: { d: DueItem; closed: boolean }) {
  const { now, patchDue } = useProto()
  const snack = useSnackbar()
  const a = d.assignment!
  const input = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<{ name: string; size: number }[]>(() =>
    (d.files ?? []).map((n) => ({ name: n, size: 1_240_000 })),
  )
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [sending, setSending] = useState(false)
  const done = d.status === 'submitted' || d.status === 'graded'

  const pick = (list: FileList | null) => {
    if (!list?.length) return
    const f = list[0]
    const ext = `.${f.name.split('.').pop()?.toLowerCase()}`
    let problem: string | null = null
    if (!a.fileTypes.includes(ext))
      problem = `${f.name} isn’t allowed here: ${fileTypesText(a.fileTypes)}.`
    else if (f.size > a.maxBytes)
      problem = `${f.name} is ${bytes(f.size)}; the limit is ${bytes(a.maxBytes)}.`
    else if (files.length >= a.maxFiles)
      problem = `Only ${a.maxFiles} ${a.maxFiles === 1 ? 'file' : 'files'}: remove one first.`
    if (problem) {
      setError(problem)
      haptic('selection')
      return
    }
    setError(null)
    setFiles((x) => [...x, { name: f.name, size: f.size }])
  }

  const submit = () => {
    setConfirm(false)
    setSending(true)
    setTimeout(() => {
      setSending(false)
      patchDue(d.id, {
        status: 'submitted',
        submittedAt: nowStamp(now.date, now.minutes),
        files: files.map((f) => f.name),
      })
      haptic('success')
    }, 1300)
  }

  if (done)
    return (
      <Card>
        <AnimatePresence initial={false}>
          <m.div
            key="receipt"
            className="flex items-start gap-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={springs.spatialFast}
          >
            <DrawnCheck />
            <div>
              <p className="t-title-m">
                {d.status === 'graded' ? `Graded: ${d.grade ?? ''}` : 'Submitted for grading'}
              </p>
              <p className="t-body-m c-muted">
                {d.submittedAt
                  ? `Sent ${longDate(d.submittedAt.slice(0, 10))}, ${d.submittedAt.slice(11, 16)}`
                  : 'Campus Virtual has it'}
                {d.files?.length
                  ? `, ${d.files.length} ${d.files.length === 1 ? 'file' : 'files'}`
                  : ''}
              </p>
              {d.files?.map((f) => (
                <p key={f} className="t-body-m mt-2 flex items-center gap-2">
                  <Icon name="description" size={18} className="c-muted" />
                  {f}
                </p>
              ))}
            </div>
          </m.div>
        </AnimatePresence>
      </Card>
    )

  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <p className="t-title-m">Your submission</p>
        <span className="t-label-m c-muted">
          {d.status === 'draft' ? 'Draft on Campus Virtual' : 'Nothing handed in'}
        </span>
      </div>
      <p className="t-body-m c-muted mt-1">
        {a.maxFiles === 1 ? '1 file' : `Up to ${a.maxFiles} files`}, {bytes(a.maxBytes)} each,{' '}
        {fileTypesText(a.fileTypes)}
      </p>
      <ul className="mt-3 flex flex-col gap-1">
        <AnimatePresence initial={false}>
          {files.map((f, i) => (
            <m.li
              key={f.name + i}
              className="flex items-center gap-3 rounded-xl px-3 py-2"
              style={{ background: 'var(--md-sys-color-surface-container-high)' }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ height: springs.spatialFast, opacity: springs.effectsFast }}
            >
              <Icon name="description" size={20} className="c-muted" />
              <span className="t-body-m min-w-0 flex-1 truncate">{f.name}</span>
              <span className="t-body-s c-muted tnum">{bytes(f.size)}</span>
              <button
                type="button"
                className="cx-icon-btn cx-state -mr-2"
                aria-label={`Remove ${f.name}`}
                onClick={() => setFiles((x) => x.filter((_, j) => j !== i))}
              >
                <Icon name="close" size={20} />
              </button>
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
      {error && (
        <p className="t-body-m c-error mt-2 flex items-start gap-2" role="alert">
          <Icon name="error" size={18} />
          {error}
        </p>
      )}
      <input
        ref={input}
        type="file"
        className="hidden"
        accept={a.fileTypes.join(',')}
        onChange={(e) => {
          pick(e.target.files)
          e.target.value = ''
        }}
      />
      {closed ? (
        <p className="t-body-m c-muted mt-3">
          The cut-off has passed: Campus Virtual takes nothing more.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={`cx-btn ${files.length ? 'cx-btn--tonal' : 'cx-btn--filled'} cx-state`}
            onClick={() => input.current?.click()}
            disabled={files.length >= a.maxFiles}
          >
            <Icon name="attachment" size={18} />
            Add a file
          </button>
          {files.length > 0 && (
            <>
              <button
                type="button"
                className="cx-btn cx-btn--text cx-state"
                onClick={() => {
                  patchDue(d.id, { status: 'draft', files: files.map((f) => f.name) })
                  snack('Draft saved on Campus Virtual')
                }}
              >
                Save draft
              </button>
              <button
                type="button"
                className="cx-btn cx-btn--filled cx-state ml-auto"
                onClick={() => setConfirm(true)}
                disabled={sending}
              >
                {sending ? (
                  <>
                    <LoadingIndicator size={24} label="Sending to Campus Virtual" />
                    Sending
                  </>
                ) : (
                  <>
                    <Icon name="send" size={18} />
                    Submit for grading
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        label="Submit for grading?"
        variant="center"
      >
        <span className="c-primary">
          <Icon name="send" />
        </span>
        <h2 className="t-headline-s mt-4">Submit for grading?</h2>
        <p className="t-body-m c-muted mt-4">
          {files.length} {files.length === 1 ? 'file' : 'files'} go to Campus Virtual for “{d.name}
          ”. After this you can’t change them unless your teacher reopens it.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="cx-btn cx-btn--text cx-state"
            onClick={() => setConfirm(false)}
            autoFocus
          >
            Cancel
          </button>
          <button type="button" className="cx-btn cx-btn--filled cx-state" onClick={submit}>
            Submit
          </button>
        </div>
      </Modal>
    </Card>
  )
}

/** The success receipt's check, drawn once. */
function DrawnCheck() {
  return (
    <span
      className="grid h-10 w-10 flex-none place-items-center rounded-full"
      style={{ background: 'var(--cx-free-container)', color: 'var(--cx-free-on-container)' }}
      aria-hidden="true"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <m.path
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, ease: [0.2, 0, 0, 1], delay: 0.1 }}
        />
      </svg>
    </span>
  )
}

/* ── Quiz ────────────────────────────────────────────────────────────────────────────────── */

function QuizActions({ d, closed }: { d: DueItem; closed: boolean }) {
  const snack = useSnackbar()
  const [confirm, setConfirm] = useState(false)
  const q = d.quiz!
  const left = q.attemptsAllowed - q.attemptsUsed
  const facts: [string, string][] = [
    ['Questions', String(q.questions)],
    ['Time limit', `${q.timeLimit} min`],
    ['Attempts', `${q.attemptsUsed} of ${q.attemptsAllowed} used`],
    ['To pass', q.gradeToPass],
  ]
  return (
    <Card>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="t-label-m c-muted">{k}</dt>
            <dd className="t-title-m tnum">{v}</dd>
          </div>
        ))}
      </dl>
      {q.bestGrade && (
        <p className="t-body-m mt-3">
          Best grade so far: <b className="tnum font-semibold">{q.bestGrade}</b>
        </p>
      )}
      {d.status !== 'graded' && !closed && left > 0 && (
        <button
          type="button"
          className="cx-btn cx-btn--filled cx-btn--lg cx-state mt-4 w-full"
          onClick={() => setConfirm(true)}
        >
          <Icon name="quiz" size={20} />
          {q.attemptsUsed ? 'Start another attempt' : 'Attempt the quiz'}
        </button>
      )}
      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        label="Start the attempt?"
        variant="center"
      >
        <span className="c-primary">
          <Icon name="timer" />
        </span>
        <h2 className="t-headline-s mt-4">Start the attempt?</h2>
        <p className="t-body-m c-muted mt-4">
          The {q.timeLimit}-minute timer starts now and keeps running if you leave. This uses
          attempt {q.attemptsUsed + 1} of {q.attemptsAllowed}.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="cx-btn cx-btn--text cx-state"
            onClick={() => setConfirm(false)}
            autoFocus
          >
            Cancel
          </button>
          <button
            type="button"
            className="cx-btn cx-btn--filled cx-state"
            onClick={() => {
              setConfirm(false)
              snack('The quiz player isn’t part of this prototype')
            }}
          >
            Start
          </button>
        </div>
      </Modal>
    </Card>
  )
}

/* ── Forum ───────────────────────────────────────────────────────────────────────────────── */

function ForumActions({ d }: { d: DueItem }) {
  const { now, patchDue } = useProto()
  const snack = useSnackbar()
  const [text, setText] = useState('')
  const f = d.forum!
  const mine = f.posts.filter((p) => p.you).length
  return (
    <Card>
      <p className="t-body-m">{f.intro}</p>
      <ul className="mt-4 flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {f.posts.map((p, i) => (
            <m.li
              key={p.at + i}
              className="flex gap-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springs.spatialFast}
            >
              <span
                aria-hidden="true"
                className="t-label-m grid h-8 w-8 flex-none place-items-center rounded-full"
                style={{
                  background: p.you
                    ? 'var(--md-sys-color-primary-fixed-dim)'
                    : 'var(--md-sys-color-surface-container-highest)',
                  color: p.you
                    ? 'var(--md-sys-color-on-primary-fixed)'
                    : 'var(--md-sys-color-on-surface-variant)',
                }}
              >
                {p.author
                  .split(' ')
                  .map((w) => w[0])
                  .join('')}
              </span>
              <div className="min-w-0">
                <p className="t-label-l">
                  {p.author}{' '}
                  <span className="t-body-s c-muted tnum font-normal">{dueLabel(p.at, now)}</span>
                </p>
                <p className="t-body-m mt-0.5">{p.text}</p>
              </div>
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
      <label className="mt-4 block">
        <span className="t-label-m c-muted">
          {mine >= f.required ? 'Reply again' : 'Your post (it counts for this activity)'}
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="t-body-l mt-1 w-full resize-none rounded-2xl px-4 py-3 outline-none focus-visible:outline-2"
          style={{ background: 'var(--md-sys-color-surface-container-high)' }}
          placeholder="Write your question or answer"
        />
      </label>
      <button
        type="button"
        className="cx-btn cx-btn--filled cx-state mt-2"
        disabled={!text.trim()}
        style={text.trim() ? undefined : { opacity: 0.38 }}
        onClick={() => {
          const posts = [
            ...f.posts,
            {
              author: 'Demo Student',
              at: nowStamp(now.date, now.minutes),
              text: text.trim(),
              you: true,
            },
          ]
          patchDue(d.id, {
            forum: { ...f, posts },
            status: posts.filter((p) => p.you).length >= f.required ? 'submitted' : d.status,
          })
          setText('')
          haptic('success')
          snack('Posted to the forum')
        }}
      >
        <Icon name="send" size={18} />
        Post
      </button>
    </Card>
  )
}

/* ── Your own deadline ───────────────────────────────────────────────────────────────────── */

function ManualActions({ d }: { d: DueItem }) {
  const { patchDue } = useProto()
  const snack = useSnackbar()
  const done = d.status === 'done'
  return (
    <Card>
      {d.note && <p className="t-body-l">{d.note}</p>}
      <p className="t-body-s c-muted mt-2">
        Only you see this. It’s on your CampusPulse account, not on Campus Virtual.
      </p>
      <button
        type="button"
        className={`cx-btn ${done ? 'cx-btn--tonal' : 'cx-btn--filled'} cx-state mt-4`}
        onClick={() => {
          patchDue(d.id, { status: done ? 'todo' : 'done' })
          if (!done) haptic('success')
          snack(done ? 'Back on your list' : 'Marked as done')
        }}
      >
        <Icon name={done ? 'radioButtonUnchecked' : 'taskAlt'} size={18} />
        {done ? 'Not done yet' : 'Mark as done'}
      </button>
    </Card>
  )
}
