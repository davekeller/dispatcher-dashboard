import type { DriverCard } from '../../alerts/types'
import { BAND_LABEL } from '../../bands'
import type { DutyStatus } from '../../data/types'
import { fmtAge, fmtClock, fmtDrift } from '../../lib/format'
import type { DriverView } from '../../store/view'
import Avatar from '../../ui/Avatar'
import Card from '../../ui/Card'
import Chip from '../../ui/Chip'
import CorrectionChip from '../../ui/CorrectionChip'
import Countdown from '../../ui/Countdown'
import { BAND_TONE, STALENESS_TONE } from '../../ui/tones'

const STATUS_LABEL: Record<DutyStatus, string> = { driving: 'driving', on_duty: 'on duty at a stop', on_break: 'on break', off_duty: 'off duty' }

export default function RouteHeader({ view, card }: { view: DriverView; card: DriverCard }) {
  const tone = BAND_TONE[card.band]
  const stale = view.staleness !== 'fresh'
  const offline = view.staleness === 'offline'
  return (
    <Card className="flex items-center gap-5 px-5 py-4">
      <Avatar initials={view.driver.initials} size="lg" />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight">{view.driver.name}</h2>
          <Chip tone={tone} dashed={offline}>{card.severity === 'critical' ? 'Over limit' : BAND_LABEL[card.band]}</Chip>
          <Chip tone={view.driftMin > 5 ? BAND_TONE.watch : BAND_TONE.clear}>{fmtDrift(view.driftMin)}</Chip>
          <CorrectionChip driverId={view.driver.id} />
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
    </Card>
  )
}
