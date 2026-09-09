import { ArrowCounterClockwise, ArrowsLeftRight, BellRinging, BellSlash, CheckCircle, Flag, MapPin, Moon, NotePencil, Phone, WifiHigh, XCircle, type Icon } from '@phosphor-icons/react'
import { Link, useLocation } from 'react-router'
import { originFor } from '../app/origin'
import { fmtClock, fmtCountdown } from '../lib/format'
import type { Derived } from '../store/derive'
import type { EventDetail } from '../store/store'
import Chip from '../ui/Chip'
import { STALENESS_TONE, severityTone } from '../ui/tones'
import { describeEvent } from './copy'
import type { HistoryItem } from './derive'

const ICON: Record<EventDetail['type'], Icon> = {
  reassign: ArrowsLeftRight, schedule_reset: Moon, notify_customer: BellRinging, call_driver: Phone, stop_note: NotePencil,
  cancel_stop: XCircle, arrived: MapPin, departed: CheckCircle, snooze: BellSlash, reconnect: WifiHigh, undo: ArrowCounterClockwise,
}

/** "0:12 left", "0:08 over", "~0:39 left": the board's countdown in words, tilde and all when the ping was stale. */
const countdown = (minutes: number, stale: boolean) => `${fmtCountdown(Math.abs(minutes), stale)} ${minutes <= 0 ? 'over' : 'left'}`

/** One of her actions as a receipt: what she did, the figures she was shown, the driver as he was, and the way back to the route. */
export default function HistoryCard({ item, d }: { item: Extract<HistoryItem, { kind: 'card' }>; d: Derived }) {
  const { event, undoneAt } = item
  const copy = describeEvent(event, d)
  const Glyph = event.detail ? ICON[event.detail.type] : Flag
  const view = event.driverId ? d.byId.get(event.driverId) : undefined
  const from = originFor(useLocation())
  const ctx = event.context
  // The board's header at that moment: its top badge, the countdown, then the other reasons. Clear wears no chip.
  const [badge, ...reasons] = ctx?.alerts ?? []
  const showStaleness = ctx !== undefined && ctx.staleness !== 'fresh' && badge !== 'Offline'
  const undone = undoneAt !== undefined
  return (
    <article aria-label={copy.title} className={`rounded-control border border-line bg-panel px-2.5 py-2 ${undone ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-2">
        <Glyph size={14} weight="duotone" className="mt-px shrink-0 text-muted" aria-hidden="true" />
        <p className={`min-w-0 flex-1 text-[11px] font-semibold leading-snug text-ink ${undone ? 'line-through decoration-muted/60' : ''}`}>{copy.title}</p>
        {undone && <Chip title={`Undone at ${fmtClock(undoneAt)}`} className="px-1.5 py-0 text-[9px] leading-4">Undone {fmtClock(undoneAt)}</Chip>}
      </div>
      {copy.rows.length > 0 && (
        <ul className="mt-1 space-y-0.5 pl-[22px] text-[11px] leading-snug text-muted">
          {copy.rows.map((row, i) => <li key={i}>{row}</li>)}
        </ul>
      )}
      {(ctx || view) && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 pl-[22px] text-[10px] text-muted">
          {ctx && badge && <Chip tone={severityTone(ctx.severity)} className="px-1.5 py-0 text-[9px] leading-4">{badge}</Chip>}
          {showStaleness && <Chip tone={STALENESS_TONE[ctx.staleness]} dashed={ctx.staleness === 'offline'} className="px-1.5 py-0 text-[9px] leading-4">{ctx.staleness === 'offline' ? 'Offline' : 'Stale'}</Chip>}
          {ctx && <span className="tnum" title="Drive time left at the time">{countdown(ctx.minutesUntilLimit, ctx.staleness !== 'fresh')}</span>}
          {reasons.length > 0 && <span className="min-w-0 truncate" title={reasons.join(' · ')}>{reasons.join(' · ')}</span>}
          {view && <Link to={`/routes/${view.driver.id}`} state={{ from }} className="ml-auto shrink-0 font-semibold text-ink hover:underline">Open {view.driver.name.split(' ')[0]}'s route →</Link>}
        </div>
      )}
    </article>
  )
}
