import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'

const features = [
  {
    icon: 'timetable',
    titleKey: 'home.features.timetable.title',
    descriptionKey: 'home.features.timetable.description',
  },
  {
    icon: 'book',
    titleKey: 'home.features.exams.title',
    descriptionKey: 'home.features.exams.description',
  },
  {
    icon: 'map',
    titleKey: 'home.features.map.title',
    descriptionKey: 'home.features.map.description',
  },
  {
    icon: 'globe',
    titleKey: 'home.features.campusVirtual.title',
    descriptionKey: 'home.features.campusVirtual.description',
  },
] as const

export function HomePage() {
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      {/* Hero section */}
      <section className="flex flex-col items-start gap-4 pt-2 sm:pt-6">
        <span className="text-caption font-medium text-accent">{t('home.overline')}</span>
        <h1 className="m-0 text-display font-bold tracking-tight text-ink">{t('home.tagline')}</h1>
        <p className="m-0 max-w-2xl text-body text-ink-soft">{t('home.pitch')}</p>

        <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          <Link
            to="/app"
            className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-4 text-label font-semibold text-on-accent no-underline transition-opacity hover:opacity-90 focus:outline-2 focus:outline-offset-2 focus:outline-accent"
          >
            {t('home.openWebApp')}
          </Link>
          <span className="inline-flex h-11 items-center justify-center rounded-md border border-dashed border-line-strong px-4 text-label font-semibold text-ink-soft select-none">
            {t('home.googlePlayComingSoon')}
          </span>
        </div>

        <p className="m-0 text-caption font-medium text-ink-muted">{t('home.notice')}</p>
      </section>

      {/* Feature cards */}
      <section
        aria-label={t('home.featuresTitle')}
        className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        {features.map((feature) => (
          <article
            key={feature.icon}
            className="flex flex-col items-center rounded-lg border border-line bg-raised px-4 py-6 text-center sm:py-8"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-raised text-ink-soft">
              <Icon name={feature.icon} />
            </div>
            <h2 className="mt-4 text-heading font-semibold text-ink">{t(feature.titleKey)}</h2>
            <p className="mt-2 text-body-small text-ink-muted">{t(feature.descriptionKey)}</p>
          </article>
        ))}
      </section>

      {/* Interactive Campus Preview */}
      <section className="flex flex-col gap-6 border-t border-line pt-10 sm:pt-12">
        <div className="flex flex-col gap-2">
          <span className="text-caption font-semibold text-accent">
            {t('home.preview.overline')}
          </span>
          <h2 className="m-0 text-title font-bold tracking-tight text-ink">
            {t('home.preview.title')}
          </h2>
          <p className="m-0 max-w-2xl text-body text-ink-soft">{t('home.preview.subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Card 1: Today's schedule preview */}
          <div className="flex flex-col gap-4 rounded-lg border border-line bg-raised p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-4">
              <div>
                <h3 className="m-0 text-subtitle font-semibold text-ink">
                  {t('home.preview.todayScheduleTitle')}
                </h3>
                <p className="m-0 text-caption text-ink-muted">
                  {t('home.preview.todayScheduleMeta')}
                </p>
              </div>
              <span className="rounded-full border border-line bg-sunken px-2.5 py-1 text-caption font-medium text-ink-soft">
                {t('home.preview.groupBadge')}
              </span>
            </div>

            {/* Active class (Now) */}
            <div className="flex flex-col gap-2 rounded-md border border-accent/40 bg-accent/10 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-caption font-semibold text-accent">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  {t('home.preview.statusNowWithTime')}
                </span>
                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-caption font-medium text-accent">
                  {t('home.preview.msaType')}
                </span>
              </div>
              <h4 className="m-0 text-subtitle font-semibold text-ink">
                {t('home.preview.msaTitle')}
              </h4>
              <div className="flex flex-wrap items-center gap-4 text-caption text-ink-soft">
                <span className="inline-flex items-center gap-1">
                  <Icon name="pin" size={14} className="text-ink-muted" />
                  {t('home.preview.msaRoom')}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="user" size={14} className="text-ink-muted" />
                  {t('home.preview.msaTeacher')}
                </span>
              </div>
            </div>

            {/* Upcoming class (Next) */}
            <div className="flex flex-col gap-2 rounded-md border border-line bg-sunken/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-caption font-semibold text-ink-muted">
                  {t('home.preview.statusNextWithTime')}
                </span>
                <span className="rounded-full bg-line px-2 py-0.5 text-caption font-medium text-ink-muted">
                  {t('home.preview.dsaType')}
                </span>
              </div>
              <h4 className="m-0 text-subtitle font-medium text-ink">
                {t('home.preview.dsaTitle')}
              </h4>
              <div className="flex items-center gap-1 text-caption text-ink-muted">
                <Icon name="pin" size={14} />
                {t('home.preview.dsaRoom')}
              </div>
            </div>
          </div>

          {/* Card 2: Insights & Deadlines */}
          <div className="flex flex-col justify-between gap-5 rounded-lg border border-line bg-raised p-5 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="border-b border-line pb-4">
                <h3 className="m-0 text-subtitle font-semibold text-ink">
                  {t('home.preview.insightsTitle')}
                </h3>
              </div>

              {/* Assignment deadline */}
              <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-sunken/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-sunken text-ink-soft">
                    <Icon name="globe" size={18} />
                  </div>
                  <div>
                    <h4 className="m-0 text-body-small font-medium text-ink">
                      {t('home.preview.deadlineItem')}
                    </h4>
                    <p className="m-0 text-caption text-ink-muted">
                      {t('home.preview.deadlineTitle')}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-warn/15 px-2.5 py-1 text-caption font-semibold text-warn">
                  {t('home.preview.deadlineTime')}
                </span>
              </div>

              {/* Study space status */}
              <div className="flex items-center justify-between gap-3 rounded-md border border-line bg-sunken/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-sunken text-ink-soft">
                    <Icon name="book" size={18} />
                  </div>
                  <div>
                    <h4 className="m-0 text-body-small font-medium text-ink">
                      {t('home.preview.studySpaceItem')}
                    </h4>
                    <p className="m-0 text-caption text-ink-muted">
                      {t('home.preview.studySpaceTitle')}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-success/15 px-2.5 py-1 text-caption font-semibold text-success">
                  {t('home.preview.studySpaceCrowd')}
                </span>
              </div>
            </div>

            {/* CTA Link to Web App */}
            <Link
              to="/app"
              className="inline-flex items-center justify-between rounded-md border border-line bg-sunken px-4 py-3 text-label font-semibold text-ink no-underline transition-colors hover:border-line-strong hover:bg-sunken/80"
            >
              <span>{t('home.preview.exploreAppCta')}</span>
              <Icon name="chevron-right" size={16} className="text-ink-muted" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
