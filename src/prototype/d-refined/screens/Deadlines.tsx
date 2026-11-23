import { AnimatePresence, m } from 'motion/react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  allDue,
  isDone,
  minutesToDue,
  URGENCY_TITLES,
  urgencyOf,
  type DueItem,
  type Urgency,
} from '../campus'
import { useHref, useProto, useSnackbar, useWindowClass } from '../ctx'
import { haptic } from '../haptics'
import { Icon } from '../icons'
import { hhmm } from '../model'
import { springs } from '../motion'
import { TopAppBar } from '../ui/Bars'
import { ContainerTransform } from '../ui/ContainerTransform'
import { DueDetail, DueRow } from '../ui/Deadline'
import { rememberOrigin } from '../ui/origin'
import { Panel } from '../ui/Panel'
import { AccountButton, LinkUptNudge, PaneLayout } from './common'

const ORDER: Urgency[] = ['overdue', 'today', 'tomorrow', 'week', 'later']

export function DeadlinesScreen() {
  const { id } = useParams()
  const { data, now, campus, account } = useProto()
  const { compact } = useWindowClass()
  const items = allDue(data, campus, !!account?.uptLinked)
  const picked = items.find((d) => d.id === id) ?? null
  if (compact) {
    return picked ? (
      <ContainerTransform key={picked.id}>
        <DetailPane d={picked} back />
      </ContainerTransform>
    ) : (
      <DeadlinesList selected={null} />
    )
  }
  const open = items
    .filter((d) => !isDone(d))
    .sort((a, b) => minutesToDue(a, now) - minutesToDue(b, now))
  const sel = picked ?? open[0] ?? items[0] ?? null
  return (
    <PaneLayout compact={false} side={<DeadlinesList selected={sel?.id ?? null} />}>
      {sel ? <DetailPane d={sel} back={false} /> : <div className="cx-pane" />}
    </PaneLayout>
  )
}

function DeadlinesList({ selected }: { selected: string | null }) {
  const { data, now, campus, account } = useProto()
  const { compact } = useWindowClass()
  const href = useHref()
  const navigate = useNavigate()
  const [showDone, setShowDone] = useState(false)
  const [adding, setAdding] = useState(false)
  const linked = !!account?.uptLinked
  const items = allDue(data, campus, linked)
  const groups = new Map<Urgency, DueItem[]>()
  for (const d of items) {
    const u = urgencyOf(d, now)
    groups.set(u, [...(groups.get(u) ?? []), d])
  }
  for (const list of groups.values()) list.sort((a, b) => a.dueAt.localeCompare(b.dueAt))
  const done = groups.get('done') ?? []
  const open = (d: DueItem) => navigate(href(`/deadlines/${d.id}`))

  return (
    <div className="cx-pane relative" style={{ paddingBottom: compact ? 168 : 32 }}>
      <TopAppBar
        large={compact}
        title="Deadlines"
        subtitle={
          linked ? (
            <>
              Campus Virtual and yours, synced at <span className="tnum">{hhmm(now.minutes)}</span>
            </>
          ) : (
            'Yours only: Campus Virtual isn’t linked'
          )
        }
        actions={
          compact ? (
            <AccountButton />
          ) : (
            <button
              type="button"
              className="cx-btn cx-btn--tonal cx-state mr-1"
              onClick={() => setAdding(true)}
            >
              <Icon name="add" size={18} />
              Add
            </button>
          )
        }
      />
      <div className="px-4">
        {!linked && (
          <LinkUptNudge text="Your assignments, quizzes and forums from Campus Virtual join your own deadlines here, and you can hand in from the app." />
        )}
        {ORDER.filter((u) => groups.get(u)?.length).map((u) => (
          <section key={u} aria-labelledby={`due-${u}`}>
            <h2
              id={`due-${u}`}
              className="cx-section-title"
              style={u === 'overdue' ? { color: 'var(--md-sys-color-error)' } : undefined}
            >
              <span className="flex items-center gap-2">
                {u === 'overdue' && <Icon name="warning" size={18} />}
                {URGENCY_TITLES[u]}
              </span>
              <span className="t-body-s c-muted font-normal">{groups.get(u)!.length}</span>
            </h2>
            <ul className="cx-list">
              {groups.get(u)!.map((d) => (
                <li key={d.id} onClickCapture={(e) => compact && rememberOrigin(e.currentTarget)}>
                  <DueRow d={d} selected={selected === d.id} onOpen={open} />
                </li>
              ))}
            </ul>
          </section>
        ))}
        {done.length > 0 && (
          <section className="mt-6">
            <ul className="cx-list">
              <li>
                <button
                  type="button"
                  className="cx-item cx-item--past cx-state"
                  aria-expanded={showDone}
                  onClick={() => setShowDone((v) => !v)}
                >
                  <span className="cx-item-lead">
                    <Icon name="doneAll" />
                  </span>
                  <span className="cx-item-body t-body-l c-muted">
                    {URGENCY_TITLES.done} ({done.length})
                  </span>
                  <m.span
                    animate={{ rotate: showDone ? 180 : 0 }}
                    transition={springs.spatialFast}
                    className="c-muted grid"
                  >
                    <Icon name="keyboardArrowDown" />
                  </m.span>
                </button>
              </li>
              <AnimatePresence initial={false}>
                {showDone &&
                  done.map((d) => (
                    <m.li
                      key={d.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{
                        height: springs.spatialDefault,
                        opacity: springs.effectsDefault,
                      }}
                      style={{ overflow: 'hidden' }}
                      onClickCapture={(e) => compact && rememberOrigin(e.currentTarget)}
                    >
                      <DueRow d={d} selected={selected === d.id} onOpen={open} />
                    </m.li>
                  ))}
              </AnimatePresence>
            </ul>
          </section>
        )}
        <p className="t-body-s c-muted mt-8 px-1">
          Everything on your Campus Virtual timeline, plus what you add yourself. The quizzes, forum
          and your own deadlines here are made up for the prototype.
        </p>
      </div>
      {compact && (
        <button
          type="button"
          className="cx-fab cx-state"
          onClick={() => setAdding(true)}
          aria-label="Add a deadline"
        >
          <Icon name="add" />
          Add
        </button>
      )}
      <AddDeadline open={adding} onClose={() => setAdding(false)} wide={!compact} />
    </div>
  )
}

function DetailPane({ d, back }: { d: DueItem; back: boolean }) {
  const navigate = useNavigate()
  return (
    <div className="cx-pane" style={{ paddingBottom: 32 }}>
      <TopAppBar
        large={false}
        title={back ? '' : 'Details'}
        leading={
          back ? (
            <button
              type="button"
              className="cx-icon-btn cx-state ml-1"
              aria-label="Back to deadlines"
              onClick={() => navigate(-1)}
            >
              <Icon name="arrowBack" />
            </button>
          ) : undefined
        }
      />
      <div className="mx-auto max-w-[680px] px-4 pt-2">
        <DueDetail d={d} />
      </div>
    </div>
  )
}

/** A deadline of your own: on your CampusPulse account, beside the Campus Virtual ones. */
function AddDeadline({
  open,
  onClose,
  wide,
}: {
  open: boolean
  onClose: () => void
  wide: boolean
}) {
  const { data, now, campus, addDue } = useProto()
  const snack = useSnackbar()
  const [name, setName] = useState('')
  const [short, setShort] = useState('')
  const [date, setDate] = useState(now.date)
  const [time, setTime] = useState('23:59')
  const subjects = [
    ...new Map(data.timetable.occurrences.map((o) => [o.shortName ?? o.subject, o.subject])),
  ].sort((a, b) => a[0].localeCompare(b[0]))
  const field = 't-body-l mt-1 w-full rounded-2xl px-4 py-3 outline-none'
  const fieldStyle = { background: 'var(--md-sys-color-surface-container-high)' }

  const save = () => {
    if (!name.trim()) return
    const sub = subjects.find(([s]) => s === short)
    addDue({
      id: `m-added-${campus.added.length + 1}`,
      kind: 'manual',
      name: name.trim(),
      short: sub ? sub[0] : null,
      course: sub ? sub[1] : null,
      dueAt: `${date}T${time}`,
      cutoffAt: null,
      status: 'todo',
    })
    haptic('success')
    snack('Added to your deadlines')
    setName('')
    onClose()
  }

  return (
    <Panel open={open} onClose={onClose} label="Add a deadline" wide={wide} title="Add a deadline">
      <form
        className="flex flex-col gap-4 pt-2"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        {!wide && <h2 className="t-headline-s">Add a deadline</h2>}
        <label>
          <span className="t-label-l">What</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
            style={fieldStyle}
            placeholder="Print the poster, book the lab…"
            autoComplete="off"
          />
        </label>
        <label>
          <span className="t-label-l">Course</span>
          <select
            value={short}
            onChange={(e) => setShort(e.target.value)}
            className={field}
            style={fieldStyle}
          >
            <option value="">No course</option>
            {subjects.map(([s, n]) => (
              <option key={s} value={s}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className="t-label-l">Day</span>
            <input
              type="date"
              value={date}
              min={now.date}
              onChange={(e) => setDate(e.target.value)}
              className={`${field} tnum`}
              style={fieldStyle}
            />
          </label>
          <label>
            <span className="t-label-l">Time</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={`${field} tnum`}
              style={fieldStyle}
            />
          </label>
        </div>
        <p className="t-body-s c-muted">
          Only you see it. It stays on your CampusPulse account and reminds you like any other
          deadline.
        </p>
        <button
          type="submit"
          className="cx-btn cx-btn--filled cx-btn--lg cx-state"
          disabled={!name.trim()}
          style={name.trim() ? undefined : { opacity: 0.38 }}
        >
          Add deadline
        </button>
      </form>
    </Panel>
  )
}
