/**
 * Demo data for the UI prototypes: a real snapshot of one student's timetable (CTI-EN, year 4,
 * group 2.1, weeks 9–10) and of every room's week (Mon 23 – Fri 27 Nov 2026), taken from the stage
 * API, plus made-up Campus Virtual assignments. It sits in `public/prototype-data/` and is fetched at
 * run time, so the prototypes need no sign-in and no API. The shapes are the API's own (`schema.d.ts`).
 */
import { useEffect, useState } from 'react'
import type { components } from '../api/schema'

export type Timetable = components['schemas']['TimetableResponse']
export type Occurrence = components['schemas']['OccurrenceResponse']
export type Room = components['schemas']['RoomResponse']
export type RoomTimetable = components['schemas']['RoomTimetableResponse']
export type RoomOccurrence = components['schemas']['RoomOccurrenceResponse']
export type Semester = components['schemas']['SemesterResponse']

/** Made up for the prototypes; the app reads the real ones from Campus Virtual on the device. */
export interface Assignment {
  id: number
  course: string
  shortName: string
  name: string
  /** ISO 8601 with offset. */
  dueAt: string
  cutoffAt: string | null
  status: 'notsubmitted' | 'draft' | 'submitted' | 'graded'
  submittedAt?: string
  grade?: string
  maxFiles: number
  maxBytes: number
  fileTypes: string[]
  wordLimit: number | null
}

export interface DemoData {
  timetable: Timetable
  rooms: Room[]
  semester: Semester
  assignments: Assignment[]
  /** Room code → `YYYY-MM-DD` → that room's day (Mon 23 – Fri 27 Nov only). */
  roomTimetables: Record<string, Record<string, RoomTimetable>>
}

async function load<T>(name: string): Promise<T> {
  const res = await fetch(`/prototype-data/${name}.json`)
  if (!res.ok) throw new Error(`prototype data ${name}: HTTP ${res.status}`)
  return (await res.json()) as T
}

let cache: Promise<DemoData> | null = null

export function loadDemoData(): Promise<DemoData> {
  cache ??= Promise.all([
    load<Timetable>('timetable'),
    load<Room[]>('rooms'),
    load<Semester>('semester'),
    load<{ assignments: Assignment[] }>('assignments'),
    load<Record<string, Record<string, RoomTimetable>>>('room-timetables'),
  ]).then(([timetable, rooms, semester, a, roomTimetables]) => ({
    timetable,
    rooms,
    semester,
    assignments: a.assignments,
    roomTimetables,
  }))
  return cache
}

/** The demo data, or null while it loads. Throws to the nearest error boundary if it can't load. */
export function useDemoData(): DemoData | null {
  const [data, setData] = useState<DemoData | null>(null)
  const [error, setError] = useState<Error | null>(null)
  useEffect(() => {
    loadDemoData().then(setData, (e: unknown) =>
      setError(e instanceof Error ? e : new Error(String(e))),
    )
  }, [])
  if (error) throw error
  return data
}

/** The classes on one day, in time order. */
export function classesOn(timetable: Timetable, date: string): Occurrence[] {
  return timetable.occurrences
    .filter((o) => o.date === date)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
}

/** Rooms have no building in the data; the code's prefix is the best guess (B528A → B, 303CP → CP). */
export function buildingOf(code: string): string {
  if (/^\d+CP$/.test(code)) return 'CP'
  const m = /^([A-Z]+)\d/.exec(code)
  return m ? m[1] : code
}
