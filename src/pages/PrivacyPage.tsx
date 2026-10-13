import { DraftNotice } from '../components/DraftNotice'

export function PrivacyPage() {
  return (
    <section>
      <h1 className="m-0 text-2xl font-semibold">Privacy policy</h1>
      <div className="mt-4">
        <DraftNotice />
      </div>
      <p className="mt-6 text-ink-soft">
        This page will describe what data CampusPulse collects, why, where it is stored, how long it
        is kept, and how to contact us. Google Play requires it before the app can be published.
      </p>
    </section>
  )
}
