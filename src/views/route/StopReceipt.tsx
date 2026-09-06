import type { Delivery, Stop } from '../../data/types'
import { projectedEta } from '../../hos/compute'
import { fmtClock, fmtMinutes } from '../../lib/format'
import type { DriverView } from '../../store/view'
import { MIN } from '../../time/clock'
import Chip from '../../ui/Chip'
import { BAND_TONE } from '../../ui/tones'
import StopActionsMenu from './StopActionsMenu'
import StopStatusMarker, { stopHistoryStyle } from './StopStatusMarker'

interface StopEvent {
  label: string
  value: string
  tone: 'clear' | 'critical' | 'muted'
}

interface StopFact {
  label: string
  value: string
  tone?: string
  badge?: boolean
}

function eventDot(tone: StopEvent['tone']): string {
  if (tone === 'clear') return 'border-clear-fill bg-clear-fill'
  if (tone === 'critical') return 'border-act-now-fill bg-act-now-fill'
  return 'border-muted/55 bg-panel'
}

function stopOutcome(stop: Stop): string {
  if (stop.status === 'failed' || stop.outcome === 'failed') return 'Failed'
  if (stop.outcome === 'partial') return 'Partial'
  return 'Delivered'
}

/** A receipt follows the same file pattern as the surrounding route: identity first,
 * a small horizontal event track second, then a compact one-row fact grid. */
export default function StopReceipt({ stop, delivery, view, selected, onToggle, pastLimit = false }: { stop: Stop; delivery: Delivery | undefined; view: DriverView; selected: boolean; onToggle: () => void; pastLimit?: boolean }) {
  const isNext = view.next?.id === stop.id
  const pending = stop.status === 'pending'
  const eta = pending ? projectedEta(stop, view.driftMin) : undefined
  const pastWindow = eta !== undefined && delivery !== undefined && eta > delivery.window.end
  const statusTone = stop.status === 'failed' ? BAND_TONE.act_now : stop.status === 'unassigned' ? BAND_TONE.offline : isNext ? BAND_TONE.break : undefined
  const statusLabel = stop.status === 'failed' ? 'failed' : stop.status === 'unassigned' ? 'needs a driver' : isNext ? 'next' : undefined
  const selectable = pending || stop.status === 'unassigned'
  const complete = stop.status === 'done' || stop.status === 'failed'
  const dwell = stop.arrivedAt !== undefined && stop.departedAt !== undefined ? fmtMinutes((stop.departedAt - stop.arrivedAt) / MIN) : '—'
  const liveDwell = stop.status === 'in_progress' && stop.arrivedAt !== undefined ? fmtMinutes((view.now - stop.arrivedAt) / MIN) : '—'
  const outcome = stopOutcome(stop)
  const stopIndex = view.route.stops.findIndex((routeStop) => routeStop.id === stop.id)
  const lastCompleteIndex = view.route.stops.reduce((last, routeStop, index) => routeStop.status === 'done' || routeStop.status === 'failed' ? index : last, -1)
  const timelineRed = stop.status === 'failed' || pastLimit || pastWindow
  const timelineTone = stop.status === 'done' ? 'route-history-node' : timelineRed ? 'bg-act-now-fill/70' : 'bg-line'
  const timelineStyle = stop.status === 'done' ? stopHistoryStyle(stopIndex, lastCompleteIndex) : undefined
  const firstStop = stopIndex === view.route.stops.length - 1
  const lastStop = stopIndex === 0

  const events: StopEvent[] = complete ? [
    ...(stop.arrivedAt !== undefined ? [{ label: 'Arrived', value: fmtClock(stop.arrivedAt), tone: 'clear' as const }] : []),
    ...(stop.departedAt !== undefined ? [{ label: 'Left', value: fmtClock(stop.departedAt), tone: stop.status === 'failed' ? 'critical' as const : 'clear' as const }] : []),
    { label: stop.signedBy ? 'Signed' : 'Result', value: stop.signedBy ?? outcome, tone: stop.status === 'failed' ? 'critical' : 'clear' },
  ] : stop.status === 'in_progress' ? [
    ...(stop.arrivedAt !== undefined ? [{ label: 'Arrived', value: fmtClock(stop.arrivedAt), tone: 'clear' as const }] : []),
    { label: 'Status', value: 'At the dock', tone: 'muted' },
    ...(delivery ? [{ label: 'Window', value: `until ${fmtClock(delivery.window.end)}`, tone: 'muted' as const }] : []),
  ] : [
    { label: 'Planned', value: fmtClock(stop.plannedEta), tone: 'muted' },
    ...(eta !== undefined && eta !== stop.plannedEta ? [{ label: 'Projected', value: fmtClock(eta), tone: pastWindow ? 'critical' as const : 'muted' as const }] : []),
    ...(delivery ? [{ label: 'Window', value: `until ${fmtClock(delivery.window.end)}`, tone: pastWindow ? 'critical' as const : 'muted' as const }] : []),
  ]

  const notes = [delivery?.instructions, stop.note, stop.notifiedAt !== undefined ? 'notified' : undefined].filter(Boolean)
  const priorityFact: StopFact = { label: 'Priority', value: delivery?.priority === 'priority' ? 'Priority' : 'Standard', badge: delivery?.priority === 'priority' }
  const facts: StopFact[] = complete ? [
    { label: 'On-site', value: dwell },
    { label: 'Outcome', value: outcome, tone: stop.status === 'failed' ? 'text-act-now' : stop.outcome === 'partial' ? 'text-watch' : 'text-clear' },
    { label: 'Load', value: delivery?.items.join(', ') ?? '—' },
    priorityFact,
  ] : stop.status === 'in_progress' ? [
    { label: 'On-site', value: liveDwell },
    { label: 'Window', value: delivery ? fmtClock(delivery.window.end) : '—', tone: pastWindow ? 'text-act-now' : undefined },
    { label: 'Load', value: delivery?.items.join(', ') ?? '—' },
    priorityFact,
  ] : [
    { label: eta !== undefined && eta !== stop.plannedEta ? 'Projected' : 'ETA', value: fmtClock(eta ?? stop.plannedEta), tone: pastWindow ? 'text-act-now' : undefined },
    { label: 'Window', value: delivery ? fmtClock(delivery.window.end) : '—', tone: pastWindow ? 'text-act-now' : undefined },
    { label: 'Load', value: delivery?.items.join(', ') ?? '—' },
    priorityFact,
  ]

  return (
    <div className="relative grid grid-cols-[1rem_minmax(0,1fr)] gap-2">
      <div className="relative flex items-center justify-center">
        <span aria-hidden="true" className={`pointer-events-none absolute left-1/2 w-px -translate-x-1/2 ${timelineTone} ${firstStop ? 'top-1/2' : '-top-1'} ${lastStop ? 'bottom-1/2' : '-bottom-1'}`} style={timelineStyle} />
        <StopStatusMarker stop={stop} pastLimit={pastLimit} late={pastWindow} className="h-3.5 w-3.5" style={timelineStyle} />
      </div>
      <article className={`relative grid overflow-hidden rounded-card border bg-panel shadow-card lg:grid-cols-[2.5rem_minmax(8.75rem,0.72fr)_minmax(9.75rem,0.95fr)_minmax(16rem,1.55fr)] ${isNext ? 'border-break' : pastLimit || pastWindow ? 'border-act-now/50' : 'border-line'} ${stop.status === 'unassigned' ? 'border-dashed' : ''}`}>
        <div className="flex min-h-16 items-center justify-center border-b border-line px-1 lg:min-h-0 lg:border-b-0 lg:border-r">
          <span className="tnum min-w-0 text-center text-xl font-semibold leading-none tracking-[-0.025em] text-ink/80">{stop.seq}</span>
        </div>

        <div className="relative flex min-w-0 flex-col justify-center border-b border-line p-3 lg:border-b-0 lg:border-r">
          <h3 className="truncate text-[13px] font-semibold text-ink" title={delivery?.customer ?? stop.deliveryId}>{delivery?.customer ?? stop.deliveryId}</h3>
          <p className="mt-0.5 truncate text-[11px] text-muted" title={delivery?.address}>{delivery?.address ?? 'Address unavailable'}</p>
          {(statusLabel || pastLimit || pastWindow) && <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-1">
            {statusTone && statusLabel && <Chip tone={statusTone} dashed={stop.status === 'unassigned'} className="px-1.5 py-0 text-[10px]">{statusLabel}</Chip>}
            {pastLimit && stop.status !== 'unassigned' && <Chip tone={BAND_TONE.act_now} className="px-1.5 py-0 text-[10px]">past the limit</Chip>}
            {pastWindow && <Chip tone={BAND_TONE.act_now} className="px-1.5 py-0 text-[10px]">past window</Chip>}
          </div>}
        </div>

        <div className="flex min-w-0 items-center border-b border-line px-3 py-2.5 lg:border-b-0 lg:border-r">
          <ol className="relative grid w-full items-start" style={{ gridTemplateColumns: `repeat(${events.length}, minmax(0, 1fr))` }} aria-label={`Stop ${stop.seq} events`}>
            <span className="absolute top-[0.2rem] h-px bg-line" style={{ left: `${100 / (events.length * 2)}%`, right: `${100 / (events.length * 2)}%` }} aria-hidden="true" />
            {events.map((event) => (
              <li key={`${event.label}:${event.value}`} className="relative flex min-w-0 flex-col items-center px-0.5 text-center">
                <span className={`relative z-10 h-1.5 w-1.5 rounded-full border ${eventDot(event.tone)}`} aria-hidden="true" />
                <span className={`mt-1.5 block w-full truncate text-[8px] font-semibold uppercase tracking-[0.04em] ${event.tone === 'critical' ? 'text-act-now' : 'text-label'}`}>{event.label}</span>
                <span className={`tnum mt-0.5 block w-full min-w-0 truncate text-[11px] font-semibold ${event.tone === 'critical' ? 'text-act-now' : 'text-ink'}`} title={event.value}>{event.value}</span>
              </li>
            ))}
          </ol>
        </div>

        <dl className={`grid grid-cols-4 bg-board/45 ${selectable ? 'pr-14' : 'pr-8'}`}>
          {facts.map((fact, index) => (
            <div key={fact.label} className={`flex min-w-0 flex-col justify-center px-2.5 py-3 ${index < facts.length - 1 ? 'border-r border-line' : ''}`}>
              <dt className="truncate text-[8px] font-semibold uppercase tracking-[0.04em] text-label" title={fact.label}>{fact.label}</dt>
              {fact.badge ? (
                <dd className="mt-1 min-w-0" title={fact.value}><Chip tone={BAND_TONE.watch} className="max-w-full px-1.5 py-0 text-[10px]">priority</Chip></dd>
              ) : (
                <dd className={`tnum mt-0.5 truncate text-[12px] font-semibold leading-tight ${fact.tone ?? 'text-ink'}`} title={fact.value}>{fact.value}</dd>
              )}
            </div>
          ))}
        </dl>
        {/* Free text gets its own field at the end of the card, so identity stays name and address. */}
        {notes.length > 0 && (
          <div className="col-span-full flex min-w-0 items-baseline gap-3 border-t border-line px-3 py-2 text-[11px] leading-4 text-ink">
            <span className="shrink-0 text-[8px] font-semibold uppercase tracking-[0.04em] text-label">Notes</span>
            <span className="flex min-w-0 flex-wrap gap-x-4 gap-y-0.5">
              {delivery?.instructions && <span>{delivery.instructions}</span>}
              {stop.note && <span className="font-medium"><span className="font-semibold uppercase tracking-[0.04em] text-label">Dispatcher · </span>{stop.note}</span>}
              {stop.notifiedAt !== undefined && <span className="text-muted">Customer notified {fmtClock(stop.notifiedAt)}</span>}
            </span>
          </div>
        )}
        <StopActionsMenu
          stop={stop}
          view={view}
          customer={delivery?.customer ?? stop.deliveryId}
          selectionControl={selectable ? <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Select stop ${stop.seq} to reassign`} className="h-3.5 w-3.5 shrink-0 accent-ink" /> : undefined}
        />
      </article>
    </div>
  )
}
