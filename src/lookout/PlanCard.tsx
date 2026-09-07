import { useActions } from '../actions/ActionContext'
import { fmtAge } from '../lib/format'
import { useStore } from '../store/store'
import type { DriverView } from '../store/view'
import Button from '../ui/Button'
import { severityTone } from '../ui/tones'
import ActionConfirm from './ActionConfirm'
import type { Plan } from './plans'

/** One plan: the recommendation as a sentence, the figures behind it, and the one button that
 *  opens the matching dialog already filled in. */
export default function PlanCard({ plan, view }: { plan: Plan; view: DriverView }) {
  const { open } = useActions()
  const callDriver = useStore((s) => s.callDriver)
  const stale = view.staleness !== 'fresh'
  const tone = severityTone(plan.severity)
  const blocked = Boolean(plan.positionDependent && stale)
  const blockedReason = blocked ? `Last ping ${fmtAge(view.pingAgeMin)}. Position-dependent actions are disabled until the truck reports in.` : undefined
  const action = plan.action
  return (
    <article className="rounded-control border border-line/60 bg-panel/70 px-2.5 py-2">
      <div className="flex items-start gap-2">
        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${plan.severity === 'none' ? 'bg-clear-fill' : tone.fill}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold leading-snug text-ink">{plan.title}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted">{plan.body}</p>
        </div>
      </div>
      {(action || plan.call) && (
        <div className="mt-1.5 flex flex-wrap gap-1.5 pl-4">
          {action && (
            <Button size="sm" variant={plan.kind === 'reassign' || plan.kind === 'assign' ? 'primary' : 'secondary'} disabled={blocked} title={blockedReason} onClick={() => open(action.action, view.driver.id, { stopIds: action.stopIds, toId: action.toId, afterStopId: action.afterStopId })}>
              {action.label}
            </Button>
          )}
          {plan.call && <ActionConfirm label="Call driver" confirmLabel="Place call" doneLabel="Call logged" onConfirm={() => callDriver(view.driver.id)} />}
        </div>
      )}
    </article>
  )
}
