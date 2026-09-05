import { ListBullets, MapTrifold } from '@phosphor-icons/react'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useActions } from '../../actions/ActionContext'
import { stopsPastLimit } from '../../store/actions'
import { fmtClock } from '../../lib/format'
import { useLookout } from '../../lookout/LookoutContext'
import { useDerived } from '../../store/hooks'
import { useStore } from '../../store/store'
import Button from '../../ui/Button'
import EmptyState from '../../ui/EmptyState'
import AlertStrip from './AlertStrip'
import DriverCard from './DriverCard'
import StaleBanner from './StaleBanner'
import RouteRail from './RouteRail'
import StopReceipt from './StopReceipt'

// Leaflet and its stylesheet load only when someone opens the map; the board never pays for them.
const RouteMap = lazy(() => import('./map/RouteMap'))

type StopsMode = 'list' | 'map'

/** A file for one driver's day, in the case-file shape: the route rail down the left, then the
 *  driver card, the alerts, and the stop receipts. Lookout stays open and focuses on this driver. */
export default function RouteFilePage() {
  const { driverId = '' } = useParams()
  const d = useDerived()
  const deliveries = useStore((s) => s.fleet.deliveries)
  const deliveryById = useMemo(() => new Map(deliveries.map((x) => [x.id, x])), [deliveries])
  const { setFocus } = useLookout()
  const { open } = useActions()
  const [selected, setSelected] = useState<string[]>([])
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [params, setParams] = useSearchParams()
  const mode: StopsMode = params.get('view') === 'map' ? 'map' : 'list'
  const setMode = (next: StopsMode) => setParams((prev) => {
    const q = new URLSearchParams(prev)
    if (next === 'map') q.set('view', 'map')
    else q.delete('view')
    return q
  }, { replace: true })
  const [selectedStop, setSelectedStop] = useState<string | null>(null)
  const view = d.byId.get(driverId)
  const card = d.cardById.get(driverId)

  useEffect(() => {
    setFocus(driverId)
    return () => setFocus(null)
  }, [driverId, setFocus])
  useEffect(() => setSelected([]), [driverId])
  useEffect(() => setSelectedStop(null), [driverId])

  if (!view || !card) {
    return (
      <div className="p-6">
        <EmptyState title="No driver with that id is on this shift." action={<Link to="/"><Button size="sm">Back to the board</Button></Link>} />
      </div>
    )
  }

  const stale = view.staleness !== 'fresh'
  const staleReason = stale ? 'Position unknown. This action is disabled until the truck reports in.' : undefined
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  const pastLimitIds = new Set(stopsPastLimit(view))
  // On the map the rail's selection is the page's; it starts on the next stop, like the rail does when reading.
  const mapSelection = selectedStop ?? view.next?.id ?? null
  const seg = (on: boolean) => `inline-flex h-7 items-center gap-1.5 rounded-[6px] px-2.5 text-[11px] font-semibold transition ${on ? 'bg-well text-ink' : 'text-muted hover:text-ink'}`

  return (
    <div className="flex items-start gap-5 p-5">
      <RouteRail view={view} deliveryById={deliveryById} pastLimitIds={pastLimitIds} collapsed={railCollapsed} onCollapsedChange={setRailCollapsed} activeStopId={mode === 'map' ? mapSelection : undefined} onSelectStop={mode === 'map' ? setSelectedStop : undefined} />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
      <DriverCard view={view} card={card} />
      {stale && <StaleBanner view={view} />}
      {card.alerts.length > 0 && <AlertStrip view={view} card={card} />}
      <section>
        <header className="mb-2 flex items-center gap-3">
          <h2 className="text-[12px] font-semibold uppercase tracking-wide text-label">Stops</h2>
          <span className="tnum text-[12px] text-muted">{view.done} of {view.total} done</span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="primary" disabled={selected.length === 0 || stale} title={staleReason} onClick={() => open('reassign', view.driver.id, { stopIds: selected })}>
              Reassign selected{selected.length > 0 ? ` (${selected.length})` : ''}
            </Button>
            <Button size="sm" disabled={view.remaining.length === 0 || view.plannedResetAt !== undefined} title={view.plannedResetAt !== undefined ? `Reset already scheduled for ${fmtClock(view.plannedResetAt)}` : undefined} onClick={() => open('schedule_reset', view.driver.id)}>Schedule reset</Button>
            <Button size="sm" disabled={stale || view.remaining.length === 0} title={staleReason} onClick={() => open('notify_customer', view.driver.id)}>Notify customers</Button>
            <div className="ml-1 flex shrink-0 items-center gap-0.5 rounded-control border border-line bg-panel p-0.5 shadow-sm" role="group" aria-label="Show stops as">
              <button type="button" aria-pressed={mode === 'list'} onClick={() => setMode('list')} className={seg(mode === 'list')} title="Stops as a list">
                <ListBullets size={14} weight={mode === 'list' ? 'fill' : 'regular'} /> List
              </button>
              <button type="button" aria-pressed={mode === 'map'} onClick={() => setMode('map')} className={seg(mode === 'map')} title="Stops on a map, with the truck">
                <MapTrifold size={14} weight={mode === 'map' ? 'fill' : 'regular'} /> Map
              </button>
            </div>
          </div>
        </header>
        {mode === 'map' ? (
          <Suspense fallback={<div className="flex h-[22rem] items-center justify-center rounded-card border border-line bg-panel text-[12px] text-muted">Loading the map…</div>}>
            <RouteMap view={view} deliveryById={deliveryById} pastLimitIds={pastLimitIds} selectedStopId={mapSelection} onSelectStop={setSelectedStop} />
          </Suspense>
        ) : (
          <ol className="flex flex-col gap-2">
            {view.route.stops.map((s) => (
              <li key={s.id} id={`stop-${s.id}`} className="scroll-mt-4">
                <StopReceipt stop={s} delivery={deliveryById.get(s.deliveryId)} view={view} selected={selected.includes(s.id)} onToggle={() => toggle(s.id)} pastLimit={pastLimitIds.has(s.id)} />
              </li>
            ))}
          </ol>
        )}
      </section>
      </div>
    </div>
  )
}
