import type { CSSProperties } from 'react'
import { completedStopLightWeight, miniTimelineLayout } from '../../lib/routeTimeline'
import { stopsPastLimit } from '../../store/actions'
import type { DriverView } from '../../store/view'

function nodeTone(status: string, needsAttention: boolean): string {
  if (status === 'failed') return 'bg-act-now-fill'
  if (status === 'done') return 'route-history-node'
  if (status === 'unassigned') return 'border border-dashed border-offline bg-panel'
  if (needsAttention) return 'border border-act-now bg-panel'
  return 'border border-muted/70 bg-panel'
}

function nodeSize(status: string): string {
  return status === 'done' ? 'h-[5px] w-[5px]' : 'h-1.5 w-1.5'
}

/** The route-detail stop spine reduced to its visual essentials. It occupies the full
 * left edge of a board card. Stops keep one uniform reverse-route scale so the work left
 * is at the top; completed deliveries recede into smaller connective nodes below it. */
export default function RouteTimelineMini({ view }: { view: DriverView }) {
  const stops = view.route.stops
  const layout = miniTimelineLayout(stops.map((stop) => stop.status))
  const pastLimitIds = new Set(stopsPastLimit(view))
  const lateIds = new Set(view.lateStops.map((stop) => stop.id))
  const firstPastIndex = stops.findIndex((stop) => pastLimitIds.has(stop.id))
  const lastCompleteIndex = stops.reduce((last, stop, index) => stop.status === 'done' || stop.status === 'failed' ? index : last, -1)
  const position = (index: number) => layout.positions[index] ?? 50
  const completeFrom = lastCompleteIndex < 0 ? 95 : position(lastCompleteIndex)
  const pastLimitThrough = firstPastIndex < 0 ? 5 : position(firstPastIndex)

  return (
    <div className="relative isolate w-6 shrink-0 self-stretch border-r border-line/70 bg-canvas/50 py-2.5" aria-label={`Route timeline: ${view.done} of ${view.total} stops complete${pastLimitIds.size > 0 ? `, ${pastLimitIds.size} stops past HOS` : ''}.`}>
      <div className="relative h-full">
      <span className="absolute bottom-[5%] left-1/2 top-[5%] w-px -translate-x-1/2 bg-line" aria-hidden="true" />
      {lastCompleteIndex >= 0 && <span className="route-history-progress absolute bottom-[5%] left-1/2 w-px -translate-x-1/2" style={{ top: `${completeFrom}%` }} aria-hidden="true" />}
      {firstPastIndex >= 0 && <span className="absolute left-1/2 top-[5%] w-px -translate-x-1/2 bg-act-now-fill/70" style={{ bottom: `${100 - pastLimitThrough}%` }} aria-hidden="true" />}
      {firstPastIndex >= 0 && <span className="absolute left-1/2 z-10 h-px w-4 -translate-x-1/2 bg-act-now-fill" style={{ top: `${pastLimitThrough}%` }} aria-hidden="true" />}
      {stops.map((stop, index) => (
        <span
          key={stop.id}
          className={`absolute left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full ${nodeSize(stop.status)} ${nodeTone(stop.status, pastLimitIds.has(stop.id) || lateIds.has(stop.id))}`}
          style={{
            top: `${position(index)}%`,
            ...(stop.status === 'done' ? { '--route-history-light': `${completedStopLightWeight(index, lastCompleteIndex)}%` } : {}),
          } as CSSProperties}
          aria-hidden="true"
        />
      ))}
      </div>
    </div>
  )
}
