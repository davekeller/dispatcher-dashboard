import { Link } from 'react-router'
import type { DriverCard } from '../../alerts/types'
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

const TITLE_STATUS_RULES = new Set(['wont_finish', 'offline_near_limit', 'offline'])

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
  const titleStatus = detailAlerts.find((alert) => TITLE_STATUS_RULES.has(alert.ruleId))
  const footerAlerts = detailAlerts.filter((alert) => alert.id !== titleStatus?.id)
  const headerStatus = titleStatus ? {
    label: titleStatus.label,
    title: titleStatus.title,
    className: severityTone(titleStatus.severity).text,
  } : undefined
  const nextValue = view.next ? `#${view.next.seq}` : view.unassigned.length ? `${view.unassigned.length}` : '—'
  const nextLabel = view.next ? 'Up next' : view.unassigned.length ? 'Unassigned' : 'Complete'
  const riskValue = pastLimitCount > 0 ? `${pastLimitCount} past HOS` : view.lateStops.length > 0 ? `${view.lateStops.length} late` : 'Clear'
  const riskTone = pastLimitCount > 0 ? 'text-act-now' : view.lateStops.length > 0 ? 'text-watch' : 'text-clear'
  return (
    <Link to={`/routes/${view.driver.id}`} className={`group block shrink-0 overflow-hidden rounded-card border-[1.5px] transition hover:-translate-y-px hover:border-ink/25 hover:shadow-md ${surface} ${dim}`}>
      <RouteHeader view={view} card={card} showPingAge status={headerStatus} />
      <div className="flex min-h-[6.75rem]">
        <RouteTimelineMini view={view} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-16 min-w-0 items-stretch">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 px-1.5 py-2">
              <DriverAvatar driver={view.driver} size={20} className={quiet ? 'opacity-80' : ''} />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-baseline gap-1">
                  <p className="shrink-0 truncate text-[12px] font-semibold leading-4 text-ink" title={view.driver.name}>{view.driver.name}</p>
                  <span className="truncate font-mono text-[8px] leading-4 text-muted" title={`Truck license plate ${view.truck.plate}`}>{view.truck.plate}</span>
                </div>
              </div>
            </div>
            <dl className="ml-auto grid w-[6.5rem] shrink-0 grid-cols-2 border-l border-line/80">
              <div className="flex min-w-0 flex-col items-center justify-center border-r border-line/80 px-1.5 text-center">
                <dd className="tnum whitespace-nowrap text-[11px] font-semibold leading-none text-ink">{view.done} / {view.total}</dd>
                <dt className="mt-1 text-[7px] font-semibold uppercase tracking-[0.03em] text-label">Stops</dt>
              </div>
              <div className="flex min-w-0 flex-col items-center justify-center px-1.5 text-center">
                <dd className="tnum whitespace-nowrap text-[11px] font-semibold leading-none text-ink">{nextValue}</dd>
                <dt className="mt-1 whitespace-nowrap text-[7px] font-semibold uppercase tracking-[0.03em] text-label">{nextLabel}</dt>
              </div>
            </dl>
          </div>
          <dl className="mt-auto grid min-h-11 grid-cols-2 border-t border-line/80">
            <div className="flex min-w-0 flex-col justify-center border-r border-line/80 px-2.5 py-1.5">
              <dt className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.04em] text-label"><span className={`h-1.5 w-1.5 rounded-full ${hosFill}`} /> HOS fit</dt>
              <dd className={`tnum mt-0.5 truncate text-[10px] font-semibold ${hosText}`} title={hos.value}>{hos.value}</dd>
            </div>
            <div className="flex min-w-0 flex-col justify-center px-2.5 py-1.5">
              <dt className="text-[8px] font-semibold uppercase tracking-[0.04em] text-label">Route risk</dt>
              <dd className={`tnum mt-0.5 truncate text-[10px] font-semibold ${riskTone}`} title={riskValue}>{riskValue}</dd>
            </div>
          </dl>
          {(footerAlerts.length > 0 || pick || hasCorrection) && (
            <div className="flex flex-wrap gap-1 border-t border-line/80 px-2.5 py-1.5">
              {pick && <Chip tone={LOOKOUT_TONE} title="Lookout's top pick across the fleet">✦ Lookout's pick</Chip>}
              <CorrectionChip driverId={view.driver.id} />
              {footerAlerts.map((a) => (
                <span key={a.id} className={`text-[9px] font-semibold leading-4 ${severityTone(a.severity).text}`} title={a.title}>{a.label}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
