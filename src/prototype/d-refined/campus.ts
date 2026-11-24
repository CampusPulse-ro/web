/**
 * Campus Virtual, as the app would see it through the Moodle mobile API: everything on the student's
 * Timeline (`core_calendar_get_action_events_by_timesort`: assignments, quizzes, forums) plus the
 * deadlines they added themselves. The assignments come from the shared demo data; the quizzes, forum
 * posts, manual deadlines and course pages below are made up for this prototype, like the
 * assignments are.
 */
import type { WallTime } from '../clock'
import type { Assignment, DemoData } from '../data'
import { daysBetween, minutesUntil, wallOf } from './model'

export type DueKind = 'assign' | 'quiz' | 'forum' | 'manual'
/** Moodle's states, plus "done" for a ticked-off manual deadline. */
export type DueStatus = 'todo' | 'draft' | 'submitted' | 'graded' | 'done'

export interface Quiz {
  timeLimit: number
  attemptsAllowed: number
  attemptsUsed: number
  questions: number
  gradeToPass: string
  bestGrade?: string
}

export interface ForumPost {
  author: string
  /** `YYYY-MM-DDTHH:MM` campus time */
  at: string
  text: string
  you?: boolean
}

export interface Forum {
  intro: string
  required: number
  posts: ForumPost[]
}

export interface DueItem {
  id: string
  kind: DueKind
  name: string
  /** Subject short name, or null for a manual deadline with no course. */
  short: string | null
  course: string | null
  /** `YYYY-MM-DDTHH:MM` campus time */
  dueAt: string
  cutoffAt: string | null
  status: DueStatus
  grade?: string
  /** `YYYY-MM-DDTHH:MM` */
  submittedAt?: string
  files?: string[]
  assignment?: Assignment
  quiz?: Quiz
  forum?: Forum
  note?: string
}

export const KIND_TEXT: Record<DueKind, string> = {
  assign: 'Assignment',
  quiz: 'Quiz',
  forum: 'Forum',
  manual: 'Added by you',
}

export const DUE_ICON = {
  assign: 'assignment',
  quiz: 'quiz',
  forum: 'forum',
  manual: 'checklist',
} as const

const local = (iso: string) => iso.slice(0, 16)

function fromAssignment(a: Assignment): DueItem {
  return {
    id: `a${a.id}`,
    kind: 'assign',
    name: a.name,
    short: a.shortName,
    course: a.course,
    dueAt: local(a.dueAt),
    cutoffAt: a.cutoffAt ? local(a.cutoffAt) : null,
    status:
      a.status === 'notsubmitted'
        ? 'todo'
        : a.status === 'draft'
          ? 'draft'
          : a.status === 'submitted'
            ? 'submitted'
            : 'graded',
    grade: a.grade,
    submittedAt: a.submittedAt ? local(a.submittedAt) : undefined,
    files:
      a.status === 'draft'
        ? ['architecture-sheet-v1.pdf']
        : a.status === 'notsubmitted'
          ? []
          : ['submission.zip'],
    assignment: a,
  }
}

/** Made up: what Campus Virtual's Timeline adds besides assignments. */
const EXTRA: DueItem[] = [
  {
    id: 'q31',
    kind: 'quiz',
    name: 'Quiz 3: Forward kinematics',
    short: 'MER',
    course: 'Mechanical Engineering and Robotics',
    dueAt: '2026-11-25T10:00',
    cutoffAt: null,
    status: 'todo',
    quiz: {
      timeLimit: 20,
      attemptsAllowed: 2,
      attemptsUsed: 0,
      questions: 10,
      gradeToPass: '5.00',
    },
  },
  {
    id: 'q32',
    kind: 'quiz',
    name: 'Quiz: Test design techniques',
    short: 'SSV',
    course: 'Software verification and validation',
    dueAt: '2026-11-27T23:59',
    cutoffAt: null,
    status: 'todo',
    quiz: {
      timeLimit: 30,
      attemptsAllowed: 2,
      attemptsUsed: 1,
      questions: 15,
      gradeToPass: '5.00',
      bestGrade: '6.50 / 10',
    },
  },
  {
    id: 'q33',
    kind: 'quiz',
    name: 'Quiz 2: VHDL basics',
    short: 'CAD',
    course: 'Computer aided design',
    dueAt: '2026-11-18T23:59',
    cutoffAt: null,
    status: 'graded',
    grade: '8.00 / 10',
    submittedAt: '2026-11-17T20:31',
    quiz: {
      timeLimit: 15,
      attemptsAllowed: 1,
      attemptsUsed: 1,
      questions: 8,
      gradeToPass: '5.00',
      bestGrade: '8.00 / 10',
    },
  },
  {
    id: 'f41',
    kind: 'forum',
    name: 'Week 9: post your architecture question',
    short: 'MSA',
    course: 'Mobile systems and applications',
    dueAt: '2026-11-26T18:00',
    cutoffAt: null,
    status: 'todo',
    forum: {
      intro:
        'Post one question about your app’s architecture before Thursday, and answer at least one colleague. It counts towards the lab activity grade.',
      required: 1,
      posts: [
        {
          author: 'Ioana Păun',
          at: '2026-11-23T21:40',
          text: 'How do you keep the offline cache in sync when the timetable changes in the middle of the week?',
        },
        {
          author: 'Mihai Țurcanu',
          at: '2026-11-24T08:05',
          text: 'Is it fine to put the push-notification scheduling on the server instead of the device?',
        },
      ],
    },
  },
]

/** Made up: deadlines the student added in the app (the accounts feature). */
const MANUAL: DueItem[] = [
  {
    id: 'm1',
    kind: 'manual',
    name: 'Print the CAD poster (A2)',
    short: 'CAD',
    course: 'Computer aided design',
    dueAt: '2026-11-26T11:00',
    cutoffAt: null,
    status: 'todo',
    note: 'Copy centre by the library, before the lab at 12:00.',
  },
  {
    id: 'm2',
    kind: 'manual',
    name: 'Rehearse the MSA demo with the team',
    short: 'MSA',
    course: 'Mobile systems and applications',
    dueAt: '2026-12-02T11:00',
    cutoffAt: null,
    status: 'todo',
    note: 'Bring the phone charged and the APK installed.',
  },
]

export interface CampusState {
  /** In-app changes: a saved draft, a submission, a reply, a ticked manual deadline. */
  patches: Record<string, Partial<DueItem>>
  /** Manual deadlines added in this session. */
  added: DueItem[]
}

export function allDue(data: DemoData, state: CampusState, linked: boolean): DueItem[] {
  const moodle = linked ? [...data.assignments.map(fromAssignment), ...EXTRA] : []
  return [...moodle, ...MANUAL, ...state.added].map((d) => ({ ...d, ...state.patches[d.id] }))
}

export type Urgency = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'done'

export const URGENCY_TITLES: Record<Urgency, string> = {
  overdue: 'Overdue',
  today: 'Due today',
  tomorrow: 'Due tomorrow',
  week: 'This week',
  later: 'Later',
  done: 'Done',
}

const at = (s: string) => wallOf(`${s}:00`)

export const isDone = (d: DueItem) =>
  d.status === 'submitted' || d.status === 'graded' || d.status === 'done'

export function urgencyOf(d: DueItem, now: WallTime): Urgency {
  if (isDone(d)) return 'done'
  const due = at(d.dueAt)
  if (minutesUntil(now, due) < 0) return 'overdue'
  const days = daysBetween(now.date, due.date)
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days < 7) return 'week'
  return 'later'
}

/** 'open' | late work still accepted | Campus Virtual takes nothing more */
export function cutoffOf(d: DueItem, now: WallTime): 'open' | 'late-ok' | 'closed' {
  if (minutesUntil(now, at(d.dueAt)) >= 0) return 'open'
  if (d.kind === 'quiz') return 'closed'
  if (!d.cutoffAt) return 'late-ok'
  return minutesUntil(now, at(d.cutoffAt)) >= 0 ? 'late-ok' : 'closed'
}

export function minutesToDue(d: DueItem, now: WallTime) {
  return minutesUntil(now, at(d.dueAt))
}

export const dueWall = (d: DueItem) => at(d.dueAt)

/** The one line under a deadline's name: what Moodle says, or what's left to do. */
export function statusLine(d: DueItem): string {
  switch (d.kind) {
    case 'assign':
      return d.status === 'todo'
        ? 'No submission yet'
        : d.status === 'draft'
          ? 'Draft, not submitted for grading'
          : d.status === 'submitted'
            ? 'Submitted for grading'
            : `Graded${d.grade ? `: ${d.grade}` : ''}`
    case 'quiz': {
      const q = d.quiz!
      if (d.status === 'graded') return `Finished: ${q.bestGrade ?? d.grade ?? ''}`
      const left = q.attemptsAllowed - q.attemptsUsed
      return q.attemptsUsed === 0
        ? `${q.questions} questions, ${q.timeLimit} min`
        : `Best so far ${q.bestGrade}, ${left} ${left === 1 ? 'attempt' : 'attempts'} left`
    }
    case 'forum': {
      const mine = d.forum!.posts.filter((p) => p.you).length
      return mine >= d.forum!.required ? 'You posted' : `${d.forum!.required - mine} post needed`
    }
    case 'manual':
      return d.status === 'done' ? 'Done' : 'Added by you'
  }
}

/* ── Course pages (made up content around the real subjects) ─────────────────────────────── */

export interface CourseFile {
  name: string
  size: string
}

export interface CourseSection {
  title: string
  summary?: string
  files: CourseFile[]
  /** Due items in this section, by id. */
  activities: string[]
}

export function courseSections(short: string): CourseSection[] {
  const slides = (n: number) => ({
    name: `Course ${n} slides.pdf`,
    size: `${(1.4 + n / 10).toFixed(1)} MB`,
  })
  const byCourse: Record<string, string[]> = {
    SSV: ['a106', 'a101', 'q32'],
    MSA: ['a102', 'f41'],
    CAD: ['q33', 'a103'],
    MER: ['q31', 'a104'],
    VVHS: ['a105'],
  }
  const acts = byCourse[short] ?? []
  return [
    {
      title: 'General',
      summary: 'Course rules, the syllabus and announcements.',
      files: [
        { name: 'Syllabus 2026-2027.pdf', size: '220 KB' },
        { name: 'Grading rules.pdf', size: '96 KB' },
      ],
      activities: [],
    },
    {
      title: 'Week 8, 16 to 20 November',
      files: [slides(8)],
      activities: acts.filter((id) => ['a106', 'q33', 'a105'].includes(id)),
    },
    {
      title: 'Week 9, 23 to 27 November',
      summary: 'This week',
      files: [slides(9), { name: 'Lab 9 handout.pdf', size: '640 KB' }],
      activities: acts.filter((id) => !['a106', 'q33', 'a105', 'a104'].includes(id)),
    },
    {
      title: 'Week 10, 30 November to 4 December',
      files: [slides(10)],
      activities: acts.filter((id) => id === 'a104'),
    },
  ]
}
