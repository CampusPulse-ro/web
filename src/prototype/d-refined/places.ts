/**
 * Where a room is: its building (and floor when the code says it), so a first-year student can find
 * it. The real building data is being researched (api #66); this is a small made-up mapping for
 * the rooms in the demo data, with plausible names. No availability, on purpose: the timetable only
 * covers one faculty, so a room's "free" or "in use" can't be known.
 */

export interface Building {
  id: string
  name: string
  /** For Maps. */
  address: string
}

const BUILDINGS: Record<string, Building> = {
  ac: {
    id: 'ac',
    name: 'Automation and Computers building',
    address: 'Bulevardul Vasile Pârvan 2, Timișoara',
  },
  el: {
    id: 'el',
    name: 'Electronics building',
    address: 'Bulevardul Vasile Pârvan 2B, Timișoara',
  },
  mec: {
    id: 'mec',
    name: 'Mechanics building',
    address: 'Bulevardul Mihai Viteazu 1, Timișoara',
  },
  ctr: {
    id: 'ctr',
    name: 'Civil Engineering building',
    address: 'Strada Traian Lalescu 2, Timișoara',
  },
  mpt: {
    id: 'mpt',
    name: 'Management building',
    address: 'Strada Remus 14, Timișoara',
  },
}

export interface Place {
  room: string
  building: Building
  /** "5th floor", "ground floor", or null when the code doesn't say. */
  floor: string | null
}

const ordinal = (n: number) =>
  n === 0 ? 'ground floor' : `${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'} floor`

/** The building and floor of a room code, or null for a room this demo doesn't place. */
export function placeOf(room: string | null): Place | null {
  if (!room) return null
  let m = /^(\d)\d\dCP$/.exec(room)
  if (m) return { room, building: BUILDINGS.ac, floor: ordinal(+m[1]) }
  m = /^A(\d)\d\d[A-Z]?$/.exec(room)
  if (m) return { room, building: BUILDINGS.ac, floor: ordinal(+m[1]) }
  m = /^B(\d)\d\d[A-Z]?$/.exec(room)
  if (m) return { room, building: BUILDINGS.el, floor: ordinal(+m[1]) }
  if (room === 'OROLOGERIE') return { room, building: BUILDINGS.mec, floor: 'ground floor' }
  if (/^P\d+/.test(room)) return { room, building: BUILDINGS.ctr, floor: null }
  if (room === 'MPT') return { room, building: BUILDINGS.mpt, floor: null }
  return null
}

/** Opens Maps (the app on a phone) at the building. */
export function directionsUrl(p: Place): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.building.address)}`
}
