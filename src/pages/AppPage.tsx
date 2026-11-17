import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useApiStatus } from '../api/useApiStatus'
import { useAuth } from '../auth'
import { Icon } from '../components/Icon'
import { formatDateTime } from '../i18n/format'

const sampleClasses = [
  {
    time: '09:00 – 11:00',
    nameKey: 'appPage.sampleClasses.msa' as const,
    room: 'B528A',
    building: 'Electro',
  },
  {
    time: '12:00 – 14:00',
    nameKey: 'appPage.sampleClasses.dsa' as const,
    room: 'A101',
    building: 'Electro',
  },
]

export function AppPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [now] = useState(() => Date.now())
  const todayText = formatDateTime(now, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <section className="flex flex-col gap-8">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <span className="text-caption font-semibold tracking-wide text-accent uppercase">
          {todayText}
        </span>
        <h1 className="m-0 text-title font-bold tracking-tight text-ink">
          {user?.name ? t('appPage.greetingWithName', { name: user.name }) : t('appPage.title')}
        </h1>
        <p className="m-0 max-w-2xl text-body text-ink-muted">{t('appPage.subtitle')}</p>
      </header>

      {/* Backend API status line */}
      <ApiStatusLine />

      {/* Navigation cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/timetable"
          className="group flex flex-col rounded-lg border border-line bg-raised p-5 no-underline transition hover:border-accent focus:outline-2 focus:outline-offset-2 focus:outline-accent"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-sunken text-accent transition group-hover:scale-105">
            <Icon name="timetable" size={20} />
          </div>
          <h2 className="mt-4 mb-1 text-subtitle font-semibold text-ink">
            {t('appPage.nav.timetable')}
          </h2>
          <p className="m-0 text-body-small text-ink-muted">{t('appPage.nav.timetableDesc')}</p>
        </Link>

        <a
          href="#exams"
          className="group flex flex-col rounded-lg border border-line bg-raised p-5 no-underline transition hover:border-accent focus:outline-2 focus:outline-offset-2 focus:outline-accent"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-sunken text-ink-soft transition group-hover:scale-105">
            <Icon name="book" size={20} />
          </div>
          <h2 className="mt-4 mb-1 text-subtitle font-semibold text-ink">
            {t('appPage.nav.exams')}
          </h2>
          <p className="m-0 text-body-small text-ink-muted">{t('appPage.nav.examsDesc')}</p>
        </a>

        <a
          href="#campus"
          className="group flex flex-col rounded-lg border border-line bg-raised p-5 no-underline transition hover:border-accent focus:outline-2 focus:outline-offset-2 focus:outline-accent"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-sunken text-ink-soft transition group-hover:scale-105">
            <Icon name="map" size={20} />
          </div>
          <h2 className="mt-4 mb-1 text-subtitle font-semibold text-ink">{t('appPage.nav.map')}</h2>
          <p className="m-0 text-body-small text-ink-muted">{t('appPage.nav.mapDesc')}</p>
        </a>

        <a
          href="#campus-virtual"
          className="group flex flex-col rounded-lg border border-line bg-raised p-5 no-underline transition hover:border-accent focus:outline-2 focus:outline-offset-2 focus:outline-accent"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-sunken text-ink-soft transition group-hover:scale-105">
            <Icon name="globe" size={20} />
          </div>
          <h2 className="mt-4 mb-1 text-subtitle font-semibold text-ink">
            {t('appPage.nav.campusVirtual')}
          </h2>
          <p className="m-0 text-body-small text-ink-muted">{t('appPage.nav.campusVirtualDesc')}</p>
        </a>
      </div>

      {/* Main schedule and upcoming deadlines grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Today's schedule card */}
        <div
          id="schedule"
          className="flex flex-col gap-4 rounded-lg border border-line bg-raised p-5 sm:p-6 lg:col-span-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
            <div>
              <h2 className="m-0 text-heading font-semibold text-ink">
                {t('appPage.schedule.title')}
              </h2>
              <p className="mt-1 mb-0 text-body-small text-ink-muted">
                {t('appPage.schedule.demoNotice')}
              </p>
            </div>
            <Link
              to="/timetable"
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-sunken px-3 py-1.5 text-label font-medium text-ink no-underline transition hover:border-accent hover:text-accent focus:outline-2 focus:outline-offset-2 focus:outline-accent"
            >
              <span>{t('appPage.schedule.viewAll')}</span>
              <Icon name="chevron-right" size={16} />
            </Link>
          </div>

          <div className="flex flex-col gap-3 pt-1">
            {sampleClasses.map((item) => (
              <article
                key={item.time}
                className="flex flex-col gap-3 rounded-md border border-line bg-sunken/40 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-2 text-label font-semibold text-accent sm:min-w-36">
                  <Icon name="clock" size={16} />
                  <span>{item.time}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="m-0 text-subtitle font-semibold text-ink">{t(item.nameKey)}</h3>
                  <p className="mt-1 mb-0 flex items-center gap-1.5 text-body-small text-ink-muted">
                    <Icon name="pin" size={14} />
                    <span>
                      {t('appPage.schedule.roomPrefix')} {item.room}
                      {' · '}
                      {item.building}
                    </span>
                  </p>
                </div>

                <span className="w-fit rounded-full border border-line bg-sunken px-2.5 py-0.5 text-caption font-medium text-ink-muted">
                  {t('appPage.schedule.sampleBadge')}
                </span>
              </article>
            ))}
          </div>
        </div>

        {/* Coming up: deadlines and exams */}
        <div
          id="exams"
          className="flex flex-col gap-4 rounded-lg border border-line bg-raised p-5 sm:p-6"
        >
          <div className="border-b border-line pb-4">
            <h2 className="m-0 text-heading font-semibold text-ink">
              {t('appPage.comingUp.title')}
            </h2>
          </div>

          <article className="rounded-md border border-line bg-sunken/40 p-4">
            <span className="text-caption font-semibold tracking-wider text-warn uppercase">
              {t('appPage.comingUp.exampleDeadline')}
            </span>
            <h3 className="mt-2 mb-1 text-subtitle font-semibold text-ink">
              {t('appPage.comingUp.msaMilestone')}
            </h3>
            <p className="m-0 text-body-small text-ink-muted">{t('appPage.comingUp.msaNotice')}</p>
          </article>

          <article className="rounded-md border border-line bg-sunken/40 p-4">
            <span className="text-caption font-semibold tracking-wider text-accent uppercase">
              {t('appPage.comingUp.exams')}
            </span>
            <h3 className="mt-2 mb-1 text-subtitle font-semibold text-ink">
              {t('appPage.comingUp.examSchedule')}
            </h3>
            <p className="m-0 text-body-small text-ink-muted">{t('appPage.comingUp.examNotice')}</p>
          </article>
        </div>
      </div>

      {/* Study spaces & Campus Virtual facilities */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <article
          id="campus"
          className="flex flex-col rounded-lg border border-line bg-raised p-5 sm:p-6"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-sunken text-accent">
            <Icon name="search" size={20} />
          </div>
          <h2 className="mt-4 mb-2 text-heading font-semibold text-ink">
            {t('appPage.studySpaces.title')}
          </h2>
          <p className="m-0 text-body-small leading-relaxed text-ink-muted">
            {t('appPage.studySpaces.description')}
          </p>
        </article>

        <article
          id="campus-virtual"
          className="flex flex-col rounded-lg border border-line bg-raised p-5 sm:p-6"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-sunken text-accent">
            <Icon name="globe" size={20} />
          </div>
          <h2 className="mt-4 mb-2 text-heading font-semibold text-ink">
            {t('appPage.campusVirtual.title')}
          </h2>
          <p className="m-0 text-body-small leading-relaxed text-ink-muted">
            {t('appPage.campusVirtual.description')}
          </p>
        </article>
      </div>
    </section>
  )
}

/** Shows whether the API responds, with a retry action on error. */
function ApiStatusLine() {
  const { t } = useTranslation()
  const status = useApiStatus()

  let statusText: string

  if (status.isPending || (status.isError && status.isFetching)) {
    statusText = t('appPage.api.checking')
  } else if (status.isError) {
    statusText = t('appPage.api.unreachable')
  } else {
    statusText = status.data === 'online' ? t('appPage.api.online') : t('appPage.api.degraded')
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-body-small text-ink-muted">
      <p className="m-0" role="status">
        {t('appPage.api.label')} {statusText}
      </p>

      {status.isError && (
        <button
          type="button"
          onClick={() => void status.refetch()}
          disabled={status.isFetching}
          className="cursor-pointer rounded-md border border-line px-3 py-1 text-label font-medium text-ink hover:bg-raised focus:outline-2 focus:outline-offset-2 focus:outline-accent disabled:opacity-50"
        >
          {t('appPage.api.retry')}
        </button>
      )}
    </div>
  )
}
