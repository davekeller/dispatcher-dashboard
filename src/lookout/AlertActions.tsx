import { useActions } from '../actions/ActionContext'
import type { ActionId } from '../alerts/types'
import { useStore } from '../store/store'
import Button from '../ui/Button'
import ActionConfirm from './ActionConfirm'

const LABEL: Record<ActionId, string> = {
  reassign: 'Reassign stops',
  schedule_reset: 'Schedule reset',
  notify_customer: 'Notify customers',
  call_driver: 'Call driver',
  acknowledge: 'Snooze 10 min',
}

/** The one place action buttons are rendered. The rail and the route file both use it, so
 *  the same handler runs from either surface. Dialog actions open a dialog; the two light
 *  actions confirm inline. `positionDependentDisabled` carries the stale-data reason. */
export default function AlertActions({ driverId, actions, alertIds, positionDependentDisabled }: { driverId: string; actions: ActionId[]; alertIds: string[]; positionDependentDisabled?: string }) {
  const { open } = useActions()
  const callDriver = useStore((s) => s.callDriver)
  const acknowledge = useStore((s) => s.acknowledge)
  const unique = [...new Set(actions)]
  return (
    <div className="flex flex-wrap gap-1.5">
      {unique.map((a) => {
        if (a === 'call_driver') return <ActionConfirm key={a} label={LABEL[a]} confirmLabel="Place call" doneLabel="Call logged" onConfirm={() => callDriver(driverId)} />
        if (a === 'acknowledge') return <ActionConfirm key={a} label={LABEL[a]} confirmLabel="Snooze" doneLabel="Snoozed" onConfirm={() => alertIds.forEach((id) => acknowledge(id))} />
        const disabled = positionDependentDisabled !== undefined && (a === 'reassign' || a === 'notify_customer')
        return (
          <Button key={a} size="sm" variant={a === 'reassign' ? 'primary' : 'secondary'} disabled={disabled} title={disabled ? positionDependentDisabled : undefined} onClick={() => open(a, driverId)}>
            {LABEL[a]}
          </Button>
        )
      })}
    </div>
  )
}
