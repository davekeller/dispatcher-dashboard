import { useEffect, useMemo, useState } from 'react'
import { useActions } from '../../../actions/ActionContext'
import { CAPACITY_MARGIN_MIN } from '../../../hos/constants'
import { fmtCountdown, fmtHm } from '../../../lib/format'
import { reassignCandidates, stopsPastLimit } from '../../../store/actions'
import { useDerived } from '../../../store/hooks'
import { useStore } from '../../../store/store'
import type { DriverView } from '../../../store/view'
import Button from '../../../ui/Button'
import Chip from '../../../ui/Chip'
import EmptyState from '../../../ui/EmptyState'
import Modal from '../../../ui/Modal'
import { BAND_TONE } from '../../../ui/tones'

function defaultSelection(from: DriverView, hasWontFinish: boolean): string[] {
  const past = hasWontFinish ? stopsPastLimit(from) : []
  if (past.length > 0) return past
  return from.route.stops.filter((s) => s.status === 'pending' || s.status === 'unassigned').map((s) => s.id)
}

/** Preview → confirm → commit. The candidate filter excludes anyone who would enter act now,
 *  and the preview shows the receiving driver's new figures, so a reassign never just moves
 *  the violation to someone else. */
export default function ReassignDialog({ driverId, initialStopIds, onClose }: { driverId: string; initialStopIds?: string[]; onClose: () => void }) {
  const d = useDerived()
  const { open } = useActions()
  const reassign = useStore((s) => s.reassignStops)
  const deliveries = useStore((s) => s.fleet.deliveries)
  const from = d.byId.get(driverId)!
  const card = d.cardById.get(driverId)!
  const [stopIds, setStopIds] = useState<string[]>(() => (initialStopIds?.length ? initialStopIds : defaultSelection(from, card.alerts.some((a) => a.ruleId === 'wont_finish'))))
  const [toId, setToId] = useState<string | null>(null)
  const candidates = useMemo(() => reassignCandidates(d.views, from, stopIds), [d.views, from, stopIds])
  useEffect(() => {
    if (toId !== null && !candidates.some((c) => c.view.driver.id === toId)) setToId(null)
  }, [candidates, toId])
  const to = toId ? d.byId.get(toId) : undefined
  const selectable = from.route.stops.filter((s) => s.status === 'pending' || s.status === 'unassigned')
  const moved = selectable.filter((s) => stopIds.includes(s.id)).reduce((t, s) => t + s.driveMinutesFromPrev, 0)
  const toggle = (id: string) => setStopIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  const customer = (deliveryId: string) => deliveries.find((x) => x.id === deliveryId)?.customer ?? deliveryId

  return (
    <Modal
      title={`Reassign ${from.driver.name}'s stops`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!to || stopIds.length === 0} onClick={() => { if (to) { reassign(driverId, to.driver.id, stopIds); onClose() } }}>
            Confirm reassign{to ? ` to ${to.driver.name}` : ''}
          </Button>
        </>
      }
    >
      <section>
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-label">Stops to move · {fmtHm(moved)} of driving</h3>
        <ul className="flex flex-col gap-1">
          {selectable.map((s) => (
            <li key={s.id}>
              <label className="flex items-center gap-2 rounded-control px-2 py-1 text-[13px] hover:bg-well">
                <input type="checkbox" checked={stopIds.includes(s.id)} onChange={() => toggle(s.id)} className="accent-ink" />
                <span className="tnum w-5 text-muted">{s.seq}</span>
                <span className="font-medium">{customer(s.deliveryId)}</span>
                <span className="tnum ml-auto text-[11px] text-muted">{s.driveMinutesFromPrev} min drive</span>
              </label>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-5">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-label">Who can take them</h3>
        {candidates.length === 0 ? (
          <EmptyState
            title="No one has the capacity for these stops."
            body="Every fresh driver on the road would end up inside the act-now window. Schedule a reset for the stops that fit and let the rest wait for a driver."
            action={<Button size="sm" variant="primary" onClick={() => { onClose(); open('schedule_reset', driverId) }}>Schedule a reset instead</Button>}
          />
        ) : (
          <ul className="flex flex-col gap-1">
            {candidates.map((c) => (
              <li key={c.view.driver.id}>
                <label className={`flex items-center gap-3 rounded-control border px-3 py-2 text-[13px] ${toId === c.view.driver.id ? 'border-ink bg-well' : 'border-line hover:bg-well/60'}`}>
                  <input type="radio" name="candidate" checked={toId === c.view.driver.id} onChange={() => setToId(c.view.driver.id)} className="accent-ink" />
                  <span className="font-semibold">{c.view.driver.name}</span>
                  <span className="text-muted">{c.view.driver.region}</span>
                  {c.sameRegion && <Chip tone={BAND_TONE.clear}>same region</Chip>}
                  <span className="tnum ml-auto text-[12px] text-muted">{c.view.remaining.length} stops left · {fmtHm(c.spare)} spare after the move</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="mt-5 grid grid-cols-2 gap-3">
        <Preview title={from.driver.name} before={`${fmtHm(from.remainingDriveMin)} of driving vs ${fmtCountdown(from.minutesUntilLimit, from.staleness !== 'fresh')} left`} after={`${fmtHm(Math.max(0, from.remainingDriveMin - moved))} of driving vs ${fmtCountdown(from.minutesUntilLimit, from.staleness !== 'fresh')} left`} good={from.remainingDriveMin - moved <= from.minutesUntilLimit} />
        {to ? (
          <Preview title={to.driver.name} before={`${fmtHm(to.remainingDriveMin)} of driving vs ${fmtHm(to.minutesUntilLimit)} left`} after={`${fmtHm(to.remainingDriveMin + moved)} of driving vs ${fmtHm(to.minutesUntilLimit)} left`} good={to.minutesUntilLimit - (to.remainingDriveMin + moved) >= CAPACITY_MARGIN_MIN} />
        ) : (
          <div className="rounded-card border border-dashed border-line px-4 py-3 text-[12px] text-muted">Pick a driver to preview their new figures.</div>
        )}
      </section>
    </Modal>
  )
}

function Preview({ title, before, after, good }: { title: string; before: string; after: string; good: boolean }) {
  return (
    <div className="rounded-card border border-line px-4 py-3 text-[12px]">
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-1 text-muted">now: {before}</p>
      <p className={`mt-0.5 font-semibold ${good ? 'text-clear' : 'text-act-now'}`}>after: {after}</p>
    </div>
  )
}
