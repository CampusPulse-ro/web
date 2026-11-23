import { addDays } from '../../clock'
import { useProto } from '../ctx'
import { Icon } from '../icons'
import {
  classLabel,
  dayClasses,
  DAY_END,
  DAY_START,
  holidayOf,
  hhmm,
  kindOf,
  longDate,
  phaseOf,
  shortOf,
  weekdayShort,
  type Cls,
} from '../model'
import { ClassRow } from './ClassBits'
import { SubjectAvatar } from './Shape'

const HOURS = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START / 60 + i)

/**
 * The week as a calendar grid: blocks in their subject's tonal container (with the subject's short
 * name, so colour isn't the only cue), room codes in Roboto Flex's narrow cut on one line, a now
 * line in the live colour, holidays as labelled columns. Each block is one button with a full label.
 */
export function WeekGrid({
  monday,
  onOpen,
  selected,
  onSelectDay,
  compact,
}: {
  monday: string
  onOpen: (c: Cls) => void
  selected?: string | null
  onSelectDay?: (date: string) => void
  compact: boolean
}) {
  const { data, now, looks } = useProto()
  const days = Array.from({ length: 5 }, (_, i) => addDays(monday, i))
  const hour = compact ? 46 : 56
  const top = (min: number) => ((min - DAY_START) / 60) * hour
  const timeCol = compact ? 34 : 48
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
              className="cx-state mx-0.5 flex flex-col items-center gap-0.5 rounded-2xl py-1.5"
              style={isSel ? { background: 'var(--md-sys-color-secondary-container)' } : undefined}
            >
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
        {/* hour rules + labels */}
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
              {classes.map((c) => {
                const phase = phaseOf(c, now.date, now.minutes)
                const look = looks.get(shortOf(c.o))
                const h = top(c.end) - top(c.start) - 3
                const past = phase === 'past'
                return (
                  <button
                    key={c.key}
                    type="button"
                    aria-label={classLabel(c, phase, true)}
                    onClick={() => onOpen(c)}
                    className="cx-state absolute inset-x-0 z-10 overflow-hidden text-left"
                    style={{
                      top: top(c.start) + 1,
                      height: h,
                      padding: compact ? '4px 5px' : '6px 8px',
                      borderRadius: compact ? 8 : 12,
                      background: past
                        ? 'var(--md-sys-color-surface-container-high)'
                        : `var(--cx-${look?.tone ?? 's1'}-container)`,
                      color: past
                        ? 'var(--md-sys-color-on-surface-variant)'
                        : `var(--cx-${look?.tone ?? 's1'}-on-container)`,
                      boxShadow: phase === 'now' ? 'inset 0 0 0 2px var(--cx-live)' : undefined,
                    }}
                  >
                    <span
                      className="t-label-l t-e t-narrow block truncate"
                      style={{ lineHeight: '18px' }}
                    >
                      {shortOf(c.o)}
                    </span>
                    <span
                      className="t-label-m block truncate font-medium"
                      // Roboto Flex only narrows much at a display optical size, so ask for one
                      style={
                        compact
                          ? { fontSize: 11, fontVariationSettings: "'wdth' 40, 'opsz' 36" }
                          : { fontStretch: '78%' }
                      }
                    >
                      {c.o.room}
                    </span>
                    {!compact && h > 70 && (
                      <span className="t-label-s block truncate" style={{ opacity: 0.85 }}>
                        {kindOf(c)}, {hhmm(c.start)}
                      </span>
                    )}
                    {compact && h > 80 && (
                      <span className="t-label-s t-narrow block truncate" style={{ opacity: 0.85 }}>
                        {kindOf(c)}
                      </span>
                    )}
                  </button>
                )
              })}
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

/** Which subject is which: shape + colour + short name + full name. */
export function SubjectLegend({ dates }: { dates: string[] }) {
  const { data, looks } = useProto()
  const seen = new Map<string, string>()
  for (const d of dates) for (const c of dayClasses(data, d)) seen.set(shortOf(c.o), c.o.subject)
  const items = [...seen.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  if (items.length === 0) return null
  return (
    <ul
      className="mt-4 grid gap-x-4 gap-y-2"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
    >
      {items.map(([short, name]) => {
        const look = looks.get(short)
        return (
          <li key={short} className="flex items-center gap-3">
            {look && <SubjectAvatar short={short} tone={look.tone} shape={look.shape} size={32} />}
            <span className="t-body-m min-w-0">{name}</span>
          </li>
        )
      })}
    </ul>
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
