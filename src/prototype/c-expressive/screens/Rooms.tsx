import { AnimatePresence, m } from 'motion/react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { minutesOf } from '../../clock'
import { useHref, useKeys, useParam, useProto, useWindowClass } from '../ctx'
import { Icon } from '../icons'
import {
  dayClasses,
  DAY_END,
  DAY_START,
  duration,
  durationShort,
  groupOf,
  groupsText,
  hhmm,
  longDate,
  roomDates,
  roomDay,
  roomStatus,
  shortDate,
  weekdayShort,
  type RoomStatus,
} from '../model'
import { springs } from '../motion'
import { TopAppBar } from '../ui/Bars'
import { Segmented } from '../ui/Controls'
import { ContainerTransform } from '../ui/ContainerTransform'
import { rememberOrigin } from '../ui/origin'
import { AccountButton, PaneLayout } from './common'

type Show = 'free' | 'at' | 'all'

function statusText(s: RoomStatus, from?: number) {
  if (!s.known) return 'No timetable for this day'
  if (s.free) {
    if (s.until === null)
      return from !== undefined && from >= DAY_END
        ? 'Free, nothing else today'
        : 'Free for the rest of the day'
    return `Free until ${hhmm(s.until)}`
  }
  return `In use until ${hhmm(s.until)}`
}

export function RoomsScreen() {
  const { code } = useParams()
  const { compact } = useWindowClass()
  const { data, now } = useProto()
  if (compact) {
    return code ? (
      <ContainerTransform key={code}>
        <RoomDayPane code={code} back />
      </ContainerTransform>
    ) : (
      <RoomsList selected={null} />
    )
  }
  // expanded/medium: list-detail; with nothing picked, show the room of the next class
  const fallback =
    dayClasses(data, now.date).find((c) => c.end > now.minutes)?.o.room ??
    dayClasses(data, now.date)[0]?.o.room ??
    'B528A'
  const sel = code ?? fallback
  return (
    <PaneLayout compact={false} side={<RoomsList selected={sel} />}>
      <RoomDayPane code={sel} back={false} />
    </PaneLayout>
  )
}

function RoomsList({ selected }: { selected: string | null }) {
  const { data, now } = useProto()
  const { compact } = useWindowClass()
  const href = useHref()
  const [showParam, setShow] = useParam('show')
  const [atParam, setAt] = useParam('at')
  const [group, setGroup] = useParam('group')
  const [q, setQ] = useParam('q')
  const [dayParam, setDay] = useParam('day')

  const dates = roomDates(data)
  const day = dayParam && dates.includes(dayParam) ? dayParam : now.date
  const known = dates.includes(day)
  const show: Show = showParam === 'at' || showParam === 'all' ? showParam : 'free'
  const nextHour = Math.min(
    Math.max(Math.ceil((now.minutes + 1) / 60) * 60, DAY_START),
    DAY_END - 60,
  )
  const at =
    show === 'at'
      ? atParam && /^\d\d:\d\d$/.test(atParam)
        ? minutesOf(atParam)
        : nextHour
      : now.minutes
  const when = day === now.date && show !== 'at' ? now.minutes : at

  const yours = [
    ...new Set(
      dayClasses(data, now.date)
        .map((c) => c.o.room)
        .filter((r): r is string => !!r),
    ),
  ]
  const query = (q ?? '').trim().toUpperCase()

  const rooms = data.rooms
    .map((r) => ({ r, s: roomStatus(data, r.code, day, when) }))
    .filter(({ r }) => !query || r.code.includes(query))
    .filter(({ r }) => !group || groupOf(r.code) === group)
    .filter(({ s }) => show === 'all' || !s.known || s.free)
    .sort((a, b) => {
      const fa = a.s.known && a.s.free ? 1 : 0
      const fb = b.s.known && b.s.free ? 1 : 0
      if (fa !== fb) return fb - fa
      if (a.s.known && b.s.known) {
        if (a.s.free && b.s.free) return b.s.freeFor - a.s.freeFor
        if (!a.s.free && !b.s.free) return a.s.until - b.s.until
      }
      return a.r.code.localeCompare(b.r.code)
    })

  const totals = new Map<string, { all: number; free: number }>()
  for (const r of data.rooms) {
    const g = groupOf(r.code)
    const s = roomStatus(data, r.code, day, when)
    const t = totals.get(g) ?? { all: 0, free: 0 }
    totals.set(g, { all: t.all + 1, free: t.free + (s.known && s.free ? 1 : 0) })
  }
  const groups = new Map<string, typeof rooms>()
  for (const x of rooms) {
    const g = groupOf(x.r.code)
    groups.set(g, [...(groups.get(g) ?? []), x])
  }
  const ordered = [...groups.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  )

  const row = (code: string, s: RoomStatus, capacity: number | null) => {
    const free = s.known && s.free
    const isSel = selected === code
    return (
      <Link
        to={href(`/rooms/${encodeURIComponent(code)}`, {
          day: day === now.date ? null : day,
          show: showParam,
          at: atParam,
          group,
          q,
        })}
        className={`cx-item cx-state ${isSel ? 'cx-item--selected' : ''}`}
        aria-current={isSel ? 'true' : undefined}
        onClick={(e) => compact && rememberOrigin(e.currentTarget)}
      >
        <span
          className="grid h-10 w-10 flex-none place-items-center rounded-full"
          style={{
            background: free
              ? 'var(--cx-free-container)'
              : 'var(--md-sys-color-surface-container-highest)',
            color: free ? 'var(--cx-free-on-container)' : 'var(--md-sys-color-on-surface-variant)',
          }}
        >
          <Icon name={!s.known ? 'eventBusy' : free ? 'doorOpen' : 'groups'} size={22} />
        </span>
        <span className="cx-item-body">
          <span className="flex items-baseline gap-2">
            <span className="t-title-m t-narrow t-e">{code}</span>
            {capacity && <span className="t-body-s c-muted">{capacity} seats</span>}
          </span>
          <span className={`t-body-m ${free && !isSel ? 'c-free' : 'c-muted'}`}>
            {statusText(s, when)}
          </span>
        </span>
        {s.known && (
          <span className="cx-item-trail">
            <span className="t-label-l t-e tnum">
              {free ? durationShort(s.freeFor) : hhmm(s.until)}
            </span>
            <span className="t-body-s c-muted">{free ? 'free' : 'free from'}</span>
          </span>
        )}
      </Link>
    )
  }

  return (
    <div className="cx-pane" style={{ paddingBottom: compact ? 96 : 32 }}>
      <TopAppBar
        large={compact}
        title="Rooms"
        subtitle={
          known
            ? show === 'at'
              ? `Free at ${hhmm(at)}, ${day === now.date ? 'today' : shortDate(day)}`
              : day === now.date
                ? `Free right now, ${hhmm(now.minutes)}`
                : shortDate(day)
            : undefined
        }
        actions={compact ? <AccountButton /> : undefined}
        below={
          <div className="mt-4 flex flex-col gap-3">
            <label
              className="flex h-14 items-center gap-3 rounded-full px-4"
              style={{ background: 'var(--md-sys-color-surface-container-high)' }}
            >
              <Icon name="search" className="c-muted" />
              <input
                value={q ?? ''}
                onChange={(e) => setQ(e.target.value || null)}
                placeholder="Search a room code"
                aria-label="Search rooms"
                className="t-body-l min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--md-sys-color-on-surface-variant)]"
                autoComplete="off"
                spellCheck={false}
              />
              {q && (
                <button
                  type="button"
                  className="cx-icon-btn cx-state -mr-2"
                  aria-label="Clear the search"
                  onClick={() => setQ(null)}
                >
                  <Icon name="close" />
                </button>
              )}
            </label>
            <Segmented
              label="Which rooms"
              value={show}
              onChange={(v) => setShow(v === 'free' ? null : v)}
              options={[
                { value: 'free', label: 'Free now' },
                { value: 'at', label: 'Free at…' },
                { value: 'all', label: 'All' },
              ]}
            />
            <AnimatePresence initial={false}>
              {show === 'at' && (
                <m.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ height: springs.spatialDefault, opacity: springs.effectsDefault }}
                  className="-mx-4 overflow-hidden"
                >
                  <div
                    className="flex gap-2 overflow-x-auto px-4 pb-1"
                    role="radiogroup"
                    aria-label="Time"
                  >
                    {Array.from({ length: 12 }, (_, i) => DAY_START + i * 60).map((t) => (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={t === at}
                        className={`cx-chip cx-state tnum ${t === at ? 'cx-chip--selected' : ''}`}
                        onClick={() => setAt(hhmm(t))}
                      >
                        {t === at && <Icon name="check" size={18} />}
                        {hhmm(t)}
                      </button>
                    ))}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
            {group && (
              <div>
                <button
                  type="button"
                  className="cx-chip cx-chip--selected cx-state"
                  onClick={() => setGroup(null)}
                  aria-label={`Showing ${group} rooms only. Remove this filter`}
                >
                  {group} rooms
                  <Icon name="close" size={18} />
                </button>
              </div>
            )}
          </div>
        }
      />
      <div className="px-4">
        {!known ? (
          <div
            className="mt-2 rounded-[28px] p-5"
            style={{ background: 'var(--md-sys-color-surface-container)' }}
          >
            <p className="t-title-m">No room timetable for {longDate(day)}</p>
            <p className="t-body-m c-muted mt-1">
              The demo has every room’s timetable for Monday 23 to Friday 27 November only. In the
              app this comes from the API for any teaching day.
            </p>
            <button
              type="button"
              className="cx-btn cx-btn--tonal cx-state mt-4"
              onClick={() => setDay(dates[dates.length - 1])}
            >
              Show Friday 27 November instead
            </button>
          </div>
        ) : (
          <>
            {yours.length > 0 && !group && !query && day === now.date && (
              <section aria-labelledby="yours">
                <h2 id="yours" className="cx-section-title">
                  Your rooms today
                </h2>
                <ul className="cx-list">
                  {yours.map((code) => (
                    <li key={code}>
                      {row(
                        code,
                        roomStatus(data, code, day, when),
                        data.rooms.find((r) => r.code === code)?.capacity ?? null,
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <p className="t-body-s c-muted mt-6 flex gap-2 px-1">
              <Icon name="info" size={16} />
              <span>
                Grouped by the start of the room code. The timetable doesn’t say which building a
                room is in, so a group is a hint, not a map.
              </span>
            </p>
            {ordered.length === 0 && (
              <p className="t-body-l mt-6 px-1">
                {query ? `No room matches “${q}”.` : 'No room is free then.'}{' '}
                {show !== 'all' && (
                  <button
                    type="button"
                    className="c-primary underline"
                    onClick={() => setShow('all')}
                  >
                    Show all rooms
                  </button>
                )}
              </p>
            )}
            {ordered.map(([g, list]) => (
              <section key={g} aria-label={`${g} rooms`}>
                <h2 className="cx-section-title">
                  <span>{g === 'CP' ? 'CP rooms' : `${g} rooms`}</span>
                  <span className="t-body-s c-muted font-normal">
                    {totals.get(g)?.free ?? 0} of {totals.get(g)?.all ?? list.length} free
                  </span>
                </h2>
                <ul className="cx-list">
                  {list.map(({ r, s }) => (
                    <li key={r.code}>{row(r.code, s, r.capacity)}</li>
                  ))}
                </ul>
              </section>
            ))}
            <p className="t-body-s c-muted mt-8 px-1">
              From the official timetable. Bookings and exams outside it aren’t shown.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

function RoomDayPane({ code, back }: { code: string; back: boolean }) {
  const { data, now } = useProto()
  const navigate = useNavigate()
  const { compact } = useWindowClass()
  const [dayParam, setDay] = useParam('day')
  const dates = roomDates(data)
  const day = dayParam && /^\d{4}-\d{2}-\d{2}$/.test(dayParam) ? dayParam : now.date
  const room = data.rooms.find((r) => r.code === code)
  const occ = roomDay(data, code, day)
  const isToday = day === now.date
  const status = isToday && occ ? roomStatus(data, code, day, now.minutes) : null
  const mine = new Set(
    dayClasses(data, day)
      .filter((c) => c.o.room === code)
      .map((c) => c.o.startsAt),
  )
  const idx = dates.indexOf(day)

  useKeys(
    {
      ArrowLeft: () => idx > 0 && setDay(dates[idx - 1] === now.date ? null : dates[idx - 1]),
      ArrowRight: () =>
        idx >= 0 &&
        idx < dates.length - 1 &&
        setDay(dates[idx + 1] === now.date ? null : dates[idx + 1]),
      t: () => setDay(null),
    },
    !compact,
  )

  // the day as alternating free gaps and classes, 08:00–20:00
  const spans: {
    kind: 'free' | 'busy'
    from: number
    to: number
    o?: NonNullable<typeof occ>[number]
  }[] = []
  if (occ) {
    let t = DAY_START
    for (const o of occ) {
      const s = minutesOf(o.startsAt)
      const e = minutesOf(o.endsAt)
      if (s > t) spans.push({ kind: 'free', from: t, to: s })
      spans.push({ kind: 'busy', from: s, to: e, o })
      t = Math.max(t, e)
    }
    if (t < DAY_END) spans.push({ kind: 'free', from: t, to: DAY_END })
  }

  const content = (
    <div className="cx-pane" style={{ paddingBottom: compact ? 32 : 32 }}>
      <TopAppBar
        large={compact}
        title={<span className="t-narrow font-semibold">{code}</span>}
        smallTitle={code}
        subtitle={[
          `In the ${groupOf(code)} group`,
          room?.capacity ? `${room.capacity} seats` : null,
        ]
          .filter(Boolean)
          .join(', ')}
        leading={
          back ? (
            <button
              type="button"
              className="cx-icon-btn cx-state ml-1"
              aria-label="Back to rooms"
              onClick={() => navigate(-1)}
            >
              <Icon name="arrowBack" />
            </button>
          ) : undefined
        }
        below={
          <div className="mt-4">
            <div className="cx-seg cx-seg--sm" role="radiogroup" aria-label="Day">
              {dates.map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={d === day}
                  className="cx-state tnum flex-col !gap-0 !py-1"
                  style={{ minHeight: 52 }}
                  onClick={() => setDay(d === now.date ? null : d)}
                >
                  <span className="t-label-m">{weekdayShort(d)}</span>
                  <span className="t-title-s">{Number(d.slice(8))}</span>
                </button>
              ))}
            </div>
          </div>
        }
      />
      <div className="px-4">
        {!occ ? (
          <div
            className="rounded-[28px] p-5"
            style={{ background: 'var(--md-sys-color-surface-container)' }}
          >
            <p className="t-title-m">No timetable for {longDate(day)}</p>
            <p className="t-body-m c-muted mt-1">
              The demo has this room’s days from Monday 23 to Friday 27 November. Pick one above.
            </p>
          </div>
        ) : (
          <>
            {status?.known && (
              <div
                className="flex items-start gap-4 rounded-[28px] p-5"
                style={{
                  background: status.free
                    ? 'var(--cx-free-container)'
                    : 'var(--md-sys-color-surface-container-high)',
                  color: status.free
                    ? 'var(--cx-free-on-container)'
                    : 'var(--md-sys-color-on-surface)',
                }}
              >
                <Icon name={status.free ? 'doorOpen' : 'groups'} size={28} />
                <div>
                  <p className="t-title-l">{statusText(status, now.minutes)}</p>
                  <p className="t-body-m mt-1" style={{ opacity: 0.88 }}>
                    {status.free
                      ? status.until !== null
                        ? `${duration(status.freeFor)} from now`
                        : 'Nothing else on in it today'
                      : status.freeFor > 0
                        ? `Then free ${hhmm(status.until)} to ${hhmm(status.until + status.freeFor)}`
                        : 'Then nothing until the end of the day'}
                  </p>
                </div>
              </div>
            )}
            <DayStrip spans={spans} nowMin={isToday ? now.minutes : null} />
            <h2 className="cx-section-title">{isToday ? 'Today' : longDate(day)}</h2>
            <ul className="cx-list">
              {spans.map((sp) =>
                sp.kind === 'free' ? (
                  <li key={`f${sp.from}`} className="cx-item">
                    <span className="cx-item-lead c-free">
                      <Icon name="doorOpen" />
                    </span>
                    <span className="cx-item-body">
                      <span className="t-body-l c-free">Free</span>
                      <span className="t-body-m c-muted">{duration(sp.to - sp.from)}</span>
                    </span>
                    <span className="cx-item-trail t-body-m tnum c-muted">
                      {hhmm(sp.from)} to {hhmm(sp.to)}
                    </span>
                  </li>
                ) : (
                  <li
                    key={`b${sp.from}`}
                    className={`cx-item cx-item--three ${isToday && sp.to <= now.minutes ? 'cx-item--past' : ''}`}
                  >
                    <span className="cx-item-lead">
                      <Icon name="groups" />
                    </span>
                    <span className="cx-item-body">
                      <span className="t-body-l">{sp.o!.subject}</span>
                      <span className="t-body-m c-muted">
                        {capital(sp.o!.kinds[0] ?? 'class')}
                        {sp.o!.offered
                          ? ', for the students who pick this slot'
                          : sp.o!.groups.length
                            ? ` for ${groupsText(sp.o!.groups)}`
                            : ''}
                      </span>
                      {mine.has(sp.o!.startsAt) && (
                        <span className="cx-chip cx-chip--small cx-chip--selected mt-1 self-start">
                          <Icon name="school" size={14} />
                          Your class
                        </span>
                      )}
                    </span>
                    <span className="cx-item-trail t-body-m tnum">
                      <span>{hhmm(sp.from)}</span>
                      <span className="c-muted">{hhmm(sp.to)}</span>
                    </span>
                  </li>
                ),
              )}
            </ul>
            <p className="t-body-s c-muted mt-6 px-1">
              From the official timetable. Exams and one-off bookings aren’t in it.{' '}
              {!compact && (
                <>
                  <kbd>←</kbd> <kbd>→</kbd> change the day.
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
  return content
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** The room's day at a glance: 08–20, free time in green, a live now marker. */
function DayStrip({
  spans,
  nowMin,
}: {
  spans: { kind: 'free' | 'busy'; from: number; to: number }[]
  nowMin: number | null
}) {
  const pct = (m: number) => `${((m - DAY_START) / (DAY_END - DAY_START)) * 100}%`
  const free = spans.filter((s) => s.kind === 'free')
  return (
    <div
      className="mt-5"
      aria-label={`Free ${free.map((s) => `${hhmm(s.from)} to ${hhmm(s.to)}`).join(', ') || 'never'}`}
      role="img"
    >
      <div
        className="relative h-9 overflow-hidden rounded-full"
        style={{ background: 'var(--md-sys-color-surface-container-highest)' }}
      >
        {free.map((s) => (
          <span
            key={s.from}
            className="absolute inset-y-0"
            style={{
              left: pct(s.from),
              width: `calc(${pct(s.to)} - ${pct(s.from)})`,
              background: 'var(--cx-free-container)',
            }}
          />
        ))}
        {spans
          .filter((s) => s.kind === 'busy')
          .map((s) => (
            <span
              key={`b${s.from}`}
              className="absolute inset-y-1.5 rounded-full"
              style={{
                left: `calc(${pct(s.from)} + 2px)`,
                width: `calc(${pct(s.to)} - ${pct(s.from)} - 4px)`,
                background: 'var(--md-sys-color-surface-bright)',
              }}
            />
          ))}
        {nowMin !== null && nowMin >= DAY_START && nowMin <= DAY_END && (
          <span
            className="absolute inset-y-0 w-1 -translate-x-1/2 rounded-full"
            style={{
              left: pct(nowMin),
              background: 'var(--cx-live)',
              transition:
                'left var(--cx-motion-spatial-default-duration) var(--cx-motion-spatial-default)',
            }}
          />
        )}
      </div>
      <div className="t-label-s c-muted tnum relative mt-1 h-4">
        {[8, 10, 12, 14, 16, 18, 20].map((h) => (
          <span
            key={h}
            className={`absolute ${h === 8 ? '' : h === 20 ? '-translate-x-full' : '-translate-x-1/2'}`}
            style={{ left: pct(h * 60) }}
          >
            {String(h).padStart(2, '0')}
          </span>
        ))}
      </div>
    </div>
  )
}
