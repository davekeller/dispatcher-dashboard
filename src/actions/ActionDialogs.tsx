import NotifyDialog from '../views/route/actions/NotifyDialog'
import ReassignDialog from '../views/route/actions/ReassignDialog'
import ResetDialog from '../views/route/actions/ResetDialog'
import { useActions } from './ActionContext'

/** Renders whichever dialog was requested. Lives in its own file so the dialogs can import
 *  useActions without a cycle. */
export default function ActionDialogs() {
  const { request, close } = useActions()
  if (!request) return null
  if (request.action === 'reassign') return <ReassignDialog key={request.driverId} driverId={request.driverId} initialStopIds={request.stopIds} initialToId={request.toId} onClose={close} />
  if (request.action === 'schedule_reset') return <ResetDialog key={request.driverId} driverId={request.driverId} initialAfterStopId={request.afterStopId} onClose={close} />
  return <NotifyDialog key={request.driverId} driverId={request.driverId} initialStopIds={request.stopIds} onClose={close} />
}
