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
    </div>
  )
}
