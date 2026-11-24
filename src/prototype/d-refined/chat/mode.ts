/**
 * Examiner is the default. The coach switch appears only after the page was opened once with
 * `?chat=coach` (remembered on this browser), so a visitor never stumbles into the rehearsal mode.
 */
export type ChatMode = 'examiner' | 'coach'

const UNLOCK_KEY = 'cx-d-chat-coach'
const MODE_KEY = 'cx-d-chat-mode'

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage blocked (private window): the choice lasts for this page only
  }
}

function launch(search: string): { unlocked: boolean; mode: ChatMode } {
  const asked = new URLSearchParams(search).get('chat') === 'coach'
  if (asked) {
    write(UNLOCK_KEY, '1')
    write(MODE_KEY, 'coach')
  }
  const unlocked = asked || read(UNLOCK_KEY) === '1'
  return { unlocked, mode: unlocked && read(MODE_KEY) === 'coach' ? 'coach' : 'examiner' }
}

/** Read once, when the prototype loads: its links drop unknown query parameters right away. */
export const launchMode = launch(window.location.search)

export function saveMode(mode: ChatMode) {
  write(MODE_KEY, mode)
}
