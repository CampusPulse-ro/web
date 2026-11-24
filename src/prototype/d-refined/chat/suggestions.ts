/** Questions to start from, per screen. The first one works everywhere. */
import type { ChatMode } from './mode'

const FIRST = 'What am I looking at, and how is it built?'

const EXAMINER: Record<string, string[]> = {
  Today: [
    'Where does today’s timetable come from?',
    'How does the app know which class is on now and what comes next?',
    'How would this screen hold up with every UPT student using it?',
  ],
  Week: [
    'How is the week built from the API’s timetable data?',
    'How does the timetable cache work?',
    'What happens when the faculty changes the timetable?',
  ],
  'Class detail': [
    'Where do this class’s room and teacher come from?',
    'How do class reminders work?',
    'Is this class fetched live or from a cache?',
  ],
  Deadlines: [
    'How are deadlines synced from Campus Virtual?',
    'Where are deadlines I add myself stored?',
    'What here is built, and what exists only in the prototype?',
  ],
  'Deadline detail': [
    'How would submitting this assignment work?',
    'How does the app talk to Campus Virtual, and is that safe?',
    'Is the student’s Campus Virtual token stored on the server?',
  ],
  Courses: ['Where does the course list come from?', 'How are courses linked to Campus Virtual?'],
  'Course detail': [
    'Where does this course’s information come from?',
    'How is this course’s Campus Virtual page found?',
  ],
  Profile: [
    'How are accounts and sessions stored?',
    'How does linking a UPT account work?',
    'What happens when a student deletes their account?',
  ],
  'Sign in': [
    'How does sign-in work, step by step?',
    'How are sign-in codes sent and checked?',
    'What does signing in with UPT do?',
  ],
}

const COACH = [
  'Explain how this screen gets its data, simply.',
  'Drill me on this part of the system.',
  'What would the TA ask me about this screen?',
]

export function suggestionsFor(screen: string, mode: ChatMode): string[] {
  return [FIRST, ...(mode === 'coach' ? COACH : (EXAMINER[screen] ?? []))]
}
