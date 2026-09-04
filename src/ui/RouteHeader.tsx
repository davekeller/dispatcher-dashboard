import type { DriverCard } from '../alerts/types'
import { fmtAge, fmtCompactAge } from '../lib/format'
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
 *  route id, the priority chip, and the countdown on the right. The dot occupies the
 *  same 24px track as the miniature timeline below it on full cards. */
export default function RouteHeader({ view, card, showPingAge = false }: { view: DriverView; card: DriverCard; showPingAge?: boolean }) {
  const tone = BAND_TONE[card.band]
  const offline = view.staleness === 'offline'
  const priorityAlert = priorityAlertOf(card)
  return (
    <div className="flex min-h-10 items-center border-b border-line/70 pr-2">
      <span className="flex w-6 shrink-0 items-center justify-center" aria-hidden="true">
        <span className={`h-2 w-2 rounded-full ${offline ? `border border-dashed ${tone.border}` : tone.fill}`} />
      </span>
      <span className={`shrink-0 whitespace-nowrap font-mono font-semibold tracking-tight text-ink ${showPingAge ? 'text-[12px]' : 'text-[13px]'}`} title={`Route ${view.route.id.toUpperCase()}`}>{view.route.id.toUpperCase()}</span>
      {showPingAge && <span className="tnum ml-1.5 whitespace-nowrap text-[8px] leading-4 text-muted" title={`Updated ${fmtAge(view.pingAgeMin)}`}>{fmtCompactAge(view.pingAgeMin)}</span>}
      <span className={`ml-auto flex min-w-0 items-center ${showPingAge ? 'gap-1' : 'gap-1.5'}`}>
        {priorityAlert && <Chip tone={severityTone(priorityAlert.severity)} className={showPingAge ? 'px-1 py-0 text-[8px] leading-3.5' : 'px-1.5 py-0 text-[9px] leading-4'} title={priorityAlert.title}>{priorityAlert.label}</Chip>}
        <Countdown minutes={view.minutesUntilLimit} stale={view.staleness !== 'fresh'} size={showPingAge ? 'xs' : 'sm'} />
      </span>
    </div>
  )
}
