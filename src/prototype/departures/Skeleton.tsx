/** A first-load skeleton shaped like the screen it stands in for (never a spinner). */
export function Skeleton({ phone }: { phone: boolean }) {
  const rows = (
    <div className="dp-skel-rows">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="dp-skel-row">
          <span className="dp-skel dp-skel-time" />
          <span className="dp-skel dp-skel-line" />
          <span className="dp-skel dp-skel-room" />
        </div>
      ))}
    </div>
  )
  return (
    <div className={phone ? 'dp-skeleton dp-skeleton-phone' : 'dp-skeleton'} aria-busy="true">
      <span className="dp-sr">Loading your day</span>
      {phone ? (
        <>
          <div className="dp-skel dp-skel-strip" />
          <div className="dp-skel dp-skel-title" />
          <div className="dp-skel dp-skel-hero" />
          {rows}
        </>
      ) : (
        <div className="dp-skel-desk">
          <div>
            <div className="dp-skel dp-skel-title" />
            <div className="dp-skel dp-skel-hero" />
            {rows}
          </div>
          <div className="dp-skel dp-skel-grid" />
        </div>
      )}
    </div>
  )
}
