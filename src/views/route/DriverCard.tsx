import type { DriverCard as Ranked } from '../../alerts/types'
import { BAND_LABEL } from '../../bands'
import type { DutyStatus } from '../../data/types'
import { fmtAge, fmtClock, fmtCountdown, fmtDrift, fmtHm } from '../../lib/format'
import type { DriverView } from '../../store/view'
import Avatar from '../../ui/Avatar'
import Card from '../../ui/Card'
import Chip from '../../ui/Chip'
import CorrectionChip from '../../ui/CorrectionChip'
import Countdown from '../../ui/Countdown'
import { BAND_TONE, STALENESS_TONE } from '../../ui/tones'

const STATUS_LABEL: Record<DutyStatus, string> = { driving: 'driving', on_duty: 'on duty at a stop', on_break: 'on break', off_duty: 'off duty' }

/** The driver and the day in one card: who, where they stand, the five figures that matter,
 *  Alerts sit under it; the stops under those; the route rail carries the day's timeline. */
export default function DriverCard({ view, card }: { view: DriverView; card: Ranked }) {
  const tone = BAND_TONE[card.band]
  const stale = view.staleness !== 'fresh'
  const offline = view.staleness === 'offline'
  const fits = view.remainingDriveMin <= view.minutesUntilLimit
  const metrics = [
    { label: 'Driving today', value: fmtHm(view.drivingMin), sub: 'of 11:00' },
    { label: 'On duty', value: fmtHm(view.shiftElapsedMin), sub: `since ${fmtClock(view.driver.shiftStartedAt)}` },
    { label: 'Break', value: view.breakMin > 0 ? fmtHm(view.breakMin) : 'none yet', sub: view.breakMin > 0 ? 'taken today' : 'no 30-min break yet', tone: view.breakMin === 0 ? 'text-watch' : undefined },
    { label: 'Stops', value: `${view.done} / ${view.remaining.length}`, sub: 'done · remaining' },
    { label: 'Driving left vs. limit', value: `${fmtHm(view.remainingDriveMin)} vs ${fmtCountdown(view.minutesUntilLimit, stale)}`, sub: view.remaining.length === 0 ? 'route complete' : fits ? 'fits before the limit' : 'does not fit', tone: view.remaining.length === 0 ? undefined : fits ? 'text-clear' : 'text-act-now' },
  ]
  return (
    <Card className="px-5 py-4">
      <div className="flex items-center gap-5">
        <Avatar initials={view.driver.initials} size="lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl font-semibold tracking-tight">{view.driver.name}</h2>
            <Chip tone={tone} dashed={offline}>{card.severity === 'critical' ? 'Over limit' : BAND_LABEL[card.band]}</Chip>
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
      <dl className="mt-4 grid grid-cols-5 gap-3 border-t border-line pt-3">
        {metrics.map((m) => (
          <div key={m.label}>
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-label">{m.label}</dt>
            <dd className={`tnum mt-0.5 font-display text-xl font-semibold leading-none ${m.tone ?? 'text-ink'}`}>{m.value}</dd>
            <dd className="mt-1 text-[11px] text-muted">{m.sub}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
