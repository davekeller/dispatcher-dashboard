import { Link } from 'react-router'
import type { DriverCard } from '../alerts/types'
import { fmtAge, fmtClock } from '../lib/format'
import { useStore } from '../store/store'
import type { DriverView } from '../store/view'
import Avatar from '../ui/Avatar'
import Chip from '../ui/Chip'
import Countdown from '../ui/Countdown'
import { BAND_TONE, STALENESS_TONE, severityTone } from '../ui/tones'
import AlertActions from './AlertActions'
import { LOOKOUT } from './voice'

/** One card per driver, every reason on it, 2–3 actions. Same handlers as the route file. */
export default function RecommendationCard({ view, card, pinned = false }: { view: DriverView; card: DriverCard; pinned?: boolean }) {
  const snoozes = useStore((s) => s.snoozes)
  const tone = BAND_TONE[card.band]
  const stale = view.staleness !== 'fresh'
  const offline = view.staleness === 'offline'
  const staleReason = stale ? `Last ping ${fmtAge(view.pingAgeMin)}. Position-dependent actions are disabled until the truck reports in.` : undefined
  const snoozedUntil = card.snoozed ? Math.max(...card.alerts.map((a) => snoozes[a.id] ?? 0)) : undefined
  return (
    <article className={`rounded-card border bg-panel p-3 shadow-card ${pinned ? 'border-lookout/50' : 'border-line'} ${card.snoozed ? 'opacity-60' : ''}`}>
      <header className="flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${offline ? `border-2 border-dashed ${tone.border}` : tone.fill}`} aria-hidden="true" />
        <Avatar initials={view.driver.initials} size="sm" />
        <Link to={`/routes/${view.driver.id}`} className="truncate text-[13px] font-semibold text-ink hover:underline">{view.driver.name}</Link>
        <span className="text-[11px] text-muted">{view.driver.region}</span>
        <Countdown minutes={view.minutesUntilLimit} stale={stale} className="ml-auto" />
      </header>
      <ul className="mt-2 flex flex-col gap-1.5">
        {card.alerts.map((a) => (
          <li key={a.id} className="text-[12px] leading-snug">
            <Chip tone={severityTone(a.severity)} className="mr-1.5 align-middle">{a.label}</Chip>
            <span className="font-semibold text-ink">{a.title}</span> <span className="text-muted">{a.body}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
        <Chip tone={STALENESS_TONE[view.staleness]} dashed={offline}>{fmtAge(view.pingAgeMin)}</Chip>
        {view.driver.contactAttemptedAt !== undefined && <span>{LOOKOUT.called(fmtClock(view.driver.contactAttemptedAt))}</span>}
        {snoozedUntil !== undefined && <span>{LOOKOUT.snoozed(fmtClock(snoozedUntil))}</span>}
      </div>
      <div className="mt-2.5">
        <AlertActions driverId={view.driver.id} actions={card.alerts.flatMap((a) => a.actions)} alertIds={card.alerts.map((a) => a.id)} positionDependentDisabled={staleReason} />
      </div>
    </article>
  )
}
