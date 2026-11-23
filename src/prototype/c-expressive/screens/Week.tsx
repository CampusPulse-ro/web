import { AnimatePresence, m } from 'motion/react'
import { useState } from 'react'
import { addDays } from '../../clock'
import { useKeys, useParam, useProto, useSheetParam, useWindowClass } from '../ctx'
import { Icon } from '../icons'
import { dayMonth, isWeekend, weekNumber, weekStart, type Cls } from '../model'
import { springs } from '../motion'
import { TopAppBar } from '../ui/Bars'
import { Segmented } from '../ui/Controls'
import { SubjectLegend, WeekAgenda, WeekGrid } from '../ui/WeekGrid'
import { AccountButton, PaneLayout } from './common'

export function WeekScreen() {
  const { data, now } = useProto()
  const { compact } = useWindowClass()
  const [weekParam, setWeekParam] = useParam('week')
  const [viewParam, setView] = useParam('view')
  const [, openClass] = useSheetParam('class')
  const view = viewParam === 'agenda' ? 'agenda' : 'grid'

  const weeks = [...new Set(data.timetable.occurrences.map((o) => o.week))].sort((a, b) => a - b)
  // On a weekend the useful week is the coming one.
  const thisWeek =
    weekNumber(data, isWeekend(now.date) ? addDays(now.date, 2) : now.date) ?? weeks[0]
  const wanted = weekParam ? Number(weekParam) : thisWeek
  const week = weeks.includes(wanted) ? wanted : weeks[0]
  const idx = weeks.indexOf(week)
  const monday = weekStart(data, week) ?? data.timetable.from
  const friday = addDays(monday, 4)
  const dates = Array.from({ length: 5 }, (_, i) => addDays(monday, i))

  const [dir, setDir] = useState(1)
  const setWeek = (w: number) => {
    if (!weeks.includes(w)) return
    setDir(w > week ? 1 : -1)
    setWeekParam(w === thisWeek ? null : String(w))
  }
  useKeys({
    ArrowLeft: () => setWeek(weeks[idx - 1]),
    ArrowRight: () => setWeek(weeks[idx + 1]),
    t: () => setWeek(thisWeek),
  })

  const open = (c: Cls) => openClass(c.key)
  const range = `${Number(monday.slice(8))} to ${dayMonth(friday)}`

  return (
    <PaneLayout compact={compact}>
      <div className="cx-pane" style={{ paddingBottom: compact ? 96 : 32 }}>
        <div className={compact ? '' : 'mx-auto max-w-[1100px] px-4'}>
          <TopAppBar
            large={compact}
            title={`Week ${week}`}
            subtitle={`${range}${week === thisWeek ? ', this week' : ''}`}
            actions={
              <>
                <button
                  type="button"
                  className="cx-icon-btn cx-state"
                  aria-label="Previous week"
                  disabled={idx <= 0}
                  onClick={() => setWeek(weeks[idx - 1])}
                >
                  <Icon name="chevronLeft" />
                </button>
                <button
                  type="button"
                  className="cx-icon-btn cx-state"
                  aria-label="Next week"
                  disabled={idx >= weeks.length - 1}
                  onClick={() => setWeek(weeks[idx + 1])}
                >
                  <Icon name="chevronRight" />
                </button>
                {compact && <AccountButton />}
              </>
            }
            below={
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Segmented
                  label="View"
                  value={view}
                  onChange={(v) => setView(v === 'agenda' ? 'agenda' : null)}
                  options={[
                    { value: 'grid', label: 'Week', icon: 'calendarViewWeek' },
                    { value: 'agenda', label: 'Agenda', icon: 'viewAgenda' },
                  ]}
                  className="min-w-[240px] flex-1 sm:flex-none"
                />
                {week !== thisWeek && (
                  <button
                    type="button"
                    className="cx-chip cx-chip--selected cx-state"
                    onClick={() => setWeek(thisWeek)}
                  >
                    <Icon name="today" size={18} />
                    This week
                  </button>
                )}
                {!compact && (
                  <span className="t-body-s c-muted ml-auto flex items-center gap-1.5">
                    <Icon name="keyboard" size={16} />
                    <kbd>←</kbd> <kbd>→</kbd> weeks, <kbd>T</kbd> this week
                  </span>
                )}
              </div>
            }
          />
          <div className="overflow-x-clip px-3 sm:px-4">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <m.div
                key={`${week}-${view}`}
                custom={dir}
                variants={{
                  enter: (d: number) => ({ x: d * 48, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (d: number) => ({ x: d * -48, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ x: springs.spatialDefault, opacity: springs.effectsDefault }}
                drag={compact ? 'x' : false}
                dragDirectionLock
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                dragSnapToOrigin
                onDragEnd={(_, info) => {
                  if (info.offset.x < -70 || info.velocity.x < -500) setWeek(weeks[idx + 1])
                  else if (info.offset.x > 70 || info.velocity.x > 500) setWeek(weeks[idx - 1])
                }}
              >
                {view === 'grid' ? (
                  <>
                    <WeekGrid monday={monday} onOpen={open} compact={compact} />
                    <h2 className="cx-section-title">Subjects</h2>
                    <SubjectLegend dates={dates} />
                  </>
                ) : (
                  <WeekAgenda monday={monday} onOpen={open} />
                )}
              </m.div>
            </AnimatePresence>
            <p className="t-body-s c-muted mt-8 px-1">
              This demo has the timetable for weeks {weeks[0]} and {weeks[weeks.length - 1]}.
              {compact && ' Swipe sideways to change the week.'}
            </p>
          </div>
        </div>
      </div>
    </PaneLayout>
  )
}
