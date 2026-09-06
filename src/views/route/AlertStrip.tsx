import { WarningCircle } from '@phosphor-icons/react'
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
  const hasCriticalAlert = card.alerts.some((alert) => alert.severity === 'critical')
  return (
    <Card className={`overflow-hidden ${hasCriticalAlert ? 'critical-alert-card border-[1.5px]' : ''}`}>
      <ul className="divide-y divide-line">
        {card.alerts.map((a) => {
          const tone = severityTone(a.severity)
          const critical = a.severity === 'critical'
          return (
            <li key={a.id} className="grid min-h-16 grid-cols-[2.75rem_minmax(0,1fr)_auto] items-stretch">
              <div className={`flex items-center justify-center border-r border-line ${critical ? 'bg-act-now-soft/75' : tone.soft}`}>
                <WarningCircle size={18} weight={critical ? 'fill' : 'duotone'} className={critical ? 'text-act-now' : tone.text} aria-hidden="true" />
              </div>
              <div className="flex min-w-0 items-center gap-3 px-3 py-3">
                <Chip tone={tone}>{a.label}</Chip>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink">{a.title}</p>
                  <p className="text-[12px] text-muted">{a.body}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center py-3 pl-2 pr-3">
                <AlertActions driverId={view.driver.id} actions={a.actions} alertIds={[a.id]} positionDependentDisabled={reason} resetScheduledAt={view.plannedResetAt} singleLine />
              </div>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
