import { useActions } from '../actions/ActionContext'
import type { ActionId } from '../alerts/types'
import { fmtClock } from '../lib/format'
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

const COMPACT_LABEL: Record<ActionId, string> = {
  reassign: 'Reassign',
  schedule_reset: 'Reset',
  notify_customer: 'Notify',
  call_driver: 'Call',
  acknowledge: 'Snooze',
}

/** The one place action buttons are rendered. The rail and the route file both use it, so
 *  the same handler runs from either surface. Dialog actions open a dialog; the two light
 *  actions confirm inline. `positionDependentDisabled` carries the stale-data reason. */
export default function AlertActions({ driverId, actions, alertIds, positionDependentDisabled, resetScheduledAt, singleLine = false, compact = false }: { driverId: string; actions: ActionId[]; alertIds: string[]; positionDependentDisabled?: string; resetScheduledAt?: number; singleLine?: boolean; compact?: boolean }) {
  const { open } = useActions()
  const callDriver = useStore((s) => s.callDriver)
  const acknowledge = useStore((s) => s.acknowledge)
  const unique = [...new Set(actions)]
  const labels = compact ? COMPACT_LABEL : LABEL
  return (
    <div className={`flex justify-end gap-1.5 ${singleLine ? 'flex-nowrap whitespace-nowrap' : 'flex-wrap'}`}>
      {unique.map((a) => {
        if (a === 'call_driver') return <ActionConfirm key={a} label={labels[a]} confirmLabel="Place call" doneLabel="Call logged" compact={compact} onConfirm={() => callDriver(driverId)} />
        if (a === 'acknowledge') return <ActionConfirm key={a} label={labels[a]} confirmLabel="Snooze" doneLabel="Snoozed" compact={compact} onConfirm={() => alertIds.forEach((id) => acknowledge(id))} />
        const stale = positionDependentDisabled !== undefined && (a === 'reassign' || a === 'notify_customer')
        const resetDone = a === 'schedule_reset' && resetScheduledAt !== undefined
        const disabled = stale || resetDone
        const title = stale ? positionDependentDisabled : resetDone ? `Reset already scheduled for ${fmtClock(resetScheduledAt)}` : undefined
        return (
          <Button key={a} size="sm" variant={a === 'reassign' ? 'danger' : 'secondary'} className={compact ? 'h-6 px-2 text-[10px]' : ''} disabled={disabled} title={title} onClick={() => open(a, driverId)}>
            {labels[a]}
          </Button>
        )
      })}
    </div>
  )
}
