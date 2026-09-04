import { Link } from 'react-router'
import type { DriverCard } from '../../alerts/types'
import { LIMIT_MIN } from '../../hos/constants'
import { fmtAge } from '../../lib/format'
import { useStore } from '../../store/store'
import type { DriverView } from '../../store/view'
import Bar from '../../ui/Bar'
import Chip from '../../ui/Chip'
import CorrectionChip from '../../ui/CorrectionChip'
import DriverAvatar from '../../ui/DriverAvatar'
import Countdown from '../../ui/Countdown'
import { BAND_TONE, LOOKOUT_TONE, STALENESS_TONE, severityTone } from '../../ui/tones'

/** One route, one driver, one truck. Color is attention: a clear card is quiet, and only
 *  the marker strip, the glyph, and the badges carry band color. Nothing drags. */
export default function RouteCard({ view, card, pick = false }: { view: DriverView; card: DriverCard; pick?: boolean }) {
  const tone = BAND_TONE[card.band]
  const quiet = card.band === 'clear' && !pick
  const stale = view.staleness !== 'fresh'
  const offline = view.staleness === 'offline'
  const surface = quiet ? 'border-line/70 bg-panel/80 opacity-80 hover:opacity-100' : 'border-line bg-panel shadow-card'
  const dim = card.snoozed ? 'opacity-60' : ''
  const hasCorrection = useStore((s) => Boolean(s.corrections[view.driver.id]))
  return (
    <Link to={`/routes/${view.driver.id}`} className={`group flex overflow-hidden rounded-card border transition hover:border-ink/30 hover:shadow-md ${surface} ${dim}`}>
      <div className={`w-1.5 shrink-0 transition-colors duration-300 ${offline ? `border-l-[6px] border-dashed ${tone.border} bg-transparent` : tone.fill}`} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <DriverAvatar driver={view.driver} size={22} className={quiet ? 'opacity-80' : ''} />
          <span className="truncate text-[13px] font-semibold text-ink" title={`${view.driver.name} · ${view.truck.plate}`}>{view.driver.name}</span>
          <Countdown minutes={view.minutesUntilLimit} stale={stale} className="ml-auto" />
        </div>
        <Bar value={view.drivingMin / LIMIT_MIN} tone={quiet ? { ...tone, fill: 'bg-offline-fill' } : tone} />
        <div className="flex items-center gap-2 text-[11px] text-muted">
          <span className="tnum font-medium text-ink">{view.done}/{view.total}</span>
          <span className="truncate">{view.next ? `next · ${nextLabel(view)}` : view.unassigned.length ? `${view.unassigned.length} need a driver` : 'route complete'}</span>
          <Chip tone={STALENESS_TONE[view.staleness]} dashed={offline} className="ml-auto" title="Age of the last telematics ping">{fmtAge(view.pingAgeMin)}</Chip>
        </div>
        {(card.alerts.length > 0 || pick || hasCorrection) && (
          <div className="flex flex-wrap gap-1">
            {pick && <Chip tone={LOOKOUT_TONE} title="Lookout's top pick across the fleet">✦ Lookout's pick</Chip>}
            <CorrectionChip driverId={view.driver.id} />
            {card.alerts.map((a) => (
              <Chip key={a.id} tone={severityTone(a.severity)} title={a.title}>{a.label}</Chip>
            ))}
          </div>
        )}
      </div>
    </Link>
  )
}

function nextLabel(view: DriverView): string {
  const s = view.next!
  return `stop ${s.seq}${s.status === 'in_progress' ? ' · at the dock' : ''}`
}
