import { AnimatePresence, m } from 'motion/react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Assignment } from '../../data'
import { useHref, useProto, useWindowClass } from '../ctx'
import { Icon } from '../icons'
import { hhmm, minutesUntil, URGENCY_TITLES, urgencyOf, wallOf, type Urgency } from '../model'
import { springs } from '../motion'
import { TopAppBar } from '../ui/Bars'
import { ContainerTransform } from '../ui/ContainerTransform'
import { AssignmentDetail, AssignmentRow } from '../ui/Deadline'
import { rememberOrigin } from '../ui/origin'
import { AccountButton, PaneLayout } from './common'

const ORDER: Urgency[] = ['overdue', 'today', 'tomorrow', 'week', 'later']

export function DeadlinesScreen() {
  const { id } = useParams()
  const { data, now } = useProto()
  const { compact } = useWindowClass()
  const picked = data.assignments.find((a) => String(a.id) === id) ?? null
  if (compact) {
    return picked ? (
      <ContainerTransform key={picked.id}>
        <DetailPane a={picked} back />
      </ContainerTransform>
    ) : (
      <DeadlinesList selected={null} />
    )
  }
  const open = data.assignments
    .filter((a) => urgencyOf(a, now) !== 'done')
    .sort((a, b) => minutesUntil(now, wallOf(a.dueAt)) - minutesUntil(now, wallOf(b.dueAt)))
  const sel = picked ?? open[0] ?? data.assignments[0]
  return (
    <PaneLayout compact={false} side={<DeadlinesList selected={sel.id} />}>
      <DetailPane a={sel} back={false} />
    </PaneLayout>
  )
}

function DeadlinesList({ selected }: { selected: number | null }) {
  const { data, now } = useProto()
  const { compact } = useWindowClass()
  const href = useHref()
  const navigate = useNavigate()
  const [showDone, setShowDone] = useState(false)
  const groups = new Map<Urgency, Assignment[]>()
  for (const a of data.assignments) {
    const u = urgencyOf(a, now)
    groups.set(u, [...(groups.get(u) ?? []), a])
  }
  for (const list of groups.values()) list.sort((a, b) => a.dueAt.localeCompare(b.dueAt))
  const done = groups.get('done') ?? []

  const open = (a: Assignment) => navigate(href(`/deadlines/${a.id}`))

  return (
    <div className="cx-pane" style={{ paddingBottom: compact ? 96 : 32 }}>
      <TopAppBar
        large={compact}
        title="Deadlines"
        subtitle={
          <>
            From Campus Virtual, synced at <span className="tnum">{hhmm(now.minutes)}</span>
          </>
        }
        actions={compact ? <AccountButton /> : undefined}
      />
      <div className="px-4">
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
              {groups.get(u)!.map((a) => (
                <li key={a.id} onClickCapture={(e) => compact && rememberOrigin(e.currentTarget)}>
                  <AssignmentRow a={a} selected={selected === a.id} onOpen={open} />
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
                    <Icon name="taskAlt" />
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
                  done.map((a) => (
                    <m.li
                      key={a.id}
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
                      <AssignmentRow a={a} selected={selected === a.id} onOpen={open} />
                    </m.li>
                  ))}
              </AnimatePresence>
            </ul>
          </section>
        )}
        <p className="t-body-s c-muted mt-8 px-1">
          These assignments are made up for the prototype. The app reads yours from Campus Virtual
          on the phone.
        </p>
      </div>
    </div>
  )
}

function DetailPane({ a, back }: { a: Assignment; back: boolean }) {
  const navigate = useNavigate()
  return (
    <div className="cx-pane" style={{ paddingBottom: 32 }}>
      <TopAppBar
        large={false}
        title={back ? '' : 'Assignment'}
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
      <div className="mx-auto max-w-[640px] px-4 pt-2">
        <AssignmentDetail a={a} />
      </div>
    </div>
  )
}
