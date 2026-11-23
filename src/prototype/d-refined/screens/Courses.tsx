import { AnimatePresence, m } from 'motion/react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { allDue, courseSections, isDone, KIND_TEXT, type DueItem } from '../campus'
import { useHref, useProto, useSheetParam, useSnackbar, useWindowClass } from '../ctx'
import { Icon } from '../icons'
import { minutesOf, type WallTime } from '../../clock'
import type { DemoData } from '../../data'
import {
  classKind,
  findClass,
  hhmm,
  KIND_ICON,
  kindOf,
  relativeDay,
  shortOf,
  type Cls,
} from '../model'
import { springs } from '../motion'
import { TopAppBar } from '../ui/Bars'
import { Segmented } from '../ui/Controls'
import { DueRow } from '../ui/Deadline'
import { SubjectAvatar } from '../ui/Shape'
import { AccountButton, LinkUptNudge, PaneLayout } from './common'

interface Course {
  short: string
  name: string
  teachers: string[]
  url: string | null
}

function useCourses(): Course[] {
  const { data } = useProto()
  const map = new Map<string, Course>()
  for (const o of data.timetable.occurrences) {
    const short = shortOf(o)
    const c = map.get(short) ?? { short, name: o.subject, teachers: [], url: o.campusVirtualUrl }
    if (o.teacher && !c.teachers.includes(o.teacher)) c.teachers.push(o.teacher)
    map.set(short, c)
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

/** Every class from now on, in time order. */
function upcomingClasses(data: DemoData, now: WallTime): Cls[] {
  return data.timetable.occurrences
    .filter((o) => o.date > now.date || (o.date === now.date && minutesOf(o.endsAt) > now.minutes))
    .map((o) => findClass(data, `${o.date}_${o.startsAt.slice(0, 5)}`)!)
    .sort((a, b) => a.key.localeCompare(b.key))
}

/** The next time this course is on, from now. */
function nextOf(short: string, list: Cls[]): Cls | null {
  return list.find((c) => shortOf(c.o) === short) ?? null
}

export function CoursesScreen() {
  const { short } = useParams()
  const courses = useCourses()
  const course = courses.find((c) => c.short === short)
  return course ? <CoursePage course={course} /> : <CourseList courses={courses} />
}

function CourseList({ courses }: { courses: Course[] }) {
  const { data, now, looks, campus, account } = useProto()
  const { compact } = useWindowClass()
  const href = useHref()
  const due = allDue(data, campus, !!account?.uptLinked)
  const upcoming = upcomingClasses(data, now)

  return (
    <PaneLayout compact={compact}>
      <div className="cx-pane" style={{ paddingBottom: compact ? 96 : 40 }}>
        <div className={compact ? '' : 'mx-auto max-w-[1180px] px-6'}>
          <TopAppBar
            large={compact}
            title="Courses"
            subtitle="Semester 1, 2026-2027"
            actions={compact ? <AccountButton /> : undefined}
          />
          <div className={compact ? 'px-4' : 'px-2'}>
            <LinkUptNudge text="Each course’s sections, files and your grades come from Campus Virtual." />
            <ul
              className={compact ? 'cx-list' : 'grid gap-4'}
              style={
                compact
                  ? undefined
                  : { gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }
              }
            >
              {courses.map((c) => {
                const look = looks.get(c.short)
                const next = nextOf(c.short, upcoming)
                const open = due.filter((d) => d.short === c.short && !isDone(d)).length
                const body = (
                  <>
                    <span className="cx-item-body">
                      <span className="t-body-l line-clamp-2">{c.name}</span>
                      <span className="t-body-m c-muted truncate">
                        {next
                          ? `Next: ${relativeDay(next.date, now.date)} ${hhmm(next.start)}, ${kindOf(next).toLowerCase()}`
                          : 'No more classes in this timetable'}
                      </span>
                    </span>
                    {open > 0 && (
                      <span className="cx-chip cx-chip--small tnum flex-none">{open} due</span>
                    )}
                  </>
                )
                return (
                  <li key={c.short}>
                    {compact ? (
                      <Link
                        to={href(`/courses/${c.short}`)}
                        className="cx-item cx-item--three cx-state"
                      >
                        {look && (
                          <SubjectAvatar short={c.short} tone={look.tone} shape={look.shape} />
                        )}
                        {body}
                      </Link>
                    ) : (
                      <Link
                        to={href(`/courses/${c.short}`)}
                        className="cx-state flex h-full flex-col gap-4 p-5"
                        style={{
                          background: 'var(--md-sys-color-surface-container)',
                          borderRadius: 28,
                        }}
                      >
                        <span className="flex items-start justify-between gap-3">
                          {look && (
                            <SubjectAvatar
                              short={c.short}
                              tone={look.tone}
                              shape={look.shape}
                              size={56}
                            />
                          )}
                          {open > 0 && (
                            <span className="cx-chip cx-chip--small tnum">{open} due</span>
                          )}
                        </span>
                        <span>
                          <span className="t-title-l line-clamp-2">{c.name}</span>
                          <span className="t-body-m c-muted mt-1 block">
                            {c.teachers.length ? c.teachers.join(', ') : 'Teachers not listed'}
                          </span>
                        </span>
                        <span className="t-body-m mt-auto flex items-center gap-2">
                          <Icon name="schedule" size={18} className="c-muted" />
                          {next
                            ? `${relativeDay(next.date, now.date).replace(/^./, (x) => x.toUpperCase())} ${hhmm(next.start)}, ${kindOf(next).toLowerCase()} in ${next.o.room}`
                            : 'No more classes in this timetable'}
                        </span>
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </PaneLayout>
  )
}

function CoursePage({ course }: { course: Course }) {
  const { data, now, looks, campus, account } = useProto()
  const { compact } = useWindowClass()
  const navigate = useNavigate()
  const href = useHref()
  const snack = useSnackbar()
  const [, openClass] = useSheetParam('class')
  const [tab, setTab] = useState<'content' | 'grades'>('content')
  const linked = !!account?.uptLinked
  const look = looks.get(course.short)
  const items = allDue(data, campus, linked).filter((d) => d.short === course.short)
  const byId = new Map(items.map((d) => [d.id, d]))
  const sections = courseSections(course.short)
  const week = upcomingClasses(data, now)
    .filter((c) => shortOf(c.o) === course.short)
    .slice(0, 4)
  const openDue = (d: DueItem) => navigate(href(`/deadlines/${d.id}`))

  const content = (
    <div>
      {sections.map((s) => (
        <section key={s.title} aria-label={s.title}>
          <h2 className="cx-section-title">
            <span>{s.title}</span>
            {s.summary === 'This week' && (
              <span className="cx-chip cx-chip--small cx-chip--selected">This week</span>
            )}
          </h2>
          {s.summary && s.summary !== 'This week' && (
            <p className="t-body-m c-muted -mt-1 mb-2 px-1">{s.summary}</p>
          )}
          <ul className="cx-list">
            {s.files.map((f) => (
              <li key={f.name}>
                <button
                  type="button"
                  className="cx-item cx-state"
                  onClick={() => snack(`Saved ${f.name} for offline`)}
                >
                  <span className="cx-item-lead">
                    <Icon name="pictureAsPdf" />
                  </span>
                  <span className="cx-item-body">
                    <span className="t-body-l truncate">{f.name}</span>
                    <span className="t-body-s c-muted tnum">{f.size}</span>
                  </span>
                  <Icon name="cloudDone" className="c-muted" size={20} />
                </button>
              </li>
            ))}
            {s.activities
              .map((id) => byId.get(id))
              .filter((d): d is DueItem => !!d)
              .map((d) => (
                <li key={d.id}>
                  <DueRow d={d} onOpen={openDue} />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  )

  const graded = items.filter((d) => d.kind !== 'manual')
  const grades = (
    <div>
      <ul className="cx-list mt-2">
        {graded.map((d) => (
          <li key={d.id} className="cx-item">
            <span className="cx-item-lead">
              <Icon
                name={d.kind === 'quiz' ? 'quiz' : d.kind === 'forum' ? 'forum' : 'assignment'}
              />
            </span>
            <span className="cx-item-body">
              <span className="t-body-l line-clamp-2">{d.name}</span>
              <span className="t-body-m c-muted">{KIND_TEXT[d.kind]}</span>
            </span>
            <span className={`t-title-m tnum ${d.status === 'graded' ? '' : 'c-muted'}`}>
              {d.status === 'graded' ? (d.grade ?? d.quiz?.bestGrade) : '–'}
            </span>
          </li>
        ))}
        <li className="cx-item">
          <span className="cx-item-lead">
            <Icon name="grading" />
          </span>
          <span className="cx-item-body">
            <span className="t-body-l">Course total</span>
            <span className="t-body-m c-muted">Your teacher hasn’t released it yet</span>
          </span>
          <span className="t-title-m c-muted">–</span>
        </li>
      </ul>
    </div>
  )

  const side = (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="next-classes">
        <h2 id="next-classes" className="cx-section-title">
          Next classes
        </h2>
        <ul className="cx-list">
          {week.map((c) => (
            <li key={c.key}>
              <button type="button" className="cx-item cx-state" onClick={() => openClass(c.key)}>
                <span className="cx-item-lead">
                  <Icon name={KIND_ICON[classKind(c)]} />
                </span>
                <span className="cx-item-body">
                  <span className="t-body-l">
                    {relativeDay(c.date, now.date).replace(/^./, (x) => x.toUpperCase())},{' '}
                    <span className="tnum">{hhmm(c.start)}</span>
                  </span>
                  <span className="t-body-m c-muted">
                    {kindOf(c)} in <span className="t-narrow font-semibold">{c.o.room}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
          {week.length === 0 && (
            <li className="cx-item t-body-m c-muted">No more classes in this timetable</li>
          )}
        </ul>
      </section>
      {!compact && linked && (
        <section aria-labelledby="grades">
          <h2 id="grades" className="cx-section-title">
            Grades
          </h2>
          {grades}
        </section>
      )}
    </div>
  )

  return (
    <PaneLayout compact={compact}>
      <div className="cx-pane" style={{ paddingBottom: compact ? 40 : 40 }}>
        <div className={compact ? '' : 'mx-auto max-w-[1180px] px-6'}>
          <TopAppBar
            large={compact}
            title={course.name}
            smallTitle={course.short}
            subtitle={course.teachers.length ? course.teachers.join(', ') : undefined}
            leading={
              <button
                type="button"
                className="cx-icon-btn cx-state ml-1"
                aria-label="Back to courses"
                onClick={() => navigate(href('/courses'))}
              >
                <Icon name="arrowBack" />
              </button>
            }
            below={
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {look && (
                  <SubjectAvatar
                    short={course.short}
                    tone={look.tone}
                    shape={look.shape}
                    size={44}
                  />
                )}
                <span className="t-body-m c-muted flex-1">
                  {items.filter((d) => !isDone(d)).length} due, from Campus Virtual
                </span>
                {course.url && (
                  <a
                    href={course.url}
                    target="_blank"
                    rel="noreferrer"
                    className="cx-btn cx-btn--text cx-state"
                  >
                    <Icon name="openInNew" size={18} />
                    Website
                  </a>
                )}
              </div>
            }
          />
          <div className={compact ? 'px-4' : 'px-2'}>
            {!linked ? (
              <LinkUptNudge text="This course’s sections, files and your grades come from Campus Virtual." />
            ) : compact ? (
              <>
                <Segmented
                  label="Show"
                  value={tab}
                  onChange={setTab}
                  options={[
                    { value: 'content', label: 'Course' },
                    { value: 'grades', label: 'Grades' },
                  ]}
                />
                <AnimatePresence mode="wait" initial={false}>
                  <m.div
                    key={tab}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={springs.effectsFast}
                  >
                    {tab === 'content' ? (
                      <>
                        {content}
                        {side}
                      </>
                    ) : (
                      grades
                    )}
                  </m.div>
                </AnimatePresence>
              </>
            ) : (
              <div className="grid gap-8" style={{ gridTemplateColumns: 'minmax(0, 1fr) 360px' }}>
                {content}
                {side}
              </div>
            )}
            <p className="t-body-s c-muted mt-8 px-1">
              The sections, files and grades here are made up for the prototype; in the app they
              come from Campus Virtual.
            </p>
          </div>
        </div>
      </div>
    </PaneLayout>
  )
}
