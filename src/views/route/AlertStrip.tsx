import type { DriverCard } from '../../alerts/types'
import { fmtAge } from '../../lib/format'
import AlertActions from '../../lookout/AlertActions'
import type { DriverView } from '../../store/view'
import Card from '../../ui/Card'
import Chip from '../../ui/Chip'
import { severityTone } from '../../ui/tones'

/** One full-width row per firing rule. Copy and actions come from the rule object, so a rule
 *  added live during the walkthrough renders in the alert card with no new UI. */
export default function AlertStrip({ view, card }: { view: DriverView; card: DriverCard }) {
  const reason = view.staleness !== 'fresh' ? `Last ping ${fmtAge(view.pingAgeMin)}. Position-dependent actions are disabled until the truck reports in.` : undefined
  return (
    <Card className="overflow-hidden">
      <ul className="divide-y divide-line">
        {card.alerts.map((a) => {
          const tone = severityTone(a.severity)
          return (
            <li key={a.id} className="flex min-h-16 items-center gap-4 px-4 py-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Chip tone={tone}>{a.label}</Chip>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink">{a.title}</p>
                  <p className="text-[12px] text-muted">{a.body}</p>
                </div>
              </div>
              <div className="ml-auto shrink-0">
                <AlertActions driverId={view.driver.id} actions={a.actions} alertIds={[a.id]} positionDependentDisabled={reason} resetScheduledAt={view.plannedResetAt} singleLine />
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
