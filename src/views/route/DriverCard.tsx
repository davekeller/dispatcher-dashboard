import type { DriverCard as Ranked } from '../../alerts/types'
import { BAND_LABEL } from '../../bands'
import type { DutyStatus } from '../../data/types'
import { fmtAge, fmtClock, fmtCountdown, fmtDrift, fmtHm } from '../../lib/format'
import type { DriverView } from '../../store/view'
import DriverAvatar from '../../ui/DriverAvatar'
import Card from '../../ui/Card'
import Chip from '../../ui/Chip'
import CorrectionChip from '../../ui/CorrectionChip'
import Countdown from '../../ui/Countdown'
import { BAND_TONE, CRITICAL_TONE, STALENESS_TONE } from '../../ui/tones'

const STATUS_LABEL: Record<DutyStatus, string> = { driving: 'driving', on_duty: 'on duty at a stop', on_break: 'on break', off_duty: 'off duty' }
const TOP_BORDER = {
  act_now: 'border-t-act-now-fill',
  watch: 'border-t-watch-fill',
  offline: 'border-t-offline-fill',
  break: 'border-t-break-fill',
  clear: 'border-t-nav-selected-ink',
} as const

/** The route's assigned driver and their day: identity and countdown above the five figures that matter. */
export default function DriverCard({ view, card }: { view: DriverView; card: Ranked }) {
  const tone = BAND_TONE[card.band]
  const stale = view.staleness !== 'fresh'
  const offline = view.staleness === 'offline'
  const overLimit = view.minutesUntilLimit <= 0
  const topBorder = overLimit ? 'border-t-act-now' : TOP_BORDER[card.band]
  const fits = view.remainingDriveMin <= view.minutesUntilLimit
  const metrics = [
    { label: 'Driving today', value: fmtHm(view.drivingMin), sub: 'of 11:00' },
    { label: 'On duty', value: fmtHm(view.shiftElapsedMin), sub: `since ${fmtClock(view.driver.shiftStartedAt)}` },
    { label: 'Break', value: view.breakMin > 0 ? fmtHm(view.breakMin) : 'none yet', sub: view.breakMin > 0 ? 'taken today' : 'no 30-min break yet', tone: view.breakMin === 0 ? 'text-watch' : undefined },
    { label: 'Stops', value: `${view.done} / ${view.remaining.length}`, sub: 'done · remaining' },
    { label: 'Driving left vs. limit', value: `${fmtHm(view.remainingDriveMin)} vs ${fmtCountdown(view.minutesUntilLimit, stale)}`, sub: view.remaining.length === 0 ? 'route complete' : fits ? 'fits before the limit' : 'does not fit', tone: view.remaining.length === 0 ? undefined : fits ? 'text-clear' : 'text-act-now' },
  ]
  return (
    <Card className={`route-detail-card overflow-hidden border-t-[3px] ${topBorder}`}>
      <div className="flex items-center gap-5 px-5 py-4">
        <DriverAvatar driver={view.driver} size={56} />
        <div className="min-w-0">
          <p className="mb-1 text-[9px] font-semibold uppercase leading-none tracking-[0.06em] text-label">Assigned driver</p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl font-semibold tracking-tight">{view.driver.name}</h2>
            <Chip tone={card.severity === 'critical' ? CRITICAL_TONE : tone} dashed={offline}>{card.severity === 'critical' ? 'Over limit' : BAND_LABEL[card.band]}</Chip>
            <Chip tone={view.driftMin > 5 ? BAND_TONE.watch : BAND_TONE.clear}>{fmtDrift(view.driftMin)}</Chip>
            <CorrectionChip driverId={view.driver.id} />
            {view.plannedResetAt !== undefined && <Chip tone={BAND_TONE.break}>reset at {fmtClock(view.plannedResetAt)}</Chip>}
          </div>
          <p className="mt-1 text-[12px] text-muted">
            {view.truck.plate} · {view.driver.region} · on duty since {fmtClock(view.driver.shiftStartedAt)} · {STATUS_LABEL[view.status]}
          </p>
        </div>
        <div className="ml-auto flex flex-col items-end gap-1">
          <Countdown minutes={view.minutesUntilLimit} stale={stale} size="lg" />
          <span className="flex items-center gap-2 text-[11px] text-muted">
            {view.minutesUntilLimit <= 0 ? 'past the 11-hour limit' : 'to the 11-hour limit'}
            <Chip tone={STALENESS_TONE[view.staleness]} dashed={offline} title="Age of the last telematics ping">{fmtAge(view.pingAgeMin)}</Chip>
          </span>
        </div>
      </div>
      <dl className="grid grid-cols-5 divide-x divide-line border-t border-line">
        {metrics.map((m) => (
          <div key={m.label} className="flex min-h-[5.25rem] min-w-0 flex-col justify-center px-4 py-3">
            <dt className="text-[9px] font-semibold uppercase leading-3 tracking-[0.04em] text-label">{m.label}</dt>
            <dd className={`tnum mt-1 font-display text-xl font-semibold leading-none ${m.tone ?? 'text-ink'}`}>{m.value}</dd>
            <dd className="mt-1 truncate text-[10px] text-muted" title={m.sub}>{m.sub}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
