/** Extracts 1-2 uppercase letters from the student's name for their avatar. */
export function getInitials(name: string): string {
  const trimmed = name.trim()

  if (!trimmed) return '?'

  const parts = trimmed.split(/\s+/).filter(Boolean)

  if (parts.length === 0) return '?'

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
