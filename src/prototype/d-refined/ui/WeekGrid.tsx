import { m } from 'motion/react'
import type { CSSProperties } from 'react'
import { addDays } from '../../clock'
import { useProto, useSheetParam } from '../ctx'
import { Icon } from '../icons'
import {
  classKind,
  classLabel,
  dayClasses,
  DAY_END,
  DAY_START,
  holidayOf,
  hhmm,
  KIND_ICON,
  kindOf,
  longDate,
  phaseOf,
  shortOf,
  weekdayShort,
  type ClassKind,
  type Cls,
} from '../model'
import { springs } from '../motion'
import { ClassRow } from './ClassBits'
import { SubjectAvatar } from './Shape'

const HOURS = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START / 60 + i)

/** The block's fill, tint and line for its subject (or neutral once it's over). */
function blockVars(tone: string, past: boolean): CSSProperties {
  return (
    past
      ? {
          '--b-fill': 'var(--md-sys-color-surface-container-high)',
          '--b-hatch':
            'color-mix(in srgb, var(--md-sys-color-on-surface-variant) 12%, transparent)',
          '--b-tint': 'var(--md-sys-color-surface-container)',
          '--b-line': 'var(--md-sys-color-outline-variant)',
          '--b-ink': 'var(--md-sys-color-on-surface-variant)',
        }
      : {
          '--b-fill': `var(--cx-${tone}-container)`,
          '--b-hatch': `color-mix(in srgb, var(--cx-${tone}-on-container) 16%, transparent)`,
          '--b-tint': `color-mix(in srgb, var(--cx-${tone}-container) 38%, var(--md-sys-color-surface))`,
          '--b-line': `var(--cx-${tone}-color)`,
          '--b-ink': `var(--cx-${tone}-on-container)`,
        }
  ) as CSSProperties
}

/**
 * The week as a calendar grid. Each block carries its subject twice (colour and short name) and its
 * kind twice (a course is a solid fill, a lab is hatched, a seminar is outlined, and each has its
 * own mark), so neither depends on colour. Long room codes use Roboto Flex's condensed cut. On wide
 * windows a block expands into the class panel; one button per block, with a full label.
 */
export function WeekGrid({
  monday,
  onOpen,
  selected,
  onSelectDay,
  compact,
  morph = !compact,
}: {
  monday: string
  onOpen: (c: Cls) => void
  selected?: string | null
  onSelectDay?: (date: string) => void
  compact: boolean
  /** Blocks expand into the side panel (wide windows); the phone gets a sheet instead. */
  morph?: boolean
}) {
  const { data, now } = useProto()
  const days = Array.from({ length: 5 }, (_, i) => addDays(monday, i))
  const hour = compact ? 48 : 58
  const top = (min: number) => ((min - DAY_START) / 60) * hour
  const timeCol = compact ? 30 : 48
  const showNow = now.minutes >= DAY_START && now.minutes <= DAY_END

  return (
    <div>
      <div
        className="grid"
        style={{ gridTemplateColumns: `${timeCol}px repeat(5, minmax(0, 1fr))` }}
      >
        <span />
        {days.map((d) => {
          const isToday = d === now.date
          const isSel = selected === d
          const label = (
            <>
              <span className={`t-label-m ${isToday ? 'c-primary' : 'c-muted'}`}>
                {weekdayShort(d)}
              </span>
              <span
                className={`t-title-m tnum grid h-8 w-8 place-items-center rounded-full ${isToday ? 't-e' : ''}`}
                style={
                  isToday
                    ? {
                        background: 'var(--md-sys-color-primary)',
                        color: 'var(--md-sys-color-on-primary)',
                      }
                    : undefined
                }
              >
                {Number(d.slice(8))}
              </span>
            </>
          )
          return onSelectDay ? (
            <button
              key={d}
              type="button"
              aria-pressed={isSel}
              aria-label={`${longDate(d)}${isToday ? ', today' : ''}`}
              onClick={() => onSelectDay(d)}
              className="cx-state relative mx-0.5 flex flex-col items-center gap-0.5 rounded-2xl py-1.5"
            >
              {isSel && (
                <m.span
                  layoutId={`day-sel-${monday}`}
                  className="absolute inset-0 -z-10 rounded-2xl"
                  style={{ background: 'var(--md-sys-color-secondary-container)' }}
                  transition={springs.spatialFast}
                />
              )}
              {label}
            </button>
          ) : (
            <div
              key={d}
              className="flex flex-col items-center gap-0.5 py-1.5"
              aria-label={longDate(d)}
            >
              {label}
            </div>
          )
        })}
      </div>

      <div
        className="relative mt-2 grid"
        style={{
          gridTemplateColumns: `${timeCol}px repeat(5, minmax(0, 1fr))`,
          height: top(DAY_END) + 8,
        }}
      >
        {HOURS.map((h) => (
          <div
            key={h}
            className="pointer-events-none absolute right-0 left-0"
            style={{ top: top(h * 60) }}
          >
            <span
              className="t-label-s c-muted tnum absolute -translate-y-1/2"
              style={{ left: 0, width: timeCol - 6, textAlign: 'right' }}
            >
              {String(h).padStart(2, '0')}
            </span>
            <span
              className="absolute right-0 h-px"
              style={{ left: timeCol, background: 'var(--md-sys-color-surface-container-highest)' }}
            />
          </div>
        ))}
        <span />
        {days.map((d) => {
          const holiday = holidayOf(data, d)
          const classes = dayClasses(data, d)
          const isToday = d === now.date
          return (
            <div
              key={d}
              className="relative mx-0.5"
              style={
                selected === d
                  ? {
                      background:
                        'color-mix(in srgb, var(--md-sys-color-secondary-container) 35%, transparent)',
                      borderRadius: 12,
                    }
                  : undefined
              }
            >
              {holiday && (
                <div
                  className="absolute inset-x-0 grid place-items-center rounded-xl"
                  style={{ top: 0, bottom: 8, background: 'var(--md-sys-color-surface-container)' }}
                >
                  <span
                    className="t-label-l c-muted flex items-center gap-2"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                  >
                    <Icon name="celebration" size={18} />
                    {holiday}
                  </span>
                </div>
              )}
              {classes.map((c) => (
                <Block
                  key={c.key}
                  c={c}
                  top={top(c.start) + 1}
                  height={top(c.end) - top(c.start) - 3}
                  compact={compact}
                  morph={morph}
                  onOpen={onOpen}
                />
              ))}
              {isToday && showNow && (
                <div
                  className="pointer-events-none absolute -right-0.5 -left-0.5"
                  style={{
                    top: top(now.minutes),
                    transition:
                      'top var(--cx-motion-spatial-default-duration) var(--cx-motion-spatial-default)',
                  }}
                  aria-hidden="true"
                >
                  <span
                    className="absolute inset-x-0 h-0.5 -translate-y-1/2"
                    style={{ background: 'var(--cx-live)' }}
                  />
                  <span
                    className="absolute z-20 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                    style={{ background: 'var(--cx-live)', left: 0 }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Block({
  c,
  top,
  height,
  compact,
  morph,
  onOpen,
}: {
  c: Cls
  top: number
  height: number
  compact: boolean
  morph: boolean
  onOpen: (c: Cls) => void
}) {
  const { now, looks, origin, setOrigin } = useProto()
  const [openKey] = useSheetParam('class')
  const phase = phaseOf(c, now.date, now.minutes)
  const past = phase === 'past'
  const kind = classKind(c)
  const look = looks.get(shortOf(c.o))
  const lid = `wk-${c.key}`
  // While this block's panel is open, the block itself is the panel: its fill has moved there.
  const expanded = morph && openKey === c.key && origin === lid
  const radius = compact ? 9 : 12
  const long = (c.o.room?.length ?? 0) > 6

  return (
    <button
      type="button"
      aria-label={classLabel(c, phase, true)}
      onClick={() => {
        setOrigin(morph ? lid : null)
        onOpen(c)
      }}
      className="cx-blk-btn absolute inset-x-0 z-10 text-left"
      style={{
        top,
        height,
        borderRadius: radius,
        boxShadow: phase === 'now' && !expanded ? '0 0 0 2px var(--cx-live)' : undefined,
        ...blockVars(look?.tone ?? 's1', past),
      }}
    >
      {!expanded && (
        <m.span
          layoutId={morph ? lid : undefined}
          data-kind={kind}
          className="cx-blk absolute inset-0"
          style={{ borderRadius: radius }}
          transition={springs.spatialDefault}
        />
      )}
      <span
        className="relative flex h-full flex-col overflow-hidden"
        style={{
          padding: compact ? '4px 5px' : '6px 8px',
          color: 'var(--b-ink)',
          opacity: expanded ? 0 : 1,
        }}
      >
        <span className="flex items-start justify-between gap-1">
          <span className="t-label-l t-e t-narrow block truncate" style={{ lineHeight: '18px' }}>
            {shortOf(c.o)}
          </span>
          {!compact && <Icon name={KIND_ICON[kind]} size={16} className="mt-0.5 opacity-90" />}
        </span>
        <span
          className="t-label-m block truncate font-medium"
          // Long codes (OROLOGERIE) on the phone: Roboto Flex only narrows much at a display
          // optical size, so ask for one; short codes keep the normal cut
          style={
            compact && long
              ? {
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 0,
                  fontVariationSettings: "'wdth' 25, 'opsz' 40",
                }
              : { fontStretch: '78%' }
          }
        >
          {c.o.room}
        </span>
        {!compact && height > 70 && (
          <span className="t-label-s block truncate" style={{ opacity: 0.9 }}>
            {kindOf(c)}, {hhmm(c.start)}
          </span>
        )}
        {compact && height > 84 && (
          <span className="t-label-s t-narrow block truncate" style={{ opacity: 0.9 }}>
            {kindOf(c)}
          </span>
        )}
        {compact && (
          <Icon name={KIND_ICON[kind]} size={13} className="absolute right-1 bottom-1 opacity-90" />
        )}
      </span>
    </button>
  )
}

const KINDS: { kind: ClassKind; label: string; about: string }[] = [
  { kind: 'course', label: 'Course', about: 'solid' },
  { kind: 'lab', label: 'Lab', about: 'hatched' },
  { kind: 'seminar', label: 'Seminar', about: 'outlined' },
]

/** Which subject is which (shape, colour, short and full name), and how each kind of class looks. */
export function SubjectLegend({
  dates,
  columns = 'auto',
}: {
  dates: string[]
  columns?: 'auto' | 1
}) {
  const { data, looks } = useProto()
  const seen = new Map<string, string>()
  for (const d of dates) for (const c of dayClasses(data, d)) seen.set(shortOf(c.o), c.o.subject)
  const items = [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  if (items.length === 0) return null
  return (
    <div>
      <ul
        className="grid gap-x-4 gap-y-2"
        style={{
          gridTemplateColumns: columns === 1 ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))',
        }}
      >
        {items.map(([short, name]) => {
          const look = looks.get(short)
          return (
            <li key={short} className="flex items-center gap-3">
              {look && (
                <SubjectAvatar short={short} tone={look.tone} shape={look.shape} size={32} />
              )}
              <span className="t-body-m min-w-0">{name}</span>
            </li>
          )
        })}
      </ul>
      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2" aria-label="Kinds of class">
        {KINDS.map((k) => (
          <li key={k.kind} className="t-body-m flex items-center gap-2">
            <span
              aria-hidden="true"
              className="relative h-6 w-9 overflow-hidden rounded-md"
              style={blockVars('s4', false)}
            >
              <span data-kind={k.kind} className="cx-blk absolute inset-0 rounded-md" />
              <span className="absolute top-0.5 right-0.5" style={{ color: 'var(--b-ink)' }}>
                <Icon name={KIND_ICON[k.kind]} size={12} />
              </span>
            </span>
            {k.label}
            <span className="c-muted">{k.about}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** The week as a list, day by day: the screen-reader path, and the better phone view for many. */
export function WeekAgenda({ monday, onOpen }: { monday: string; onOpen: (c: Cls) => void }) {
  const { data, now } = useProto()
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter(
    (d, i) => i < 5 || dayClasses(data, d).length > 0,
  )
  return (
    <div>
      {days.map((d) => {
        const classes = dayClasses(data, d)
        const holiday = holidayOf(data, d)
        const isToday = d === now.date
        return (
          <section key={d} aria-label={longDate(d)}>
            <h3
              className="cx-section-title"
              style={isToday ? undefined : { color: 'var(--md-sys-color-on-surface-variant)' }}
            >
              <span>
                {longDate(d)}
                {isToday && (
                  <span className="cx-chip cx-chip--small cx-chip--selected ml-2 align-middle">
                    Today
                  </span>
                )}
              </span>
              {classes.length > 0 && (
                <span className="t-body-s c-muted tnum font-normal">
                  {hhmm(classes[0].start)} to {hhmm(classes[classes.length - 1].end)}
                </span>
              )}
            </h3>
            {classes.length > 0 ? (
              <ul className="cx-list">
                {classes.map((c) => (
                  <li key={c.key}>
                    <ClassRow c={c} onOpen={onOpen} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="t-body-m c-muted flex items-center gap-2 px-1 py-2">
                <Icon name={holiday ? 'celebration' : 'eventAvailable'} size={20} />
                {holiday ? `${holiday}, no classes` : 'No classes'}
              </p>
            )}
          </section>
        )
      })}
    </div>
  )
}
