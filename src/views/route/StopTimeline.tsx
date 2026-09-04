import type { ReactNode } from 'react'
import type { Delivery, Stop } from '../../data/types'
import { projectedEta } from '../../hos/compute'
import { fmtClock, fmtMinutes } from '../../lib/format'
import { suggestResetStop } from '../../store/actions'
import type { DriverView } from '../../store/view'
import StopReceipt from './StopReceipt'

type Row =
  | { kind: 'stop'; stop: Stop; pastLimit: boolean }
  | { kind: 'now' }
  | { kind: 'limit'; afterRoute: boolean }
  | { kind: 'complete' }

/** The stops on a vertical spine: one node per stop, a "now" marker between the last stop
 *  reached and the next, and the 11-hour limit marked where it lands among the remaining
 *  stops. Past the limit the spine turns red, so the won't-finish case is visible as red
 *  nodes below the line. The spine is one row per stop, not proportional to time; the
 *  times on each node and the drift chip carry the behind-or-ahead read. */
export default function StopTimeline({ view, deliveryById, selected, onToggle }: { view: DriverView; deliveryById: Map<string, Delivery>; selected: string[]; onToggle: (id: string) => void }) {
  const stops = view.route.stops
  const nowIndex = stops.findIndex((s) => s.status === 'pending' || s.status === 'unassigned')
  const over = view.minutesUntilLimit <= 0
  const reachable = suggestResetStop(view) // last remaining stop the driver can still reach before the limit
  const lastRemaining = view.remaining[view.remaining.length - 1]?.id
  const rows: Row[] = []
  let pastLimit = false
  stops.forEach((s, i) => {
    if (i === nowIndex) {
      rows.push({ kind: 'now' })
      if (view.remaining.length > 0 && (over || reachable === null)) {
        rows.push({ kind: 'limit', afterRoute: false })
        pastLimit = true
      }
    }
    rows.push({ kind: 'stop', stop: s, pastLimit: pastLimit && s.status !== 'done' && s.status !== 'failed' })
    if (!over && reachable !== null && s.id === reachable) {
      if (reachable === lastRemaining) rows.push({ kind: 'limit', afterRoute: true })
      else {
        rows.push({ kind: 'limit', afterRoute: false })
        pastLimit = true
      }
    }
  })
  if (nowIndex === -1) rows.push({ kind: 'complete' })

  return (
    <ol className="flex flex-col">
      {rows.map((row, i) => {
        const last = i === rows.length - 1
        if (row.kind === 'stop') {
          const s = row.stop
          const delivery = deliveryById.get(s.deliveryId)
          const time = s.status === 'done' || s.status === 'failed' ? s.departedAt : s.status === 'in_progress' ? s.arrivedAt : s.status === 'pending' ? projectedEta(s, view.driftMin) : undefined
          const late = s.status === 'pending' && delivery !== undefined && time !== undefined && time > delivery.window.end
          const dot =
            s.status === 'done' ? 'bg-ink' : s.status === 'failed' ? 'bg-act-now' : s.status === 'in_progress' || view.next?.id === s.id ? 'border-2 border-break bg-panel' : s.status === 'unassigned' ? 'border-2 border-dashed border-offline bg-panel' : row.pastLimit ? 'border-2 border-act-now bg-panel' : 'border-2 border-line bg-panel'
          return (
            <SpineRow key={s.id} time={time !== undefined ? fmtClock(time) : '—'} timeTone={late ? 'text-watch' : s.status === 'done' ? 'text-muted' : 'text-ink'} dot={dot} line={row.pastLimit ? 'bg-act-now/60' : 'bg-line'} last={last}>
              <StopReceipt stop={s} delivery={delivery} view={view} selected={selected.includes(s.id)} onToggle={() => onToggle(s.id)} pastLimit={row.pastLimit} />
            </SpineRow>
          )
        }
        if (row.kind === 'now') {
          const next = view.next
          const doing = view.status === 'on_break' ? 'on break' : view.status === 'off_duty' ? 'off duty' : next?.status === 'in_progress' ? `at stop ${next.seq}` : next ? `driving to stop ${next.seq}` : 'heading in'
          return (
            <SpineRow key="now" time={fmtClock(view.now)} timeTone="text-ink font-semibold" dot="bg-ink ring-4 ring-ink/15" line={pastLimit ? 'bg-act-now/60' : 'bg-line'} last={last}>
              <div className="flex h-7 items-center gap-2 text-[12px] font-semibold text-ink"><span className="h-px flex-1 bg-ink/40" />now · {doing}<span className="h-px flex-1 bg-ink/40" /></div>
            </SpineRow>
          )
        }
        if (row.kind === 'limit') {
          const label = over ? `over the 11-hour limit by ${fmtMinutes(-view.minutesUntilLimit)}` : row.afterRoute ? `11-hour limit lands after the route · ${fmtClock(view.limitHitAt)}` : `11-hour limit lands here · ${fmtClock(view.limitHitAt)}`
          const tone = row.afterRoute ? 'text-muted' : 'text-act-now'
          return (
            <SpineRow key={`limit-${i}`} time="" timeTone="" dot={row.afterRoute ? 'bg-muted' : 'bg-act-now'} line={row.afterRoute ? 'bg-line' : 'bg-act-now/60'} last={last}>
              <div className={`flex h-7 items-center gap-2 text-[12px] font-semibold ${tone}`}><span className={`h-px flex-1 ${row.afterRoute ? 'bg-line' : 'bg-act-now/50'}`} />{label}<span className={`h-px flex-1 ${row.afterRoute ? 'bg-line' : 'bg-act-now/50'}`} /></div>
            </SpineRow>
          )
        }
        return (
          <SpineRow key="complete" time={fmtClock(view.now)} timeTone="text-ink font-semibold" dot="bg-clear-fill" line="bg-line" last>
            <div className="flex h-7 items-center gap-2 text-[12px] font-semibold text-clear"><span className="h-px flex-1 bg-clear/40" />route complete · heading in<span className="h-px flex-1 bg-clear/40" /></div>
          </SpineRow>
        )
      })}
    </ol>
  )
}

function SpineRow({ time, timeTone, dot, line, last, children }: { time: string; timeTone: string; dot: string; line: string; last: boolean; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[4.25rem_1rem_1fr] gap-x-2">
      <span className={`tnum pt-2.5 text-right text-[11px] ${timeTone}`}>{time}</span>
      <span className="relative flex justify-center" aria-hidden="true">
        {!last && <span className={`absolute top-4 bottom-0 w-0.5 ${line}`} />}
        <span className={`relative mt-2.5 h-3 w-3 shrink-0 rounded-full ${dot}`} />
      </span>
      <div className="pb-2">{children}</div>
    </li>
  )
}
