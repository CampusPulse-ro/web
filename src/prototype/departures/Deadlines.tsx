/** Campus Virtual deadlines, grouped by how soon they bite, in Moodle's own states. */
import { AnimatePresence, m } from 'motion/react'
import { useState } from 'react'
import { useApp } from './context'
import {
  cvUrlFor,
  dueExact,
  dueRelative,
  GROUP_LABEL,
  hueStyle,
  limitsText,
  statusLabel,
  type Deadline,
  type DeadlineGroupId,
} from './model'
import { parseWall } from './time'
import { IconChevron, IconExternal, RollingCount } from './ui'

const EASE = [0.2, 0.8, 0.2, 1] as const

function tone(d: Deadline): 'late' | 'soon' | 'done' | 'calm' {
  if (d.group === 'done') return 'done'
  if (d.until < 0) return 'late'
  if (d.until < 24 * 60) return 'soon'
  return 'calm'
}

export function DeadlineRow({ d }: { d: Deadline }) {
  const { today, openDue } = useApp()
  const done = d.group === 'done'
  const submitted = d.a.submittedAt ? parseWall(d.a.submittedAt) : null
  return (
    <button
      type="button"
      className="dp-due-row"
      data-tone={tone(d)}
      style={hueStyle(d.a.shortName)}
      onClick={() => openDue(d.a.id)}
    >
      <span className="dp-due-main">
        <span className="dp-due-name">{d.a.name}</span>
        <span className="dp-due-meta">
          <span className="dp-due-course dp-num">{d.a.shortName}</span>
          <span>{statusLabel(d.a)}</span>
        </span>
        {d.group === 'overdue' && d.cutoff && !d.cutoffPassed && (
          <span className="dp-due-cutoff">Still accepted until {dueExact(d.cutoff)}</span>
        )}
      </span>
      <span className="dp-due-when">
        <span className="dp-due-rel">
          {done
            ? submitted
              ? 'Handed in'
              : statusLabel(d.a).split(':')[0]
            : dueRelative(d, today)}
        </span>
        <span className="dp-due-exact dp-num">
          {done && submitted ? dueExact(submitted) : dueExact(d.due)}
        </span>
      </span>
    </button>
  )
}

const ORDER: DeadlineGroupId[] = ['overdue', 'today', 'week', 'later']

export function DeadlinesView() {
  const { deadlines } = useApp()
  const [showDone, setShowDone] = useState(false)
  const done = deadlines.filter((d) => d.group === 'done').reverse()
  return (
    <div className="dp-page dp-deadlines">
      <header className="dp-title-head">
        <h1 className="dp-title">Deadlines</h1>
        <p className="dp-title-sub">From your Campus Virtual courses</p>
      </header>
      {ORDER.map((g) => {
        const items = deadlines.filter((d) => d.group === g)
        if (!items.length) return null
        return (
          <section key={g} className="dp-due-group" data-group={g} aria-labelledby={`dp-g-${g}`}>
            <h2 className="dp-group-title" id={`dp-g-${g}`}>
              {GROUP_LABEL[g]} <span className="dp-group-count dp-num">{items.length}</span>
            </h2>
            <ul className="dp-rows">
              <AnimatePresence initial={false}>
                {items.map((d) => (
                  <m.li
                    key={d.a.id}
                    layout="position"
                    className="dp-row-li"
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: EASE }}
                  >
                    <DeadlineRow d={d} />
                  </m.li>
                ))}
              </AnimatePresence>
            </ul>
          </section>
        )
      })}
      {done.length > 0 && (
        <section className="dp-due-group">
          <button
            type="button"
            className="dp-fold-button"
            aria-expanded={showDone}
            aria-label={`${GROUP_LABEL.done}, ${done.length}`}
            onClick={() => setShowDone(!showDone)}
          >
            <span aria-hidden="true">
              {GROUP_LABEL.done} (<RollingCount value={done.length} />)
            </span>
            <IconChevron dir={showDone ? 'up' : 'down'} />
          </button>
          {showDone && (
            <ul className="dp-rows">
              {done.map((d) => (
                <li key={d.a.id} className="dp-row-li">
                  <DeadlineRow d={d} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <p className="dp-footnote">
        Read from Campus Virtual. When Moodle still accepts late work, the row says until when.
      </p>
    </div>
  )
}

export function DueDetail({ id }: { id: number }) {
  const { deadlines, data, today } = useApp()
  const d = deadlines.find((x) => x.a.id === id)
  if (!d) return <p className="dp-sheet-missing">This assignment isn’t in your courses any more.</p>
  const a = d.a
  const url = cvUrlFor(data, a.shortName)
  const t = tone(d)
  const submitted = a.submittedAt ? parseWall(a.submittedAt) : null
  return (
    <div className="dp-detail" style={hueStyle(a.shortName)}>
      <header className="dp-detail-head" data-drag-handle>
        <span className="dp-detail-short dp-num">{a.shortName}</span>
        <h2 className="dp-detail-title">{a.name}</h2>
        <p className="dp-detail-kind">{a.course}</p>
        <p className="dp-detail-live" data-tone={t}>
          {d.group === 'done'
            ? statusLabel(a)
            : d.until < 0
              ? `Overdue, ${dueRelative(d, today)}`
              : `Due ${dueRelative(d, today)}`}
        </p>
      </header>
      <dl className="dp-facts">
        <div className="dp-fact">
          <dt>Due</dt>
          <dd className="dp-num">{dueExact(d.due)}</dd>
        </div>
        {d.cutoff && (
          <div className="dp-fact">
            <dt>Cut-off</dt>
            <dd>
              <span className="dp-num">{dueExact(d.cutoff)}</span>
              <span className="dp-fact-sub">
                {d.cutoffPassed
                  ? 'Passed: nothing can be submitted any more.'
                  : 'Late work is accepted until then, nothing after it.'}
              </span>
            </dd>
          </div>
        )}
        <div className="dp-fact">
          <dt>Status</dt>
          <dd>
            {statusLabel(a)}
            {submitted && <span className="dp-fact-sub dp-num">{dueExact(submitted)}</span>}
          </dd>
        </div>
        <div className="dp-fact">
          <dt>Hand in</dt>
          <dd>{limitsText(a)}</dd>
        </div>
      </dl>
      {d.group !== 'done' && (
        <p className="dp-detail-note">
          Submitting from the app checks these limits first, then asks you to confirm, naming the
          assignment. Not part of this prototype.
        </p>
      )}
      {url && (
        <a className="dp-primary" href={url} target="_blank" rel="noreferrer">
          Open in Campus Virtual
          <IconExternal />
        </a>
      )}
    </div>
  )
}
