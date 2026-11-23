import { useEffect, useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ApiError, type Deadline } from '../api/client'
import {
  useCreateDeadline,
  useDeadlines,
  useDeleteDeadline,
  useSetDeadlineDone,
  useUpdateDeadline,
  type DeadlineInput,
} from '../api/useDeadlines'
import { useAuth } from '../auth'
import { Banner } from '../components/Banner'
import { Button } from '../components/Button'
import { Dialog } from '../components/Dialog'
import { Icon } from '../components/Icon'
import { Input } from '../components/Input'
import { inputClasses, textLinkClasses } from '../components/styles'
import {
  campusDate,
  campusInstant,
  campusTime,
  daysBetween,
  isoWeekday,
  useDateTimeFormat,
} from '../i18n/format'

/** The API's limits (api README, "Manual deadlines"). */
const limits = { title: 200, course: 200, notes: 2000 }

type Bucket = 'overdue' | 'today' | 'thisWeek' | 'later'
const buckets: readonly Bucket[] = ['overdue', 'today', 'thisWeek', 'later']

/** Which group a deadline that isn't done goes in, by the campus calendar. */
function bucketOf(dueAt: number, now: number): Bucket {
  if (dueAt < now) return 'overdue'
  const today = campusDate(now)
  const days = daysBetween(today, campusDate(dueAt))
  if (days === 0) return 'today'
  // The rest of this week, up to Sunday.
  if (days <= 7 - isoWeekday(today)) return 'thisWeek'
  return 'later'
}

/** The current time, moved on every minute so a deadline turns overdue while the page is open. */
function useMinute(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])
  return now
}

type Editing = { mode: 'add' } | { mode: 'edit'; deadline: Deadline } | null

export function DeadlinesPage() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const deadlines = useDeadlines()
  const now = useMinute()
  const [editing, setEditing] = useState<Editing>(null)
  const [deleting, setDeleting] = useState<Deadline | null>(null)
  const [showDone, setShowDone] = useState(false)

  const list = deadlines.data ?? []
  const open = list.filter((item) => !item.done)
  const done = list
    .filter((item) => item.done)
    .sort((a, b) => Date.parse(b.dueAt) - Date.parse(a.dueAt))
  const grouped = new Map<Bucket, Deadline[]>()
  for (const item of open) {
    const bucket = bucketOf(Date.parse(item.dueAt), now)
    grouped.set(bucket, [...(grouped.get(bucket) ?? []), item])
  }

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="m-0 text-title text-ink">{t('deadlines.title')}</h1>
          <p className="m-0 text-body text-ink-muted">{t('deadlines.subtitle')}</p>
        </div>
        <Button onClick={() => setEditing({ mode: 'add' })} className="shrink-0">
          <Icon name="plus" size={18} />
          {t('deadlines.add')}
        </Button>
      </header>

      <p className="m-0 flex items-start gap-2 text-body-small text-ink-muted">
        <Icon name="info" size={16} className="mt-0.5 shrink-0 text-ink-muted" />
        <span>
          {user?.uptLinked ? (
            t('deadlines.campusVirtualLater')
          ) : (
            <>
              {t('deadlines.linkForCampusVirtual')}{' '}
              <Link to="/account" className={textLinkClasses}>
                {t('deadlines.linkUpt')}
              </Link>
            </>
          )}
        </span>
      </p>

      {deadlines.isPending ? (
        <p role="status" className="m-0 text-body text-ink-muted">
          {t('deadlines.loading')}
        </p>
      ) : deadlines.isError && !deadlines.data ? (
        <Banner
          tone="error"
          role="alert"
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void deadlines.refetch()}
              loading={deadlines.isFetching}
            >
              {t('deadlines.retry')}
            </Button>
          }
        >
          {t('deadlines.loadFailed')}
        </Banner>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-start gap-3 py-6">
          <h2 className="m-0 text-subtitle text-ink">{t('deadlines.emptyTitle')}</h2>
          <p className="m-0 text-body-small text-ink-muted">{t('deadlines.emptyBody')}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {open.length === 0 && (
            <p className="m-0 text-body text-ink-muted">{t('deadlines.allDone')}</p>
          )}
          {buckets.map((bucket) => {
            const items = grouped.get(bucket)
            if (!items) return null
            return (
              <DeadlineGroup
                key={bucket}
                title={t(`deadlines.groups.${bucket}`)}
                items={items}
                now={now}
                overdue={bucket === 'overdue'}
                onEdit={(deadline) => setEditing({ mode: 'edit', deadline })}
                onDelete={setDeleting}
              />
            )
          })}

          {done.length > 0 && (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                aria-expanded={showDone}
                aria-controls="deadlines-done"
                onClick={() => setShowDone((value) => !value)}
                className="-ml-2 flex w-fit cursor-pointer items-center gap-1.5 rounded-sm px-2 py-1 text-subtitle text-ink-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
              >
                <Icon
                  name="chevron-down"
                  size={18}
                  className={`transition ${showDone ? '' : '-rotate-90'}`}
                />
                {t('deadlines.groups.done')}
                <span className="text-body-small text-ink-muted">{done.length}</span>
              </button>
              {showDone && (
                <div id="deadlines-done">
                  <DeadlineList
                    items={done}
                    now={now}
                    onEdit={(deadline) => setEditing({ mode: 'edit', deadline })}
                    onDelete={setDeleting}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <DeadlineForm editing={editing} onClose={() => setEditing(null)} />
      <DeleteDeadline deadline={deleting} onClose={() => setDeleting(null)} />
    </section>
  )
}

interface GroupProps {
  title: string
  items: Deadline[]
  now: number
  overdue?: boolean
  onEdit: (deadline: Deadline) => void
  onDelete: (deadline: Deadline) => void
}

function DeadlineGroup({ title, items, now, overdue, onEdit, onDelete }: GroupProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2
        id={headingId}
        className={`m-0 flex items-baseline gap-2 text-subtitle ${overdue ? 'text-warn' : 'text-ink'}`}
      >
        {title}
        <span className="text-body-small text-ink-muted">{items.length}</span>
      </h2>
      <DeadlineList items={items} now={now} onEdit={onEdit} onDelete={onDelete} />
    </section>
  )
}

function DeadlineList({ items, now, onEdit, onDelete }: Omit<GroupProps, 'title' | 'overdue'>) {
  return (
    <ul className="m-0 flex list-none flex-col divide-y divide-line border-y border-line p-0">
      {items.map((item) => (
        <DeadlineRow
          key={item.id}
          deadline={item}
          now={now}
          onEdit={() => onEdit(item)}
          onDelete={() => onDelete(item)}
        />
      ))}
    </ul>
  )
}

interface RowProps {
  deadline: Deadline
  now: number
  onEdit: () => void
  onDelete: () => void
}

function DeadlineRow({ deadline, now, onEdit, onDelete }: RowProps) {
  const { t } = useTranslation()
  const format = useDateTimeFormat()
  const setDone = useSetDeadlineDone()
  const dueAt = Date.parse(deadline.dueAt)
  const late = !deadline.done && dueAt < now
  const titleId = useId()

  const days = daysBetween(campusDate(now), campusDate(dueAt))
  const time = format.time(dueAt)
  const due =
    days === 0
      ? t('deadlines.dueToday', { time })
      : days === 1
        ? t('deadlines.dueTomorrow', { time })
        : days === -1
          ? t('deadlines.dueYesterday', { time })
          : t('deadlines.dueOn', {
              day: format.custom(dueAt, {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                ...(campusDate(dueAt).slice(0, 4) === campusDate(now).slice(0, 4)
                  ? {}
                  : { year: 'numeric' }),
              }),
              time,
            })

  return (
    <li className="flex items-start gap-3 py-3.5">
      <input
        type="checkbox"
        checked={deadline.done}
        onChange={(event) => setDone.mutate({ id: deadline.id, done: event.target.checked })}
        aria-labelledby={titleId}
        aria-describedby={`${titleId}-due`}
        className="mt-1 size-5 shrink-0 cursor-pointer accent-accent"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
          <span
            id={titleId}
            className={`text-body break-words ${deadline.done ? 'text-ink-muted line-through' : 'text-ink'}`}
          >
            {deadline.title}
          </span>
          <span
            id={`${titleId}-due`}
            className={`shrink-0 text-body-small tabular-nums ${late ? 'text-warn' : 'text-ink-muted'}`}
          >
            {due}
          </span>
        </div>
        {deadline.course && (
          <span className="text-body-small text-ink-soft">{deadline.course}</span>
        )}
        {deadline.notes && (
          <p className="m-0 text-body-small whitespace-pre-line text-ink-muted">{deadline.notes}</p>
        )}
        {setDone.isError && (
          <p role="alert" className="m-0 text-body-small text-danger">
            {t('deadlines.saveFailed')}
          </p>
        )}
      </div>
      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          aria-label={t('deadlines.editNamed', { title: deadline.title })}
        >
          {t('deadlines.edit')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          aria-label={t('deadlines.deleteNamed', { title: deadline.title })}
          className="px-2"
        >
          <Icon name="trash" size={16} />
        </Button>
      </div>
    </li>
  )
}

interface FormState {
  title: string
  course: string
  date: string
  time: string
  notes: string
}

function initialForm(editing: Editing): FormState {
  if (editing?.mode === 'edit') {
    const { deadline } = editing
    return {
      title: deadline.title,
      course: deadline.course ?? '',
      date: campusDate(Date.parse(deadline.dueAt)),
      time: campusTime(Date.parse(deadline.dueAt)),
      notes: deadline.notes ?? '',
    }
  }
  return { title: '', course: '', date: campusDate(Date.now()), time: '23:59', notes: '' }
}

/** Add or edit a deadline in a dialog. Date and time are campus time. */
function DeadlineForm({ editing, onClose }: { editing: Editing; onClose: () => void }) {
  const { t } = useTranslation()
  const create = useCreateDeadline()
  const update = useUpdateDeadline()
  const [form, setForm] = useState<FormState>(() => initialForm(editing))
  const [errors, setErrors] = useState<{ title?: string; due?: string }>({})
  const [shownFor, setShownFor] = useState<Editing>(editing)
  const notesId = useId()

  // A new add or edit starts from its own values (state reset while rendering, React's pattern).
  if (shownFor !== editing) {
    setShownFor(editing)
    setForm(initialForm(editing))
    setErrors({})
  }
  // …and without the last one's error.
  const { reset: resetCreate } = create
  const { reset: resetUpdate } = update
  useEffect(() => {
    resetCreate()
    resetUpdate()
  }, [editing, resetCreate, resetUpdate])

  const saving = create.isPending || update.isPending
  const failure = create.error ?? update.error
  const set = (field: keyof FormState) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const title = form.title.trim()
    const dueAt = campusInstant(form.date, form.time)
    const next: typeof errors = {}
    if (!title) next.title = t('deadlines.form.titleRequired')
    if (!dueAt) next.due = t('deadlines.form.dueRequired')
    setErrors(next)
    if (next.title || next.due || !dueAt) return

    const input: DeadlineInput = {
      title,
      course: form.course.trim(),
      dueAt: dueAt.toISOString(),
      notes: form.notes.trim(),
    }
    const done = { onSuccess: onClose }
    if (editing?.mode === 'edit') update.mutate({ id: editing.deadline.id, input }, done)
    else create.mutate(input, done)
  }

  return (
    <Dialog
      open={editing !== null}
      onClose={onClose}
      busy={saving}
      title={
        editing?.mode === 'edit' ? t('deadlines.form.editTitle') : t('deadlines.form.addTitle')
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Input
          label={t('deadlines.form.title')}
          value={form.title}
          onChange={(event) => set('title')(event.target.value)}
          maxLength={limits.title}
          required
          error={errors.title}
          data-autofocus
        />
        <Input
          label={t('deadlines.form.course')}
          hint={t('deadlines.form.optional')}
          value={form.course}
          onChange={(event) => set('course')(event.target.value)}
          maxLength={limits.course}
        />
        <fieldset className="m-0 flex flex-col gap-1.5 border-0 p-0">
          <legend className="mb-1.5 p-0 text-label text-ink">{t('deadlines.form.due')}</legend>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={
                <span className="text-caption text-ink-muted">{t('deadlines.form.date')}</span>
              }
              type="date"
              value={form.date}
              onChange={(event) => set('date')(event.target.value)}
              required
              aria-invalid={errors.due ? true : undefined}
            />
            <Input
              label={
                <span className="text-caption text-ink-muted">{t('deadlines.form.time')}</span>
              }
              type="time"
              value={form.time}
              onChange={(event) => set('time')(event.target.value)}
              required
              aria-invalid={errors.due ? true : undefined}
            />
          </div>
          {errors.due ? (
            <p role="alert" className="m-0 text-body-small text-danger">
              {errors.due}
            </p>
          ) : (
            <p className="m-0 text-caption text-ink-muted">{t('deadlines.form.campusTime')}</p>
          )}
        </fieldset>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={notesId} className="text-label text-ink">
            {t('deadlines.form.notes')}
          </label>
          <textarea
            id={notesId}
            value={form.notes}
            onChange={(event) => set('notes')(event.target.value)}
            maxLength={limits.notes}
            rows={3}
            aria-describedby={`${notesId}-hint`}
            className={`py-2.5 ${inputClasses()}`}
          />
          <p id={`${notesId}-hint`} className="m-0 text-caption text-ink-muted">
            {t('deadlines.form.optional')}
          </p>
        </div>

        {failure && (
          <Banner tone="error" role="alert">
            {failure instanceof ApiError && failure.type === 'deadline-limit'
              ? t('deadlines.form.limit')
              : t('deadlines.saveFailed')}
          </Banner>
        )}

        <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('deadlines.form.cancel')}
          </Button>
          <Button type="submit" loading={saving}>
            {editing?.mode === 'edit' ? t('deadlines.form.save') : t('deadlines.form.addSubmit')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

/** Asks before deleting, naming the deadline. */
function DeleteDeadline({ deadline, onClose }: { deadline: Deadline | null; onClose: () => void }) {
  const { t } = useTranslation()
  const remove = useDeleteDeadline()
  const { reset } = remove
  useEffect(() => reset(), [deadline, reset])

  return (
    <Dialog
      open={deadline !== null}
      onClose={onClose}
      busy={remove.isPending}
      title={t('deadlines.delete.title')}
      description={deadline ? t('deadlines.delete.body', { title: deadline.title }) : undefined}
    >
      {remove.isError && (
        <Banner tone="error" role="alert">
          {t('deadlines.delete.failed')}
        </Banner>
      )}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={remove.isPending} data-autofocus>
          {t('deadlines.form.cancel')}
        </Button>
        <Button
          variant="danger"
          loading={remove.isPending}
          onClick={() => deadline && remove.mutate(deadline.id, { onSuccess: onClose })}
        >
          {t('deadlines.delete.confirm')}
        </Button>
      </div>
    </Dialog>
  )
}
