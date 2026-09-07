import { Link, useLocation } from 'react-router'
import type { DriverCard } from '../alerts/types'
import { originFor } from '../app/origin'
import { fmtAge, fmtClock } from '../lib/format'
import { useStore } from '../store/store'
import type { DriverView } from '../store/view'
import DriverAvatar from '../ui/DriverAvatar'
import Chip from '../ui/Chip'
import CorrectionChip from '../ui/CorrectionChip'
import RouteHeader, { PRIORITY_RULES } from '../ui/RouteHeader'
import { STALENESS_TONE, severityTone } from '../ui/tones'
import RouteTimelineMini from '../views/shift/RouteTimelineMini'
import AlertActions from './AlertActions'
import { recommendationSummary } from './recommendationSummary'
import { recommendationBorder } from './recommendationTone'
import { LOOKOUT } from './voice'

/** One card per driver, every reason on it, 2–3 actions. Same handlers as the route file.
 *  Both forms open with the board card's header row (band dot, route id, priority chip,
 *  countdown). `compact` is the recommendations-bar form: under that header, the avatar
 *  beside the directive, which may wrap, then the actions. No name row, no spine, because
 *  the directive already carries the name. */
export default function RecommendationCard({ view, card, pinned = false, compact = false }: { view: DriverView; card: DriverCard; pinned?: boolean; compact?: boolean }) {
  const snoozes = useStore((s) => s.snoozes)
  const from = originFor(useLocation())
  const hasCorrection = useStore((s) => Boolean(s.corrections[view.driver.id]))
  const stale = view.staleness !== 'fresh'
  const offline = view.staleness === 'offline'
  const staleReason = stale ? `Last ping ${fmtAge(view.pingAgeMin)}. Position-dependent actions are disabled until the truck reports in.` : undefined
  const snoozedUntil = card.snoozed ? Math.max(...card.alerts.map((a) => snoozes[a.id] ?? 0)) : undefined
  const hasStatus = view.driver.contactAttemptedAt !== undefined || snoozedUntil !== undefined || hasCorrection
  const surface = compact
    ? `overflow-hidden rounded-control border bg-panel/70 ${pinned ? 'lookout-card-ring' : recommendationBorder(card.severity)} ${card.snoozed ? 'opacity-60' : ''}`
    : `overflow-hidden rounded-card border-[1.5px] bg-panel shadow-card ${pinned ? 'lookout-card-ring' : 'border-line'} ${card.snoozed ? 'opacity-60' : ''}`
  const actions = <AlertActions driverId={view.driver.id} actions={card.alerts.flatMap((a) => a.actions)} alertIds={card.alerts.map((a) => a.id)} positionDependentDisabled={staleReason} resetScheduledAt={view.plannedResetAt} compact={compact} />
  const summaryContext = {
    minutesUntilLimit: view.minutesUntilLimit,
    remainingStops: view.remaining.length,
    remainingDriveMin: view.remainingDriveMin,
    driftMin: view.driftMin,
    unnotifiedLateStops: view.unnotifiedLateStops.length,
    unassignedStops: view.unassigned.length,
    pingAgeMin: view.pingAgeMin,
  }
  const status = (
    <>
      {view.driver.contactAttemptedAt !== undefined && <span>{LOOKOUT.called(fmtClock(view.driver.contactAttemptedAt))}</span>}
      {snoozedUntil !== undefined && <span>{LOOKOUT.snoozed(fmtClock(snoozedUntil))}</span>}
      <CorrectionChip driverId={view.driver.id} />
    </>
  )
  if (compact) {
    return (
      <article className={surface}>
        <RouteHeader view={view} card={card} />
        <div className="flex items-start gap-2 px-2.5 py-1.5">
          <Link to={`/routes/${view.driver.id}`} state={{ from }} title={`Open ${view.driver.name}'s route`} className="mt-0.5 shrink-0">
            <DriverAvatar driver={view.driver} size={24} />
          </Link>
          <div className="min-w-0 flex-1 py-px font-lookout">
            <Link to={`/routes/${view.driver.id}`} state={{ from }} className="block truncate text-[11px] font-semibold text-ink hover:underline">{view.driver.name}</Link>
            <ul className="mt-1 space-y-0.5">
              {card.alerts.map((a) => (
                <li key={a.id} className="flex items-start gap-1.5 text-[11px] leading-snug text-muted">
                  <span className={`mt-[0.38rem] h-1 w-1 shrink-0 rounded-full ${severityTone(a.severity).fill}`} aria-hidden="true" />
                  <span>{recommendationSummary(a.ruleId, summaryContext, a.title)}</span>
                </li>
              ))}
            </ul>
            {(stale || hasStatus) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-muted">
                {stale && <Chip tone={STALENESS_TONE[view.staleness]} dashed={offline} className="px-1.5 py-0 text-[9px] leading-4">{fmtAge(view.pingAgeMin)}</Chip>}
                {status}
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-line/40 px-2.5 py-1.5">{actions}</div>
      </article>
    )
  }
  return (
    <article className={surface}>
      <RouteHeader view={view} card={card} />
      <div className="flex">
        <RouteTimelineMini view={view} />
        <div className="min-w-0 flex-1">
          <div className="flex min-h-[3.75rem] min-w-0 items-center gap-2 px-2.5 py-2">
            <DriverAvatar driver={view.driver} size={26} />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <Link to={`/routes/${view.driver.id}`} state={{ from }} className="min-w-0 flex-1 truncate text-[12px] font-semibold leading-4 text-ink hover:underline">{view.driver.name}</Link>
                <span className="tnum shrink-0 text-[9px] leading-4 text-muted" title="Age of the last telematics ping">{fmtAge(view.pingAgeMin)}</span>
              </div>
              <span className="block truncate text-[10px] leading-4 text-muted">{view.truck.plate} · {view.driver.region}</span>
            </div>
          </div>
          <ul>
            {card.alerts.map((a) => (
              <li key={a.id} className="border-t border-line/80 px-2.5 py-2 font-lookout text-[12px] leading-snug">
                {!PRIORITY_RULES.has(a.ruleId) && <span className={`mb-1 block text-[9px] font-semibold uppercase tracking-[0.04em] ${severityTone(a.severity).text}`}>{a.label}</span>}
                <p><span className="font-semibold text-ink">{a.title}</span> <span className="text-muted">{a.body}</span></p>
              </li>
            ))}
          </ul>
          {hasStatus && <div className="flex flex-wrap items-center gap-2 border-t border-line/80 px-2.5 py-1.5 text-[10px] text-muted">{status}</div>}
          <div className="border-t border-line/80 px-2.5 py-2">{actions}</div>
        </div>
      </div>
    </article>
  )
}
