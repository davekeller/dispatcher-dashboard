import type { ReactNode } from 'react'
import { projectedEta } from '../../hos/compute'
import { WINDOW_14H_MIN } from '../../hos/constants'
import { fmtClock } from '../../lib/format'
import type { DriverView } from '../../store/view'
import { MIN } from '../../time/clock'

/** One time axis for the ribbon and the duty timeline: route start to the latest of window
 *  end, the limit, the 14-hour mark, and now, plus a little air. */
export function ribbonAxis(view: DriverView): { start: number; end: number; pct: (t: number) => number } {
  const start = view.route.plannedStartAt
  const window14 = view.driver.shiftStartedAt + WINDOW_14H_MIN * MIN
  const end = Math.max(view.route.windowEnd, view.limitHitAt, window14, view.now) + 20 * MIN
  return { start, end, pct: (t) => Math.max(0, Math.min(100, ((t - start) / (end - start)) * 100)) }
}

function Label({ at, children, className = '', below = false }: { at: number; children: ReactNode; className?: string; below?: boolean }) {
  return (
    <span className={`tnum absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold ${below ? 'bottom-0' : 'top-0'} ${className}`} style={{ left: `${at}%` }}>
      {children}
    </span>
  )
}

/** Stops as ticks on a time axis, filled through the last completed stop, with the now-line,
 *  the limit mark at limitHitAt, and the window end. If the last pending tick sits past the
 *  limit mark, the span between is hatched, and wont_finish is the rule that fires, on the
 *  same math. */
export default function RouteRibbon({ view }: { view: DriverView }) {
  const { route, now, driftMin, limitHitAt } = view
  const { pct } = ribbonAxis(view)
  const done = route.stops.filter((s) => s.status === 'done' || s.status === 'failed')
  const filledTo = done.length > 0 ? (done[done.length - 1].departedAt ?? route.plannedStartAt) : route.plannedStartAt
  const ticks = route.stops.map((s) => ({
    s,
    t: s.status === 'done' || s.status === 'failed' ? (s.departedAt ?? s.plannedEta) : s.status === 'in_progress' ? (s.arrivedAt ?? now) : projectedEta(s, driftMin),
  }))
  const lastPending = [...ticks].reverse().find((k) => k.s.status === 'pending')
  const overrunTo = lastPending !== undefined && lastPending.t > limitHitAt ? lastPending.t : undefined
  const window14 = view.driver.shiftStartedAt + WINDOW_14H_MIN * MIN
  const stale = view.staleness !== 'fresh'

  return (
    <div>
      <div className="mb-1 flex items-center gap-3 text-[11px]">
        <span className="font-semibold uppercase tracking-wide text-label">Route ribbon</span>
        <span className="text-muted">ticks are stops · filled through the last completed · pending ETAs include today's drift</span>
      </div>
      <div className="relative h-14">
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 56" preserveAspectRatio="none" aria-hidden="true">
          <rect x="0" y="24" width="1000" height="8" rx="4" className="fill-well" />
          <rect x="0" y="24" width={pct(filledTo) * 10} height="8" rx="4" className="fill-clear-fill" />
          {overrunTo !== undefined && (
            <rect x={pct(limitHitAt) * 10} y="24" width={Math.max(0, (pct(overrunTo) - pct(limitHitAt)) * 10)} height="8" className="fill-act-now-fill" opacity="0.55" />
          )}
          {ticks.map(({ s, t }) => (
            <rect
              key={s.id}
              x={pct(t) * 10 - 1.5}
              y={s.status === 'unassigned' ? 26 : 20}
              width="3"
              height={s.status === 'unassigned' ? 4 : 16}
              className={s.status === 'unassigned' ? 'fill-offline-fill' : s.status === 'pending' ? 'fill-muted' : s.status === 'failed' ? 'fill-act-now' : 'fill-ink'}
            />
          ))}
          <rect x={pct(now) * 10 - 1} y="8" width="2" height="40" className="fill-ink" />
          <rect x={pct(limitHitAt) * 10 - 1} y="8" width="2" height="40" className="fill-act-now" />
          <rect x={pct(route.windowEnd) * 10 - 0.5} y="14" width="1" height="28" className="fill-muted" opacity="0.6" />
          <rect x={pct(window14) * 10 - 0.5} y="14" width="1" height="28" className="fill-muted" opacity="0.35" />
        </svg>
        <Label at={pct(now)} className="text-ink">now {fmtClock(now)}</Label>
        <Label at={pct(limitHitAt)} className="text-act-now" below>{stale ? '~' : ''}limit {fmtClock(limitHitAt)}</Label>
        <Label at={pct(route.windowEnd)} className="text-muted">window {fmtClock(route.windowEnd)}</Label>
        <Label at={pct(window14)} className="text-muted/70" below>14h</Label>
      </div>
    </div>
  )
}
