import { ListBullets, MapTrifold } from '@phosphor-icons/react'
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useActions } from '../../actions/ActionContext'
import { stopsPastLimit } from '../../store/actions'
import { useLookout } from '../../lookout/LookoutContext'
import { fmtAge } from '../../lib/format'
import { routeHosSignal, routeScheduleSignal, type RouteSignalTone } from '../../lib/routeProgress'
import { useDerived } from '../../store/hooks'
import { useStore } from '../../store/store'
import Button from '../../ui/Button'
import EmptyState from '../../ui/EmptyState'
import AlertStrip from './AlertStrip'
import DriverCard from './DriverCard'
import StaleBanner from './StaleBanner'
import RouteRail from './RouteRail'
import StopReceipt from './StopReceipt'
import { nextStopSelection } from './stopSelection'

// Leaflet and its stylesheet load only when someone opens the map; the board never pays for them.
const RouteMap = lazy(() => import('./map/RouteMap'))

type StopsMode = 'list' | 'map'

const SIGNAL_DOT: Record<RouteSignalTone, string> = {
  clear: 'bg-clear-fill',
  watch: 'bg-watch-fill',
  act_now: 'bg-act-now-fill',
  offline: 'bg-offline-fill',
}

const SIGNAL_TEXT: Record<RouteSignalTone, string> = {
  clear: 'text-clear',
  watch: 'text-watch',
  act_now: 'text-act-now',
  offline: 'text-offline',
}

/** A file for one driver's day, in the case-file shape: the route rail down the left, then one
 *  driver-and-alert header card followed by the stop list or map. Lookout stays focused here. */
export default function RouteFilePage() {
  const { driverId = '' } = useParams()
  const d = useDerived()
  const deliveries = useStore((s) => s.fleet.deliveries)
  const deliveryById = useMemo(() => new Map(deliveries.map((x) => [x.id, x])), [deliveries])
  const { setFocus } = useLookout()
  const { open } = useActions()
  const [selected, setSelected] = useState<string[]>([])
  const selectionAnchor = useRef<string | null>(null)
  const [railCollapsed, setRailCollapsed] = useState(true)
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
  useEffect(() => {
    setSelected([])
    selectionAnchor.current = null
  }, [driverId])
  useEffect(() => setSelectedStop(null), [driverId])
  useEffect(() => setRailCollapsed(true), [driverId])

  if (!view || !card) {
    return (
      <div className="p-6">
        <EmptyState title="No driver with that id is on this shift." action={<Link to="/"><Button size="sm">Back to the board</Button></Link>} />
      </div>
    )
  }

  const stale = view.staleness !== 'fresh'
  const staleReason = stale ? 'Position unknown. This action is disabled until the truck reports in.' : undefined
  const progress = view.total === 0 ? 100 : Math.round((view.done / view.total) * 100)
  const routeSignals = [routeScheduleSignal(view), routeHosSignal(view)]
  const selectableStopIds = [...view.route.stops]
    .reverse()
    .filter((stop) => stop.status === 'pending' || stop.status === 'unassigned')
    .map((stop) => stop.id)
  const selectStop = (id: string, extendRange: boolean) => {
    const anchor = selectionAnchor.current
    setSelected((current) => nextStopSelection(current, selectableStopIds, id, anchor, extendRange))
    if (!extendRange || anchor === null) selectionAnchor.current = id
  }
  const pastLimitIds = new Set(stopsPastLimit(view))
  // On the map the rail's selection is the page's; it starts on the next stop, like the rail does when reading.
  const mapSelection = selectedStop ?? view.next?.id ?? null
  const seg = (on: boolean) => `inline-flex h-7 items-center gap-1.5 rounded-[6px] px-2.5 text-[11px] font-semibold transition ${on ? 'bg-board text-ink' : 'text-muted hover:bg-board/60 hover:text-ink'}`

  return (
    <div className="route-workspace flex min-h-full items-start gap-5 py-5 pr-5">
      <RouteRail view={view} deliveryById={deliveryById} pastLimitIds={pastLimitIds} collapsed={railCollapsed} onCollapsedChange={setRailCollapsed} activeStopId={mode === 'map' ? mapSelection : undefined} onSelectStop={mode === 'map' ? setSelectedStop : undefined} />
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <DriverCard view={view} card={card} />
        <section>
          <header className={`sticky top-0 z-30 mb-3 flex min-h-14 w-full items-stretch border-y border-nav-selected-line/70 bg-nav-selected/55 px-3 backdrop-blur ${railCollapsed ? '' : 'flex-wrap'}`}>
            <div className={`flex min-w-0 shrink-0 items-center gap-2.5 py-2 pr-3 ${railCollapsed ? '' : 'order-1 flex-1'}`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-ink text-on-accent shadow-sm" aria-hidden="true">
                <ListBullets size={15} weight="bold" />
              </span>
              <div className="min-w-0">
                <p className="text-[8px] font-semibold uppercase leading-none tracking-[0.07em] text-label">Stops · {progress}% complete</p>
                <h2 className="tnum mt-1 whitespace-nowrap text-[13px] font-semibold leading-none text-ink">{view.done}/{view.total} delivered</h2>
              </div>
            </div>
            <dl aria-label="Route status" className={`grid min-w-0 flex-1 grid-cols-3 divide-x divide-nav-selected-line/70 ${railCollapsed ? 'border-l border-nav-selected-line/70' : 'order-3 basis-full border-t border-nav-selected-line/70'}`}>
              <div className="flex min-w-0 flex-col justify-center px-3 py-2">
                <dt className="flex min-w-0 items-center gap-1.5 text-[8px] font-semibold uppercase tracking-[0.06em] text-label">
                  <span>Remaining</span>
                  <span className="truncate font-medium normal-case tracking-normal text-muted" title={`Updated ${fmtAge(view.pingAgeMin)}`}>· {fmtAge(view.pingAgeMin)}</span>
                </dt>
                <dd className="tnum mt-1 text-[12px] font-semibold leading-none text-ink">{view.remaining.length} <span className="text-[9px] font-medium text-muted">stops</span></dd>
              </div>
              {routeSignals.map((signal) => (
                <div key={signal.label} className="flex min-w-0 flex-col justify-center px-3 py-2">
                  <dt className="text-[8px] font-semibold uppercase tracking-[0.06em] text-label">{signal.label}</dt>
                  <dd className={`mt-1 flex min-w-0 items-center gap-1.5 text-[11px] font-semibold leading-none ${SIGNAL_TEXT[signal.tone]}`}>
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${SIGNAL_DOT[signal.tone]}`} />
                    <span className="truncate" title={signal.value}>{signal.value}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <div className={`ml-auto flex items-center gap-2 py-2 pl-3 ${railCollapsed ? '' : 'order-2'}`}>
              {selected.length > 0 && (
                <Button size="sm" variant="primary" disabled={stale} title={staleReason} onClick={() => open('reassign', view.driver.id, { stopIds: selected })}>
                  Reassign selected ({selected.length})
                </Button>
              )}
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
          {(card.alerts.length > 0 || stale) && (
            <div className="mb-3 flex flex-col gap-3">
              {card.alerts.length > 0 && <AlertStrip view={view} card={card} />}
              {stale && <StaleBanner view={view} />}
            </div>
          )}
          {mode === 'map' ? (
            <Suspense fallback={<div className="flex h-[22rem] items-center justify-center rounded-card border border-line bg-panel text-[12px] text-muted">Loading the map…</div>}>
              <RouteMap view={view} deliveryById={deliveryById} pastLimitIds={pastLimitIds} selectedStopId={mapSelection} onSelectStop={setSelectedStop} />
            </Suspense>
          ) : (
            <ol className="flex flex-col gap-2">
              {[...view.route.stops].reverse().map((s) => (
                <li key={s.id} id={`stop-${s.id}`} className="scroll-mt-16">
                  <StopReceipt stop={s} delivery={deliveryById.get(s.deliveryId)} view={view} selected={selected.includes(s.id)} onSelect={(extendRange) => selectStop(s.id, extendRange)} pastLimit={pastLimitIds.has(s.id)} />
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}
