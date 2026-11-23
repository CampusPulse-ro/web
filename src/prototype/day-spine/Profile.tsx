/** Profile as grouped settings: sign out at the bottom, deleting the account in its own section. */
import { useState, type ReactNode } from 'react'
import { Segmented, Switch } from './ui'
import { useProto } from './state'

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8" aria-label={title}>
      <h2 className="text-label text-ink-soft">{title}</h2>
      <div className="mt-1 divide-y divide-line">{children}</div>
    </section>
  )
}

function Item({ label, value, about }: { label: string; value?: ReactNode; about?: string }) {
  return (
    <div className="flex min-h-14 items-center gap-4 py-3">
      <span className="flex flex-1 flex-col">
        <span className="text-body text-ink">{label}</span>
        {about ? <span className="text-caption text-ink-muted">{about}</span> : null}
      </span>
      {value ? <span className="text-right text-body-small text-ink-soft">{value}</span> : null}
    </div>
  )
}

export function ProfileScreen() {
  const { data, wide } = useProto()
  const [remind, setRemind] = useState(true)
  const [lead, setLead] = useState<'5' | '10' | '15'>('10')
  const [lang, setLang] = useState<'en' | 'ro'>('en')
  const g = data.timetable.studyGroup
  const optional = new Set(
    data.timetable.occurrences.filter((o) => o.optional).map((o) => o.subjectId),
  )

  return (
    <div className={wide ? 'mx-auto max-w-xl px-8 py-10' : 'px-5 pt-7 pb-32'}>
      <h1 className="b-title">Profile</h1>
      <div className="mt-6 flex items-center gap-4">
        <span
          aria-hidden
          className="grid size-14 place-items-center rounded-full bg-raised text-subtitle text-ink-soft"
        >
          DS
        </span>
        <span className="flex flex-col">
          <span className="text-subtitle text-ink">Demo student</span>
          <span className="text-body-small text-ink-muted">
            {g ? `${g.programmeCode}, year ${g.year}, group ${g.label}` : 'No group picked'}
          </span>
        </span>
      </div>

      <Group title="Timetable">
        <Item
          label="Study group"
          value={g ? `${g.programmeName}` : 'Not set'}
          about="Change it in the timetable setup"
        />
        <Item label="Optional subjects" value={`${optional.size} picked`} />
      </Group>

      <Group title="Reminders">
        <Switch
          checked={remind}
          onChange={setRemind}
          label="Class reminders"
          about="A notification with the room, before each class"
        />
        {remind ? (
          <div className="py-3">
            <p className="mb-2 text-body-small text-ink-soft">How long before</p>
            <Segmented
              id="lead"
              label="How long before"
              value={lead}
              onChange={setLead}
              options={[
                { value: '5', label: '5 min' },
                { value: '10', label: '10 min' },
                { value: '15', label: '15 min' },
              ]}
            />
          </div>
        ) : null}
      </Group>

      <Group title="Campus Virtual">
        <Item
          label="Connected"
          about="Deadlines and submissions use your own cv.upt.ro sign-in"
          value={<span className="b-free-text">On</span>}
        />
      </Group>

      <Group title="Language">
        <div className="py-3">
          <Segmented
            id="lang"
            label="Language"
            value={lang}
            onChange={setLang}
            options={[
              { value: 'en', label: 'English' },
              { value: 'ro', label: 'Română' },
            ]}
          />
          <p className="mt-2 text-caption text-ink-muted">
            Romanian names keep their letters: Topîrceanu, Șerban, Vacanța de iarnă.
          </p>
        </div>
      </Group>

      <div className="mt-10 border-t border-line pt-2">
        <button
          type="button"
          className="flex min-h-12 w-full items-center rounded-md text-left text-body text-ink hover:bg-raised"
        >
          Sign out
        </button>
      </div>

      <section className="mt-10" aria-label="Danger zone">
        <h2 className="text-label text-danger">Delete your account</h2>
        <p className="mt-1 text-body-small text-ink-muted">
          Removes your settings, devices and reminders from CampusPulse. Campus Virtual keeps your
          coursework.
        </p>
        <button
          type="button"
          className="-mx-3 mt-2 min-h-12 rounded-md px-3 text-label text-danger hover:bg-danger/10"
        >
          Delete account…
        </button>
      </section>
    </div>
  )
}
