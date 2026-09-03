import type { DutyStatus } from '../../data/types'
import { knownSegments } from '../../hos/compute'
import type { DriverView } from '../../store/view'
import { ribbonAxis } from './RouteRibbon'

const FILL: Record<DutyStatus, string> = { driving: 'fill-ink', on_duty: 'fill-muted', on_break: 'fill-break-fill', off_duty: 'fill-offline-fill' }

/** Today's segments as we know them (segmentsKnownAt the last ping), on the ribbon's axis.
 *  A planned reset draws dashed and ahead of the now-line. */
export default function DutyTimeline({ view, className = '' }: { view: DriverView; className?: string }) {
  const { start, end, pct } = ribbonAxis(view)
  const segs = knownSegments(view.driver, view.now)
  return (
    <div className={className}>
      <div className="mb-1 text-[11px]">
        <span className="font-semibold uppercase tracking-wide text-label">Duty timeline</span>{' '}
        <span className="text-muted">driving · on duty · break · planned reset (dashed)</span>
      </div>
      <svg className="h-4 w-full" viewBox="0 0 1000 16" preserveAspectRatio="none" aria-hidden="true">
        <rect x="0" y="4" width="1000" height="8" rx="2" className="fill-well" />
        {segs.map((s, i) => {
          const s0 = Math.max(s.startedAt, start)
          const s1 = Math.min(s.endedAt ?? view.now, end)
          if (s1 <= s0) return null
          return <rect key={i} x={pct(s0) * 10} y="4" width={(pct(s1) - pct(s0)) * 10} height="8" className={FILL[s.status]} opacity={s.planned ? 0.45 : 1} strokeDasharray={s.planned ? '6 4' : undefined} stroke={s.planned ? 'currentColor' : 'none'} strokeWidth={s.planned ? 2 : 0} />
        })}
        <rect x={pct(view.now) * 10 - 1} y="0" width="2" height="16" className="fill-ink" />
      </svg>
    </div>
  )
}
