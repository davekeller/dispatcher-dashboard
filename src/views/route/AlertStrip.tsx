import type { DriverCard } from '../../alerts/types'
import { fmtAge } from '../../lib/format'
import AlertActions from '../../lookout/AlertActions'
import type { DriverView } from '../../store/view'
import Chip from '../../ui/Chip'
import { severityTone } from '../../ui/tones'

/** One row per firing rule. Copy and actions come from the rule object, so a rule added
 *  live during the walkthrough renders here with no new UI. */
export default function AlertStrip({ view, card }: { view: DriverView; card: DriverCard }) {
  const reason = view.staleness !== 'fresh' ? `Last ping ${fmtAge(view.pingAgeMin)}. Position-dependent actions are disabled until the truck reports in.` : undefined
  return (
    <ul className="flex flex-col gap-2">
      {card.alerts.map((a) => {
        const tone = severityTone(a.severity)
        return (
          <li key={a.id} className={`flex items-start gap-3 rounded-card border border-line border-l-4 bg-panel px-4 py-3 shadow-card ${tone.border}`}>
            <Chip tone={tone} className="mt-0.5">{a.label}</Chip>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-ink">{a.title}</p>
              <p className="text-[12px] text-muted">{a.body}</p>
            </div>
            <AlertActions driverId={view.driver.id} actions={a.actions} alertIds={[a.id]} positionDependentDisabled={reason} resetScheduledAt={view.plannedResetAt} />
          </li>
        )
      })}
    </ul>
  )
}
