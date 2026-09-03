import { Link } from 'react-router'
import type { DriverCard } from '../alerts/types'
import type { DriverView } from '../store/view'
import Countdown from '../ui/Countdown'
import { BAND_TONE } from '../ui/tones'

/** The three most pressing alerts, one line each. It is ranked.slice(0, 3); if it ever
 *  needs its own logic, something upstream is wrong. */
export default function AlertBar({ cards, byId }: { cards: DriverCard[]; byId: Map<string, DriverView> }) {
  return (
    <ol className="flex flex-col divide-y divide-line border-b border-line">
      {cards.map((c) => {
        const v = byId.get(c.driverId)!
        const tone = BAND_TONE[c.band]
        const lead = c.alerts[0]
        return (
          <li key={c.driverId}>
            <Link to={`/routes/${c.driverId}`} className="flex items-center gap-2 px-4 py-2 text-[12px] hover:bg-well/60">
              <span className={`h-2 w-2 shrink-0 rounded-full ${v.staleness === 'offline' ? `border-2 border-dashed ${tone.border}` : tone.fill}`} aria-hidden="true" />
              <span className="truncate"><span className="font-semibold text-ink">{v.driver.name}</span> <span className="text-muted">· {lead.label.toLowerCase()}</span></span>
              <Countdown minutes={v.minutesUntilLimit} stale={v.staleness !== 'fresh'} className="ml-auto" />
            </Link>
          </li>
        )
      })}
    </ol>
  )
}
