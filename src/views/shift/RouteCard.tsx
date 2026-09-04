import { Link } from 'react-router'
import type { DriverCard } from '../../alerts/types'
import { fmtAge } from '../../lib/format'
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
  const detailAlerts = card.alerts.filter((alert) => !PRIORITY_RULES.has(alert.ruleId))
  const nextValue = view.next ? `#${view.next.seq}` : view.unassigned.length ? `${view.unassigned.length}` : '—'
  const nextLabel = view.next ? 'Up next' : view.unassigned.length ? 'Unassigned' : 'Complete'
  return (
    <Link to={`/routes/${view.driver.id}`} className={`group block shrink-0 overflow-hidden rounded-card border-[1.5px] transition hover:-translate-y-px hover:border-ink/25 hover:shadow-md ${surface} ${dim}`}>
      <RouteHeader view={view} card={card} />
      <div className="flex min-h-[7.5rem]">
        <RouteTimelineMini view={view} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex min-h-[3.5rem] min-w-0 items-center gap-2 px-2.5 py-2">
            <DriverAvatar driver={view.driver} size={24} className={quiet ? 'opacity-80' : ''} />
            <div className="flex min-w-0 flex-1 items-baseline gap-1.5">
              <p className="shrink-0 truncate text-[12px] font-semibold leading-4 text-ink" title={view.driver.name}>{view.driver.name}</p>
              <span className="truncate font-mono text-[9px] leading-4 text-muted" title={`Truck license plate ${view.truck.plate}`}>{view.truck.plate}</span>
            </div>
            <span className="tnum ml-auto self-start whitespace-nowrap text-[9px] leading-4 text-muted" title="Age of the last telematics ping">{fmtAge(view.pingAgeMin)}</span>
          </div>
          <dl className="mt-auto grid min-h-11 grid-cols-2 border-t border-line/80">
            <div className="flex min-w-0 items-center gap-1.5 border-r border-line/80 px-2.5 py-1.5">
              <dd className="tnum truncate text-[12px] font-semibold leading-none text-ink">{view.done} / {view.total}</dd>
              <dt className="text-[8px] font-semibold uppercase tracking-[0.04em] text-label">Stops</dt>
            </div>
            <div className="flex min-w-0 items-center gap-1.5 px-2.5 py-1.5">
              <dd className="tnum truncate text-[12px] font-semibold leading-none text-ink">{nextValue}</dd>
              <dt className="truncate text-[8px] font-semibold uppercase tracking-[0.04em] text-label">{nextLabel}</dt>
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
