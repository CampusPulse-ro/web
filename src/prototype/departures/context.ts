import { createContext, useContext } from 'react'
import type { WallTime } from '../clock'
import type { DemoData, Occurrence } from '../data'
import type { Deadline } from './model'
import type { Nav } from './nav'

/** The Rooms filter. `near` comes from a break row: rooms in one code group, free until a time. */
export interface RoomFilter {
  mode: 'now' | 'at' | 'all'
  /** Minutes from midnight, for "Free at…". */
  at: number
  /** A day other than today (when today has no room schedule in the snapshot). */
  date: string | null
  near: { group: string; room: string; until: number } | null
  query: string
}

export interface AppState {
  data: DemoData
  now: WallTime
  today: string
  phone: boolean
  nav: Nav
  go: (patch: Partial<Nav>, opts?: { replace?: boolean }) => void
  deadlines: Deadline[]
  roomFilter: RoomFilter
  setRoomFilter: (f: RoomFilter) => void
  /** The day the Today board shows. */
  selectedDay: string
  selectDay: (date: string) => void
  openClass: (o: Occurrence) => void
  openRoom: (code: string, date?: string | null) => void
  openDue: (id: number) => void
  /** Closes an overlay, going back in history if opening it pushed an entry. */
  close: (what: 'cls' | 'due' | 'room') => void
  /** Rooms filtered to a break: free near a room until a time. */
  roomsNear: (room: string, until: number) => void
}

export const AppContext = createContext<AppState | null>(null)

export function useApp(): AppState {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp outside the prototype')
  return ctx
}
