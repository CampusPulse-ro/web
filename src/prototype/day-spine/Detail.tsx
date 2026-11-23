/**
 * A class (or a deadline) opened from its block: on the phone a sheet you drag down to close, on
 * desktop a panel at the side. The block's colour expands into it, so you see where it came from.
 */
import { AnimatePresence, m, useDragControls, type PanInfo } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { minutesOf } from '../clock'
import type { Occurrence } from '../data'
import { vars } from './css'
import { IconClose, IconExternal, IconNext } from './icons'
import {
  deadlinesOf,
  dueExact,
  dueRelative,
  duration,
  fileLimits,
  findOcc,
  hhmm,
  kindLabel,
  longDate,
  minutesUntil,
  NEUTRAL,
  nextTimeOf,
  roomDay,
  roomStatus,
  statusText,
  relativeDay,
  type Deadline,
} from './model'
import { useColorOf, useNav, useProto } from './state'
import { Switch } from './ui'

export function DetailHost() {
  const { data, now, wide, origin, setOrigin, subjects } = useProto()
  const [nav, go] = useNav()
  const occ = findOcc(data.timetable, nav.cls)
  const deadline = nav.due
    ? (deadlinesOf(data.assignments, now).find((d) => String(d.a.id) === nav.due) ?? null)
    : null
  const open = occ ? `cls-${nav.cls}` : deadline ? `due-${nav.due}` : null
  const opener = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) opener.current = document.activeElement as HTMLElement | null
  }, [open])

  const close = () => {
    go({ cls: null, due: null }, { replace: true })
    const el = opener.current
    window.setTimeout(() => {
      el?.focus({ preventScroll: true })
      setOrigin(null)
    }, 480)
  }

  const layoutId = occ && nav.cls && origin?.endsWith(nav.cls) ? origin : undefined
  const color = deadline
    ? (subjects.byShort.get(deadline.a.shortName)?.color ?? NEUTRAL)
    : undefined

  return (
    <AnimatePresence>
      {open ? (
        <Surface key={open} wide={wide} onClose={close} layoutId={layoutId} color={color} occ={occ}>
          {occ ? <ClassDetail occ={occ} /> : deadline ? <DeadlineDetail d={deadline} /> : null}
        </Surface>
      ) : null}
    </AnimatePresence>
  )
}

function Surface({
  wide,
  onClose,
  layoutId,
  occ,
  color,
  children,
}: {
  wide: boolean
  onClose: () => void
  layoutId: string | undefined
  occ: Occurrence | null
  color?: string
  children: ReactNode
}) {
  const colorOf = useColorOf()
  const sub = color ?? (occ ? colorOf(occ) : NEUTRAL)
  const content = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  const drag = useDragControls()

  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    content.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose()
  }

  const morph = !!layoutId
  const bg = (
    <m.div
      layoutId={layoutId}
      className="b-sheet-bg absolute inset-0"
      style={{ borderRadius: wide ? '20px 0 0 20px' : '22px 22px 0 0' }}
      transition={{ type: 'spring', duration: 0.42, bounce: 0.1 }}
    />
  )

  return (
    <>
      <m.div
        aria-hidden
        className="fixed inset-0 z-50 bg-black/55"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.2 } }}
        onClick={onClose}
      />
      <m.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        className={
          wide
            ? 'fixed top-3 right-0 bottom-3 z-50 flex w-full max-w-md flex-col'
            : 'b-sheet-max fixed inset-x-0 bottom-0 z-50 flex flex-col'
        }
        style={vars({ '--sub': sub })}
        initial={morph ? { opacity: 1 } : wide ? { x: '100%' } : { y: '100%' }}
        animate={morph ? { opacity: 1 } : wide ? { x: 0 } : { y: 0 }}
        exit={
          morph
            ? { opacity: 0, transition: { duration: 0.16 } }
            : wide
              ? { x: '100%', transition: { duration: 0.22 } }
              : { y: '100%', transition: { duration: 0.22 } }
        }
        transition={{ type: 'spring', duration: 0.38, bounce: 0.08 }}
        drag={wide ? false : 'y'}
        dragListener={false}
        dragControls={drag}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.04, bottom: 0.9 }}
        onDragEnd={onDragEnd}
      >
        {bg}
        <m.div
          className="relative flex min-h-0 flex-1 flex-col"
          initial={morph ? { opacity: 0 } : false}
          animate={{ opacity: 1, transition: { delay: morph ? 0.14 : 0, duration: 0.2 } }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
        >
          {wide ? (
            <div className="flex justify-end px-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="grid size-11 place-items-center rounded-full text-ink-soft hover:bg-raised hover:text-ink"
              >
                <IconClose width={20} height={20} />
              </button>
            </div>
          ) : (
            <div
              className="flex shrink-0 cursor-grab touch-none justify-center pt-1.5 pb-1"
              onPointerDown={(e) => drag.start(e)}
            >
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-24 items-center justify-center"
              >
                <span className="block h-1 w-10 rounded-full bg-line-strong" />
              </button>
            </div>
          )}
          <div
            ref={content}
            tabIndex={-1}
            className={`min-h-0 flex-1 overflow-y-auto outline-none ${wide ? 'px-7 pb-8' : 'px-6 pb-10'}`}
          >
            {children}
          </div>
        </m.div>
      </m.div>
    </>
  )
}

function Row({
  label,
  children,
  onClick,
  href,
}: {
  label: string
  children: ReactNode
  onClick?: () => void
  href?: string
}) {
  const inner = (
    <>
      <span className="w-20 shrink-0 pt-0.5 text-caption text-ink-muted">{label}</span>
      <span className="min-w-0 flex-1">{children}</span>
      {onClick ? (
        <IconNext width={18} height={18} className="mt-0.5 shrink-0 text-ink-muted" />
      ) : null}
      {href ? (
        <IconExternal width={18} height={18} className="mt-0.5 shrink-0 text-ink-muted" />
      ) : null}
    </>
  )
  const cls = 'flex w-full items-start gap-3 py-3.5 text-left'
  if (onClick)
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${cls} -mx-3 rounded-md px-3 hover:bg-ink/5`}
      >
        {inner}
      </button>
    )
  if (href)
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={`${cls} -mx-3 rounded-md px-3 hover:bg-ink/5`}
      >
        {inner}
      </a>
    )
  return <div className={cls}>{inner}</div>
}

function ClassDetail({ occ }: { occ: Occurrence }) {
  const { data, now, wide, setOrigin } = useProto()
  const [, go] = useNav()
  const [remind, setRemind] = useState(false)
  const start = minutesOf(occ.startsAt)
  const end = minutesOf(occ.endsAt)
  const until = minutesUntil(now, occ.date, start)
  const toEnd = minutesUntil(now, occ.date, end)
  const running = until <= 0 && toEnd > 0
  let when: string
  if (running) when = `Now, ${duration(toEnd)} left`
  else if (toEnd <= 0) when = occ.date === now.date ? `Ended at ${hhmm(end)}` : 'Over'
  else if (until < 24 * 60 && occ.date === now.date) when = `In ${duration(until)}`
  else when = relativeDay(occ.date, now.date).replace(/^./, (c) => c.toUpperCase())
  const progress = running ? (now.minutes - start) / (end - start) : toEnd <= 0 ? 1 : 0

  const roomOccs = occ.room ? roomDay(data, occ.room, occ.date) : null
  let roomLine = 'Room timetables exist for 23 to 27 November in this demo'
  if (roomOccs) {
    const after = roomStatus(roomOccs, end)
    roomLine =
      after.state === 'free'
        ? after.until === null
          ? 'Free after this class for the rest of the day'
          : `Free after this class until ${hhmm(after.until)}`
        : `Booked again right after, until ${hhmm(after.until ?? end)}`
  }
  const next = nextTimeOf(data.timetable, occ)
  const due = deadlinesOf(data.assignments, now).filter(
    (d) => d.a.shortName === occ.shortName && d.urgency !== 'done',
  )

  return (
    <div>
      <p className="text-label text-ink-soft">{kindLabel(occ)}</p>
      <h2 id="detail-title" className="b-detail-title mt-1 text-ink">
        {occ.subject}
      </h2>
      <p className="mt-2 text-body text-ink-soft">
        {longDate(occ.date)}, <span className="b-num">{hhmm(start)}</span> to{' '}
        <span className="b-num">{hhmm(end)}</span>
      </p>

      <div className="mt-5">
        <p className="text-label text-ink">{when}</p>
        <div
          aria-hidden
          className={`relative mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10 ${progress > 0 ? '' : 'hidden'}`}
        >
          <div
            className="b-swatch absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${Math.round(progress * 100)}%`,
              transition: 'width var(--b-glide) ease',
            }}
          />
        </div>
      </div>

      <div className="mt-6 divide-y divide-ink/10">
        <Row
          label="Room"
          onClick={
            occ.room
              ? () => {
                  setOrigin(null)
                  go({ view: wide ? 'rooms' : 'room', room: occ.room, rday: occ.date, cls: null })
                }
              : undefined
          }
        >
          <span className="b-num block text-subtitle text-ink">{occ.room ?? 'Not listed yet'}</span>
          {occ.room ? <span className="text-body-small text-ink-muted">{roomLine}</span> : null}
        </Row>
        <Row label="Teacher">
          <span className="text-body text-ink">{occ.teacher ?? 'Not listed in the timetable'}</span>
        </Row>
        <Row label="Next time">
          <span className="text-body text-ink">
            {next ? (
              <>
                {longDate(next.date)}, <span className="b-num">{next.startsAt.slice(0, 5)}</span>
              </>
            ) : (
              `Not on the timetable again before ${longDate(data.timetable.to).replace(/^\w+ /, '')}`
            )}
          </span>
        </Row>
        {due.map((d) => (
          <Row
            key={d.a.id}
            label="Due"
            onClick={() => go({ cls: null, due: String(d.a.id) }, { replace: true })}
          >
            <span className="block text-body text-ink">{d.a.name}</span>
            <span
              className={`text-body-small ${d.urgency === 'overdue' ? 'text-danger' : 'text-ink-muted'}`}
            >
              {dueRelative(d, now)}, {dueExact(d.date, d.minute, now.date)}
            </span>
          </Row>
        ))}
      </div>

      <div className="mt-2 border-t border-ink/10 pt-2">
        <Switch
          checked={remind}
          onChange={setRemind}
          label="Remind me"
          about={
            remind
              ? `10 min before, at ${hhmm(start - 10)}`
              : 'A notification 10 min before it starts'
          }
        />
      </div>

      {occ.optional ? (
        <p className="mt-3 text-caption text-ink-muted">
          You picked this subject in the timetable setup.
        </p>
      ) : null}

      {occ.campusVirtualUrl ? (
        <a
          href={occ.campusVirtualUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-5 text-label text-on-accent"
        >
          Open in Campus Virtual <IconExternal width={18} height={18} />
        </a>
      ) : null}
    </div>
  )
}

function DeadlineDetail({ d }: { d: Deadline }) {
  const { data, now, subjects } = useProto()
  const subject = subjects.byShort.get(d.a.shortName)
  const url = data.timetable.occurrences.find(
    (o) => o.shortName === d.a.shortName,
  )?.campusVirtualUrl
  const late = d.urgency === 'overdue'
  const canSubmit = d.urgency !== 'done' && !(d.cutoff?.passed ?? false)
  return (
    <div style={vars({ '--sub': subject?.color ?? NEUTRAL })}>
      <p className="flex items-center gap-2 text-label text-ink-soft">
        <span aria-hidden className="b-swatch size-2.5 rounded-full" />
        {d.a.course}
      </p>
      <h2 id="detail-title" className="b-detail-title mt-1 text-ink">
        {d.a.name}
      </h2>
      <p className={`mt-2 text-body ${late ? 'text-danger' : 'text-ink-soft'}`}>
        {d.urgency === 'done' ? statusText(d.a, now.date) : `Due ${dueRelative(d, now)}`}
      </p>
      <div className="mt-6 divide-y divide-ink/10">
        <Row label="Due">
          <span className="b-num text-body text-ink">{dueExact(d.date, d.minute, now.date)}</span>
        </Row>
        {d.cutoff ? (
          <Row label="Cut-off">
            <span className="block text-body text-ink">
              <span className="b-num">{dueExact(d.cutoff.date, d.cutoff.minute, now.date)}</span>
            </span>
            <span className="text-body-small text-ink-muted">
              {d.cutoff.passed
                ? 'Passed: Campus Virtual no longer accepts it'
                : 'Late submissions are accepted until then'}
            </span>
          </Row>
        ) : null}
        <Row label="Status">
          <span className="text-body text-ink">{statusText(d.a, now.date)}</span>
        </Row>
        <Row label="Files">
          <span className="text-body text-ink">{fileLimits(d.a)}</span>
          {d.a.wordLimit ? (
            <span className="block text-body-small text-ink-muted">
              Up to {d.a.wordLimit} words
            </span>
          ) : null}
        </Row>
      </div>
      {canSubmit ? (
        <p className="mt-4 text-caption text-ink-muted">
          Handing in from the app checks these limits before anything is sent, and asks twice before
          &ldquo;Submit for grading&rdquo;.
        </p>
      ) : null}
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="mt-6 flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent px-5 text-label text-on-accent"
        >
          Open in Campus Virtual <IconExternal width={18} height={18} />
        </a>
      ) : null}
    </div>
  )
}
