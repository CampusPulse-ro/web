/**
 * Prototype B, "Day spine": the day as one calm vertical line. Blocks are sized by their length, gaps
 * are visible and say what they're good for, and the now-line moves down the spine, filling the part
 * of the day already lived. Served at /prototype (see ../README.md).
 */
import './theme.css'
import { domMax, LazyMotion, MotionConfig } from 'motion/react'
import { Component, useEffect, useMemo, useState, type ReactNode } from 'react'
import { initialStart, useDemoClock } from '../clock'
import { useDemoData } from '../data'
import { vars } from './css'
import { DemoControl } from './Demo'
import { DetailHost } from './Detail'
import { subjectsOf } from './model'
import { Shell } from './Shell'
import { ProtoContext, useIsWide } from './state'

export default function DaySpinePrototype() {
  useEffect(() => {
    const title = document.title
    document.title = 'Day spine, a CampusPulse prototype'
    return () => {
      document.title = title
    }
  }, [])
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        <Boundary>
          <Root />
        </Boundary>
      </MotionConfig>
    </LazyMotion>
  )
}

function Root() {
  const data = useDemoData()
  const [start, setStart] = useState(() => initialStart())
  const now = useDemoClock(start)
  const wide = useIsWide()
  const [playing, setPlaying] = useState(false)
  const [origin, setOrigin] = useState<string | null>(null)
  const subjects = useMemo(() => (data ? subjectsOf(data.timetable) : null), [data])

  return (
    <div
      className="b-root"
      style={playing ? vars({ '--b-glide': '110ms', '--b-glide-ease': 'linear' }) : undefined}
    >
      {data && subjects ? (
        <ProtoContext.Provider
          value={{ data, subjects, now, start, wide, playing, origin, setOrigin }}
        >
          <Shell />
          <DetailHost />
        </ProtoContext.Provider>
      ) : (
        <Skeleton wide={wide} />
      )}
      <DemoControl
        start={start}
        setStart={setStart}
        now={now}
        playing={playing}
        setPlaying={setPlaying}
        wide={wide}
      />
    </div>
  )
}

/** The shape of a day while the data loads; shown only if loading takes a moment. */
function Skeleton({ wide }: { wide: boolean }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setShow(true), 200)
    return () => window.clearTimeout(t)
  }, [])
  if (!show) return null
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className={wide ? 'max-w-md px-6 pt-20' : 'px-5 pt-8'}
    >
      <div className="b-skeleton h-8 w-40 rounded-md" />
      <div className="b-skeleton mt-3 h-4 w-56 rounded-md" />
      <div className="relative mt-10 h-96">
        <div className="absolute top-0 bottom-0 left-[59px] w-0.5 bg-raised" />
        {[0, 128, 256].map((top) => (
          <div
            key={top}
            className="b-skeleton absolute right-3 left-[60px] h-[116px] rounded-r-xl"
            style={{ top }}
          />
        ))}
      </div>
    </div>
  )
}

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="b-root px-6 pt-16">
        <p className="text-heading text-ink">The demo data didn&rsquo;t load.</p>
        <p className="mt-1 text-body text-ink-muted">{this.state.error.message}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 min-h-12 rounded-full bg-accent px-6 text-label text-on-accent"
        >
          Try again
        </button>
      </div>
    )
  }
}
