/**
 * Rooms, status first: what's free now (or at a time), grouped by the room code's prefix, each with a
 * thin strip of its day. A room's day is the same spine as Today, with the free windows labelled.
 */
import { minutesOf } from '../clock'
import { buildingOf, classesOn, type RoomOccurrence } from '../data'
import { vars } from './css'
import { IconBack, IconClose } from './icons'
import {
  busyWindows,
  dayMonth,
  duration,
  elapsedFor,
  hhmm,
  kindLabel,
  longDate,
  ROOM_DATES,
  roomDay,
  roomStatus,
  freeDuring,
  weekdayName,
  weekdayShort,
  dayOfMonth,
  groupLabel,
  NEUTRAL,
  type RoomStatus,
} from './model'
import { Spine, TEXT_X } from './Spine'
import { useNav, useProto, useColorOf, type FreeMode } from './state'
import { Segmented } from './ui'

// ---------- shared bits ----------

function StatusLine({ s, moment }: { s: RoomStatus; moment: number }) {
  if (s.state === 'free') {
    return (
      <span className="text-body-small">
        <span aria-hidden className="mr-2 inline-block size-2 rounded-full bg-success" />
        <span className="b-free-text">
          {s.until === null ? (
            'Free for the rest of the day'
          ) : (
            <>
              Free until <span className="b-num">{hhmm(s.until)}</span>
            </>
          )}
        </span>
        {s.until !== null ? (
          <span className="b-num ml-2 text-ink-muted">{duration(s.until - moment)}</span>
        ) : null}
      </span>
    )
  }
  return (
    <span className="text-body-small">
      <span aria-hidden className="mr-2 inline-block size-2 rounded-full border-2 border-warn" />
      <span className="b-busy-text">
        In use until <span className="b-num">{hhmm(s.until ?? 0)}</span>
      </span>
      <span className="ml-2 text-ink-muted">
        {s.nextFree?.end ? (
          <>
            then free until <span className="b-num">{hhmm(s.nextFree.end)}</span>
          </>
        ) : (
          'then free'
        )}
      </span>
    </span>
  )
}

function MiniRoomDay({ occs, nowMin }: { occs: RoomOccurrence[]; nowMin: number | null }) {
  const busy = busyWindows(occs)
  const pos = (m: number) => `${(Math.min(Math.max(m, 480), 1200) - 480) / 7.2}%`
  return (
    <span aria-hidden className="relative block h-1.5 w-24 shrink-0 rounded-full bg-line">
      {busy.map((b) => (
        <span
          key={b.start}
          className="absolute inset-y-0 rounded-full bg-ink-muted"
          style={{ left: pos(b.start), width: `calc(${pos(b.end)} - ${pos(b.start)})` }}
        />
      ))}
      {nowMin !== null && nowMin >= 480 && nowMin <= 1200 ? (
        <span
          className="absolute -inset-y-1 w-0.5 rounded-full"
          style={{ left: pos(nowMin), background: 'var(--b-live)' }}
        />
      ) : null}
    </span>
  )
}

function DayPills({ date, onPick }: { date: string; onPick: (d: string) => void }) {
  const { now } = useProto()
  return (
    <div className="flex gap-0.5">
      {ROOM_DATES.map((d) => (
        <button
          key={d}
          type="button"
          aria-pressed={d === date}
          onClick={() => onPick(d)}
          className={`flex min-h-12 flex-1 items-center justify-center gap-1 rounded-full px-1 text-label transition-colors ${
            d === date ? 'bg-raised text-ink' : 'text-ink-muted hover:text-ink-soft'
          }`}
        >
          {weekdayShort(d)} <span className="b-num">{dayOfMonth(d)}</span>
          {d === now.date ? (
            <span
              aria-label="today"
              className="size-1.5 rounded-full"
              style={{ background: 'var(--b-live)' }}
            />
          ) : null}
        </button>
      ))}
    </div>
  )
}

function NoRoomData({ date }: { date: string }) {
  return (
    <div className="mt-6">
      <p className="text-body text-ink">No room timetable for {longDate(date)}.</p>
      <p className="mt-1 text-body-small text-ink-muted">
        This demo has every room&rsquo;s timetable for Monday 23 to Friday 27 November: pick one of
        those days above.
      </p>
    </div>
  )
}

// ---------- the list ----------

interface Row {
  code: string
  occs: RoomOccurrence[]
  status: RoomStatus
  group: string
}

function useRoomRows() {
  const { data, now } = useProto()
  const [nav] = useNav()
  const date = nav.rday ?? now.date
  const isToday = date === now.date
  const hasData = ROOM_DATES.includes(date)
  const mode: FreeMode = nav.free === 'now' && !isToday ? 'at' : nav.free
  const from = nav.from ? minutesOf(nav.from) : isToday ? now.minutes : 10 * 60
  const until = nav.until ? minutesOf(nav.until) : null
  const moment = mode === 'now' ? now.minutes : from
  const rows: Row[] = hasData
    ? data.rooms.map((r) => {
        const occs = roomDay(data, r.code, date) ?? []
        return { code: r.code, occs, status: roomStatus(occs, moment), group: buildingOf(r.code) }
      })
    : []
  const visible = rows
    .filter((r) => !nav.grp || r.group === nav.grp)
    .filter((r) => {
      if (mode === 'all') return true
      if (mode === 'at') return freeDuring(r.occs, from, until ?? from + 1)
      return r.status.state === 'free'
    })
  const mine = [
    ...new Set(
      classesOn(data.timetable, date)
        .map((o) => o.room)
        .filter((c): c is string => !!c),
    ),
  ]
  return { date, isToday, hasData, mode, from, until, moment, rows, visible, mine }
}

function sortRows(a: Row, b: Row): number {
  if (a.status.state !== b.status.state) return a.status.state === 'free' ? -1 : 1
  const au = a.status.until ?? 9999
  const bu = b.status.until ?? 9999
  return a.status.state === 'free' ? bu - au : au - bu
}

function RoomRow({
  r,
  moment,
  nowMin,
  selected,
}: {
  r: Row
  moment: number
  nowMin: number | null
  selected: boolean
}) {
  const { wide } = useProto()
  const [nav, go] = useNav()
  return (
    <li>
      <button
        type="button"
        aria-current={selected ? 'true' : undefined}
        onClick={() => go({ view: wide ? 'rooms' : 'room', room: r.code, rday: nav.rday })}
        className={`flex min-h-16 w-full items-center gap-4 rounded-md px-3 py-2.5 text-left transition-colors ${
          selected ? 'bg-raised' : 'hover:bg-raised/70'
        }`}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="b-num text-subtitle text-ink">{r.code}</span>
          <StatusLine s={r.status} moment={moment} />
        </span>
        <MiniRoomDay occs={r.occs} nowMin={nowMin} />
      </button>
    </li>
  )
}

export function RoomsList({ selected }: { selected: string | null }) {
  const { now, wide } = useProto()
  const [nav, go] = useNav()
  const { date, isToday, hasData, mode, from, until, moment, rows, visible, mine } = useRoomRows()
  const nowMin = isToday ? now.minutes : null
  const groups = new Map<string, Row[]>()
  const sizes = new Map<string, number>()
  for (const r of rows) sizes.set(r.group, (sizes.get(r.group) ?? 0) + 1)
  for (const r of visible) {
    const g = r.group.length > 3 || (sizes.get(r.group) ?? 0) < 2 ? 'Other' : r.group
    groups.set(g, [...(groups.get(g) ?? []), r])
  }
  const order = [...groups.keys()].sort((a, b) =>
    a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b),
  )
  const pinned = rows.filter((r) => mine.includes(r.code))

  return (
    <div className={wide ? 'px-5 pt-6 pb-16' : 'px-4 pt-7 pb-32'}>
      <div className="px-1">
        <h1 className="b-title">Rooms</h1>
        <p className="mt-1 text-body-small text-ink-muted">
          {weekdayName(date)} {dayMonth(date)}
          {hasData ? (
            <>
              , <span className="b-num">{hhmm(moment)}</span>
              {mode === 'at' && until !== null ? (
                <>
                  {' '}
                  to <span className="b-num">{hhmm(until)}</span>
                </>
              ) : null}
            </>
          ) : null}
        </p>
        <div className="mt-4">
          <DayPills
            date={date}
            onPick={(d) => go({ rday: d === now.date ? null : d }, { replace: true })}
          />
        </div>
      </div>

      {!hasData ? (
        <div className="px-1">
          <NoRoomData date={date} />
        </div>
      ) : (
        <>
          <div className="mt-4 px-1">
            <Segmented<FreeMode>
              id="rooms-mode"
              label="Which rooms"
              value={mode}
              onChange={(v) =>
                go(
                  {
                    free: v,
                    from: v === 'at' ? (nav.from ?? hhmm(Math.ceil(moment / 5) * 5)) : null,
                    until: v === 'at' ? nav.until : null,
                  },
                  { replace: true },
                )
              }
              options={[
                { value: 'now', label: 'Free now', disabled: !isToday },
                { value: 'at', label: 'Free at…' },
                { value: 'all', label: 'All' },
              ]}
            />
            {mode === 'at' ? (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-body-small text-ink-soft">
                  From
                  <input
                    type="time"
                    step={300}
                    value={hhmm(from)}
                    onChange={(e) =>
                      e.target.value && go({ from: e.target.value }, { replace: true })
                    }
                    className="b-num min-h-12 rounded-md bg-raised px-2 text-ink"
                  />
                </label>
                <label className="flex items-center gap-2 text-body-small text-ink-soft">
                  until
                  <input
                    type="time"
                    step={300}
                    value={until !== null ? hhmm(until) : ''}
                    onChange={(e) => go({ until: e.target.value || null }, { replace: true })}
                    className="b-num min-h-12 rounded-md bg-raised px-2 text-ink"
                  />
                </label>
              </div>
            ) : null}
            {nav.grp ? (
              <button
                type="button"
                onClick={() => go({ grp: null }, { replace: true })}
                className="mt-3 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-raised pr-2.5 pl-3.5 text-label text-ink hover:bg-line"
              >
                {groupLabel(nav.grp)} only
                <IconClose width={16} height={16} aria-label="clear" />
              </button>
            ) : null}
          </div>

          {pinned.length ? (
            <section className="mt-7" aria-labelledby="rooms-mine">
              <h2 id="rooms-mine" className="px-1 text-label text-ink-soft">
                Your rooms {isToday ? 'today' : `on ${weekdayName(date)}`}
              </h2>
              <ul className="mt-1">
                {pinned.map((r) => (
                  <RoomRow
                    key={r.code}
                    r={r}
                    moment={moment}
                    nowMin={nowMin}
                    selected={r.code === selected}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          {order.map((g) => (
            <section key={g} className="mt-7" aria-labelledby={`grp-${g}`}>
              <h2 id={`grp-${g}`} className="px-1 text-label text-ink-soft">
                {g === 'Other' ? 'Other rooms' : groupLabel(g)}
                <span className="b-num ml-2 font-normal text-ink-muted">
                  {groups.get(g)?.length}
                </span>
              </h2>
              <ul className="mt-1">
                {[...(groups.get(g) ?? [])].sort(sortRows).map((r) => (
                  <RoomRow
                    key={r.code}
                    r={r}
                    moment={moment}
                    nowMin={nowMin}
                    selected={r.code === selected}
                  />
                ))}
              </ul>
            </section>
          ))}
          {!visible.length ? (
            <p className="mt-8 px-1 text-body text-ink-soft">
              No room is free for that whole time{nav.grp ? ` in the ${groupLabel(nav.grp)}` : ''}.
            </p>
          ) : null}

          <p className="mt-10 px-1 text-caption text-ink-muted">
            Based on the official timetable. Groups come from the room code (B515 is in the B
            group): the timetable lists no buildings, so a group is a good guess, not a map.
          </p>
        </>
      )}
    </div>
  )
}

// ---------- one room's day ----------

interface RoomBlock {
  key: string
  start: number
  end: number
  list: RoomOccurrence[]
  lane: number
  lanes: number
}

function roomBlocks(occs: RoomOccurrence[]): RoomBlock[] {
  const same = new Map<string, RoomOccurrence[]>()
  for (const o of occs) {
    const k = `${o.startsAt}-${o.endsAt}`
    same.set(k, [...(same.get(k) ?? []), o])
  }
  const items: RoomBlock[] = [...same.entries()]
    .map(([key, list]) => ({
      key,
      start: minutesOf(list[0].startsAt),
      end: minutesOf(list[0].endsAt),
      list,
      lane: 0,
      lanes: 1,
    }))
    .sort((a, b) => a.start - b.start || b.end - a.end)
  let cluster: RoomBlock[] = []
  let clusterEnd = -1
  const assign = () => {
    const ends: number[] = []
    for (const it of cluster) {
      let lane = ends.findIndex((e) => e <= it.start)
      if (lane < 0) {
        lane = ends.length
        ends.push(it.end)
      } else ends[lane] = it.end
      it.lane = lane
    }
    for (const it of cluster) it.lanes = ends.length
  }
  for (const it of items) {
    if (cluster.length && it.start >= clusterEnd) {
      assign()
      cluster = []
    }
    cluster.push(it)
    clusterEnd = Math.max(clusterEnd, it.end)
  }
  if (cluster.length) assign()
  return items
}

function groupsText(groups: string[]): string {
  if (!groups.length) return ''
  if (groups.length <= 2) return `For ${groups.join(' and ')}`
  return `For ${groups.slice(0, 2).join(', ')} and ${groups.length - 2} more groups`
}

export function RoomDay({ code, onBack }: { code: string; onBack?: () => void }) {
  const { data, now, start, wide, subjects } = useProto()
  const colorOf = useColorOf()
  const [nav, go] = useNav()
  const date = nav.rday ?? now.date
  const occs = roomDay(data, code, date)
  const scale = 0.9
  const elapsed = elapsedFor(date, now)
  const nowMin = typeof elapsed === 'number' ? elapsed : null
  const mineToday = classesOn(data.timetable, date).filter((o) => o.room === code)
  const blocks = occs ? roomBlocks(occs) : []
  const busy = occs ? busyWindows(occs) : []
  const rs = Math.floor(Math.min(480, ...blocks.map((b) => b.start)) / 60) * 60
  const re = Math.ceil(Math.max(1200, ...blocks.map((b) => b.end)) / 60) * 60
  const free: { start: number; end: number }[] = []
  let cursor = rs
  for (const b of busy) {
    if (b.start - cursor >= 30) free.push({ start: cursor, end: b.start })
    cursor = Math.max(cursor, b.end)
  }
  if (re - cursor >= 30) free.push({ start: cursor, end: re })
  const status = occs && nowMin !== null ? roomStatus(occs, nowMin) : null
  const group = buildingOf(code)

  return (
    <div className={wide ? 'max-w-2xl px-6 pt-6 pb-16' : 'px-4 pt-4 pb-32'}>
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 flex min-h-11 items-center gap-1 rounded-full pr-3 pl-1 text-label text-ink-soft hover:text-ink"
        >
          <IconBack width={20} height={20} /> Rooms
        </button>
      ) : null}
      <div className="px-1">
        <h1 className="b-num b-room-title mt-2 text-ink">{code}</h1>
        <p className="mt-2 text-caption text-ink-muted">
          {group.length > 3
            ? 'A room of its own in the codes'
            : `${groupLabel(group)}, going by the code`}
        </p>

        {status ? (
          <div className="mt-5">
            <p
              className={`text-heading ${status.state === 'free' ? 'b-free-text' : 'b-busy-text'}`}
            >
              {status.state === 'free' ? (
                status.until === null ? (
                  'Free for the rest of the day'
                ) : (
                  <>
                    Free until <span className="b-num">{hhmm(status.until)}</span>
                  </>
                )
              ) : (
                <>
                  In use until <span className="b-num">{hhmm(status.until ?? 0)}</span>
                </>
              )}
            </p>
            <p className="mt-0.5 text-body-small text-ink-soft">
              {status.state === 'busy' && status.current?.length ? (
                <>Now: {status.current[0].subject}. </>
              ) : null}
              {status.state === 'busy' && status.nextFree ? (
                status.nextFree.end !== null ? (
                  <>
                    Free next <span className="b-num">{hhmm(status.nextFree.start)}</span> to{' '}
                    <span className="b-num">{hhmm(status.nextFree.end)}</span>.
                  </>
                ) : (
                  <>
                    Free from <span className="b-num">{hhmm(status.nextFree.start)}</span> for the
                    rest of the day.
                  </>
                )
              ) : null}
              {status.state === 'free' && status.until !== null && nowMin !== null ? (
                <>{duration(status.until - nowMin)} from now.</>
              ) : null}
            </p>
          </div>
        ) : null}

        <div className="mt-5">
          <DayPills
            date={date}
            onPick={(d) => go({ rday: d === now.date ? null : d }, { replace: true })}
          />
        </div>
      </div>

      {!occs ? (
        <div className="px-1">
          <NoRoomData date={date} />
        </div>
      ) : (
        <div className="mt-6">
          <p className="mb-3 px-1 text-body-small text-ink-muted">
            {occs.length
              ? `${occs.length} ${occs.length === 1 ? 'class' : 'classes'} ${date === now.date ? 'today' : `on ${weekdayName(date)}`}`
              : `Nothing booked ${date === now.date ? 'today' : `on ${weekdayName(date)}`}`}
          </p>
          <Spine
            range={[rs, re]}
            elapsed={elapsed}
            scale={scale}
            jumpKey={`${code}|${date}|${start}`}
            labels={[...new Set(busy.flatMap((b) => [b.start, b.end]))]}
            segments={blocks.map((b) => {
              const mine = mineToday.find((o) => minutesOf(o.startsAt) === b.start)
              return {
                key: b.key,
                start: b.start,
                end: b.end,
                color: mine ? colorOf(mine) : NEUTRAL,
                offset: b.lane * 9,
              }
            })}
          >
            {(y) => (
              <>
                {free.map((f) => {
                  const cur = nowMin !== null && nowMin >= f.start && nowMin < f.end
                  const past = elapsed === 'past' || (nowMin !== null && nowMin >= f.end)
                  const h = (f.end - f.start) * scale
                  return (
                    <div
                      key={f.start}
                      className="absolute right-3 flex flex-col justify-center"
                      style={{ top: y(f.start), height: h, left: TEXT_X }}
                    >
                      {h >= 34 ? (
                        <p className={`text-label ${past ? 'text-ink-muted' : 'b-free-text'}`}>
                          {cur ? 'Free now' : `Free ${duration(f.end - f.start)}`}
                          <span className="b-num ml-2 font-normal text-ink-muted">
                            {hhmm(f.start)}–{hhmm(f.end)}
                          </span>
                        </p>
                      ) : null}
                    </div>
                  )
                })}
                {blocks.map((b) => {
                  const mine = mineToday.find((o) => minutesOf(o.startsAt) === b.start)
                  const color = mine ? colorOf(mine) : NEUTRAL
                  const past = elapsed === 'past' || (nowMin !== null && b.end <= nowMin)
                  const h = (b.end - b.start) * scale
                  const width = `((100% - ${TEXT_X + 8}px) / ${b.lanes})`
                  const first = b.list[0]
                  const subjectsHere = [...new Set(b.list.map((o) => o.subject))]
                  const groups = [...new Set(b.list.flatMap((o) => o.groups))]
                  return (
                    <div
                      key={b.key}
                      className="absolute pr-3"
                      style={vars(
                        { '--sub': color },
                        {
                          top: y(b.start) + 2,
                          height: h - 4,
                          left: `calc(${TEXT_X}px + ${b.lane} * ${width})`,
                          width: `calc(${width})`,
                        },
                      )}
                    >
                      <div
                        className={`relative flex h-full flex-col overflow-hidden ${
                          b.lane > 0 ? 'border-l border-line pl-3' : ''
                        }`}
                      >
                        {mine ? (
                          <span className="mb-0.5 flex items-center gap-1.5 text-caption font-semibold text-ink">
                            <span aria-hidden className="b-swatch size-1.5 rounded-full" />
                            Your class
                            {subjects.byId.get(mine.subjectId) ? `, ${mine.shortName}` : ''}
                          </span>
                        ) : null}
                        <span
                          className={`text-label leading-snug ${h >= 80 ? 'line-clamp-2' : 'truncate'} ${
                            past ? 'text-ink-muted' : 'text-ink'
                          }`}
                        >
                          {subjectsHere.join(' / ')}
                        </span>
                        <span className="flex gap-2.5 text-caption text-ink-muted">
                          <span>{kindLabel(first)}</span>
                          <span className="b-num">
                            {hhmm(b.start)}–{hhmm(b.end)}
                          </span>
                        </span>
                        {h >= 100 && (groups.length || first.offered) ? (
                          <span className="mt-0.5 truncate text-caption text-ink-muted">
                            {groups.length
                              ? groupsText(groups)
                              : 'Offered slot, for students who pick it'}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </Spine>
        </div>
      )}
    </div>
  )
}

// ---------- screens ----------

export function RoomsScreen() {
  return <RoomsList selected={null} />
}

export function RoomDayScreen() {
  const [nav, go] = useNav()
  if (!nav.room) return <RoomsList selected={null} />
  return <RoomDay code={nav.room} onBack={() => go({ view: 'rooms', room: null })} />
}

export function RoomsDesktop() {
  const { data, now } = useProto()
  const [nav] = useNav()
  const date = nav.rday ?? now.date
  // With no room picked, show the room of the class you're in or heading to.
  const todays = classesOn(data.timetable, date)
  const current =
    date === now.date ? todays.find((o) => minutesOf(o.endsAt) > now.minutes) : todays[0]
  const code = nav.room ?? current?.room ?? todays[0]?.room ?? null
  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(380px,440px)_minmax(0,1fr)]">
      <section aria-label="Rooms" className="min-h-0 overflow-y-auto border-r border-line">
        <RoomsList selected={code} />
      </section>
      <section aria-label="Room day" className="min-h-0 overflow-y-auto">
        {code ? (
          <RoomDay code={code} />
        ) : (
          <p className="px-6 pt-8 text-body text-ink-soft">Pick a room to see its day.</p>
        )}
      </section>
    </div>
  )
}
