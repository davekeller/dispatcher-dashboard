import { ClockCountdown, MagnifyingGlass, NavigationArrow, Sparkle, X, type Icon } from '@phosphor-icons/react'
import { useEffect, useMemo, useState } from 'react'
import { useActions } from '../../../actions/ActionContext'
import { REGIONS } from '../../../data/regions'
import type { FilterState } from '../../../filters'
import { CAPACITY_MARGIN_MIN } from '../../../hos/constants'
import { fmtCountdown, fmtHm } from '../../../lib/format'
import { reassignCandidates, stopsPastLimit, type Candidate } from '../../../store/actions'
import { CANDIDATE_ORDERS, EMPTY_CANDIDATE_FILTERS, distanceKm, filterCandidates, isFilteringCandidates, orderCandidates, type CandidateFilters, type CandidateOrder } from '../../../store/candidates'
import { useDerived } from '../../../store/hooks'
import { useStore } from '../../../store/store'
import type { DriverView } from '../../../store/view'
import Button from '../../../ui/Button'
import Chip from '../../../ui/Chip'
import EmptyState from '../../../ui/EmptyState'
import Modal from '../../../ui/Modal'
import { BAND_TONE } from '../../../ui/tones'
import FiltersDropdown, { type FilterGroup, type FiltersCopy } from '../../shift/FiltersDropdown'
import OrderDropdown, { type OrderOption } from '../../shift/OrderDropdown'

function defaultSelection(from: DriverView, hasWontFinish: boolean): string[] {
  const past = hasWontFinish ? stopsPastLimit(from) : []
  if (past.length > 0) return past
  return from.route.stops.filter((s) => s.status === 'pending' || s.status === 'unassigned').map((s) => s.id)
}

// The picker's nav mirrors the board's: the order data lives in store/candidates.ts, the
// glyphs and copy here.
const ORDER_GLYPH: Record<CandidateOrder, Icon> = { lookout: Sparkle, proximity: NavigationArrow, time_left: ClockCountdown }
const ORDER_OPTIONS: OrderOption<CandidateOrder>[] = CANDIDATE_ORDERS.map((o) => ({ id: o.id, label: o.label, description: o.hint, Glyph: ORDER_GLYPH[o.id] }))
const PICKER_COPY: FiltersCopy = { all: 'All drivers', aria: 'Drivers shown', title: 'Filter drivers', hint: 'Narrow by region, or keep it to the same region.' }
const SEARCH_LABEL = 'Search drivers or trucks'

function orderDetail(order: CandidateOrder, from: DriverView, c: Candidate): string | null {
  if (order === 'proximity') return `${distanceKm(from.truck.position, c.view.truck.position).toFixed(1)} km away`
  if (order === 'time_left') return `${fmtHm(c.view.minutesUntilLimit)} left`
  return null
}

/** Preview → confirm → commit. The candidate filter excludes anyone who would enter act now,
 *  and the preview shows the receiving driver's new figures, so a reassign never just moves
 *  the violation to someone else. The picker's order, filters, and search only re-sequence
 *  and narrow that capacity-safe set; nothing here adds anyone back. */
export default function ReassignDialog({ driverId, initialStopIds, initialToId, onClose }: { driverId: string; initialStopIds?: string[]; initialToId?: string; onClose: () => void }) {
  const d = useDerived()
  const { open } = useActions()
  const reassign = useStore((s) => s.reassignStops)
  const deliveries = useStore((s) => s.fleet.deliveries)
  const from = d.byId.get(driverId)!
  const card = d.cardById.get(driverId)!
  const [stopIds, setStopIds] = useState<string[]>(() => (initialStopIds?.length ? initialStopIds : defaultSelection(from, card.alerts.some((a) => a.ruleId === 'wont_finish'))))
  const [toId, setToId] = useState<string | null>(initialToId ?? null) // a Lookout plan can pre-pick the candidate
  const [order, setOrder] = useState<CandidateOrder>('lookout')
  const [filters, setFilters] = useState<CandidateFilters>(EMPTY_CANDIDATE_FILTERS)
  const candidates = useMemo(() => reassignCandidates(d.views, from, stopIds), [d.views, from, stopIds])
  const shown = useMemo(() => filterCandidates(orderCandidates(candidates, from, order), filters), [candidates, from, order, filters])
  useEffect(() => {
    if (toId !== null && !shown.some((c) => c.view.driver.id === toId)) setToId(null)
  }, [shown, toId])
  const to = toId ? d.byId.get(toId) : undefined
  const selectable = from.route.stops.filter((s) => s.status === 'pending' || s.status === 'unassigned')
  const moved = selectable.filter((s) => stopIds.includes(s.id)).reduce((t, s) => t + s.driveMinutesFromPrev, 0)
  const toggle = (id: string) => setStopIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  const customer = (deliveryId: string) => deliveries.find((x) => x.id === deliveryId)?.customer ?? deliveryId
  const filtering = isFilteringCandidates(filters)

  const firstName = from.driver.name.split(' ')[0]
  const filterGroups: FilterGroup[] = [
    { id: 'region', label: 'Region', kind: 'multi', options: REGIONS.map((r) => ({ value: r, label: r })) },
    { id: 'scope', label: 'Scope', kind: 'multi', options: [{ value: 'same_region', label: `Same region as ${firstName}` }] },
  ]
  const filterState: FilterState = { region: filters.regions, scope: filters.sameRegionOnly ? ['same_region'] : [] }
  const onFilterState = (next: FilterState) => setFilters((f) => ({ ...f, regions: (next.region as string[] | undefined) ?? [], sameRegionOnly: ((next.scope as string[] | undefined) ?? []).includes('same_region') }))

  return (
    <Modal
      title={`Reassign ${from.driver.name}'s stops`}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="danger" disabled={!to || stopIds.length === 0} onClick={() => { if (to) { reassign(driverId, to.driver.id, stopIds); onClose() } }}>
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
      <section className="mt-5 border-t border-line pt-4">
        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-label">
          Who can take them{candidates.length > 0 && (filtering ? ` · ${shown.length} of ${candidates.length}` : ` · ${candidates.length}`)}
        </h3>
        {candidates.length === 0 ? (
          <EmptyState
            title="No one has the capacity for these stops."
            body="Every fresh driver on the road would end up inside the act-now window. Schedule a reset for the stops that fit and let the rest wait for a driver."
            action={<Button size="sm" variant="primary" onClick={() => { onClose(); open('schedule_reset', driverId) }}>Schedule a reset instead</Button>}
          />
        ) : (
          <>
            {/* The picker's nav sits on the canvas tone so it reads as controls, not as another row of candidates. */}
            <div className="relative z-20 mb-2 flex flex-wrap items-center gap-2 rounded-control border border-line/70 bg-canvas px-2 py-2">
              <OrderDropdown value={order} onChange={setOrder} options={ORDER_OPTIONS} label="Order drivers by" />
              <FiltersDropdown value={filterState} onChange={onFilterState} filters={filterGroups} copy={PICKER_COPY} />
              {filtering && (
                <Button size="sm" variant="ghost" onClick={() => setFilters(EMPTY_CANDIDATE_FILTERS)}>
                  <X size={12} /> Clear
                </Button>
              )}
              <label className="relative ml-auto min-w-44 flex-1 sm:max-w-56">
                <span className="sr-only">{SEARCH_LABEL}</span>
                <MagnifyingGlass size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} placeholder={SEARCH_LABEL} className="h-9 w-full rounded-control border border-nav-selected-line bg-panel pl-9 pr-3 text-[12px] text-ink outline-none transition placeholder:text-muted focus:border-ink/35 focus:ring-2 focus:ring-ink/10" aria-label={SEARCH_LABEL} />
              </label>
            </div>
            <div className="min-h-48">
              {shown.length === 0 ? (
                <div className="flex items-center justify-between gap-3 rounded-card border border-dashed border-line px-4 py-3 text-[12px] text-muted">
                  <span>No one matches these filters. {candidates.length === 1 ? 'One driver' : `${candidates.length} drivers`} can take the stops.</span>
                  <Button size="sm" variant="ghost" onClick={() => setFilters(EMPTY_CANDIDATE_FILTERS)}>Clear filters</Button>
                </div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {shown.map((c) => {
                    const detail = orderDetail(order, from, c)
                    return (
                      <li key={c.view.driver.id}>
                        <label className={`flex items-center gap-3 rounded-control border px-3 py-2 text-[13px] ${toId === c.view.driver.id ? 'border-ink bg-well' : 'border-line hover:bg-well/60'}`}>
                          <input type="radio" name="candidate" checked={toId === c.view.driver.id} onChange={() => setToId(c.view.driver.id)} className="accent-ink" />
                          <span className="font-semibold">{c.view.driver.name}</span>
                          <span className="text-muted">{c.view.driver.region}</span>
                          {c.sameRegion && <Chip tone={BAND_TONE.clear}>same region</Chip>}
                          <span className="tnum ml-auto text-[12px] text-muted">{detail && <span className="text-ink">{detail} · </span>}{c.view.remaining.length} stops left · {fmtHm(c.spare)} spare after the move</span>
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </>
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
