/**
 * One day on the spine: the state sentence, the blocks and labelled gaps, the bridge to the next class
 * when the day is over, and what's due soon. Phone Today and the desktop day pane both use it.
 */
import { m } from 'motion/react'
import { Fragment, type ReactNode, type Ref, type SVGProps } from 'react'
import { addDays, minutesOf } from '../clock'
import { buildingOf, classesOn, type Occurrence } from '../data'
import { vars } from './css'
import { DeadlineRow } from './Deadlines'
import {
  blocksOf,
  dayMonth,
  dayRange,
  daysBetween,
  deadlinesOf,
  duration,
  elapsedFor,
  freeRoomsNear,
  gapsOf,
  groupLabel,
  hhmm,
  isWeekend,
  kindLabel,
  kindWord,
  livedPx,
  minutesUntil,
  nextClassAfter,
  nonTeachingReason,
  blockLabel,
  blockState,
  phaseOf,
  relativeDay,
  statusText,
  urgentDeadlines,
  onSpine,
  weekdayName,
  type ClassBlock,
  type Elapsed,
  type GapSpan,
} from './model'
import { CAPSULE, GUTTER, Spine, SPINE_X, TEXT_X } from './Spine'
import { IconCourse, IconLab, IconSeminar } from './icons'
import { useColorOf, useNav, useProto } from './state'

// ---------- the state sentence ----------

type Part = string | { b: string }

function Sentence({ parts }: { parts: Part[] }) {
  return (
    <>
      {parts.map((p, i) =>
        typeof p === 'string' ? <Fragment key={i}>{p}</Fragment> : <strong key={i}>{p.b}</strong>,
      )}
    </>
  )
}

function room(o: Occurrence): Part {
  return o.room ? { b: o.room } : 'a room not listed yet'
}

function short(o: Occurrence): string {
  return o.shortName ?? o.subject
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function headline(
  classes: Occurrence[],
  date: string,
  nowDate: string,
  nowMinute: number,
  reason: string | null,
): Part[][] {
  const blocks = blocksOf(classes)
  if (!blocks.length) {
    if (reason) return [[`${reason}. No classes.`]]
    if (isWeekend(date)) return [[date === nowDate ? 'Weekend. No classes.' : 'No classes.']]
    return [[date === nowDate ? 'No classes today.' : `No classes on ${weekdayName(date)}.`]]
  }
  const first = blocks[0]
  const last = blocks[blocks.length - 1]
  const n = blocks.length
  if (date !== nowDate) {
    const gaps = gapsOf(blocks)
    const free = gaps.reduce((s, g) => s + g.end - g.start, 0)
    const lines: Part[][] = [
      [
        `${n} ${n === 1 ? 'class' : 'classes'}, `,
        { b: hhmm(first.start) },
        ' to ',
        { b: hhmm(last.end) },
        '.',
      ],
    ]
    if (free) lines.push([`${duration(free)} free in between.`])
    return lines
  }
  const phase = phaseOf(blocks, nowMinute)
  switch (phase.kind) {
    case 'before': {
      const o = phase.next.occ
      const mins = phase.next.start - nowMinute
      return [
        mins <= 180
          ? ['First class in ', { b: duration(mins) }, '.']
          : ['First class at ', { b: hhmm(phase.next.start) }, '.'],
        [{ b: short(o) }, ` ${kindWord(o)} in `, room(o), '.'],
      ]
    }
    case 'in': {
      const o = phase.current.occ
      const lines: Part[][] = [
        ['In ', { b: short(o) }, ` ${kindWord(o)} until `, { b: hhmm(phase.current.end) }, '.'],
      ]
      const nx = phase.next
      if (!nx) lines.push(['Last class today.'])
      else if (nx.start === phase.current.end)
        lines.push(['Then ', { b: short(nx.occ) }, ` ${kindWord(nx.occ)} in `, room(nx.occ), '.'])
      else
        lines.push([
          `Then ${duration(nx.start - phase.current.end)} free, `,
          { b: short(nx.occ) },
          ' at ',
          { b: hhmm(nx.start) },
          '.',
        ])
      return lines
    }
    case 'gap': {
      const o = phase.next.occ
      return [
        ['Free until ', { b: hhmm(phase.next.start) }, '.'],
        ['Next: ', { b: short(o) }, ` ${kindWord(o)} in `, room(o), '.'],
      ]
    }
    case 'after':
      return [['Done for today.']]
    case 'none':
      return [['No classes today.']]
  }
}

/** The second line after the last class: where tomorrow (or the next teaching day) starts. */
function nextLine(next: Occurrence | null, today: string): Part[] | null {
  if (!next) return null
  return [
    `${cap(relativeDay(next.date, today))} at `,
    { b: next.startsAt.slice(0, 5) },
    ': ',
    { b: short(next) },
    ` ${kindWord(next)} in `,
    room(next),
    '.',
  ]
}

// ---------- blocks ----------

function KindGlyph({ kind, ...p }: { kind: string } & SVGProps<SVGSVGElement>) {
  if (kind === 'lab') return <IconLab {...p} />
  if (kind === 'seminar') return <IconSeminar {...p} />
  return <IconCourse {...p} />
}

/** The capsule on the spine for one class: empty ahead, filling while it runs, filled once lived. */
export function Capsule({
  lid,
  hidden,
  lived,
  kind,
  full,
}: {
  lid: string | undefined
  hidden: boolean
  /** Lived part, in px. */
  lived: number
  kind: string
  /** The whole capsule is lived. */
  full: boolean
}) {
  if (hidden) return null
  return (
    <m.span
      layoutId={lid}
      aria-hidden
      data-past={full}
      className="b-capsule absolute inset-y-0 left-1.5"
      style={{ width: CAPSULE, borderRadius: 999 }}
      transition={{ type: 'spring', duration: 0.42, bounce: 0.1 }}
    >
      <span
        className="b-capsule-fill b-glide-h absolute inset-x-0 top-0"
        style={{ height: lived }}
      />
      <KindGlyph
        kind={kind}
        width={15}
        height={15}
        className="absolute top-1.5 left-1/2 -translate-x-1/2"
        style={{ color: full || lived > 10 ? 'var(--color-page)' : 'var(--sub)' }}
      />
    </m.span>
  )
}

function DayBlock({
  block,
  top,
  height,
  elapsed,
  scale,
  upcoming,
}: {
  block: ClassBlock
  top: number
  height: number
  elapsed: Elapsed
  scale: number
  upcoming: number | null
}) {
  const { origin, setOrigin } = useProto()
  const [nav, go] = useNav()
  const colorOf = useColorOf()
  const o = block.occ
  const { past, current } = blockState(block, elapsed)
  const lid = `day-${block.id}`
  const expanded = nav.cls === block.id && origin === lid
  const left = current && typeof elapsed === 'number' ? block.end - elapsed : 0
  const tall = height >= 96
  const state = current
    ? `now, ${duration(left)} left`
    : upcoming !== null
      ? `in ${duration(upcoming)}`
      : past
        ? 'over'
        : ''
  const x0 = SPINE_X - CAPSULE / 2 - 6

  return (
    <button
      type="button"
      aria-label={blockLabel(o, state)}
      onClick={() => {
        setOrigin(lid)
        go({ cls: block.id, due: null })
      }}
      className="group absolute right-2 text-left"
      style={vars({ '--sub': colorOf(o) }, { top: top + 2, height: height - 4, left: x0 })}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 right-0 rounded-2xl bg-raised opacity-0 transition-opacity duration-150 group-hover:opacity-60"
        style={{ left: TEXT_X - x0 - 12 }}
      />
      <Capsule
        lid={lid}
        hidden={expanded}
        lived={livedPx(block.start, block.end, elapsed, scale)}
        kind={o.kinds[0] ?? 'course'}
        full={past}
      />
      <span
        className={`absolute inset-y-0 right-0 flex flex-col pr-2 ${tall ? 'pt-1' : 'justify-center'}`}
        style={{ left: TEXT_X - x0, opacity: expanded ? 0 : 1 }}
      >
        <span
          className={`text-subtitle leading-snug ${tall ? 'line-clamp-2' : 'truncate'} ${
            past ? 'text-ink-muted' : 'text-ink'
          }`}
        >
          {o.subject}
        </span>
        <span className="mt-0.5 flex gap-3 text-body-small text-ink-muted">
          <span className={`b-num font-semibold ${past ? '' : 'text-ink'}`}>
            {o.room ?? 'No room'}
          </span>
          <span>{kindLabel(o)}</span>
          <span className="b-num">
            {o.startsAt.slice(0, 5)}–{o.endsAt.slice(0, 5)}
          </span>
        </span>
        {tall && (current || upcoming !== null) ? (
          <span className="mt-1.5 flex items-center gap-2 text-label text-ink">
            <span aria-hidden className="b-swatch size-1.5 rounded-full" />
            {current ? `${duration(left)} left` : `Starts in ${duration(upcoming ?? 0)}`}
          </span>
        ) : null}
      </span>
    </button>
  )
}

// ---------- gaps ----------

function placeAround(height: number, nowOffset: number | null, content: number): number {
  if (nowOffset === null) return Math.max(0, (height - content) / 2)
  if (nowOffset < height / 2) return Math.min(height - content, nowOffset + 12)
  return Math.max(0, nowOffset - content - 12)
}

function GapNote({
  gap,
  top,
  height,
  scale,
  elapsed,
  date,
  next,
}: {
  gap: GapSpan
  top: number
  height: number
  scale: number
  elapsed: Elapsed
  date: string
  next: Occurrence
}) {
  const { data } = useProto()
  const [, go] = useNav()
  const nowMin = typeof elapsed === 'number' ? elapsed : null
  const current = nowMin !== null && nowMin >= gap.start && nowMin < gap.end
  const past = elapsed === 'past' || (nowMin !== null && nowMin >= gap.end)
  const from = current && nowMin !== null ? nowMin : gap.start
  const rooms = !past && next.room ? freeRoomsNear(data, next.room, date, from, gap.end) : []
  const group = next.room ? buildingOf(next.room) : ''
  const contentH = rooms.length ? 96 : 44
  const offset = current && nowMin !== null ? (nowMin - gap.start) * scale : null
  const pad = placeAround(height, offset, contentH)

  return (
    <div className="absolute right-3" style={{ top, height, left: TEXT_X }}>
      <div className="absolute inset-x-0 flex flex-col gap-1" style={{ top: pad }}>
        {current ? (
          <p className="text-label text-ink">
            Free until <span className="b-num">{hhmm(gap.end)}</span>
            <span className="b-num ml-2 font-normal text-ink-soft">
              {duration(gap.end - (nowMin ?? gap.start))} left
            </span>
          </p>
        ) : (
          <p className={`text-label ${past ? 'text-ink-muted' : 'text-ink-soft'}`}>
            <span className="b-num">{duration(gap.end - gap.start)}</span> free
          </p>
        )}
        {rooms.length ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-caption text-ink-muted">
              {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'} free in the {groupLabel(group)}{' '}
              until <span className="b-num">{hhmm(gap.end)}</span>
            </p>
            <div className="-my-1.5 flex flex-wrap items-center gap-x-1.5">
              {rooms.slice(0, 3).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => go({ view: 'room', room: c, rday: date })}
                  className="group/chip flex min-h-12 items-center"
                >
                  <span className="b-num rounded-full bg-raised px-3 py-1.5 text-label text-ink transition-colors group-hover/chip:bg-line">
                    {c}
                  </span>
                </button>
              ))}
              {rooms.length > 3 ? (
                <button
                  type="button"
                  onClick={() =>
                    go({
                      view: 'rooms',
                      free: 'at',
                      from: hhmm(from),
                      until: hhmm(gap.end),
                      grp: group,
                      rday: date,
                    })
                  }
                  className="min-h-12 rounded-full px-2 text-label text-accent hover:underline"
                >
                  All {rooms.length}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ---------- the timeline ----------

export function DayTimeline({
  date,
  scale,
  nowRef,
}: {
  date: string
  scale: number
  nowRef?: Ref<HTMLDivElement>
}) {
  const { data, now, start, subjects } = useProto()
  const [, go] = useNav()
  const classes = classesOn(data.timetable, date)
  const blocks = blocksOf(classes)
  const elapsed = elapsedFor(date, now)
  const base = dayRange(blocks, elapsed)
  // Deadlines with a time on this day sit on the spine too, where no class covers them.
  const dues = onSpine(deadlinesOf(data.assignments, now), blocks, base[0], date)
  const range: [number, number] = [
    base[0],
    Math.max(base[1], ...dues.map((d) => Math.ceil((d.minute + 40) / 60) * 60)),
  ]
  const gaps = gapsOf(blocks)
  const nowMin = typeof elapsed === 'number' ? elapsed : null
  const phase = nowMin !== null ? phaseOf(blocks, nowMin) : null
  const labels = [...new Set(blocks.flatMap((b) => [b.start, b.end]))]
  // The gap note already counts down a break, so only the first class of the day says "starts in".
  const upcomingId = phase?.kind === 'before' ? phase.next.id : null

  return (
    <Spine
      range={range}
      elapsed={elapsed}
      scale={scale}
      labels={labels}
      jumpKey={`${date}|${start}`}
      nowRef={nowRef}
    >
      {(y) => (
        <>
          {blocks.map((b) => (
            <DayBlock
              key={b.id}
              block={b}
              top={y(b.start)}
              height={(b.end - b.start) * scale}
              elapsed={elapsed}
              scale={scale}
              upcoming={
                b.id === upcomingId && nowMin !== null && b.start - nowMin <= 180
                  ? b.start - nowMin
                  : null
              }
            />
          ))}
          {gaps.map((g) => {
            const next = blocks.find((b) => b.start === g.end)
            return next ? (
              <GapNote
                key={g.start}
                gap={g}
                top={y(g.start)}
                height={(g.end - g.start) * scale}
                scale={scale}
                elapsed={elapsed}
                date={date}
                next={next.occ}
              />
            ) : null
          })}
          {dues.map((d) => {
            const late = d.urgency === 'overdue'
            const color = subjects.byShort.get(d.a.shortName)?.color ?? 'var(--b-sub-neutral)'
            return (
              <button
                key={d.a.id}
                type="button"
                onClick={() => go({ due: String(d.a.id), cls: null })}
                className="group absolute right-2 flex items-start text-left"
                style={vars(
                  { '--sub': color },
                  { top: y(d.minute) - 9, height: 44, left: SPINE_X - 10 },
                )}
              >
                <span
                  aria-hidden
                  className="b-swatch absolute size-2.5 rotate-45 rounded-xs"
                  style={{ left: 5, top: 4, boxShadow: '0 0 0 3px var(--color-page)' }}
                />
                <span
                  className="flex min-w-0 flex-col pr-2 group-hover:underline"
                  style={{ paddingLeft: TEXT_X - SPINE_X + 10 }}
                >
                  <span className={`text-label ${late ? 'text-danger' : 'text-ink'}`}>
                    {late ? 'Was due' : 'Due'} <span className="b-num">{hhmm(d.minute)}</span>
                    <span className="ml-2 font-normal text-ink-soft">{d.a.shortName}</span>
                  </span>
                  <span className="truncate text-caption text-ink-muted">
                    {d.a.name}, {statusText(d.a, now.date).toLowerCase()}
                  </span>
                </span>
              </button>
            )
          })}
        </>
      )}
    </Spine>
  )
}

// ---------- the bridge to the next class ----------

/**
 * When a day has no more classes, the spine keeps going, dashed and not to scale, past the days off
 * (each with its reason) to the next class.
 */
export function NextBridge({ date, showNow }: { date: string; showNow: boolean }) {
  const { data, now, setOrigin } = useProto()
  const [, go] = useNav()
  const colorOf = useColorOf()
  const fromMinute = date === now.date ? now.minutes : 24 * 60
  const next = nextClassAfter(data.timetable, date, fromMinute)
  if (!next) {
    return (
      <p className="mt-4 text-body-small text-ink-muted" style={{ paddingLeft: TEXT_X }}>
        Nothing else on this timetable (it runs to {dayMonth(data.timetable.to)}).
      </p>
    )
  }
  const stops: { date: string; text: string }[] = []
  for (let d = 1; d < daysBetween(date, next.date); d++) {
    const day = addDays(date, d)
    const reason = nonTeachingReason(data.semester, day)
    stops.push({
      date: day,
      text: reason ?? (isWeekend(day) ? 'Weekend' : 'No classes'),
    })
  }
  const start = minutesOf(next.startsAt)
  const until = minutesUntil(now, next.date, start)
  const days = daysBetween(now.date, next.date)
  const inText =
    until < 24 * 60 ? `in ${duration(until)}` : days === 1 ? 'tomorrow' : `in ${days} days`
  const color = colorOf(next)

  return (
    <div className="relative mt-1 pb-2">
      <div
        aria-hidden
        className="absolute top-0 border-l-2 border-dashed"
        style={{ left: SPINE_X - 1, bottom: 90, borderColor: 'var(--color-line-strong)' }}
      />
      {showNow ? (
        <Row
          marker={<span className="block h-0.5 w-11 rounded-full bg-(--b-live)" />}
          gutter={
            <span className="b-now-pill b-num px-1.5 py-0.5 text-caption">{hhmm(now.minutes)}</span>
          }
        >
          <span className="text-body-small text-ink-soft">
            Next class <span className="b-num font-semibold text-ink">{inText}</span>
          </span>
        </Row>
      ) : null}
      {stops.map((s) => (
        <Row
          key={s.date}
          marker={
            <span className="block size-2.5 rounded-full border-2 border-ink-muted bg-page" />
          }
          gutter={
            <span className="text-caption text-ink-muted">{weekdayName(s.date).slice(0, 3)}</span>
          }
        >
          <span className="text-body-small text-ink-muted">
            <span className="text-ink-soft">{s.text}</span>
            <span className="ml-2">{dayMonth(s.date)}</span>
          </span>
        </Row>
      ))}
      <div className="relative mt-2" style={{ height: 92 }}>
        <span
          aria-hidden
          className="absolute top-1 text-right text-caption text-ink-muted"
          style={{ left: 0, width: GUTTER - 8 }}
        >
          <span className="b-num">{hhmm(start)}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setOrigin(null)
            go({ day: next.date, cls: null }, { replace: true })
          }}
          aria-label={`Next class: ${blockLabel(next, '')}. Show ${weekdayName(next.date)}.`}
          className="group absolute inset-y-0 right-2 text-left"
          style={vars({ '--sub': color }, { left: SPINE_X - CAPSULE / 2 - 6 })}
        >
          <span
            aria-hidden
            className="absolute inset-y-0 right-0 rounded-2xl bg-raised opacity-0 transition-opacity duration-150 group-hover:opacity-60"
            style={{ left: TEXT_X - (SPINE_X - CAPSULE / 2 - 6) - 12 }}
          />
          <Capsule
            lid={undefined}
            hidden={false}
            lived={0}
            kind={next.kinds[0] ?? 'course'}
            full={false}
          />
          <span
            className="absolute inset-y-0 right-0 flex flex-col pt-0.5 pr-2"
            style={{ left: TEXT_X - (SPINE_X - CAPSULE / 2 - 6) }}
          >
            <span className="text-caption text-ink-soft">
              {cap(relativeDay(next.date, now.date))}
              {showNow ? null : <span className="ml-2 text-ink-muted">{inText}</span>}
            </span>
            <span className="line-clamp-2 text-subtitle leading-snug text-ink">{next.subject}</span>
            <span className="flex gap-3 text-body-small text-ink-muted">
              <span className="b-num font-semibold text-ink">{next.room ?? 'No room'}</span>
              <span>{kindLabel(next)}</span>
            </span>
          </span>
        </button>
      </div>
    </div>
  )
}

function Row({
  marker,
  gutter,
  children,
}: {
  marker: ReactNode
  gutter: ReactNode
  children: ReactNode
}) {
  return (
    <div className="relative flex min-h-11 items-center" style={{ paddingLeft: TEXT_X }}>
      <span className="absolute flex justify-end" style={{ left: 0, width: GUTTER - 4 }}>
        {gutter}
      </span>
      <span className="absolute -translate-x-1/2" style={{ left: SPINE_X }}>
        {marker}
      </span>
      {children}
    </div>
  )
}

// ---------- the whole day ----------

export function DayBody({
  date,
  scale,
  nowRef,
}: {
  date: string
  scale: number
  nowRef?: Ref<HTMLDivElement>
}) {
  const { data, now } = useProto()
  const classes = classesOn(data.timetable, date)
  const reason = nonTeachingReason(data.semester, date)
  const isToday = date === now.date
  const blocks = blocksOf(classes)
  const over = isToday && blocks.length > 0 && now.minutes >= blocks[blocks.length - 1].end
  const lines = headline(classes, date, now.date, now.minutes, reason)
  const after = over ? nextLine(nextClassAfter(data.timetable, date, now.minutes), now.date) : null
  if (after) lines.push(after)
  const all = deadlinesOf(data.assignments, now)
  const shown = new Set(
    blocks.length
      ? onSpine(all, blocks, dayRange(blocks, elapsedFor(date, now))[0], date).map((d) => d.a.id)
      : [],
  )
  const due = isToday ? urgentDeadlines(all.filter((d) => !shown.has(d.a.id))) : []
  const inRange = date >= data.timetable.from && date <= data.timetable.to

  return (
    <div>
      <p className="b-headline px-5">
        {lines.map((parts, i) => (
          <span key={i} className="block">
            <Sentence parts={parts} />
          </span>
        ))}
      </p>
      <div className="mt-5">
        {!inRange ? (
          <p className="px-5 text-body-small text-ink-muted">
            This demo&rsquo;s timetable covers {dayMonth(data.timetable.from)} to{' '}
            {dayMonth(data.timetable.to)}.
          </p>
        ) : blocks.length ? (
          <DayTimeline date={date} scale={scale} nowRef={nowRef} />
        ) : (
          <div ref={nowRef} />
        )}
        {inRange && (over || (!blocks.length && date >= now.date)) ? (
          <NextBridge date={date} showNow={!blocks.length && isToday} />
        ) : null}
      </div>
      {due.length ? (
        <section className="mt-8 px-5" aria-labelledby="due-soon">
          <h2 id="due-soon" className="text-label text-ink-soft">
            Due soon
          </h2>
          <ul className="mt-1 divide-y divide-line">
            {due.map((d) => (
              <DeadlineRow key={d.a.id} d={d} compact />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
