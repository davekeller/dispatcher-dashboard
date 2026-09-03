import type { Delivery, Stop } from '../../data/types'
import { projectedEta } from '../../hos/compute'
import { fmtClock, fmtMinutes } from '../../lib/format'
import type { DriverView } from '../../store/view'
import { MIN } from '../../time/clock'
import Chip from '../../ui/Chip'
import { BAND_TONE } from '../../ui/tones'

/** The receipt of what happened at a stop, or what is planned to. Pending and unassigned
 *  stops carry a checkbox, so a partial reassign is just selecting cards. */
export default function StopReceipt({ stop, delivery, view, selected, onToggle }: { stop: Stop; delivery: Delivery | undefined; view: DriverView; selected: boolean; onToggle: () => void }) {
  const isNext = view.next?.id === stop.id
  const pending = stop.status === 'pending'
  const eta = pending ? projectedEta(stop, view.driftMin) : undefined
  const pastWindow = eta !== undefined && delivery !== undefined && eta > delivery.window.end
  const statusTone = stop.status === 'failed' ? BAND_TONE.act_now : stop.status === 'unassigned' ? BAND_TONE.offline : isNext ? BAND_TONE.break : undefined
  const statusLabel = stop.status === 'failed' ? 'failed' : stop.status === 'unassigned' ? 'needs a driver' : isNext ? 'next' : undefined
  const selectable = pending || stop.status === 'unassigned'
  return (
    <li className={`flex gap-3 rounded-card border bg-panel px-3 py-2.5 ${isNext ? 'border-break shadow-card' : 'border-line'} ${stop.status === 'done' ? 'opacity-80' : ''} ${stop.status === 'unassigned' ? 'border-dashed' : ''}`}>
      {selectable ? (
        <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Select stop ${stop.seq} to reassign`} className="mt-1 accent-ink" />
      ) : (
        <span className="w-[13px] shrink-0" aria-hidden="true" />
      )}
      <span className="tnum w-5 shrink-0 pt-px text-[12px] font-semibold text-muted">{stop.seq}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="font-semibold text-ink">{delivery?.customer ?? stop.deliveryId}</span>
          {delivery?.priority === 'priority' && <Chip tone={BAND_TONE.watch}>priority</Chip>}
          {statusTone && statusLabel && <Chip tone={statusTone} dashed={stop.status === 'unassigned'}>{statusLabel}</Chip>}
          {stop.notifiedAt !== undefined && <Chip>customer notified {fmtClock(stop.notifiedAt)}</Chip>}
          {pastWindow && <Chip tone={BAND_TONE.act_now}>past window</Chip>}
        </div>
        <p className="truncate text-[12px] text-muted">
          {delivery?.address} · {delivery?.items.join(', ')}
          {delivery?.instructions ? ` · ${delivery.instructions}` : ''}
        </p>
        <p className="tnum mt-0.5 text-[11px] text-muted">
          {(stop.status === 'done' || stop.status === 'failed') && stop.arrivedAt !== undefined && stop.departedAt !== undefined && (
            <>
              arrived {fmtClock(stop.arrivedAt)} · left {fmtClock(stop.departedAt)} · {fmtMinutes((stop.departedAt - stop.arrivedAt) / MIN)} on site
              {stop.signedBy ? ` · signed ${stop.signedBy}` : ''}
              {stop.outcome === 'partial' ? ' · partial delivery' : ''}
              {stop.note ? ` · ${stop.note}` : ''}
            </>
          )}
          {stop.status === 'in_progress' && stop.arrivedAt !== undefined && <>arrived {fmtClock(stop.arrivedAt)} · at the dock</>}
          {(pending || stop.status === 'unassigned') && (
            <>
              planned {fmtClock(stop.plannedEta)}
              {eta !== undefined && eta !== stop.plannedEta ? ` · projected ${fmtClock(eta)}` : ''}
              {delivery ? ` · window until ${fmtClock(delivery.window.end)}` : ''} · {stop.driveMinutesFromPrev} min drive
            </>
          )}
        </p>
      </div>
    </li>
  )
}
