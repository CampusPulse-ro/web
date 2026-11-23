import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useHref, useProto, useSnackbar } from '../ctx'
import { Icon } from '../icons'
import { allDue, DUE_ICON, isDone, KIND_TEXT } from '../campus'
import {
  classKind,
  classLabel,
  dueLabel,
  duration,
  hhmm,
  KIND_ICON,
  kindOf,
  longDate,
  phaseOf,
  shortOf,
  weekNumber,
  type Cls,
} from '../model'
import { directionsUrl, placeOf } from '../places'
import { SwitchRow } from './Controls'
import { SubjectAvatar } from './Shape'

/** One class as a list row: subject shape, name, where; times trailing in tabular figures. */
export function ClassRow({ c, onOpen }: { c: Cls; onOpen: (c: Cls) => void }) {
  const { now, looks } = useProto()
  const phase = phaseOf(c, now.date, now.minutes)
  const look = looks.get(shortOf(c.o))
  return (
    <button
      type="button"
      className={`cx-item cx-item--three cx-state ${phase === 'past' ? 'cx-item--past' : ''}`}
      aria-label={classLabel(c, phase)}
      onClick={() => onOpen(c)}
    >
      {look && (
        <SubjectAvatar
          short={shortOf(c.o)}
          tone={look.tone}
          shape={look.shape}
          past={phase === 'past'}
        />
      )}
      <span className="cx-item-body">
        <span className={`t-body-l line-clamp-2 ${phase === 'past' ? 'c-muted' : ''}`}>
          {c.o.subject}
        </span>
        <span className="t-body-m c-muted flex items-center gap-1.5 truncate">
          <Icon name={KIND_ICON[classKind(c)]} size={16} />
          <span className="truncate">
            {kindOf(c)} in{' '}
            <span className="t-narrow font-semibold">{c.o.room ?? 'a room not set yet'}</span>
          </span>
        </span>
      </span>
      <span className="cx-item-trail">
        {phase === 'now' ? (
          <span className="cx-chip cx-chip--live cx-chip--small t-e">Now</span>
        ) : (
          <span className={`t-title-m tnum ${phase === 'past' ? 'c-muted' : ''}`}>
            {hhmm(c.start)}
          </span>
        )}
        <span className="t-body-s c-muted tnum">
          {phase === 'now' ? `until ${hhmm(c.end)}` : hhmm(c.end)}
        </span>
      </span>
    </button>
  )
}

const reminders = new Set<string>()

/** The class detail: live state, where it is (building, floor, directions), reminder, the course. */
export function ClassDetail({ c }: { c: Cls }) {
  const { data, now, looks, campus, account } = useProto()
  const href = useHref()
  const snack = useSnackbar()
  const [remind, setRemind] = useState(() => reminders.has(c.key))
  const phase = phaseOf(c, now.date, now.minutes)
  const look = looks.get(shortOf(c.o))
  const week = weekNumber(data, c.date)
  const place = placeOf(c.o.room)
  const kind = classKind(c)
  const due = allDue(data, campus, !!account?.uptLinked)
    .filter((d) => d.short === shortOf(c.o) && !isDone(d))
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    .slice(0, 3)

  let live: string
  if (phase === 'now') live = `Now, ${duration(c.end - now.minutes)} left`
  else if (phase === 'past')
    live = c.date === now.date ? `Ended at ${hhmm(c.end)}` : `Was on ${longDate(c.date)}`
  else if (c.date === now.date) live = `Starts in ${duration(c.start - now.minutes)}`
  else live = longDate(c.date)
  const isLive = phase === 'now' || (phase === 'future' && c.date === now.date)

  return (
    <div className="pt-1">
      <div className="flex items-center gap-3">
        {look && (
          <SubjectAvatar short={shortOf(c.o)} tone={look.tone} shape={look.shape} size={52} />
        )}
        <div className="flex flex-wrap gap-1.5">
          <span className="cx-chip cx-chip--small">
            <Icon name={KIND_ICON[kind]} size={14} />
            {kindOf(c)}
          </span>
          {c.o.optional && <span className="cx-chip cx-chip--small">Optional</span>}
        </div>
      </div>
      <h2 className="t-headline-s mt-3">{c.o.subject}</h2>
      <p className={`t-title-m mt-1 ${isLive ? 'c-live' : 'c-muted'}`}>{live}</p>

      <ul className="cx-list mt-5">
        <li className="cx-item">
          <span className="cx-item-lead">
            <Icon name="schedule" />
          </span>
          <span className="cx-item-body">
            <span className="t-body-l tnum">
              {hhmm(c.start)} to {hhmm(c.end)}
            </span>
            <span className="t-body-m c-muted">
              {longDate(c.date)}
              {week ? `, week ${week}` : ''}
            </span>
          </span>
        </li>
        <li className="cx-item cx-item--three">
          <span className="cx-item-lead">
            <Icon name="locationOn" />
          </span>
          <span className="cx-item-body">
            <span className="t-body-l">
              Room <span className="t-narrow font-semibold">{c.o.room ?? 'not set yet'}</span>
              {place?.floor ? `, ${place.floor}` : ''}
            </span>
            <span className="t-body-m c-muted">
              {place ? place.building.name : 'Building not known yet'}
            </span>
          </span>
          {place && (
            <a
              href={directionsUrl(place)}
              target="_blank"
              rel="noreferrer"
              className="cx-btn cx-btn--tonal cx-state flex-none !px-4"
              aria-label={`Directions to the ${place.building.name}`}
            >
              <Icon name="directions" size={18} />
              Directions
            </a>
          )}
        </li>
        <li className="cx-item">
          <span className="cx-item-lead">
            <Icon name="person" />
          </span>
          <span className="cx-item-body">
            <span className="t-body-l">{c.o.teacher ?? 'No teacher listed'}</span>
            {!c.o.teacher && (
              <span className="t-body-m c-muted">
                The timetable doesn&rsquo;t name one for this {kindOf(c).toLowerCase()}
              </span>
            )}
          </span>
        </li>
        <li>
          <SwitchRow
            checked={remind}
            onChange={(v) => {
              setRemind(v)
              if (v) reminders.add(c.key)
              else reminders.delete(c.key)
              snack(v ? `You\u2019ll be reminded at ${hhmm(c.start - 10)}` : 'Reminder off')
            }}
            icon={remind ? 'notificationsActive' : 'notifications'}
            label="Remind me"
            supporting="10 minutes before, with the room and building"
          />
        </li>
      </ul>

      <h3 className="cx-section-title">In this course</h3>
      <ul className="cx-list">
        {due.map((d) => (
          <li key={d.id}>
            <Link to={href(`/deadlines/${d.id}`)} className="cx-item cx-state">
              <span className="cx-item-lead">
                <Icon name={DUE_ICON[d.kind]} />
              </span>
              <span className="cx-item-body">
                <span className="t-body-l line-clamp-2">{d.name}</span>
                <span className="t-body-m c-muted">
                  {KIND_TEXT[d.kind]}, due {dueLabel(d.dueAt, now).toLowerCase()}
                </span>
              </span>
              <Icon name="chevronRight" className="c-muted" />
            </Link>
          </li>
        ))}
        <li>
          <Link
            to={href(`/courses/${encodeURIComponent(shortOf(c.o))}`)}
            className="cx-item cx-state"
          >
            <span className="cx-item-lead">
              <Icon name="menuBook" />
            </span>
            <span className="cx-item-body">
              <span className="t-body-l">Course page</span>
              <span className="t-body-m c-muted">Sections, files and your grades</span>
            </span>
            <Icon name="chevronRight" className="c-muted" />
          </Link>
        </li>
      </ul>

      {c.o.optional && (
        <p className="t-body-s c-muted mt-4 px-1">You chose this subject in the timetable setup.</p>
      )}
      {c.o.campusVirtualUrl && (
        <a
          href={c.o.campusVirtualUrl}
          target="_blank"
          rel="noreferrer"
          className="cx-btn cx-btn--text cx-state mt-3 -ml-3"
        >
          <Icon name="openInNew" size={18} />
          Open on the Campus Virtual website
        </a>
      )}
    </div>
  )
}
