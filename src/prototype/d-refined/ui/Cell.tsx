import { Icon } from '../icons'
import { classKind, hhmm, KIND_ICON, kindOf, shortOf, type Cls } from '../model'

/**
 * What a calendar cell says: short name and kind mark, room, and (when there's room) the kind and
 * start. It is drawn inside the moving cell, so it travels with it.
 */
export function CellText({ c, compact, height }: { c: Cls; compact: boolean; height: number }) {
  const kind = classKind(c)
  const long = (c.o.room?.length ?? 0) > 6
  return (
    <>
      <span className="flex items-start justify-between gap-1">
        <span className="t-label-l t-e t-narrow block truncate" style={{ lineHeight: '18px' }}>
          {shortOf(c.o)}
        </span>
        {!compact && (
          <Icon name={KIND_ICON[kind]} size={16} className="mt-0.5 flex-none opacity-90" />
        )}
      </span>
      <span
        className="t-label-m block truncate font-medium"
        // Long codes (OROLOGERIE) on the phone: Roboto Flex only narrows much at a display
        // optical size, so ask for one; short codes keep the normal cut
        style={
          compact && long
            ? {
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 0,
                fontVariationSettings: "'wdth' 25, 'opsz' 40",
              }
            : { fontStretch: '78%' }
        }
      >
        {c.o.room}
      </span>
      {!compact && height > 70 && (
        <span className="t-label-s block truncate" style={{ opacity: 0.9 }}>
          {kindOf(c)}, {hhmm(c.start)}
        </span>
      )}
      {compact && height > 84 && (
        <span className="t-label-s t-narrow block truncate" style={{ opacity: 0.9 }}>
          {kindOf(c)}
        </span>
      )}
      {compact && (
        <Icon name={KIND_ICON[kind]} size={13} className="absolute right-1 bottom-1 opacity-90" />
      )}
    </>
  )
}

/** The same class as the class panel's header: the cell, grown up. */
export function CellHeaderText({ c }: { c: Cls }) {
  const kind = classKind(c)
  return (
    <>
      <span className="flex items-start justify-between gap-3">
        <span className="t-headline-s t-narrow font-semibold">{shortOf(c.o)}</span>
        <span className="t-label-l flex flex-none items-center gap-1.5 pt-1">
          <Icon name={KIND_ICON[kind]} size={18} />
          {kindOf(c)}
        </span>
      </span>
      <span className="t-title-m mt-1 block">{c.o.subject}</span>
      <span className="t-body-m tnum mt-1 block" style={{ opacity: 0.9 }}>
        {hhmm(c.start)} to {hhmm(c.end)}, room{' '}
        <span className="t-narrow font-semibold">{c.o.room ?? 'not set'}</span>
      </span>
    </>
  )
}
