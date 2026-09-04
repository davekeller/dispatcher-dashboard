import type { DriverCard } from '../alerts/types'
import type { DriverView } from '../store/view'
import Chip from './Chip'
import Countdown from './Countdown'
import { BAND_TONE, severityTone } from './tones'

/** Rules whose label earns the header chip. Everything else lists lower on the card. */
export const PRIORITY_RULES = new Set(['over_limit', 'limit_act_now', 'limit_watch', 'behind_schedule'])

export function priorityAlertOf(card: DriverCard) {
  return card.alerts.find((alert) => PRIORITY_RULES.has(alert.ruleId))
}

/** The top line every route card shares, on the board and in the Lookout bar: band dot,
 *  route id, the priority chip, and the countdown on the right. One component, so the
 *  two surfaces cannot drift apart and an over-limit card never loses its chip. */
export default function RouteHeader({ view, card }: { view: DriverView; card: DriverCard }) {
  const tone = BAND_TONE[card.band]
  const offline = view.staleness === 'offline'
  const priorityAlert = priorityAlertOf(card)
  return (
    <div className="flex items-center gap-2 border-b border-line/70 py-1.5 pl-3 pr-2">
      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${offline ? `border-2 border-dashed ${tone.border}` : tone.fill}`} aria-hidden="true" />
      <span className="shrink-0 whitespace-nowrap font-mono text-[12px] font-semibold tracking-tight text-ink" title={`Route ${view.route.id.toUpperCase()}`}>{view.route.id.toUpperCase()}</span>
      <span className="ml-auto flex min-w-0 items-center gap-1.5">
        {priorityAlert && <Chip tone={severityTone(priorityAlert.severity)} className="px-1.5 py-0 text-[9px] leading-4" title={priorityAlert.title}>{priorityAlert.label}</Chip>}
        <Countdown minutes={view.minutesUntilLimit} stale={view.staleness !== 'fresh'} />
      </span>
    </div>
  )
}
