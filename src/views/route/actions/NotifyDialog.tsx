import { useState } from 'react'
import { projectedEta } from '../../../hos/compute'
import { fmtClock, fmtMinutes } from '../../../lib/format'
import { useDerived } from '../../../store/hooks'
import { useStore } from '../../../store/store'
import Button from '../../../ui/Button'
import Modal from '../../../ui/Modal'

/** Pre-filled, editable, confirmed. Stamps the stops so the schedule rule and the receipts know. */
export default function NotifyDialog({ driverId, initialStopIds, onClose }: { driverId: string; initialStopIds?: string[]; onClose: () => void }) {
  const d = useDerived()
  const notify = useStore((s) => s.notifyCustomer)
  const deliveries = useStore((s) => s.fleet.deliveries)
  const view = d.byId.get(driverId)!
  const affected = view.lateStops.length > 0 ? view.lateStops : view.remaining.filter((s) => s.status === 'pending')
  const [ids, setIds] = useState<string[]>(() => initialStopIds?.length ? initialStopIds : affected.filter((s) => s.notifiedAt === undefined).map((s) => s.id))
  const delay = Math.max(5, Math.round(view.driftMin / 5) * 5)
  const firstEta = affected.find((s) => ids.includes(s.id))
  const [message, setMessage] = useState(
    () => `Hi, this is dispatch. Your delivery is running about ${fmtMinutes(delay)} late; the new ETA is around ${fmtClock(firstEta ? projectedEta(firstEta, view.driftMin) : view.now)}. Sorry for the delay.`,
  )
  const customer = (deliveryId: string) => deliveries.find((x) => x.id === deliveryId)?.customer ?? deliveryId
  const toggle = (id: string) => setIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  return (
    <Modal
      title="Notify customers"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={ids.length === 0} onClick={() => { notify(ids); onClose() }}>Send to {ids.length} customer{ids.length === 1 ? '' : 's'}</Button>
        </>
      }
    >
      <ul className="flex flex-col gap-1">
        {affected.map((s) => (
          <li key={s.id}>
            <label className="flex items-center gap-2 rounded-control px-2 py-1 text-[13px] hover:bg-well">
              <input type="checkbox" checked={ids.includes(s.id)} onChange={() => toggle(s.id)} className="accent-ink" />
              <span className="tnum w-5 text-muted">{s.seq}</span>
              <span className="font-medium">{customer(s.deliveryId)}</span>
              <span className="tnum ml-auto text-[11px] text-muted">{s.notifiedAt !== undefined ? `notified ${fmtClock(s.notifiedAt)}` : `projected ${fmtClock(projectedEta(s, view.driftMin))}`}</span>
            </label>
          </li>
        ))}
      </ul>
      <label className="mt-4 block text-[11px] font-semibold uppercase tracking-wide text-label">
        Message
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} className="mt-1 w-full rounded-control border border-line bg-panel px-3 py-2 text-[13px] font-normal normal-case tracking-normal text-ink outline-none focus:border-ink/50" />
      </label>
    </Modal>
  )
}
