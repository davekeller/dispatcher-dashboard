import { useState } from 'react'
import { projectedDepartureAt } from '../../../hos/compute'
import { fmtClock } from '../../../lib/format'
import { suggestResetStop } from '../../../store/actions'
import { useDerived } from '../../../store/hooks'
import { useStore } from '../../../store/store'
import Button from '../../../ui/Button'
import Chip from '../../../ui/Chip'
import Modal from '../../../ui/Modal'
import { BAND_TONE } from '../../../ui/tones'

/** Pick the stop after which the driver goes off duty for ten hours. Stops after that point
 *  need another driver; the dialog says so in numbers before anything commits. */
export default function ResetDialog({ driverId, onClose }: { driverId: string; onClose: () => void }) {
  const d = useDerived()
  const scheduleReset = useStore((s) => s.scheduleReset)
  const deliveries = useStore((s) => s.fleet.deliveries)
  const view = d.byId.get(driverId)!
  const suggested = suggestResetStop(view)
  const [afterId, setAfterId] = useState<string | null>(suggested)
  const idx = afterId === null ? -1 : view.remaining.findIndex((s) => s.id === afterId)
  const orphaned = view.remaining.slice(idx + 1).filter((s) => s.status === 'pending').length
  const resetAt = afterId === null ? view.now : projectedDepartureAt(view.route, afterId, view.now)
  const customer = (deliveryId: string) => deliveries.find((x) => x.id === deliveryId)?.customer ?? deliveryId

  return (
    <Modal
      title={`Schedule ${view.driver.name}'s reset`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={() => { scheduleReset(driverId, afterId); onClose() }}>Confirm reset at {fmtClock(resetAt)}</Button>
        </>
      }
    >
      <ul className="flex flex-col gap-1">
        <li>
          <label className={`flex items-center gap-3 rounded-control border px-3 py-2 text-[13px] ${afterId === null ? 'border-ink bg-well' : 'border-line hover:bg-well/60'}`}>
            <input type="radio" name="after" checked={afterId === null} onChange={() => setAfterId(null)} className="accent-ink" />
            <span className="font-semibold">Reset now</span>
            <span className="text-muted">every remaining stop needs a driver</span>
          </label>
        </li>
        {view.remaining.map((s) => (
          <li key={s.id}>
            <label className={`flex items-center gap-3 rounded-control border px-3 py-2 text-[13px] ${afterId === s.id ? 'border-ink bg-well' : 'border-line hover:bg-well/60'}`}>
              <input type="radio" name="after" checked={afterId === s.id} onChange={() => setAfterId(s.id)} className="accent-ink" />
              <span className="tnum w-5 text-muted">{s.seq}</span>
              <span className="font-semibold">after {customer(s.deliveryId)}</span>
              {s.id === suggested && <Chip tone={BAND_TONE.clear}>last stop that fits</Chip>}
              <span className="tnum ml-auto text-[12px] text-muted">departs ~{fmtClock(projectedDepartureAt(view.route, s.id, view.now))}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12px] text-muted">
        {view.driver.name.split(' ')[0]} goes off duty at <span className="tnum font-semibold text-ink">{fmtClock(resetAt)}</span> for 10 hours.{' '}
        {orphaned > 0 ? <span className="font-semibold text-watch">{orphaned} stop{orphaned === 1 ? '' : 's'} after that point will need a driver.</span> : 'Every remaining stop is done before then.'}
      </p>
    </Modal>
  )
}
