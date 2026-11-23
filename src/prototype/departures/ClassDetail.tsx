/** One class: live state, the room (a row that opens the room's day), teacher, what's due, a reminder. */
import { useState } from 'react'
import type { Occurrence } from '../data'
import { useApp } from './context'
import {
  deadlineFor,
  dueRelative,
  endOf,
  hueStyle,
  kindLabel,
  roomDay,
  roomStatus,
  shortOf,
  startOf,
  weekOf,
} from './model'
import { tick } from './nav'
import { capitalise, clock, duration, hm, longDate, nowMinutes, relativeDay } from './time'
import { Dot, IconChevron, IconExternal, Switch } from './ui'

/** Reminder choices are per class and only live in memory here. */
const reminders = new Set<string>()

export function ClassDetail({ occ }: { occ: Occurrence }) {
  const { data, now, today, deadlines, openRoom, openDue } = useApp()
  const key = `${occ.date}-${occ.startsAt}`
  const [remind, setRemind] = useState(() => reminders.has(key))
  const t = nowMinutes(now)
  const short = shortOf(occ)
  const kind = kindLabel(occ.kinds)

  let live: { text: string; tone: 'live' | 'past' | 'calm' }
  if (occ.date === today && startOf(occ) <= t && t < endOf(occ))
    live = { text: `Now, ${duration(Math.ceil(endOf(occ) - t))} left`, tone: 'live' }
  else if (occ.date === today && t < startOf(occ))
    live = { text: `Starts in ${duration(Math.ceil(startOf(occ) - t))}`, tone: 'live' }
  else if (occ.date < today || (occ.date === today && t >= endOf(occ)))
    live = { text: `Ended at ${hm(occ.endsAt)}`, tone: 'past' }
  else live = { text: capitalise(relativeDay(occ.date, today)), tone: 'calm' }

  const rt = occ.room ? roomDay(data, occ.room, occ.date) : undefined
  const status = occ.date === today && rt ? roomStatus(rt, t) : null
  const due = deadlineFor(deadlines, short)
  const week = weekOf(data, occ.date)

  return (
    <div className="dp-detail" style={hueStyle(short)}>
      <header className="dp-detail-head" data-drag-handle>
        <span className="dp-detail-short dp-num">{short}</span>
        <h2 className="dp-detail-title">{occ.subject}</h2>
        <p className="dp-detail-kind">{kind}</p>
        <p className="dp-detail-live" data-tone={live.tone}>
          {live.tone === 'live' && <Dot kind="live" />}
          {live.text}
        </p>
      </header>

      <dl className="dp-facts">
        <div className="dp-fact">
          <dt>Time</dt>
          <dd>
            <span className="dp-num dp-fact-big">
              {hm(occ.startsAt)} to {hm(occ.endsAt)}
            </span>
            <span className="dp-fact-sub">
              {longDate(occ.date)}
              {week ? `, week ${week}` : ''}
            </span>
          </dd>
        </div>
        {occ.room && (
          <div className="dp-fact dp-fact-action">
            <dt>Room</dt>
            <dd>
              <button
                type="button"
                className="dp-fact-button"
                onClick={() => openRoom(occ.room!, occ.date)}
                aria-label={`Room ${occ.room}: see the room's day`}
              >
                <span className="dp-num dp-fact-room">{occ.room}</span>
                <span className="dp-fact-sub">
                  {status?.kind === 'free' && (
                    <>
                      <Dot kind="free" />
                      Free until{' '}
                      {status.until === null ? 'the end of the day' : clock(status.until)}
                    </>
                  )}
                  {status?.kind === 'busy' && (
                    <>
                      <Dot kind="busy" />
                      In use until {clock(status.until)}
                    </>
                  )}
                  {!status &&
                    (rt ? 'See the room’s day' : 'No room schedule for this day in the demo')}
                </span>
                <IconChevron />
              </button>
            </dd>
          </div>
        )}
        {occ.teacher && (
          <div className="dp-fact">
            <dt>Teacher</dt>
            <dd>{occ.teacher}</dd>
          </div>
        )}
        {occ.optional && (
          <div className="dp-fact">
            <dt>Subject</dt>
            <dd>
              Optional
              <span className="dp-fact-sub">You picked it in the timetable setup.</span>
            </dd>
          </div>
        )}
        {due && (
          <div className="dp-fact dp-fact-action">
            <dt>Due</dt>
            <dd>
              <button type="button" className="dp-fact-button" onClick={() => openDue(due.a.id)}>
                <span>{due.a.name}</span>
                <span className="dp-fact-sub" data-tone={due.until < 0 ? 'late' : undefined}>
                  {capitalise(dueRelative(due, today))}
                </span>
                <IconChevron />
              </button>
            </dd>
          </div>
        )}
      </dl>

      {occ.date >= today && (
        <Switch
          checked={remind}
          onChange={(v) => {
            setRemind(v)
            if (v) reminders.add(key)
            else reminders.delete(key)
            tick()
          }}
          label="Remind me 10 min before"
          description={
            <>
              The notification reads “{occ.room ?? short} in 10 min, {occ.subject} (
              {kind.toLowerCase()})”.
            </>
          }
        />
      )}

      {occ.campusVirtualUrl && (
        <a className="dp-primary" href={occ.campusVirtualUrl} target="_blank" rel="noreferrer">
          Open in Campus Virtual
          <IconExternal />
        </a>
      )}
    </div>
  )
}
