import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useHref, useProto, useSnackbar } from '../ctx'
import { Icon } from '../icons'
import {
  classLabel,
  duration,
  hhmm,
  kindOf,
  longDate,
  phaseOf,
  roomStatus,
  shortOf,
  weekNumber,
  type Cls,
} from '../model'
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
        <span className="t-body-m c-muted truncate">
          {kindOf(c)} in{' '}
          <span className="t-narrow font-semibold">{c.o.room ?? 'a room not set yet'}</span>
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

/** The class detail: live state, the room as a way into that room's day, reminder, Campus Virtual. */
export function ClassDetail({ c, onNavigate }: { c: Cls; onNavigate?: () => void }) {
  const { data, now, looks } = useProto()
  const href = useHref()
  const snack = useSnackbar()
  const [remind, setRemind] = useState(() => reminders.has(c.key))
  const phase = phaseOf(c, now.date, now.minutes)
  const look = looks.get(shortOf(c.o))
  const week = weekNumber(data, c.date)

  let live: string
  if (phase === 'now') live = `Now, ${duration(c.end - now.minutes)} left`
  else if (phase === 'past')
    live = c.date === now.date ? `Ended at ${hhmm(c.end)}` : `Was on ${longDate(c.date)}`
  else if (c.date === now.date) live = `Starts in ${duration(c.start - now.minutes)}`
  else live = longDate(c.date)

  const status =
    c.o.room && c.date === now.date ? roomStatus(data, c.o.room, c.date, now.minutes) : null
  let roomLine = 'See what else is on in this room'
  if (status?.known) {
    if (phase === 'now') roomLine = 'You are in this class now'
    else if (status.free)
      roomLine =
        status.until === null
          ? 'Free for the rest of the day'
          : `Free now, until ${hhmm(status.until)}`
    else roomLine = `In use now, until ${hhmm(status.until)}`
  }

  return (
    <div className="pt-1">
      <div className="flex items-center gap-3">
        {look && (
          <SubjectAvatar short={shortOf(c.o)} tone={look.tone} shape={look.shape} size={52} />
        )}
        <div className="flex flex-wrap gap-1.5">
          <span className="cx-chip cx-chip--small">{kindOf(c)}</span>
          {c.o.optional && <span className="cx-chip cx-chip--small">Optional</span>}
        </div>
      </div>
      <h2 className="t-headline-s mt-3">{c.o.subject}</h2>
      <p
        className={`t-title-m mt-1 ${phase === 'now' || (phase === 'future' && c.date === now.date) ? 'c-live' : 'c-muted'}`}
      >
        {live}
      </p>

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
        {c.o.room && (
          <li>
            <Link
              to={href(`/rooms/${encodeURIComponent(c.o.room)}`, { day: c.date })}
              className="cx-item cx-state"
              onClick={onNavigate}
            >
              <span className="cx-item-lead">
                <Icon name="meetingRoom" />
              </span>
              <span className="cx-item-body">
                <span className="t-body-l t-narrow font-semibold">{c.o.room}</span>
                <span className="t-body-m c-muted">{roomLine}</span>
              </span>
              <Icon name="chevronRight" className="c-muted" />
            </Link>
          </li>
        )}
        <li className="cx-item">
          <span className="cx-item-lead">
            <Icon name="person" />
          </span>
          <span className="cx-item-body">
            <span className="t-body-l">{c.o.teacher ?? 'No teacher listed'}</span>
            {!c.o.teacher && (
              <span className="t-body-m c-muted">
                The timetable doesn't name one for this {kindOf(c).toLowerCase()}
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
              snack(v ? `You'll be reminded at ${hhmm(c.start - 10)}` : 'Reminder off')
            }}
            icon={remind ? 'notificationsActive' : 'notifications'}
            label="Remind me"
            supporting="10 minutes before, on this phone"
          />
        </li>
        {c.o.optional && (
          <li className="cx-item">
            <span className="cx-item-lead">
              <Icon name="school" />
            </span>
            <span className="cx-item-body">
              <span className="t-body-l">Optional subject</span>
              <span className="t-body-m c-muted">You chose it in the timetable setup</span>
            </span>
          </li>
        )}
      </ul>

      {c.o.campusVirtualUrl && (
        <a
          href={c.o.campusVirtualUrl}
          target="_blank"
          rel="noreferrer"
          className="cx-btn cx-btn--tonal cx-btn--lg cx-state mt-5 w-full"
        >
          <Icon name="openInNew" size={20} />
          Open in Campus Virtual
        </a>
      )}
    </div>
  )
}
