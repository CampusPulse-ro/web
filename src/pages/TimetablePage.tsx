import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'

const DAYS = [
  { id: 'mon', labelKey: 'timetablePage.days.monday' as const },
  { id: 'tue', labelKey: 'timetablePage.days.tuesday' as const },
  { id: 'wed', labelKey: 'timetablePage.days.wednesday' as const },
  { id: 'thu', labelKey: 'timetablePage.days.thursday' as const },
  { id: 'fri', labelKey: 'timetablePage.days.friday' as const },
] as const

type DayId = (typeof DAYS)[number]['id']

const CLASSES = [
  {
    dayId: 'mon',
    start: '09:00',
    end: '11:00',
    nameKey: 'timetablePage.courses.msa' as const,
    room: 'B528A',
    building: 'Electro',
    typeKey: 'timetablePage.types.laboratory' as const,
  },
  {
    dayId: 'mon',
    start: '12:00',
    end: '14:00',
    nameKey: 'timetablePage.courses.dsa' as const,
    room: 'A101',
    building: 'Electro',
    typeKey: 'timetablePage.types.course' as const,
  },
  {
    dayId: 'tue',
    start: '10:00',
    end: '12:00',
    nameKey: 'timetablePage.courses.dbs' as const,
    room: 'B528A',
    building: 'Electro',
    typeKey: 'timetablePage.types.laboratory' as const,
  },
  {
    dayId: 'wed',
    start: '08:00',
    end: '10:00',
    nameKey: 'timetablePage.courses.cn' as const,
    room: 'B416',
    building: 'Electro',
    typeKey: 'timetablePage.types.lecture' as const,
  },
  {
    dayId: 'thu',
    start: '14:00',
    end: '16:00',
    nameKey: 'timetablePage.courses.se' as const,
    room: 'A204',
    building: 'Electro',
    typeKey: 'timetablePage.types.seminar' as const,
  },
  {
    dayId: 'fri',
    start: '10:00',
    end: '12:00',
    nameKey: 'timetablePage.courses.ai' as const,
    room: 'A101',
    building: 'Electro',
    typeKey: 'timetablePage.types.course' as const,
  },
] as const

export function TimetablePage() {
  const { t } = useTranslation()
  const [selectedDay, setSelectedDay] = useState<DayId>('mon')

  const activeDay = DAYS.find((d) => d.id === selectedDay) ?? DAYS[0]
  const selectedClasses = CLASSES.filter((item) => item.dayId === selectedDay)

  return (
    <section className="flex flex-col gap-8">
      {/* Top navigation back to dashboard */}
      <div>
        <Link
          to="/app"
          className="inline-flex items-center gap-2 rounded-md border border-line bg-raised px-3 py-1.5 text-label font-medium text-ink no-underline transition hover:border-accent hover:text-accent focus:outline-2 focus:outline-offset-2 focus:outline-accent"
        >
          <Icon name="chevron-left" size={16} />
          <span>{t('timetablePage.backToDashboard')}</span>
        </Link>
      </div>

      {/* Header */}
      <header className="flex flex-col gap-1">
        <span className="text-caption font-semibold tracking-wider text-accent uppercase">
          {t('timetablePage.overline')}
        </span>
        <h1 className="m-0 text-title font-bold text-ink">{t('timetablePage.title')}</h1>
        <p className="m-0 max-w-2xl text-body text-ink-muted">{t('timetablePage.subtitle')}</p>
      </header>

      {/* Day picker tabs */}
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-raised p-4 sm:p-5">
        <h2 className="m-0 text-label font-semibold text-ink-soft">
          {t('timetablePage.chooseDay')}
        </h2>
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => {
            const isSelected = selectedDay === day.id
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => setSelectedDay(day.id)}
                aria-pressed={isSelected}
                className={`cursor-pointer rounded-md px-4 py-2 text-label font-semibold transition focus:outline-2 focus:outline-offset-2 focus:outline-accent ${
                  isSelected
                    ? 'bg-accent text-on-accent'
                    : 'border border-line bg-sunken text-ink hover:bg-raised'
                }`}
              >
                {t(day.labelKey)}
              </button>
            )
          })}
        </div>
      </div>

      {/* Day schedule section */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
          <h2 className="m-0 text-heading font-semibold text-ink">
            {t('timetablePage.scheduleTitle', { day: t(activeDay.labelKey) })}
          </h2>
          <span className="rounded-full border border-line bg-sunken px-2.5 py-1 text-caption font-medium text-ink-muted">
            {t('timetablePage.classesCount', { count: selectedClasses.length })}
          </span>
        </div>

        {selectedClasses.length > 0 ? (
          <div className="flex flex-col gap-3">
            {selectedClasses.map((item) => (
              <article
                key={`${item.dayId}-${item.start}-${item.nameKey}`}
                className="flex flex-col gap-4 rounded-lg border border-line bg-raised p-5 sm:flex-row sm:items-start"
              >
                <div className="flex min-w-32 flex-col items-center justify-center rounded-md border border-line bg-sunken p-3 text-center sm:min-w-36">
                  <span className="text-label font-semibold text-ink">{item.start}</span>
                  <span className="text-caption text-ink-muted">
                    {t('timetablePage.timeTo')} {item.end}
                  </span>
                </div>

                <div className="flex-1">
                  <span className="inline-block rounded-full border border-line bg-sunken px-2.5 py-0.5 text-caption font-medium text-accent">
                    {t(item.typeKey)}
                  </span>
                  <h3 className="mt-2 mb-1.5 text-subtitle font-semibold text-ink">
                    {t(item.nameKey)}
                  </h3>
                  <p className="m-0 flex items-center gap-1.5 text-body-small text-ink-muted">
                    <Icon name="pin" size={14} />
                    <span>
                      {t('timetablePage.roomPrefix')} {item.room}
                      {' · '}
                      {item.building}
                    </span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-line bg-raised/40 p-10 text-center">
            <p className="m-0 text-subtitle font-semibold text-ink">
              {t('timetablePage.noClassesTitle')}
            </p>
            <p className="mt-1 mb-0 text-body-small text-ink-muted">
              {t('timetablePage.noClassesSubtitle')}
            </p>
          </div>
        )}
      </div>

      {/* Demo notice note */}
      <footer className="rounded-md border border-line bg-raised p-4 text-center">
        <p className="m-0 text-caption text-ink-muted">{t('timetablePage.demoNotice')}</p>
      </footer>
    </section>
  )
}
