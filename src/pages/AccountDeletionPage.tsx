import { DraftNotice } from '../components/DraftNotice'

export function AccountDeletionPage() {
  return (
    <section>
      <h1 className="m-0 text-2xl font-semibold">Delete your account</h1>
      <div className="mt-4">
        <DraftNotice />
      </div>
      <p className="mt-6 text-ink-soft">
        This page will explain how to delete your CampusPulse account and which data is removed.
        Google Play requires a web page for this, separate from the option inside the app.
      </p>
    </section>
  )
}
