/** Deadlines from Campus Virtual, grouped by how urgent they are, in the subject colours of the week. */
import {
  deadlinesOf,
  dueExact,
  dueRelative,
  whenShort,
  NEUTRAL,
  statusText,
  urgencyTitle,
  type Deadline,
  type Urgency,
} from './model'
import { vars } from './css'
import { useNav, useProto } from './state'

const ORDER: Urgency[] = ['overdue', 'today', 'week', 'later', 'done']

export function DeadlineRow({ d, compact = false }: { d: Deadline; compact?: boolean }) {
  const { subjects, now } = useProto()
  const [, go] = useNav()
  const color = subjects.byShort.get(d.a.shortName)?.color ?? NEUTRAL
  const rel = dueRelative(d, now)
  const late = d.urgency === 'overdue'
  const cutoffPassed = d.cutoff?.passed ?? false
  let note: string | null = null
  if (late && d.cutoff && !cutoffPassed)
    note = `Still accepted until ${whenShort(d.cutoff.date, d.cutoff.minute, now.date)}`
  else if (late && cutoffPassed) note = 'Cut-off passed, it can no longer be handed in'
  else if (late) note = 'Late submissions are accepted'

  return (
    <li>
      <button
        type="button"
        onClick={() => go({ due: String(d.a.id), cls: null })}
        className="flex w-full items-stretch gap-3.5 rounded-md py-3 pr-2 pl-0 text-left transition-colors hover:bg-raised"
      >
        <span
          aria-hidden
          className="b-swatch w-1 shrink-0 rounded-full"
          style={vars({ '--sub': color })}
        />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-label text-ink">{d.a.name}</span>
          <span className="text-body-small text-ink-muted">
            <span className="b-num font-semibold text-ink-soft">{d.a.shortName}</span>
            <span className="ml-2">{statusText(d.a, now.date)}</span>
          </span>
          {note && (!compact || (late && d.cutoff && !cutoffPassed)) ? (
            <span className={`text-caption ${cutoffPassed ? 'text-ink-muted' : 'b-busy-text'}`}>
              {note}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
          {rel ? (
            <span className={`text-label ${late ? 'text-danger' : 'text-ink'}`}>{rel}</span>
          ) : null}
          <span className="b-num text-caption text-ink-muted">
            {dueExact(d.date, d.minute, now.date)}
          </span>
        </span>
      </button>
    </li>
  )
}

export function DeadlinesScreen() {
  const { data, now, wide } = useProto()
  const all = deadlinesOf(data.assignments, now)
  const synced = Math.max(0, now.minutes - 6)
  return (
    <div className={wide ? 'mx-auto max-w-2xl px-8 py-10' : 'px-5 pt-7 pb-28'}>
      <h1 className="b-title">Deadlines</h1>
      <p className="mt-1 text-body-small text-ink-muted">
        From Campus Virtual, synced at{' '}
        <span className="b-num">
          {String(Math.floor(synced / 60)).padStart(2, '0')}:{String(synced % 60).padStart(2, '0')}
        </span>
      </p>
      {ORDER.map((u) => {
        const items = all.filter((d) => d.urgency === u)
        if (!items.length) return null
        return (
          <section key={u} className="mt-8" aria-labelledby={`due-${u}`}>
            <h2
              id={`due-${u}`}
              className={`text-label ${u === 'overdue' ? 'text-danger' : 'text-ink-soft'}`}
            >
              {urgencyTitle(u)}
              <span className="b-num ml-2 font-normal text-ink-muted">{items.length}</span>
            </h2>
            <ul className="b-hairline mt-2 divide-y divide-line">
              {items.map((d) => (
                <DeadlineRow key={d.a.id} d={d} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
