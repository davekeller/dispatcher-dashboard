import { Link } from 'react-router'
import type { DriverCard } from '../alerts/types'
import { fmtAge, fmtClock } from '../lib/format'
import { useStore } from '../store/store'
import type { DriverView } from '../store/view'
import DriverAvatar from '../ui/DriverAvatar'
import Chip from '../ui/Chip'
import CorrectionChip from '../ui/CorrectionChip'
import Countdown from '../ui/Countdown'
import { BAND_TONE, severityTone } from '../ui/tones'
import RouteTimelineMini from '../views/shift/RouteTimelineMini'
import AlertActions from './AlertActions'
import { LOOKOUT } from './voice'

const PRIORITY_RULES = new Set(['over_limit', 'limit_act_now', 'limit_watch', 'behind_schedule'])

/** One card per driver, every reason on it, 2–3 actions. Same handlers as the route file. */
export default function RecommendationCard({ view, card, pinned = false }: { view: DriverView; card: DriverCard; pinned?: boolean }) {
  const snoozes = useStore((s) => s.snoozes)
  const hasCorrection = useStore((s) => Boolean(s.corrections[view.driver.id]))
  const tone = BAND_TONE[card.band]
  const stale = view.staleness !== 'fresh'
  const offline = view.staleness === 'offline'
  const staleReason = stale ? `Last ping ${fmtAge(view.pingAgeMin)}. Position-dependent actions are disabled until the truck reports in.` : undefined
  const snoozedUntil = card.snoozed ? Math.max(...card.alerts.map((a) => snoozes[a.id] ?? 0)) : undefined
  const priorityAlert = card.alerts.find((alert) => PRIORITY_RULES.has(alert.ruleId))
  return (
    <article className={`overflow-hidden rounded-card border bg-panel shadow-card ${pinned ? 'iq-card-ring' : 'border-line'} ${card.snoozed ? 'opacity-60' : ''}`}>
      <header className="flex items-center gap-2 border-b border-line/70 py-1.5 pl-3 pr-2">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${offline ? `border-2 border-dashed ${tone.border}` : tone.fill}`} aria-hidden="true" />
        <span className="shrink-0 whitespace-nowrap font-mono text-[12px] font-semibold tracking-tight text-ink">{view.route.id.toUpperCase()}</span>
        <span className="ml-auto flex min-w-0 items-center gap-1.5">
          {priorityAlert && <Chip tone={severityTone(priorityAlert.severity)} className="px-1.5 py-0 text-[9px] leading-4" title={priorityAlert.title}>{priorityAlert.label}</Chip>}
          <Countdown minutes={view.minutesUntilLimit} stale={stale} />
        </span>
      </header>
      <div className="flex">
        <RouteTimelineMini view={view} />
        <div className="min-w-0 flex-1">
          <div className="flex min-h-[3.75rem] min-w-0 items-center gap-2 px-2.5 py-2">
            <DriverAvatar driver={view.driver} size={26} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <Link to={`/routes/${view.driver.id}`} className="min-w-0 flex-1 truncate text-[12px] font-semibold leading-4 text-ink hover:underline">{view.driver.name}</Link>
                <span className="tnum shrink-0 text-[9px] leading-4 text-muted" title="Age of the last telematics ping">{fmtAge(view.pingAgeMin)}</span>
              </div>
              <span className="block truncate text-[10px] leading-4 text-muted">{view.truck.plate} · {view.driver.region}</span>
            </div>
          </div>
          <ul>
            {card.alerts.map((a) => (
              <li key={a.id} className="border-t border-line/80 px-2.5 py-2 text-[12px] leading-snug">
                {!PRIORITY_RULES.has(a.ruleId) && <span className={`mb-1 block text-[9px] font-semibold uppercase tracking-[0.04em] ${severityTone(a.severity).text}`}>{a.label}</span>}
                <p><span className="font-semibold text-ink">{a.title}</span> <span className="text-muted">{a.body}</span></p>
              </li>
            ))}
          </ul>
          {(view.driver.contactAttemptedAt !== undefined || snoozedUntil !== undefined || hasCorrection) && (
            <div className="flex flex-wrap items-center gap-2 border-t border-line/80 px-2.5 py-1.5 text-[10px] text-muted">
              {view.driver.contactAttemptedAt !== undefined && <span>{LOOKOUT.called(fmtClock(view.driver.contactAttemptedAt))}</span>}
              {snoozedUntil !== undefined && <span>{LOOKOUT.snoozed(fmtClock(snoozedUntil))}</span>}
              <CorrectionChip driverId={view.driver.id} />
            </div>
          )}
          <div className="border-t border-line/80 px-2.5 py-2">
            <AlertActions driverId={view.driver.id} actions={card.alerts.flatMap((a) => a.actions)} alertIds={card.alerts.map((a) => a.id)} positionDependentDisabled={staleReason} resetScheduledAt={view.plannedResetAt} />
          </div>
        </div>
      </div>
    </article>
  )
}
