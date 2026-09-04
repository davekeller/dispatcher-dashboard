import { Link } from 'react-router'
import type { DriverCard } from '../../alerts/types'
import { fmtAge } from '../../lib/format'
import { routeHosSignal } from '../../lib/routeProgress'
import { stopsPastLimit } from '../../store/actions'
import { useStore } from '../../store/store'
import type { DriverView } from '../../store/view'
import Chip from '../../ui/Chip'
import CorrectionChip from '../../ui/CorrectionChip'
import DriverAvatar from '../../ui/DriverAvatar'
import RouteHeader, { PRIORITY_RULES } from '../../ui/RouteHeader'
import { LOOKOUT_TONE, severityTone } from '../../ui/tones'
import RouteTimelineMini from './RouteTimelineMini'

/** The route is the card's primary entity; its driver and truck are assignment metadata.
 * Color is attention, clear work stays quiet, and nothing drags because bands are derived. */
export default function RouteCard({ view, card, pick = false }: { view: DriverView; card: DriverCard; pick?: boolean }) {
  const quiet = card.band === 'clear' && !pick
  const surface = quiet ? 'border-line/70 bg-panel/80 opacity-80 hover:opacity-100' : 'border-line bg-panel shadow-card'
  const dim = card.snoozed ? 'opacity-60' : ''
  const hasCorrection = useStore((s) => Boolean(s.corrections[view.driver.id]))
  const hos = routeHosSignal(view)
  const hosText = hos.tone === 'act_now' ? 'text-act-now' : hos.tone === 'watch' ? 'text-watch' : 'text-clear'
  const hosFill = hos.tone === 'act_now' ? 'bg-act-now-fill' : hos.tone === 'watch' ? 'bg-watch-fill' : 'bg-clear-fill'
  const pastLimitCount = stopsPastLimit(view).length
  const detailAlerts = card.alerts.filter((alert) => !PRIORITY_RULES.has(alert.ruleId))
  const riskValue = pastLimitCount > 0 ? `${pastLimitCount} past HOS` : view.lateStops.length > 0 ? `${view.lateStops.length} late` : 'Clear'
  const riskTone = pastLimitCount > 0 ? 'text-act-now' : view.lateStops.length > 0 ? 'text-watch' : 'text-clear'
  return (
    <Link to={`/routes/${view.driver.id}`} className={`group block shrink-0 overflow-hidden rounded-card border transition hover:-translate-y-px hover:border-ink/25 hover:shadow-md ${surface} ${dim}`}>
      <RouteHeader view={view} card={card} />
      <div className="flex min-h-[8.5rem]">
        <RouteTimelineMini view={view} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-[3.75rem] min-w-0 items-center gap-2 px-2.5 py-2">
            <DriverAvatar driver={view.driver} size={26} className={quiet ? 'opacity-80' : ''} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-[12px] font-semibold leading-4 text-ink" title={view.driver.name}>{view.driver.name}</p>
                <span className="tnum shrink-0 text-[9px] leading-4 text-muted" title="Age of the last telematics ping">{fmtAge(view.pingAgeMin)}</span>
              </div>
              <p className="truncate text-[10px] leading-4 text-muted" title={`${view.truck.plate} · ${view.driver.region}`}>{view.truck.plate} · {view.driver.region}</p>
            </div>
          </div>
          <dl className="mt-auto grid grid-cols-2 border-t border-line/80">
            <div className="flex min-h-[2.75rem] min-w-0 flex-col justify-center border-b border-r border-line/80 px-2.5 py-1.5">
              <dt className="order-2 mt-0.5 text-[8px] font-semibold uppercase tracking-[0.04em] text-label">Stops</dt>
              <dd className="tnum order-1 truncate text-[12px] font-semibold leading-none text-ink">{view.done} / {view.total}</dd>
            </div>
            <div className="flex min-h-[2.75rem] min-w-0 flex-col justify-center border-b border-line/80 px-2.5 py-1.5">
              <dt className="order-2 mt-0.5 truncate text-[8px] font-semibold uppercase tracking-[0.04em] text-label">{view.next ? 'Next' : view.unassigned.length ? `${view.unassigned.length} unassigned` : 'Complete'}</dt>
              <dd className="tnum order-1 truncate text-[12px] font-semibold leading-none text-ink">{view.next ? `#${view.next.seq}` : '—'}</dd>
            </div>
            <div className="flex min-h-[2.75rem] min-w-0 flex-col justify-center border-r border-line/80 px-2.5 py-1.5">
              <dt className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.04em] text-label"><span className={`h-1.5 w-1.5 rounded-full ${hosFill}`} /> HOS fit</dt>
              <dd className={`tnum mt-0.5 truncate text-[10px] font-semibold ${hosText}`} title={hos.value}>{hos.value}</dd>
            </div>
            <div className="flex min-h-[2.75rem] min-w-0 flex-col justify-center px-2.5 py-1.5">
              <dt className="text-[8px] font-semibold uppercase tracking-[0.04em] text-label">Route risk</dt>
              <dd className={`tnum mt-0.5 truncate text-[10px] font-semibold ${riskTone}`} title={riskValue}>{riskValue}</dd>
            </div>
          </dl>
          {(detailAlerts.length > 0 || pick || hasCorrection) && (
            <div className="flex flex-wrap gap-1 border-t border-line/80 px-2.5 py-1.5">
              {pick && <Chip tone={LOOKOUT_TONE} title="Lookout's top pick across the fleet">✦ Lookout's pick</Chip>}
              <CorrectionChip driverId={view.driver.id} />
              {detailAlerts.map((a) => (
                <span key={a.id} className={`text-[9px] font-semibold leading-4 ${severityTone(a.severity).text}`} title={a.title}>{a.label}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
