import type { DutyStatus } from '../../data/types'
import { knownSegments } from '../../hos/compute'
import type { DriverView } from '../../store/view'
import { MIN } from '../../time/clock'

const FILL: Record<DutyStatus, string> = { driving: 'fill-ink', on_duty: 'fill-muted', on_break: 'fill-break-fill', off_duty: 'fill-offline-fill' }

/** Today's duty as a slim bar from the start of the shift to now: driving, on duty, break,
 *  and a planned reset dashed at the end. Segments are the ones known at the last ping. */
export default function DutyBar({ view, className = '' }: { view: DriverView; className?: string }) {
  const start = view.driver.shiftStartedAt
  const end = Math.max(view.now, (view.plannedResetAt ?? 0) + 30 * MIN)
  const pct = (t: number) => Math.max(0, Math.min(100, ((t - start) / (end - start)) * 100))
  const segs = knownSegments(view.driver, view.now)
  return (
    <div className={className}>
      <div className="mb-1 flex items-center gap-2 text-[10px]">
        <span className="font-semibold uppercase tracking-wide text-label">Duty today</span>
        <span className="text-muted">driving · on duty · break · planned reset (dashed)</span>
      </div>
      <svg className="h-2.5 w-full" viewBox="0 0 1000 10" preserveAspectRatio="none" aria-hidden="true">
        <rect x="0" y="1" width="1000" height="8" rx="2" className="fill-well" />
        {segs.map((s, i) => {
          const s0 = Math.max(s.startedAt, start)
          const s1 = Math.min(s.endedAt ?? view.now, end)
          if (s1 <= s0) return null
          return <rect key={i} x={pct(s0) * 10} y="1" width={(pct(s1) - pct(s0)) * 10} height="8" className={FILL[s.status]} opacity={s.planned ? 0.45 : 1} strokeDasharray={s.planned ? '6 4' : undefined} stroke={s.planned ? 'currentColor' : 'none'} strokeWidth={s.planned ? 2 : 0} />
        })}
        <rect x={pct(view.now) * 10 - 1} y="0" width="2" height="10" className="fill-ink" />
      </svg>
    </div>
  )
}
