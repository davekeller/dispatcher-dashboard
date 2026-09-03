import { fmtClock, fmtCountdown, fmtHm } from '../../lib/format'
import type { DriverView } from '../../store/view'
import Card from '../../ui/Card'

export default function DayMetrics({ view }: { view: DriverView }) {
  const stale = view.staleness !== 'fresh'
  const fits = view.remainingDriveMin <= view.minutesUntilLimit
  const items = [
    { label: 'Driving today', value: fmtHm(view.drivingMin), sub: 'of 11:00' },
    { label: 'On duty', value: fmtHm(view.shiftElapsedMin), sub: `since ${fmtClock(view.driver.shiftStartedAt)}` },
    { label: 'Break', value: view.breakMin > 0 ? fmtHm(view.breakMin) : 'none yet', sub: view.breakMin > 0 ? 'taken today' : 'no 30-min break yet', tone: view.breakMin === 0 ? 'text-watch' : undefined },
    { label: 'Stops', value: `${view.done} / ${view.remaining.length}`, sub: 'done · remaining' },
    { label: 'Driving left vs. limit', value: `${fmtHm(view.remainingDriveMin)} vs ${fmtCountdown(view.minutesUntilLimit, stale)}`, sub: fits ? 'fits before the limit' : 'does not fit', tone: fits ? 'text-clear' : 'text-act-now' },
  ]
  return (
    <div className="grid grid-cols-5 gap-3">
      {items.map((m) => (
        <Card key={m.label} className="px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-label">{m.label}</p>
          <p className={`tnum mt-1 font-display text-2xl font-semibold leading-none ${m.tone ?? 'text-ink'}`}>{m.value}</p>
          <p className="mt-1 text-[11px] text-muted">{m.sub}</p>
        </Card>
      ))}
    </div>
  )
}
